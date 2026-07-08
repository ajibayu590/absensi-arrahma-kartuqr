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
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    console.log('auth-helper: Token verification successful, payload:', payload); // Debugging
    return payload;
  } catch (error) {
    console.log('auth-helper: Token verification failed:', error.message); // Debugging
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
