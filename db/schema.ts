import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * L'état complet de campagne reste versionné en JSON. Ce choix garde la V1
 * souple pendant que les règles et les bandes supplémentaires sont intégrées.
 */
export const campaignStates = sqliteTable('campaign_states', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: text('updated_at').notNull(),
});
