import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import {
  getAppUserByUsername,
  getAppUserById,
  getAllAppUsers,
  createAppUser,
  updateAppUser,
  updateAppUserLastSignedIn,
  createLicenseKey,
  getLicenseKeyByValue,
  getLicenseKeyById,
  getAllLicenseKeys,
  getLicenseKeysByUser,
  updateLicenseKey,
  activateLicenseKey,
  addDaysToKey,
  getDashboardStats,
  addLoginHistory,
  getLoginHistory,
  addAuditLog,
  getAuditLogs,
  createIosSession,
  getIosSessionByToken,
  updateIosSessionLastChecked,
} from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "authzyon_salt_2024").digest("hex");
}

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const length = 10 + Math.floor(Math.random() * 5); // 10-14
  let key = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    key += chars[bytes[i] % 26];
  }
  return key;
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// Admin middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if ((ctx.user as any).appRole !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao administrador" });
  }
  return next({ ctx });
});

// ─── Seed admin user on first run ─────────────────────────────────────────────

async function ensureAdminExists() {
  try {
    const existing = await getAppUserByUsername("RUAN");
    if (!existing) {
      await createAppUser({
        username: "RUAN",
        passwordHash: hashPassword("RUAN123"),
        role: "admin",
        keyLimit: 999999,
        keysGenerated: 0,
        isBanned: 0,
      });
      console.log("[AuthZyon] Admin user RUAN created");
    }
  } catch (e) {
    console.warn("[AuthZyon] Could not seed admin:", e);
  }
}

