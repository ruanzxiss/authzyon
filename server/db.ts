import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, appUsers, licenseKeys, loginHistory, auditLogs, iosSessions, InsertAppUser } from "../drizzle/schema";
import type { AppUser, LicenseKey, LoginHistory, AuditLog } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── App Users ───────────────────────────────────────────────────────────────

export async function getAppUserByUsername(username: string): Promise<AppUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(appUsers).where(eq(appUsers.username, username)).limit(1);
  return result[0];
}

export async function getAppUserById(id: number): Promise<AppUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(appUsers).where(eq(appUsers.id, id)).limit(1);
  return result[0];
}

export async function getAllAppUsers(): Promise<AppUser[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appUsers).orderBy(desc(appUsers.createdAt));


export async function createAppUser(data: InsertAppUser): Promise<void> {
  const db = await getDb();

  await db.insert(appUsers).values(data);
}

export async function updateAppUser(id: number, data: Partial<AppUser>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(appUsers).set(data as any).where(eq(appUsers.id, id));
}

export async function updateAppUserLastSignedIn(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(appUsers).set({ lastSignedIn: new Date() }).where(eq(appUsers.id, id));
}

// ─── License Keys ─────────────────────────────────────────────────────────────

export async function createLicenseKey(data: {
  keyValue: string;
  durationDays: number;
  createdById: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(licenseKeys).values({
    keyValue: data.keyValue,
    durationDays: data.durationDays,
    createdById: data.createdById,
    status: "inactive",
  });
}

export async function getLicenseKeyByValue(keyValue: string): Promise<LicenseKey | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(licenseKeys).where(eq(licenseKeys.keyValue, keyValue)).limit(1);
  return result[0];
}

export async function getLicenseKeyById(id: number): Promise<LicenseKey | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(licenseKeys).where(eq(licenseKeys.id, id)).limit(1);
  return result[0];
}

export async function getAllLicenseKeys(): Promise<LicenseKey[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(licenseKeys).orderBy(desc(licenseKeys.createdAt));
}

export async function getLicenseKeysByUser(userId: number): Promise<LicenseKey[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(licenseKeys).where(eq(licenseKeys.createdById, userId)).orderBy(desc(licenseKeys.createdAt));
}

export async function updateLicenseKey(id: number, data: Partial<LicenseKey>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(licenseKeys).set(data as any).where(eq(licenseKeys.id, id));
}

export async function activateLicenseKey(keyValue: string, deviceId: string, deviceInfo: string): Promise<LicenseKey | null> {
  const db = await getDb();
  if (!db) return null;
  const key = await getLicenseKeyByValue(keyValue);
  if (!key) return null;
  if (key.status !== "inactive") return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + key.durationDays * 24 * 60 * 60 * 1000);

  await db.update(licenseKeys).set({
    status: "active",
    activatedAt: now,
    expiresAt,
    deviceId,
    deviceInfo,
  }).where(eq(licenseKeys.keyValue, keyValue));

  return getLicenseKeyByValue(keyValue) as Promise<LicenseKey>;
}

export async function addDaysToKey(id: number, days: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const key = await getLicenseKeyById(id);
  if (!key) throw new Error("Key not found");

  const baseDate = key.expiresAt && key.expiresAt > new Date() ? key.expiresAt : new Date();
  const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  await db.update(licenseKeys).set({ expiresAt: newExpiry }).where(eq(licenseKeys.id, id));
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalKeys: 0, activeKeys: 0, inactiveKeys: 0, pausedKeys: 0, bannedKeys: 0, totalUsers: 0 };

  const [keyStats] = await db.select({
    total: sql<number>`COUNT(*)`,
    active: sql<number>`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`,
    inactive: sql<number>`SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END)`,
    paused: sql<number>`SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END)`,
    banned: sql<number>`SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END)`,
  }).from(licenseKeys);

  const [userStats] = await db.select({ total: sql<number>`COUNT(*)` }).from(appUsers);

  return {
    totalKeys: Number(keyStats?.total ?? 0),
    activeKeys: Number(keyStats?.active ?? 0),
    inactiveKeys: Number(keyStats?.inactive ?? 0),
    pausedKeys: Number(keyStats?.paused ?? 0),
    bannedKeys: Number(keyStats?.banned ?? 0),
    totalUsers: Number(userStats?.total ?? 0),
  };
}

// ─── Login History ────────────────────────────────────────────────────────────

export async function addLoginHistory(data: {
  userId?: number;
  username: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(loginHistory).values({
    userId: data.userId,
    username: data.username,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: data.success ? 1 : 0,
  });
}

export async function getLoginHistory(limit = 100): Promise<LoginHistory[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loginHistory).orderBy(desc(loginHistory.createdAt)).limit(limit);
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function addAuditLog(data: {
  userId?: number;
  username?: string;
  action: string;
  details?: string;
  ipAddress?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(data);
}

export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ─── iOS Sessions ─────────────────────────────────────────────────────────────

export async function createIosSession(data: {
  keyId: number;
  keyValue: string;
  deviceId: string;
  sessionToken: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(iosSessions).values({ ...data, lastChecked: new Date() });
}

export async function getIosSessionByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(iosSessions).where(eq(iosSessions.sessionToken, token)).limit(1);
  return result[0];
}

export async function updateIosSessionLastChecked(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(iosSessions).set({ lastChecked: new Date() }).where(eq(iosSessions.sessionToken, token));
}

// ─── Legacy users (OAuth compatibility) ──────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  await db.insert(users).values({ ...user, lastSignedIn: new Date() }).onDuplicateKeyUpdate({
    set: { name: user.name, email: user.email, lastSignedIn: new Date() },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
