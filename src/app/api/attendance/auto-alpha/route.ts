import { NextRequest, NextResponse } from "next/server";
import { runAutoAlpha } from "@/lib/auto-alpha";
import { getUserFromRequest } from "@/lib/auth-helper";

const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const schedulerSecret = req.headers.get("x-scheduler-secret");
    const isSchedulerCall = schedulerSecret && SCHEDULER_SECRET && schedulerSecret === SCHEDULER_SECRET;

    let force = false;

    // Cek jika pengguna meminta force-run
    try {
      const body = await req.json();
      if (body && body.force === true) {
        // Force-run membutuhkan otorisasi ADMIN
        const payload = getUserFromRequest(req);
        if (!payload || payload.peran !== "ADMIN") {
          return NextResponse.json(
            { error: "Akses ditolak. Force-run auto-alpha hanya diizinkan untuk Admin." },
            { status: 403 }
          );
        }
        force = true;
      }
    } catch (e) {
      // Body kosong atau format tidak valid, lanjutkan dengan force = false
    }

    // Jika bukan dari scheduler dan bukan force-run admin, tolak akses
    if (!isSchedulerCall && !force) {
      return NextResponse.json(
        { error: "Akses ditolak. Endpoint ini hanya bisa dipanggil oleh scheduler internal atau admin." },
        { status: 403 }
      );
    }

    const result = await runAutoAlpha(force);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Kesalahan API auto-alpha:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