ensureAdminExists();

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  // ─── Auth (OAuth compatibility) ────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("authzyon_session", { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Custom Auth ───────────────────────────────────────────────────────────
  customAuth: router({
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const ip = getClientIp(ctx.req);
        const ua = ctx.req.headers["user-agent"] || "";

        const user = await getAppUserByUsername(input.username);

        if (!user || user.passwordHash !== hashPassword(input.password)) {
          await addLoginHistory({ username: input.username, ipAddress: ip, userAgent: ua, success: false });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos" });
        }

        if (user.isBanned) {
          await addLoginHistory({ userId: user.id, username: user.username, ipAddress: ip, userAgent: ua, success: false });
          throw new TRPCError({ code: "FORBIDDEN", message: "Conta banida" });
        }

        await updateAppUserLastSignedIn(user.id);
        await addLoginHistory({ userId: user.id, username: user.username, ipAddress: ip, userAgent: ua, success: true });

        const token = generateSessionToken();
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie("authzyon_session", JSON.stringify({ userId: user.id, token, role: user.role }), {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            avatarUrl: user.avatarUrl,
            keyLimit: user.keyLimit,
            keysGenerated: user.keysGenerated,
          },
        };
      }),

    me: publicProcedure.query(async ({ ctx }) => {
      const sessionCookie = ctx.req.cookies?.authzyon_session;
      if (!sessionCookie) return null;
      try {
        const session = JSON.parse(sessionCookie);
        const user = await getAppUserById(session.userId);
        if (!user || user.isBanned) return null;
        return {
          id: user.id,
          username: user.username,
          role: user.role,
          avatarUrl: user.avatarUrl,
          keyLimit: user.keyLimit,
          keysGenerated: user.keysGenerated,
        };
      } catch {
        return null;
      }
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("authzyon_session", { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
  }),

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: router({
    stats: publicProcedure.query(async ({ ctx }) => {
      const session = getAppSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      return getDashboardStats();
    }),
  }),

  // ─── License Keys ──────────────────────────────────────────────────────────
  keys: router({
    generate: publicProcedure
      .input(z.object({ quantity: z.number().min(1).max(100), durationDays: z.union([z.literal(1), z.literal(7), z.literal(30)]) }))
      .mutation(async ({ input, ctx }) => {
        const session = getAppSession(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });

        const user = await getAppUserById(session.userId);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
        if (user.isBanned) throw new TRPCError({ code: "FORBIDDEN", message: "Conta banida" });

        const remaining = user.keyLimit - user.keysGenerated;
        if (remaining < input.quantity) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Limite de keys atingido. Você pode gerar mais ${remaining} key(s).` });
        }

        const generatedKeys: string[] = [];
        for (let i = 0; i < input.quantity; i++) {
          let keyValue = generateKey();
          let attempts = 0;
          while (await getLicenseKeyByValue(keyValue) && attempts < 10) {
            keyValue = generateKey();
            attempts++;
          }
          await createLicenseKey({ keyValue, durationDays: input.durationDays, createdById: session.userId });
          generatedKeys.push(keyValue);
        }

        await updateAppUser(session.userId, { keysGenerated: user.keysGenerated + input.quantity });
        await addAuditLog({ userId: session.userId, username: user.username, action: "GENERATE_KEYS", details: `Gerou ${input.quantity} key(s) de ${input.durationDays} dia(s)` });

        // Notificar se atingiu limite
        if (user.keysGenerated + input.quantity >= user.keyLimit) {
          await notifyOwner({ title: "Limite de keys atingido", content: `Usuário ${user.username} atingiu o limite de geração de keys (${user.keyLimit})` });
        }

        return { keys: generatedKeys };
      }),

    list: publicProcedure.query(async ({ ctx }) => {
      const session = getAppSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });

      if (session.role === "admin") {
        return getAllLicenseKeys();
      }
      return getLicenseKeysByUser(session.userId);
    }),

    pause: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const session = getAppSession(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
        const key = await getLicenseKeyById(input.id);
        if (!key) throw new TRPCError({ code: "NOT_FOUND" });
        if (session.role !== "admin" && key.createdById !== session.userId) throw new TRPCError({ code: "FORBIDDEN" });

        const newStatus = key.status === "paused" ? "active" : "paused";
        await updateLicenseKey(input.id, { status: newStatus });
        await addAuditLog({ userId: session.userId, username: session.username, action: "KEY_STATUS_CHANGE", details: `Key ${key.keyValue} → ${newStatus}` });
        return { success: true, status: newStatus };
      }),

    ban: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const session = getAppSession(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
        const key = await getLicenseKeyById(input.id);
        if (!key) throw new TRPCError({ code: "NOT_FOUND" });
        if (session.role !== "admin" && key.createdById !== session.userId) throw new TRPCError({ code: "FORBIDDEN" });

        await updateLicenseKey(input.id, { status: "banned" });
        await addAuditLog({ userId: session.userId, username: session.username, action: "KEY_BAN", details: `Key ${key.keyValue} banida` });
        return { success: true };
      }),

    addDays: publicProcedure
      .input(z.object({ id: z.number(), days: z.number().min(1).max(365) }))
      .mutation(async ({ input, ctx }) => {
        const session = getAppSession(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
        if (session.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin pode adicionar dias" });

        await addDaysToKey(input.id, input.days);
        const key = await getLicenseKeyById(input.id);
        await addAuditLog({ userId: session.userId, username: session.username, action: "KEY_ADD_DAYS", details: `Adicionou ${input.days} dia(s) à key ${key?.keyValue}` });
        return { success: true };
      }),
  }),

  // ─── Users Management ──────────────────────────────────────────────────────
  users: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const session = getAppSession(ctx.req);
      if (!session || session.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllAppUsers();
    }),

    create: publicProcedure
      .input(z.object({ username: z.string().min(3).max(32), password: z.string().min(4), keyLimit: z.number().min(1).max(99999) }))
      .mutation(async ({ input, ctx }) => {
        const session = getAppSession(ctx.req);
        if (!session || session.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

        const existing = await getAppUserByUsername(input.username);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Usuário já existe" });

        await createAppUser({
          username: input.username,
          passwordHash: hashPassword(input.password),
          role: "user",
          keyLimit: input.keyLimit,
          keysGenerated: 0,
          isBanned: 0,
        });

        await addAuditLog({ userId: session.userId, username: session.username, action: "CREATE_USER", details: `Criou usuário ${input.username} com limite ${input.keyLimit}` });
        return { success: true };
      }),

    ban: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const session = getAppSession(ctx.req);
        if (!session || session.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const user = await getAppUserById(input.id);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });

        const newBanned = user.isBanned ? 0 : 1;
        await updateAppUser(input.id, { isBanned: newBanned });
        await addAuditLog({ userId: session.userId, username: session.username, action: "USER_BAN_TOGGLE", details: `Usuário ${user.username} → ${newBanned ? "banido" : "desbanido"}` });
        return { success: true, isBanned: newBanned };
      }),

    updateLimit: publicProcedure
      .input(z.object({ id: z.number(), keyLimit: z.number().min(1).max(99999) }))
      .mutation(async ({ input, ctx }) => {
        const session = getAppSession(ctx.req);
        if (!session || session.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const user = await getAppUserById(input.id);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });

        await updateAppUser(input.id, { keyLimit: input.keyLimit });
        await addAuditLog({ userId: session.userId, username: session.username, action: "UPDATE_KEY_LIMIT", details: `Limite de ${user.username} → ${input.keyLimit}` });
        return { success: true };
      }),

    resetPassword: publicProcedure
      .input(z.object({ id: z.number(), newPassword: z.string().min(4) }))
      .mutation(async ({ input, ctx }) => {
        const session = getAppSession(ctx.req);
        if (!session || session.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateAppUser(input.id, { passwordHash: hashPassword(input.newPassword) });
        return { success: true };
      }),
  }),

  // ─── Profile ───────────────────────────────────────────────────────────────
  profile: router({
    update: publicProcedure
      .input(z.object({ avatarBase64: z.string().optional(), newPassword: z.string().min(4).optional() }))
      .mutation(async ({ input, ctx }) => {
        const session = getAppSession(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });

        const updates: any = {};

        if (input.avatarBase64) {
          const buffer = Buffer.from(input.avatarBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
          const ext = input.avatarBase64.startsWith("data:image/png") ? "png" : "jpg";
          const key = `avatars/${session.userId}-${Date.now()}.${ext}`;
          const { url } = await storagePut(key, buffer, `image/${ext}`);
          updates.avatarUrl = url;
        }

        if (input.newPassword) {
          updates.passwordHash = hashPassword(input.newPassword);
        }

        if (Object.keys(updates).length > 0) {
          await updateAppUser(session.userId, updates);
        }

        const user = await getAppUserById(session.userId);
        return { success: true, avatarUrl: user?.avatarUrl };
      }),
  }),

  // ─── History & Logs ────────────────────────────────────────────────────────
  history: router({
    login: publicProcedure.query(async ({ ctx }) => {
      const session = getAppSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      return getLoginHistory(200);
    }),

    audit: publicProcedure.query(async ({ ctx }) => {
      const session = getAppSession(ctx.req);
      if (!session || session.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAuditLogs(200);
    }),
  }),
});

// ─── Helper: parse session cookie ────────────────────────────────────────────

function getAppSession(req: any): { userId: number; role: string; username: string } | null {
  const cookie = req.cookies?.authzyon_session;
  if (!cookie) return null;
  try {
    const data = JSON.parse(cookie);
    if (!data.userId || !data.role) return null;
    return { userId: data.userId, role: data.role, username: data.username || "" };
  } catch {
    return null;
  }
}

export type AppRouter = typeof appRouter;
