import test from "node:test";
import assert from "node:assert/strict";

process.env.TOKEN_QR_SECRET = "test-token-qr-secret-that-is-at-least-32-characters";

const { createTokenQrData, verifyTokenQrData } = await import("../src/utils/tokenQr.js");

const token = {
  _id: "507f1f77bcf86cd799439011",
  arrivalDeadline: new Date(Date.now() + 60_000),
};

test("verifies a valid QR payload", () => {
  const qrCodeData = createTokenQrData(token);
  assert.deepEqual(verifyTokenQrData(qrCodeData), {
    v: 1,
    tokenId: token._id,
    exp: Math.floor(token.arrivalDeadline.getTime() / 1000),
  });
});

test("rejects tampered, malformed, and unsupported QR payloads", () => {
  const qrCodeData = createTokenQrData(token);
  const [version, payload, signature] = qrCodeData.split(".");
  const tamperedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  assert.equal(verifyTokenQrData(`${version}.${payload}.${tamperedSignature}`), null);
  assert.equal(verifyTokenQrData("not-a-qr-payload"), null);

  const unsupported = Buffer.from(
    JSON.stringify({ v: 2, tokenId: token._id, exp: Math.floor(Date.now() / 1000) + 60 })
  ).toString("base64url");
  assert.equal(verifyTokenQrData(`v1.${unsupported}.${signature}`), null);
  assert.equal(verifyTokenQrData(`v1.${payload}.${signature.slice(0, -1)}`), null);
});

test("rejects expired QR payloads", () => {
  const qrCodeData = createTokenQrData({
    ...token,
    arrivalDeadline: new Date(Date.now() - 60_000),
  });
  assert.equal(verifyTokenQrData(qrCodeData), null);
});
