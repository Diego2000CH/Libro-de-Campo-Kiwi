import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  RefreshCw,
  Lightbulb,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Parcela, InsumoInventario, ClimaCondiciones } from '../types/campo';

interface MapsGroundingSource {
  title: string;
  uri: string;
  placeId?: string;
  reviewSnippets?: string[];
}

interface AsistenteIaViewProps {
  parcelas: Parcela[];
  inventario: InsumoInventario[];
  clima: ClimaCondiciones;
  fundoNombre: string;
  explotacionLatLng?: { latitude: number; longitude: number };
  getAuthToken?: () => Promise<string | null>;
}

interface MensajeChat {
  id: string;
  remitente: 'usuario' | 'ia';
  texto: string;
  fecha: string;
  sources?: MapsGroundingSource[];
}

export const AsistenteIaView: React.FC<AsistenteIaViewProps> = ({
  parcelas,
  inventario,
  clima,
  fundoNombre,
  explotacionLatLng,
  getAuthToken,
}) => {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: 'init-1',
      remitente: 'ia',
      texto: `¡Hola! Soy tu Asesor Agrónomo Virtual de **${fundoNombre}** impulsado por **Gemini 4 Hydrogen** con **Google Maps Grounding**.\n\nPuedo ayudarte en tiempo real con:\n- Agroservicios, bodegas de insumos agrícolas, laboratorios y oficinas del SAG cercanos al huerto.\n- Dosificación oficial y períodos de carencia SAG para Kiwi Hayward.\n- Manejo preventivo de bacteriosis Psa y Botrytis según tu clima actual.\n- Cálculo de lámina de riego en parrón, horas frío y madurez (°Brix ≥ 6.2).\n\n¿Qué deseas consultar hoy?`,
      fecha: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputTexto, setInputTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number }>(
    explotacionLatLng || { latitude: -39.628593, longitude: -72.461085 }
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (explotacionLatLng) {
      setUserCoords(explotacionLatLng);
    }
  }, [explotacionLatLng]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // Mantiene las coordenadas registradas del huerto si no hay permiso GPS
        },
        { timeout: 4000 }
      );
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensajes, cargando]);

  const consultasRapidas = [
    '¿Dónde hay agroservicios o distribuidores de fertilizantes cercanos al huerto?',
    '¿Dónde queda la oficina del SAG o planta de packing más cercana?',
    '¿Cuál es la dosis y carencia de Switch 62.5 WG para Botrytis en Hayward?',
    '¿Cómo proteger contra Psa tras una lluvia o poda en parrón?',
    '¿Cuántos m³ y horas de pozo necesito para reponer 5 mm de ETo en 6 ha?',
  ];

  const handleEnviar = async (textoAEnviar?: string) => {
    const texto = (textoAEnviar || inputTexto).trim();
    if (!texto || cargando) return;

    const userMsg: MensajeChat = {
      id: `usr-${Date.now()}`,
      remitente: 'usuario',
      texto,
      fecha: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    };

    setMensajes((prev) => [...prev, userMsg]);
    setInputTexto('');
    setCargando(true);

    try {
      const token = getAuthToken ? await getAuthToken() : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/gemini/maps-advisor', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: texto,
          fundoNombre,
          parcelas,
          inventario,
          clima,
          latLng: explotacionLatLng || userCoords,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error del servidor (${res.status})`);
      }

      const iaMsg: MensajeChat = {
        id: `ia-${Date.now()}`,
        remitente: 'ia',
        texto: data.text || 'Sin respuesta disponible.',
        fecha: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        sources: Array.isArray(data.sources) ? data.sources : undefined,
      };
      setMensajes((prev) => [...prev, iaMsg]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const iaErr: MensajeChat = {
        id: `ia-err-${Date.now()}`,
        remitente: 'ia',
        texto: `No pude completar la consulta en este momento: ${errorMessage}`,
        fecha: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      };
      setMensajes((prev) => [...prev, iaErr]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 rounded-2xl text-white shadow-sm border border-emerald-800/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-emerald-300 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-800/80 text-emerald-200 text-[10px] font-bold uppercase tracking-wider mb-1">
              Gemini 4 Hydrogen · Google Maps Grounding
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Asistente Agronómico & Territorial
            </h1>
            <p className="text-xs text-emerald-100">
              Especialista en Kiwi Hayward y búsqueda georreferenciada con Google Maps cerca de {(explotacionLatLng || userCoords).latitude.toFixed(4)}, {(explotacionLatLng || userCoords).longitude.toFixed(4)}.
            </p>
          </div>
        </div>

        <button
          onClick={() => setMensajes([mensajes[0]])}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start md:self-center transition-colors border border-white/10 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reiniciar Conversación
        </button>
      </div>

      {/* Consultas Rápidas Sugeridas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-stone-500 font-bold shrink-0 flex items-center gap-1 pl-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          Consultar:
        </span>
        {consultasRapidas.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleEnviar(item)}
            className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 font-medium rounded-xl border border-stone-200 whitespace-nowrap shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Caja de Conversación */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[560px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {mensajes.map((msg) => {
            const esIa = msg.remitente === 'ia';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${esIa ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                    esIa ? 'bg-emerald-800 text-white shadow-2xs' : 'bg-stone-800 text-white shadow-2xs'
                  }`}
                >
                  {esIa ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl leading-relaxed space-y-2 shadow-2xs ${
                    esIa
                      ? 'bg-stone-50 border border-stone-200 text-stone-800'
                      : 'bg-emerald-900 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] opacity-70">
                    <span className="font-bold">
                      {esIa ? `Asesor Agrónomo IA (${fundoNombre})` : 'Tú'}
                    </span>
                    <span>{msg.fecha}</span>
                  </div>

                  <div className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed">
                    {msg.texto}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2.5 mt-2 border-t border-stone-200 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Lugares verificados en Google Maps:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src, sIdx) => (
                          <a
                            key={`${msg.id}-src-${sIdx}`}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-900 transition-colors"
                          >
                            <MapPin className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>{src.title}</span>
                            <ExternalLink className="w-3 h-3 text-stone-400 shrink-0" />
                          </a>
                        ))}
                      </div>
                      {msg.sources.some((s) => s.reviewSnippets && s.reviewSnippets.length > 0) && (
                        <div className="space-y-1 pt-1">
                          {msg.sources.flatMap((s) =>
                            (s.reviewSnippets || []).map((snip, rIdx) => (
                              <p
                                key={`${msg.id}-snip-${rIdx}`}
                                className="text-[11px] text-stone-500 italic bg-white px-2.5 py-1 rounded border border-stone-200"
                              >
                                "{snip}"
                              </p>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {cargando && (
            <div className="flex gap-3 max-w-xl mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
              </div>
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-stone-600 text-xs flex items-center gap-2">
                <span>Consultando con Gemini 4 Hydrogen y Google Maps Grounding...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Barra de entrada */}
        <div className="p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50/70">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEnviar();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              placeholder="Consulta sobre insumos cercanos en Google Maps, dosis SAG, Psa, °Brix o riego..."
              disabled={cargando}
              className="flex-1 px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputTexto.trim() || cargando}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </form>
          <div className="text-[10px] text-stone-400 mt-1.5 flex items-center justify-between px-1">
            <span>💡 Incluye enlaces directos de Google Maps cuando buscas servicios, proveedores o rutas agrícolas.</span>
            <span className="font-mono">{fundoNombre} · Temporada 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};
