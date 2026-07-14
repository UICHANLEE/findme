import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const teamState = sqliteTable("team_state", {
  teamId: text("team_id").primaryKey(),
  teamName: text("team_name"),
  currentRoom: text("current_room"),
  enteredAt: text("entered_at"),
  updatedAt: text("updated_at").notNull(),
});

export const checkEvents = sqliteTable("check_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: text("team_id").notNull(),
  room: text("room").notNull(),
  action: text("action").notNull(),
  createdAt: text("created_at").notNull(),
});
