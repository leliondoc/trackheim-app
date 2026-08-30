import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * L'état complet de campagne v3 reste versionné en JSON. La colonne de révision
 * porte séparément le verrou optimiste et reste l'autorité en cas de divergence.
 */
export const campaignStates = sqliteTable('campaign_states', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: text('updated_at').notNull(),
  revision: integer('revision').notNull().default(0),
});
