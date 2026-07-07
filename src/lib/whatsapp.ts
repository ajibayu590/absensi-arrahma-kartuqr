import axios from "axios";
import prisma from "./prisma";

/**
 * Mengirim pesan WhatsApp secara langsung via Fonnte Gateway
 */
export async function kirimWaLangsung(
  telepon: string,
  pesan: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await prisma.pengaturan.findMany({
      where: {
        kunci: {
          in: ["wa_gateway_token", "wa_gateway_url"]
        }
      }
    });
    const tokenSetting = settings.find(s => s.kunci === "wa_gateway_token");
    const urlSetting = settings.find(s => s.kunci === "wa_gateway_url");

    const token = tokenSetting?.nilai || process.env.FONNTE_TOKEN;
    const baseUrl = urlSetting?.nilai || process.env.WA_GATEWAY_URL || "https://api.fonnte.com";

    if (!token || token === "fonnte_token_placeholder" || token === "") {
      return { success: false, error: "Token WhatsApp Gateway belum dikonfigurasi di Pengaturan." };
    }

    // Jika menggunakan Open WA / wa-automate self-hosted API
    if (!baseUrl.includes("fonnte.com")) {
      const formattedTo = telepon.includes("@") ? telepon : `${telepon}@c.us`;
      const cleanUrl = baseUrl.replace(/\/$/, "");
      
      // Deteksi apakah ini NestJS OpenWA dengan mengecek /api/sessions
      let isOpenWaNest = false;
      let sessionId = "";
      
      try {
        const sessionRes = await axios.get(`${cleanUrl}/api/sessions`, {
          headers: {
            "X-API-Key": token,
            Authorization: `Bearer ${token}`
          },
          timeout: 3000
        });
        if (sessionRes.data && Array.isArray(sessionRes.data)) {
          isOpenWaNest = true;
          // Temukan sesi pertama yang ready/active, atau default ke yang pertama
          const activeSession = sessionRes.data.find((s: any) => s.status === "ready") || sessionRes.data[0];
          if (activeSession) {
            sessionId = activeSession.id || activeSession.name;
          }
        }
      } catch (e) {
        // Jika error, berarti bukan NestJS OpenWA atau server offline
      }

      if (isOpenWaNest && sessionId) {
        // Gunakan API NestJS OpenWA
        const response = await axios.post(
          `${cleanUrl}/api/sessions/${sessionId}/messages/send-text`,
          {
            chatId: formattedTo,
            text: pesan
          },
          {
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": token,
              Authorization: `Bearer ${token}`
            },
            timeout: 10000 // Jeda batas waktu 10 detik
          }
        );
        if (response.status === 200 || response.status === 201) {
          return { success: true };
        } else {
          return { success: false, error: `Error dari OpenWA NestJS (Status: ${response.status})` };
        }
      } else {
        // Fallback ke Open WA CLI lama
        const response = await axios.post(
          `${cleanUrl}/sendMessage`,
          {
            to: formattedTo,
            message: pesan,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
            },
            timeout: 10000 // Jeda batas waktu 10 detik
          }
        );

        if (response.status === 200 || response.status === 201) {
          return { success: true };
        } else {
          return { success: false, error: `Error dari Open WA (Status: ${response.status})` };
        }
      }
    } else {
      // Menggunakan Fonnte API Gateway
      const response = await axios.post(
        "https://api.fonnte.com/send",
        {
          target: telepon,
          message: pesan,
        },
        {
          headers: {
            Authorization: token,
          },
          timeout: 10000 // Jeda batas waktu 10 detik
        }
      );

      // Fonnte mengembalikan status: true jika sukses diproses
      if (response.data.status === true) {
        return { success: true };
      } else {
        return { success: false, error: response.data.reason || "Pesan ditolak oleh Fonnte." };
      }
    }
  } catch (error: any) {
    console.error("WhatsApp API Gateway Error:", error);
    return {
      success: false,
      error: error.response?.data?.reason || error.message || "Gagal menghubungkan ke gateway WhatsApp.",
    };
  }
}

/**
 * Menjalankan antrean pengiriman WhatsApp dengan jeda delay acak di background (non-blocking)
 */
export async function kirimWaDenganAntrean(idLog: number) {
  // Eksekusi secara asinkron di background menggunakan IIFE
  (async () => {
    try {
      const delaySettings = await prisma.pengaturan.findMany({
        where: {
          kunci: {
            in: ["wa_delay_min", "wa_delay_max"]
          }
        }
      });
      const delayMinSetting = delaySettings.find(s => s.kunci === "wa_delay_min");
      const delayMaxSetting = delaySettings.find(s => s.kunci === "wa_delay_max");

      const min = parseInt(delayMinSetting?.nilai || "2", 10);
      const max = parseInt(delayMaxSetting?.nilai || "5", 10);

      // Hitung jeda delay acak dalam detik
      const jedaDetik = Math.floor(Math.random() * (max - min + 1)) + min;
      
      // Tunggu sesuai jeda acak
      await new Promise((resolve) => setTimeout(resolve, jedaDetik * 1000));

      const log = await prisma.logWa.findUnique({
        where: { id: idLog }
      });

      if (!log) return;

      const hasil = await kirimWaLangsung(log.telepon, log.pesan);

      if (hasil.success) {
        await prisma.logWa.update({
          where: { id: idLog },
          data: {
            status: "TERKIRIM",
            sentAt: new Date()
          }
        });
      } else {
        await prisma.logWa.update({
          where: { id: idLog },
          data: {
            status: "GAGAL",
            error: hasil.error
          }
        });
      }
    } catch (err: any) {
      console.error(`Gagal mengirim log WA antrean (ID: ${idLog}):`, err);
      try {
        await prisma.logWa.update({
          where: { id: idLog },
          data: {
            status: "GAGAL",
            error: err.message || "Kesalahan internal antrean background."
          }
        });
      } catch (dbErr) {
        console.error("Gagal mengupdate status error log WA di database:", dbErr);
      }
    }
  })();
}
