import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

if (!process.env.JWT_SECRET) {
  throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!");
}
const JWT_SECRET = process.env.JWT_SECRET;

export interface TokenPayload {
  userId: number;
  email: string;
  peran: string;
  nama: string;
}

export function signToken(payload: TokenPayload): string {
  // Simpan token aktif selama 7 hari
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function verifyTokenEdge(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Convert secret to Uint8Array
    const encoder = new TextEncoder();
    const keyData = encoder.encode(JWT_SECRET);

    // Import key for HMAC
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Convert signature from base64url to Uint8Array
    let base64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const sigBinaryString = atob(base64);
    const sigBytes = new Uint8Array(sigBinaryString.length);
    for (let i = 0; i < sigBinaryString.length; i++) {
      sigBytes[i] = sigBinaryString.charCodeAt(i);
    }

    // Verify signature
    const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      dataToVerify
    );

    if (!isValid) return null;

    // Decode and parse payload
    let payloadBase64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    while (payloadBase64.length % 4) {
      payloadBase64 += '=';
    }
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

    // Check expiration (exp)
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload as TokenPayload;
  } catch (error) {
    console.error("verifyTokenEdge error:", error);
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
