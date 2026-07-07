// Global registry for active Server-Sent Events (SSE) connections to prevent hot-reload losses
if (!(global as any).sseClients) {
  (global as any).sseClients = new Set<ReadableStreamDefaultController>();
}

export function getSseClients(): Set<ReadableStreamDefaultController> {
  return (global as any).sseClients;
}

/**
 * Broadcasts successful student attendance logging to all active lobby display TVs in real-time
 */
export function broadcastAttendance(studentName: string, checkInTime: string) {
  const message = `data: ${JSON.stringify({
    type: "ATTENDANCE",
    name: studentName,
    time: checkInTime,
  })}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  const clients = getSseClients();

  if (clients) {
    clients.forEach((client) => {
      try {
        client.enqueue(encoded);
      } catch (error) {
        // Remove client connection from registry if connection drops/times out
        clients.delete(client);
      }
    });
  }
}
