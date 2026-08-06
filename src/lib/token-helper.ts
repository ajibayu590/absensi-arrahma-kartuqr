import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getSecretKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!");
    }
    return crypto.createHash("sha256").update("dev-fallback-secret-do-not-use-in-production").digest();
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptToken(data: any): string {
  let plainText = "";
  if (typeof data === "object" && data !== null && data.target === "absensi_smk_ar_rahma") {
    // Compress plain text format to minimize encrypted QR token length
    plainText = `SMK:${data.timestamp}:${data.rand || ""}`;
  } else if (typeof data === "object" && data !== null && data.type === "siswa_statis") {
    plainText = `SISWASTATIS:${data.nisn}`;
  } else {
    plainText = JSON.stringify(data);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  // Gabungkan IV dan data terenkripsi dipisahkan titik dua
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decryptToken(token: string): any {
  try {
    const parts = token.split(":");
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = Buffer.from(parts[1], "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const decryptedStr = decrypted.toString("utf8");

    // Check for compressed QR token format
    if (decryptedStr.startsWith("SMK:")) {
      const tokens = decryptedStr.split(":");
      return {
        target: "absensi_smk_ar_rahma",
        timestamp: parseInt(tokens[1], 10),
        rand: tokens[2] || "",
      };
    }

    if (decryptedStr.startsWith("SISWASTATIS:")) {
      const tokens = decryptedStr.split(":");
      return {
        type: "siswa_statis",
        nisn: tokens[1],
      };
    }

    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error("Gagal melakukan dekripsi token QR:", error);
    return null;
  }
}
