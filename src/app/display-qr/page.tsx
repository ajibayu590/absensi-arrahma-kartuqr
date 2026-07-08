"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { 
  Tv, 
  Users, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  Calendar, 
  Sparkles, 
  Wifi, 
  WifiOff 
} from "lucide-react";

interface AttendanceLog {
  name: string;
  time: string;
}

export default function DisplayQrPage() {
  const [token, setToken] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(10);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);
  const [successLogs, setSuccessLogs] = useState<AttendanceLog[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [piketTeachers, setPiketTeachers] = useState<{ id: number; nama: string; nip: string | null }[]>([]);
  
  // Real-time Clock States
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  const jamToleransiRef = useRef("07:15");
  const lastTriggeredDateRef = useRef("");
  const isTriggeringRef = useRef(false);

  // Update Clock & Check Auto-Alpha Trigger
  useEffect(() => {
    const triggerAutoAlpha = async (todayStr: string) => {
      if (isTriggeringRef.current) return;
      isTriggeringRef.current = true;
      try {
        console.log("Memicu auto-alpha otomatis pada jam toleransi...");
        const res = await fetch("/api/attendance/auto-alpha", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        if (res.ok) {
          lastTriggeredDateRef.current = todayStr;
        }
      } catch (err) {
        console.error("Gagal memicu auto-alpha dari TV Lobi:", err);
      } finally {
        isTriggeringRef.current = false;
      }
    };

    const updateTime = () => {
      const wibOffset = 7 * 60 * 60 * 1000;
      const wibDate = new Date(Date.now() + wibOffset);
      const hh = wibDate.getUTCHours().toString().padStart(2, "0");
      const mm = wibDate.getUTCMinutes().toString().padStart(2, "0");
      const ss = wibDate.getUTCSeconds().toString().padStart(2, "0");
      
      setCurrentTime(`${hh}:${mm}:${ss}`);
      
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      const day = dayNames[wibDate.getUTCDay()];
      const dateNum = wibDate.getUTCDate();
      const month = monthNames[wibDate.getUTCMonth()];
      const year = wibDate.getUTCFullYear();
      
      setCurrentDate(`${day}, ${dateNum} ${month} ${year}`);

      // Auto-Alpha Trigger Logic (WIB-based)
      const todayStr = wibDate.toISOString().split("T")[0];
      const currentTimeHourMin = `${hh}:${mm}`;
      const limitTime = jamToleransiRef.current;

      if (currentTimeHourMin >= limitTime && lastTriggeredDateRef.current !== todayStr && !isTriggeringRef.current) {
        triggerAutoAlpha(todayStr);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Piket Teachers
  useEffect(() => {
    async function fetchPiket() {
      try {
        const res = await fetch("/api/picket-schedules/today");
        const data = await res.json();
        if (data.piket) {
          setPiketTeachers(data.piket);
        }
      } catch (err) {
        console.error("Gagal mengambil data guru piket:", err);
      }
    }
    fetchPiket();
  }, []);

  // Fetch token baru dari API dan ubah menjadi QR Code Data URL
  async function fetchNewToken() {
    setLoadingQr(true); // Mulai loading
    try {
      const res = await fetch("/api/token-qr");
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        
        if (data.jamToleransi) {
          jamToleransiRef.current = data.jamToleransi;
        }
        
        // Ubah token menjadi QR Code base64 image source secara asynchronous
        // Membungkusnya dalam Promise dan setTimeout untuk memastikan tidak memblokir UI
        await new Promise<void>((resolve) => {
          setTimeout(async () => {
            const url = await QRCode.toDataURL(data.token, {
              width: 800,
              margin: 0, // Set margin 0 untuk memaksimalkan ukuran QR Code ke tepi wadah
              errorCorrectionLevel: "L",
              color: {
                dark: "#000000",
                light: "#ffffff",
              },
            });
            setQrDataUrl(url);
            setCountdown(10);
            resolve();
          }, 0); // Defer to allow UI to update
        });
      }
    } catch (error) {
      console.error("Gagal mengambil token QR:", error);
    } finally {
      setLoadingQr(false); // Selesai loading
    }
  }

  // 1. Logika Hitung Mundur Token QR (10 Detik)
  useEffect(() => {
    fetchNewToken();
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchNewToken();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 2. Hubungkan ke Server-Sent Events (SSE) Live Stream
  useEffect(() => {
    let eventSource: EventSource;

    const connectSSE = () => {
      setConnectionStatus("connecting");
      eventSource = new EventSource("/api/attendance/live-stream");

      eventSource.onopen = () => {
        setConnectionStatus("connected");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "ATTENDANCE") {
            // Masukkan data siswa baru yang sukses scan ke list atas
            setSuccessLogs((prev) => [
              { name: data.name, time: data.time },
              ...prev.slice(0, 4) // Batasi maksimal 5 baris log agar muat tanpa memicu scroll halaman
            ]);
          }
        } catch (err) {
          console.error("Gagal membaca pesan live stream:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("Koneksi live stream terputus. Mencoba reconnect...", err);
        setConnectionStatus("disconnected");
        eventSource.close();
        
        // Coba hubungkan kembali setelah 3 detik
        setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);



  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col font-sans p-6 md:p-8 overflow-hidden select-none">
      
      {/* BACKGROUND DECORATIONS (GLOWING ORBS) */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[30rem] h-[30rem] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* STYLE TAG FOR CUSTOM FUTURISTIC ANIMATIONS */}
      <style>{`
        .custom-glow-border {
          box-shadow: 0 0 25px -5px rgba(16, 185, 129, 0.15);
        }
        .custom-glow-border:hover {
          box-shadow: 0 0 35px -5px rgba(16, 185, 129, 0.3);
        }
        @keyframes itemSlide {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-item-in {
          animation: itemSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* HEADER SECTION (Slimmer) */}
      <header className="relative z-10 flex flex-col sm:flex-row justify-between items-center border-b border-zinc-800/60 pb-4 shrink-0 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-600/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-md flex items-center justify-center">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[8px] rounded uppercase tracking-wider">Lobby TV</span>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-zinc-100 to-emerald-400 bg-clip-text text-transparent">
                SMK AR-RAHMA MANDIRI INDONESIA
              </h1>
            </div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
              SISTEM PRESENSI QR CODE MANDIRI
            </p>
          </div>
        </div>

        {/* STATUS KONEKSI */}
        <div className="flex items-center gap-2">
          {connectionStatus === "connected" && (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black bg-emerald-950/40 text-emerald-400 border border-emerald-500/25">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3" />
                SISTEM AKTIF
              </span>
            </span>
          )}
          {connectionStatus === "connecting" && (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black bg-amber-950/40 text-amber-400 border border-amber-500/25 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              MENGHUBUNGKAN...
            </span>
          )}
          {connectionStatus === "disconnected" && (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black bg-red-950/40 text-red-400 border border-red-500/25">
              <WifiOff className="w-3 h-3" />
              SALURAN OFFLINE
            </span>
          )}
        </div>
      </header>

      {/* MAIN LAYOUT BODY (Flex-1 & min-h-0 to avoid overflow scrollbars) */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 my-6 items-stretch">
        
        {/* LEFT PANEL: QR SCAN HUB (8 Columns agar QR lebih besar) */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-zinc-900/30 border border-zinc-800/80 rounded-[2rem] p-6 md:p-8 shadow-2xl backdrop-blur-md custom-glow-border transition-all duration-300 min-h-0">
          
          <div className="border-b border-zinc-800/40 pb-3 shrink-0">
            <h2 className="text-base font-black text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Absensi QR Mandiri
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Buka portal siswa di HP, pastikan lokasi GPS aktif, lalu scan.
            </p>
          </div>

          {/* QR Code Container (Fills the available space, max-h-[60vh] untuk memaksimalkan ukuran scan jarak jauh) */}
          <div className="flex-1 min-h-0 flex items-center justify-center py-4">
            <div className="p-5 bg-white rounded-3xl shadow-2xl border-4 border-emerald-500/25 flex items-center justify-center transition-all duration-300 transform hover:scale-[1.01] h-full max-h-[60vh] aspect-square">
              {loadingQr ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 font-semibold gap-3 aspect-square">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                  <span className="text-[10px] tracking-wider">MEMBUAT TOKEN QR...</span>
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Dynamic QR Code Token"
                  className="w-full h-full select-none rounded-lg"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 font-semibold gap-3 aspect-square">
                  <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
                  <span className="text-[10px] tracking-wider">TOKEN QR TIDAK TERSEDIA</span>
                </div>
              )}
            </div>
          </div>

          {/* Single Countdown Progress Bar / Timer */}
          <div className="flex justify-center shrink-0">
            <div className="flex items-center gap-3.5 bg-zinc-950/40 border border-zinc-800/60 rounded-xl px-5 py-3 shadow-inner w-full max-w-sm justify-center">
              <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-800"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500 transition-all duration-1000 ease-linear"
                    strokeWidth="3"
                    strokeDasharray={`${(countdown / 10) * 100}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[10px] font-black font-mono text-emerald-400">
                  {countdown}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-zinc-200 block">Refresh Token Otomatis</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5 uppercase tracking-wide">
                  Diperbarui tiap 10 Detik
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: CLOCK & ATTENDANCE FEED (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6 items-stretch min-h-0">
          
          {/* DIGITAL CLOCK & DATE WIDGET */}
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-[1.75rem] p-5 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden custom-glow-border transition-all duration-300 shrink-0">
            <div className="absolute inset-0 bg-emerald-600/[0.02] pointer-events-none"></div>

            <div className="relative z-10 text-center">
              <div className="text-4xl font-black font-mono text-white tracking-widest bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-transparent flex items-center justify-center gap-2">
                <Clock className="w-7 h-7 text-emerald-400 shrink-0" />
                <span>{currentTime || "--:--:--"}</span>
              </div>
              <div className="mt-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>{currentDate || "Memuat Hari..."}</span>
              </div>
            </div>
          </div>

          {/* REAL-TIME FEED BOARD (min-h-0 & flex-grow to fit perfectly) */}
          <div className="flex-1 bg-zinc-900/30 border border-zinc-800/80 rounded-[2rem] p-5 md:p-6 shadow-2xl backdrop-blur-md flex flex-col custom-glow-border transition-all duration-300 min-h-0">
            <h3 className="text-emerald-400 font-black text-[11px] tracking-wider uppercase flex items-center gap-2 mb-4 shrink-0 border-b border-zinc-800/30 pb-2">
              <Users className="w-4.5 h-4.5" />
              Kehadiran Terbaru (Real-Time)
            </h3>

            {/* List Feed Container (Internal scroll-only, no main page scroll) */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-2.5 flex flex-col justify-start min-h-0">
              {successLogs.length > 0 ? (
                successLogs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-zinc-950/60 border border-emerald-500/15 p-3 rounded-xl shadow-inner transition-all transform hover:translate-x-1 duration-200 animate-item-in shrink-0"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Avatar Circle with initials */}
                      <div className="w-8 h-8 bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase shadow-sm shrink-0">
                        {log.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] text-zinc-100 block truncate max-w-[140px] md:max-w-[180px]">
                          {log.name}
                        </span>
                        <span className="text-[8px] text-emerald-400/80 font-bold flex items-center gap-0.5 mt-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Presensi Sukses
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-950/45 px-2 py-0.5 rounded border border-emerald-500/10 flex items-center gap-1 shadow-sm shrink-0">
                      <Clock className="w-3 h-3" />
                      {log.time}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-zinc-500 py-6">
                  <div className="w-12 h-12 bg-zinc-950/50 rounded-xl flex items-center justify-center mb-3 border border-zinc-800/80 shadow-inner">
                    <Users className="w-4 h-4 text-zinc-700 animate-pulse" />
                  </div>
                  <p className="text-[11px] font-extrabold text-zinc-400">Menunggu Absensi</p>
                  <p className="text-[9px] text-zinc-500 mt-1 max-w-[12rem] text-center leading-relaxed">
                    Umpan realtime akan memuat daftar nama siswa saat ada yang berhasil scan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER BAR (Guru Piket & Copyright Combined to save vertical space) */}
      <footer className="relative z-10 mt-auto pt-4 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        
        {/* Guru Piket */}
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">
            Guru Piket Hari Ini:
          </span>
          <div className="flex gap-2">
            {piketTeachers.length > 0 ? (
              piketTeachers.map((teacher) => (
                <span 
                  key={teacher.id} 
                  className="text-[9px] bg-zinc-900 border border-zinc-800/80 text-zinc-300 px-2.5 py-0.5 rounded-md font-bold"
                >
                  {teacher.nama}
                </span>
              ))
            ) : (
              <span className="text-[9px] text-zinc-500 italic">Tidak ada guru piket terjadwal.</span>
            )}
          </div>
        </div>

        {/* Copyright & Engine Version */}
        <span className="text-[9px] text-zinc-600 font-medium">
          SMK Ar-Rahma Mandiri Indonesia Pasuruan © 2026 • Real-time SSE Interface v4.6 • Screen-fitted (100% Viewport)
        </span>
      </footer>
    </div>
  );
}
