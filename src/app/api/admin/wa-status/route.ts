import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import { kirimWaLangsung } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang dapat memantau status WhatsApp Gateway." },
        { status: 403 }
      );
    }

    const tokenSetting = await prisma.pengaturan.findUnique({
      where: { kunci: "wa_gateway_token" }
    });
    const urlSetting = await prisma.pengaturan.findUnique({
      where: { kunci: "wa_gateway_url" }
    });

    const token = tokenSetting?.nilai || process.env.FONNTE_TOKEN;
    const baseUrl = urlSetting?.nilai || process.env.WA_GATEWAY_URL || "https://api.fonnte.com";

    if (!token || token === "fonnte_token_placeholder" || token === "") {
      return NextResponse.json({
        success: false,
        status: "DISCONNECTED",
        quota: 0,
        error: "Token WhatsApp Gateway belum dikonfigurasi."
      });
    }

    // Jika menggunakan Open WA (wa-automate self-hosted API)
    if (!baseUrl.includes("fonnte.com")) {
      try {
        const cleanUrl = baseUrl.replace(/\/$/, "");
        
        // Deteksi apakah ini NestJS OpenWA
        let isOpenWaNest = false;
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
            const sessions = sessionRes.data;
            if (sessions.length > 0) {
              const activeSession = sessions.find((s: any) => s.status === "ready") || sessions[0];
              const isConnected = activeSession.status === "ready";
              return NextResponse.json({
                success: true,
                status: isConnected ? "CONNECTED" : "DISCONNECTED",
                deviceName: `OpenWA NestJS - ${activeSession.name}`,
                deviceNumber: activeSession.phone || "Self-Hosted",
                quota: 999999,
                expired: "Permanen"
              });
            } else {
              return NextResponse.json({
                success: true,
                status: "DISCONNECTED",
                deviceName: "OpenWA NestJS",
                deviceNumber: "No Active Sessions",
                quota: 0,
                error: "Belum ada sesi WhatsApp yang aktif di OpenWA dashboard."
              });
            }
          }
        } catch (e) {
          // Bukan NestJS OpenWA, skip ke fallback CLI
        }

        const response = await axios.get(
          `${cleanUrl}/getConnectionState`,
          {
            headers: {
              Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
            },
          }
        );

        const connectionState = response.data.response || response.data || "CONNECTED";
        const isConnected = connectionState === "CONNECTED" || connectionState.toString().toUpperCase() === "CONNECTED";

        return NextResponse.json({
          success: true,
          status: isConnected ? "CONNECTED" : "DISCONNECTED",
          deviceName: "Open WA Client",
          deviceNumber: "Self-Hosted",
          quota: 999999, // Kuota tak terbatas untuk self-hosted
          expired: "Permanen"
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          status: "DISCONNECTED",
          quota: 0,
          error: err.message || "Gagal menghubungi server Open WA."
        });
      }
    }

    // Panggil API Fonnte get-devices
    try {
      const response = await axios.post(
        "https://api.fonnte.com/get-devices",
        {},
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (response.data && response.data.status === true && response.data.data) {
        const devices = response.data.data;
        if (devices.length > 0) {
          // Ambil device pertama yang terdaftar
          const device = devices[0];
          return NextResponse.json({
            success: true,
            status: device.status === "connect" ? "CONNECTED" : "DISCONNECTED",
            deviceName: device.name || "Default Device",
            deviceNumber: device.device || "-",
            quota: parseInt(device.quota || "0", 10),
            expired: device.expired || "-"
          });
        }
      }

      return NextResponse.json({
        success: false,
        status: "DISCONNECTED",
        quota: 0,
        error: response.data.reason || "Respons Fonnte tidak valid atau kosong."
      });
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        status: "DISCONNECTED",
        quota: 0,
        error: err.response?.data?.reason || err.message || "Gagal menghubungkan ke server Fonnte."
      });
    }
  } catch (error: any) {
    console.error("Kesalahan API wa-status GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang dapat mengirim pesan diagnostik." },
        { status: 403 }
      );
    }

    const { telepon } = await req.json();

    if (!telepon || !telepon.trim()) {
      return NextResponse.json({ error: "Nomor telepon tujuan uji coba wajib diisi." }, { status: 400 });
    }

    // Format nomor telepon ke format internasional (E.164)
    let phoneClean = telepon.replace(/\D/g, "");
    if (phoneClean.startsWith("0")) {
      phoneClean = "62" + phoneClean.slice(1);
    }

    const testMessage = `🧪 *DIAGNOSTIK WA GATEWAY - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKonektor pengiriman pesan absensi berjalan sukses pada pukul *${new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })} WIB*.\n\n---\nSistem Absensi SMK AR-RAHMA MANDIRI INDONESIA`;

    const result = await kirimWaLangsung(phoneClean, testMessage);

    if (result.success) {
      // Catat log audit admin
      await prisma.logAuditAdmin.create({
        data: {
          idPengguna: payload.userId,
          tindakan: "TEST_WA_CONNECTOR",
          target: phoneClean,
          detail: JSON.stringify({ status: "SUCCESS", timestamp: new Date().toISOString() })
        }
      });

      return NextResponse.json({
        success: true,
        message: `Pesan diagnostik sukses dikirimkan ke nomor ${phoneClean}.`
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || "Gagal mengirimkan pesan diagnostik."
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Kesalahan API wa-status POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
