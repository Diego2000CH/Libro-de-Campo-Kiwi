import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Usuarios autenticados mediante Firebase Auth (Google Sign-In)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Snapshot integral del huerto por propietario en Cloud SQL
export const orchardSnapshots = pgTable('orchard_snapshots', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  nombreFundo: text('nombre_fundo').notNull(),
  latitud: doublePrecision('latitud').default(-39.628593),
  longitud: doublePrecision('longitud').default(-72.461085),
  stateJson: jsonb('state_json').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabla relacional de Cuarteles sincronizada desde el cuaderno
export const parcelasSql = pgTable('parcelas', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  nombre: text('nombre').notNull(),
  codigoCuartel: text('codigo_cuartel'),
  superficieHa: doublePrecision('superficie_ha').notNull().default(0),
  variedad: text('variedad').notNull().default('Kiwi Hayward'),
  sistemaConduccion: text('sistema_conduccion'),
  estadoActual: text('estado_actual'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabla relacional de Labores SAG sincronizada desde el cuaderno
export const laboresSql = pgTable('labores', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  fecha: text('fecha').notNull(),
  parcelaId: text('parcela_id').notNull(),
  parcelaNombre: text('parcela_nombre').notNull(),
  tipoLabor: text('tipo_labor').notNull(),
  descripcion: text('descripcion').notNull(),
  nombreInsumo: text('nombre_insumo'),
  totalInsumoUtilizado: doublePrecision('total_insumo_utilizado'),
  unidadMedida: text('unidad_medida'),
  registradoPor: text('registrado_por').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  orchardSnapshot: one(orchardSnapshots, {
    fields: [users.id],
    references: [orchardSnapshots.userId],
  }),
  parcelas: many(parcelasSql),
  labores: many(laboresSql),
}));

export const orchardSnapshotsRelations = relations(orchardSnapshots, ({ one }) => ({
  owner: one(users, {
    fields: [orchardSnapshots.userId],
    references: [users.id],
  }),
}));

export const parcelasSqlRelations = relations(parcelasSql, ({ one }) => ({
  owner: one(users, {
    fields: [parcelasSql.userId],
    references: [users.id],
  }),
}));

export const laboresSqlRelations = relations(laboresSql, ({ one }) => ({
  owner: one(users, {
    fields: [laboresSql.userId],
    references: [users.id],
  }),
}));
