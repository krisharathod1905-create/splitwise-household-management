
import crypto from "crypto";
import env from "#config/env.config.js";

const QR_SECRET = env.TOKEN_QR_SECRET;
const QR_TTL_SECONDS = 24 * 60 * 60;

function sign(payload) {
  return crypto
    .createHmac("sha256", QR_SECRET)
    .update(payload)
    .digest("base64url");
}

export function createTokenQrData(token) {
  const tokenId = String(token._id);

  // Prefer the persisted arrival deadline so expiry is stable across requests.
  const expiry = token.arrivalDeadline
    ? new Date(token.arrivalDeadline).getTime()
    : new Date(token.createdAt || token.issuedAt).getTime() + QR_TTL_SECONDS * 1000;
  if (!Number.isFinite(expiry)) {
    throw new Error("Cannot create QR data for a token without an expiry timestamp.");
  }
  const exp = Math.floor(expiry / 1000);

  const payload = Buffer.from(JSON.stringify({ v: 1, tokenId, exp })).toString("base64url");

  return `v1.${payload}.${sign(payload)}`;
}

export function verifyTokenQrData(qrCodeData) {
  if (typeof qrCodeData !== "string") return null;

  const parts = qrCodeData.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;

  const [, payload, signature] = parts;
  const expected = sign(payload);

  const actualBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    if (
      decoded.v !== 1 ||
      typeof decoded.tokenId !== "string" ||
      !/^[a-f\d]{24}$/i.test(decoded.tokenId) ||
      !Number.isInteger(decoded.exp) ||
      decoded.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
