import { Router } from "express";
import { randomBytes } from "crypto";
import {
  getLicenseKeyByValue,
  updateLicenseKey,
  activateLicenseKey,
  createIosSession,
  getIosSessionByToken,
  updateIosSessionLastChecked,
  addAuditLog,
} from "./db";
import { notifyOwner } from "./_core/notification";

const iosRouter = Router();

function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// POST /api/ios/validate-key
// Valida e ativa uma key iOS
iosRouter.post("/validate-key", async (req, res) => {
  try {
    const { key, device_id, device_info } = req.body;

    if (!key || !device_id) {
      return res.status(400).json({ success: false, error: "key e device_id são obrigatórios" });
    }

    const licenseKey = await getLicenseKeyByValue(key.toUpperCase().trim());

    if (!licenseKey) {
      return res.status(404).json({ success: false, error: "Key inválida" });
    }

    if (licenseKey.status === "banned") {
      return res.status(403).json({ success: false, error: "Key banida" });
    }

    if (licenseKey.status === "paused") {
      return res.status(403).json({ success: false, error: "Key pausada" });
    }

    // Se já ativa, verificar expiração
    if (licenseKey.status === "active") {
      if (licenseKey.expiresAt && licenseKey.expiresAt < new Date()) {
        return res.status(403).json({
          success: false,
          error: "Key expirada",
          expired: true,
          expired_at: licenseKey.expiresAt,
        });
      }

      // Verificar se é o mesmo device
      if (licenseKey.deviceId && licenseKey.deviceId !== device_id) {
        return res.status(403).json({ success: false, error: "Key já ativada em outro dispositivo" });
      }

      // Gerar nova sessão
      const sessionToken = randomBytes(32).toString("hex");
      await createIosSession({ keyId: licenseKey.id, keyValue: licenseKey.keyValue, deviceId: device_id, sessionToken });

      return res.json({
        success: true,
        message: "Key Validada",
        key: licenseKey.keyValue,
        expires_at: licenseKey.expiresAt,
        session_token: sessionToken,
        days_remaining: licenseKey.expiresAt
          ? Math.ceil((licenseKey.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      });
    }

    // Ativar key (status inactive)
    const activated = await activateLicenseKey(key.toUpperCase().trim(), device_id, device_info || "");

    if (!activated) {
      return res.status(400).json({ success: false, error: "Não foi possível ativar a key" });
    }

    const sessionToken = randomBytes(32).toString("hex");
    await createIosSession({ keyId: activated.id, keyValue: activated.keyValue, deviceId: device_id, sessionToken });

    await addAuditLog({
      action: "KEY_ACTIVATED_IOS",
      details: `Key ${activated.keyValue} ativada pelo device ${device_id} (IP: ${getClientIp(req)})`,
    });

    // Notificar admin
    await notifyOwner({
      title: "🔑 Key Ativada",
      content: `Key ${activated.keyValue} foi ativada pela primeira vez.\nDevice: ${device_id}\nExpira em: ${activated.expiresAt?.toLocaleDateString("pt-BR")}`,
    });

    return res.json({
      success: true,
      message: "Key Validada",
      key: activated.keyValue,
      expires_at: activated.expiresAt,
      session_token: sessionToken,
      days_remaining: activated.expiresAt
        ? Math.ceil((activated.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    });
  } catch (err) {
    console.error("[iOS API] validate-key error:", err);
    return res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

// POST /api/ios/check-session
// Verifica se uma sessão ainda é válida (para auto-login)
iosRouter.post("/check-session", async (req, res) => {
  try {
    const { session_token, device_id } = req.body;

    if (!session_token || !device_id) {
      return res.status(400).json({ success: false, error: "session_token e device_id são obrigatórios" });
    }

    const session = await getIosSessionByToken(session_token);

    if (!session) {
      return res.status(404).json({ success: false, error: "Sessão não encontrada", needs_key: true });
    }

    if (session.deviceId !== device_id) {
      return res.status(403).json({ success: false, error: "Sessão inválida para este dispositivo", needs_key: true });
    }

    const licenseKey = await getLicenseKeyByValue(session.keyValue);

    if (!licenseKey) {
      return res.status(404).json({ success: false, error: "Key não encontrada", needs_key: true });
    }

    if (licenseKey.status === "banned" || licenseKey.status === "paused") {
      return res.status(403).json({ success: false, error: `Key ${licenseKey.status}`, needs_key: true });
    }

    if (licenseKey.expiresAt && licenseKey.expiresAt < new Date()) {
      return res.status(403).json({
        success: false,
        error: "Key expirada",
        expired: true,
        needs_key: true,
        expired_at: licenseKey.expiresAt,
      });
    }

    await updateIosSessionLastChecked(session_token);

    return res.json({
      success: true,
      key: licenseKey.keyValue,
      expires_at: licenseKey.expiresAt,
      days_remaining: licenseKey.expiresAt
        ? Math.ceil((licenseKey.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    });
  } catch (err) {
    console.error("[iOS API] check-session error:", err);
    return res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

// GET /api/ios/key-info/:key
// Informações públicas de uma key
iosRouter.get("/key-info/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const licenseKey = await getLicenseKeyByValue(key.toUpperCase().trim());

    if (!licenseKey) {
      return res.status(404).json({ success: false, error: "Key não encontrada" });
    }

    return res.json({
      success: true,
      key: licenseKey.keyValue,
      status: licenseKey.status,
      expires_at: licenseKey.expiresAt,
      activated_at: licenseKey.activatedAt,
      duration_days: licenseKey.durationDays,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Erro interno" });
  }
});

export { iosRouter };
