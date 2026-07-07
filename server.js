const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// --- Auto-Alpha Scheduler Configuration ---
const AUTO_ALPHA_HOUR = parseInt(process.env.AUTO_ALPHA_HOUR || "7", 10);
const AUTO_ALPHA_MINUTE = parseInt(process.env.AUTO_ALPHA_MINUTE || "10", 10);
const AUTO_ALPHA_INTERVAL_MS = parseInt(process.env.AUTO_ALPHA_INTERVAL_MS || "30000", 10);

let autoAlphaTriggeredToday = null;

function triggerAutoAlpha() {
  fetch(`http://localhost:${port}/api/attendance/auto-alpha`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then((data) => console.log("[SCHEDULER] Auto-alpha result:", data))
    .catch((err) => console.error("[SCHEDULER] Auto-alpha error:", err));
}

function schedulerTick() {
  const now = new Date();
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const hour = wibTime.getUTCHours();
  const minute = wibTime.getUTCMinutes();
  const today = wibTime.toISOString().split("T")[0];

  // Trigger once per day within a 20-minute window
  if (
    hour === AUTO_ALPHA_HOUR &&
    minute >= AUTO_ALPHA_MINUTE &&
    minute < AUTO_ALPHA_MINUTE + 20 &&
    autoAlphaTriggeredToday !== today
  ) {
    console.log(`[SCHEDULER] Triggering auto-alpha at ${hour}:${minute} WIB`);
    triggerAutoAlpha();
    autoAlphaTriggeredToday = today;
  }

  // Reset flag at midnight WIB
  if (hour === 0 && minute === 0) {
    autoAlphaTriggeredToday = null;
  }
}

setInterval(schedulerTick, AUTO_ALPHA_INTERVAL_MS);
console.log(`[SCHEDULER] Auto-alpha scheduler started (target: ${AUTO_ALPHA_HOUR}:${String(AUTO_ALPHA_MINUTE).padStart(2, "0")} WIB, interval: ${AUTO_ALPHA_INTERVAL_MS}ms)`);

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  })
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
