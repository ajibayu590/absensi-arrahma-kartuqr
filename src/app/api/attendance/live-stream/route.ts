import { NextRequest, NextResponse } from "next/server";
import { getSseClients } from "@/lib/sse";
import { TokenPayload } from "@/lib/auth-helper"; // Import TokenPayload
import prisma from "@/lib/prisma"; // Import prisma

export async function GET(req: NextRequest) {
  const userPayloadHeader = req.headers.get('x-user-payload');
  if (!userPayloadHeader) {
    return NextResponse.json({ error: "Sesi tidak valid atau tidak ada payload pengguna." }, { status: 401 });
  }
  const payload: TokenPayload = JSON.parse(userPayloadHeader);

  if (!payload) {
    return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  // Hanya izinkan ADMIN, KEPALA_SEKOLAH, atau GURU untuk mengakses live stream ini
  if (!["ADMIN", "KEPALA_SEKOLAH", "GURU"].includes(payload.peran)) {
    return NextResponse.json(
      { error: "Akses ditolak. Peran Anda tidak diizinkan mengakses live stream." },
      { status: 403 }
    );
  }

  // Jika peran adalah GURU, pastikan dia adalah Guru Piket atau Wali Kelas
  if (payload.peran === "GURU") {
    const guru = await prisma.guru.findUnique({
      where: { idPengguna: payload.userId },
      select: { isBk: true, kelasWali: { select: { id: true } } }
    });
    if (!guru || (!guru.isBk && !guru.kelasWali)) {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Guru BK atau Wali Kelas yang dapat mengakses live stream." },
        { status: 403 }
      );
    }
  }

  let controllerRef: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      getSseClients().add(controller);

      // Send connection active status verification packet
      const connectMessage = `data: ${JSON.stringify({
        type: "CONNECTED",
        message: "Koneksi Live Aktif",
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectMessage));
    },
    cancel() {
      if (controllerRef) {
        getSseClients().delete(controllerRef);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
