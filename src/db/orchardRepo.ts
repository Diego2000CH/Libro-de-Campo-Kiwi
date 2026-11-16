import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { laboresSql, orchardSnapshots, parcelasSql, users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database operation failed. Please try again later.', { cause: error });
  }
}

export async function getOrchardSnapshotByUid(uid: string, email: string, displayName?: string) {
  try {
    const user = await getOrCreateUser(uid, email, displayName);
    const rows = await db
      .select()
      .from(orchardSnapshots)
      .where(eq(orchardSnapshots.userId, user.id));

    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getOrchardSnapshotByUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function saveOrchardSnapshotByUid(
  uid: string,
  email: string,
  displayName: string | undefined,
  stateJson: Record<string, unknown>
) {
  try {
    const user = await getOrCreateUser(uid, email, displayName);

    const explotacion = (stateJson.explotacion as Record<string, unknown> | undefined) ?? {};
    const nombreFundo =
      typeof explotacion.nombreFundo === 'string' && explotacion.nombreFundo.trim()
        ? explotacion.nombreFundo.trim()
        : 'Mi Huerto de Kiwis';
    const latitud = typeof explotacion.latitud === 'number' ? explotacion.latitud : -39.628593;
    const longitud = typeof explotacion.longitud === 'number' ? explotacion.longitud : -72.461085;

    const saved = await db
      .insert(orchardSnapshots)
      .values({
        userId: user.id,
        nombreFundo,
        latitud,
        longitud,
        stateJson,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: orchardSnapshots.userId,
        set: {
          nombreFundo,
          latitud,
          longitud,
          stateJson,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Sincronizar tabla relacional de cuarteles
    const parcelasArr = Array.isArray(stateJson.parcelas)
      ? (stateJson.parcelas as Record<string, unknown>[])
      : [];

    await db.delete(parcelasSql).where(eq(parcelasSql.userId, user.id));
    if (parcelasArr.length > 0) {
      await db
        .insert(parcelasSql)
        .values(
          parcelasArr.map((p) => ({
            id: `${user.id}_${String(p.id || Date.now())}`,
            userId: user.id,
            nombre: String(p.nombre || 'Cuartel'),
            codigoCuartel: typeof p.codigoCuartel === 'string' ? p.codigoCuartel : null,
            superficieHa: Number(p.superficieHa) || 0,
            variedad: String(p.variedad || 'Kiwi Hayward'),
            sistemaConduccion: typeof p.sistemaConduccion === 'string' ? p.sistemaConduccion : null,
            estadoActual: typeof p.estadoActual === 'string' ? p.estadoActual : null,
            lat: typeof p.lat === 'number' ? p.lat : null,
            lng: typeof p.lng === 'number' ? p.lng : null,
            updatedAt: new Date(),
          }))
        )
        .onConflictDoNothing();
    }

    // Sincronizar tabla relacional de labores
    const laboresArr = Array.isArray(stateJson.labores)
      ? (stateJson.labores as Record<string, unknown>[])
      : [];

    await db.delete(laboresSql).where(eq(laboresSql.userId, user.id));
    if (laboresArr.length > 0) {
      await db
        .insert(laboresSql)
        .values(
          laboresArr.map((l) => ({
            id: `${user.id}_${String(l.id || Date.now())}`,
            userId: user.id,
            fecha: String(l.fecha || new Date().toISOString().split('T')[0]),
            parcelaId: String(l.parcelaId || 'general'),
            parcelaNombre: String(l.parcelaNombre || 'Huerto General'),
            tipoLabor: String(l.tipoLabor || 'fitosanitario'),
            descripcion: String(l.descripcion || ''),
            nombreInsumo: typeof l.nombreInsumo === 'string' ? l.nombreInsumo : null,
            totalInsumoUtilizado:
              typeof l.totalInsumoUtilizado === 'number' ? l.totalInsumoUtilizado : null,
            unidadMedida: typeof l.unidadMedida === 'string' ? l.unidadMedida : null,
            registradoPor: String(l.registradoPor || email),
          }))
        )
        .onConflictDoNothing();
    }

    return saved[0];
  } catch (error) {
    console.error('Database query failed in saveOrchardSnapshotByUid:', error);
    throw new Error('Database persistence failed. Please try again later.', { cause: error });
  }
}

export async function getSqlSummaryByUid(uid: string) {
  try {
    const userRows = await db.select().from(users).where(eq(users.uid, uid));
    const user = userRows[0];
    if (!user) {
      return { parcelasCount: 0, laboresCount: 0 };
    }
    const parcelas = await db.select().from(parcelasSql).where(eq(parcelasSql.userId, user.id));
    const labores = await db.select().from(laboresSql).where(eq(laboresSql.userId, user.id));
    return {
      parcelasCount: parcelas.length,
      laboresCount: labores.length,
    };
  } catch (error) {
    console.error('Database query failed in getSqlSummaryByUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
