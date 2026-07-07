import { NextResponse } from "next/server";
import { getSseClients } from "@/lib/sse";

export async function GET(req: Request) {
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
