import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!");
    }
    return "dev-fallback-secret-do-not-use-in-production";
  }
  return secret;
}

export interface TokenPayload {
  userId: number;
  email: string;
  peran: string;
  nama: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function verifyTokenEdge(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(getJwtSecret());

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    let base64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const sigBinaryString = atob(base64);
    const sigBytes = new Uint8Array(sigBinaryString.length);
    for (let i = 0; i < sigBinaryString.length; i++) {
      sigBytes[i] = sigBinaryString.charCodeAt(i);
    }

    const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      dataToVerify
    );

    if (!isValid) return null;

    let payloadBase64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    while (payloadBase64.length % 4) {
      payloadBase64 += '=';
    }
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

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
