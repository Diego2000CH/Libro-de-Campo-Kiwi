import { NotificacionHelada } from '../types/campo';

export type BrowserNotificationPermissionState = NotificationPermission | 'unsupported';

const FROST_BROADCAST_CHANNEL = 'fundo_heladas_alerts';

export function getBrowserNotificationPermission(): BrowserNotificationPermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermissionState> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.warn('Error solicitando permiso de notificaciones del navegador:', err);
    return Notification.permission;
  }
}

export async function sendBrowserFrostNotification(
  notif: NotificacionHelada,
  fundoNombre?: string
): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const title = fundoNombre ? `[${fundoNombre}] ${notif.titulo}` : notif.titulo;
  const options: NotificationOptions = {
    body: notif.mensaje,
    tag: `helada-critica-${notif.id}`,
    requireInteraction: notif.severidad === 'critica',
  };

  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    }
  } catch {
    // Fallback a Notification directo en la ventana
  }

  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        // Ignorar en entornos embebidos
      }
    };
    return true;
  } catch (err) {
    console.warn('No se pudo mostrar notificación del navegador:', err);
    return false;
  }
}

export function broadcastFrostNotification(notif: NotificacionHelada): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(FROST_BROADCAST_CHANNEL);
    channel.postMessage({ type: 'NEW_FROST_ALERT', payload: notif });
    channel.close();
  } catch {
    // Ignorar si BroadcastChannel no está disponible en el contexto actual
  }
}

export function subscribeFrostBroadcast(
  onReceive: (notif: NotificacionHelada) => void
): () => void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {};
  }
  try {
    const channel = new BroadcastChannel(FROST_BROADCAST_CHANNEL);
    const handler = (event: MessageEvent) => {
      if (event?.data?.type === 'NEW_FROST_ALERT' && event.data.payload) {
        onReceive(event.data.payload as NotificacionHelada);
      }
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  } catch {
    return () => {};
  }
}

export function formatFrostAlertShareText(
  notif: NotificacionHelada,
  fundoNombre?: string
): string {
  const fecha = new Date(notif.fechaHoraIso).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const admins = notif.destinatarios
    .filter((d) => d.esAdministrador)
    .map((d) => d.nombre)
    .join(', ');
  const equipo = notif.destinatarios
    .filter((d) => !d.esAdministrador)
    .map((d) => d.nombre)
    .join(', ');

  return [
    `${fundoNombre ? `${fundoNombre.toUpperCase()} · ` : ''}${notif.titulo}`,
    `Fecha/Hora: ${fecha}`,
    `Sensor Aire: ${notif.tempSensorC.toFixed(1)}°C | Umbral Crítico Configurado: ${notif.umbralCriticoConfiguradoC.toFixed(1)}°C${
      notif.tempBulboHumedoC !== undefined ? ` | Bulbo Húmedo: ${notif.tempBulboHumedoC.toFixed(1)}°C` : ''
    }`,
    `Estado Fenológico: ${notif.estadoFenologico}`,
    `Detalle: ${notif.mensaje}`,
    `Administrador notificado: ${admins || 'Sin asignar'}`,
    `Usuarios notificados (${notif.destinatarios.length} total): ${equipo || 'Sin otros usuarios'}`,
  ].join('\n');
}
