import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
if (!process.env.JWT_SECRET) {
  throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!");
}
// Derive a 32-byte key from our JWT_SECRET
const SECRET_KEY = crypto
  .createHash("sha256")
  .update(process.env.JWT_SECRET)
  .digest();

const IV_LENGTH = 16;

export function encryptToken(data: any): string {
  let plainText = "";
  if (typeof data === "object" && data !== null && data.target === "absensi_smk_ar_rahma") {
    // Compress plain text format to minimize encrypted QR token length
    plainText = `SMK:${data.timestamp}:${data.rand || ""}`;
  } else {
    plainText = JSON.stringify(data);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
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
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
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

    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error("Gagal melakukan dekripsi token QR:", error);
    return null;
  }
}
