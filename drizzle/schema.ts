import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  bigint,
} from "drizzle-orm/mysql-core";

// Tabela de usuários do sistema (admin e usuários criados pelo admin)
export const appUsers = mysqlTable("app_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
  avatarUrl: text("avatar_url"),
  keyLimit: int("key_limit").default(10).notNull(),
  keysGenerated: int("keys_generated").default(0).notNull(),
  isBanned: int("is_banned").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("last_signed_in"),
});

export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = typeof appUsers.$inferInsert;

// Tabela de license keys
export const licenseKeys = mysqlTable("license_keys", {
  id: int("id").autoincrement().primaryKey(),
  keyValue: varchar("key_value", { length: 20 }).notNull().unique(),
  status: mysqlEnum("status", ["inactive", "active", "paused", "banned"]).default("inactive").notNull(),
  durationDays: int("duration_days").notNull(), // 1, 7 ou 30
  createdById: int("created_by_id").notNull(),
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  deviceId: varchar("device_id", { length: 255 }),
  deviceInfo: text("device_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type LicenseKey = typeof licenseKeys.$inferSelect;
export type InsertLicenseKey = typeof licenseKeys.$inferInsert;

// Tabela de histórico de login
export const loginHistory = mysqlTable("login_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  username: varchar("username", { length: 64 }).notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  success: int("success").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = typeof loginHistory.$inferInsert;

// Tabela de logs de auditoria
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  username: varchar("username", { length: 64 }),
  action: varchar("action", { length: 128 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// Tabela de sessões iOS (para validação de keys em apps)
export const iosSessions = mysqlTable("ios_sessions", {
  id: int("id").autoincrement().primaryKey(),
  keyId: int("key_id").notNull(),
  keyValue: varchar("key_value", { length: 20 }).notNull(),
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  lastChecked: timestamp("last_checked").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type IosSession = typeof iosSessions.$inferSelect;
export type InsertIosSession = typeof iosSessions.$inferInsert;

// Manter tabela users original para compatibilidade com o sistema OAuth
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
