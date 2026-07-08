"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  HelpCircle,
  Send,
  MessageSquare,
  Activity,
  FileText,
  AlertTriangle,
  RefreshCw,
  Loader2,
  TrendingUp,
  Award,
  ShieldAlert,
  Calendar
} from "lucide-react";

interface SummaryData {
  peran: string;
  isBk?: boolean;
  namaKelasWali: string;
  totalSiswa: number;
  ringkasanHariIni: {
    hadir: number;
    terlambat: number;
    sakit: number;
    izin: number;
    alpha: number;
    belumAbsen: number;
  };
  daftarAlpha: Array<{
    idSiswa: number;
    nama: string;
    kelas: string;
    teleponOrangTua: string;
  }>;
  akumulasiBulanIni: {
    totalHariBulanIni: number;
    totalHadirBulanIni: number;
    rataRataBulanIni: number;
  };
  logWaTerbaru: Array<{
    id: number;
    namaSiswa: string;
    kelasSiswa: string;
    telepon: string;
    status: string;
    sentAt: string;
    error: string | null;
  }>;
  trendKehadiran?: Array<{ label: string; persentase: number }>;
  leaderboardKelas?: Array<{ id: number; nama: string; totalSiswa: number; persentase: number }>;
  piketActivityCount?: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastCategory, setBroadcastCategory] = useState("SEMUA");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [processingAlpha, setProcessingAlpha] = useState(false);

  // Manual Alpha trigger handler
const handleManualAlpha = async () => {
    // Tampilkan toast konfirmasi sebagai ganti confirm()
    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white dark:bg-zinc-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Konfirmasi Alpha Manual
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Anda yakin ingin memproses ALPHA MANUAL sekarang?
                Semua siswa yang belum absen hari ini akan ditandai ALPHA dan orang tua akan menerima notifikasi WhatsApp otomatis.
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-zinc-700">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setProcessingAlpha(true);
              try {
                const res = await fetch("/api/attendance/auto-alpha", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ force: true }),
                });

                const result = await res.json();

                if (!res.ok) {
                  throw new Error(result.error || "Gagal memproses alpha manual.");
                }

                toast.success(
                  result.message || "Auto-alpha manual berhasil diproses!",
                  { duration: 5000 }
                );
                fetchSummary();
              } catch (err: any) {
                toast.error(err.message || "Gagal memproses alpha manual.");
              } finally {
                setProcessingAlpha(false);
              }
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            Ya, Proses
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            Batal
          </button>
        </div>
      </div>
    ));
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/dashboard/summary");
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Gagal mengambil ringkasan dashboard.");
      }
      setData(result);
    } catch (err: any) {
      toast.error(err.message || "Kesalahan memuat ringkasan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Formulasi link wa.me otomatis untuk orang tua siswa Alpha
  const getWaMeUrl = (namaSiswa: string, teleponOrangTua: string) => {
    const hariIni = new Date();
    const namaHari = hariIni.toLocaleDateString("id-ID", { weekday: "long" });
    const tglFormat = hariIni.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const pesan = `Assalamu'alaikum Wr. Wb. Bapak/Ibu Wali dari *${namaSiswa}*. Kami dari pihak sekolah SMK Ar Rahma ingin mengabarkan bahwa pada hari ini, *${namaHari}*, *${tglFormat}*, putra/putri Bapak/Ibu terdata *ALPHA* (tidak hadir tanpa keterangan) pada jam masuk sekolah. Mohon konfirmasi keterangan ketidak-hadiran putra/putri Bapak/Ibu ke Wali Kelas. Terima kasih.`;

    // Pastikan nomor HP ortu berformat internasional
    const phoneClean = teleponOrangTua.replace(/[^0-9]/g, "");

    return `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(pesan)}`;
  };

  // Kirim WhatsApp Broadcast massal
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) {
      toast.error("Isi pesan broadcast tidak boleh kosong!");
      return;
    }

    setSendingBroadcast(true);
    try {
      const res = await fetch("/api/dashboard/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pesan: broadcastMessage,
          kategori: broadcastCategory
        })
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal mengirim broadcast.");
      }

      toast.success(result.message || "Pesan broadcast sukses diantrekan!");
      setShowBroadcastModal(false);
      setBroadcastMessage("");
      fetchSummary(); // Refresh logs
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses broadcast.");
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-zinc-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Memuat data dashboard...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const rataRata = data.akumulasiBulanIni.rataRataBulanIni;
  const isKehadiranRendah = rataRata < 90;

  // Render variables for executive charts
  const showExecutiveWidgets = (data.peran === "ADMIN" || data.peran === "KEPALA_SEKOLAH" || data.peran === "GURU_BK" || (data.peran === "GURU" && data.isBk));
  const trend = data.trendKehadiran || [];
  const leaderboard = data.leaderboardKelas || [];

  // Generate SVG coordinates for trend chart
  const renderTrendSvgPath = () => {
    if (trend.length < 2) return "";
    const width = 500;
    const height = 150;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 20;

    const points = trend.map((t, idx) => {
      const x = paddingLeft + (idx / (trend.length - 1)) * (width - paddingLeft - paddingRight);
      // Min val is 0%, max is 100%. Flip Y since SVG (0,0) is top-left
      const y = height - paddingBottom - (t.persentase / 100) * (height - paddingTop - paddingBottom);
      return { x, y };
    });

    // Make smooth bezier line path
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    // Generate area path for gradient
    const lastPoint = points[points.length - 1];
    const areaD = `${d} L ${lastPoint.x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

    return { lineD: d, areaD, points };
  };

  const svgData = trend.length >= 2 ? renderTrendSvgPath() : null;

  // Split classes leaderboard to best and worst
  const topClasses = leaderboard.slice(0, 3);
  const bottomClasses = [...leaderboard].reverse().slice(0, 3).filter(c => !topClasses.find(tc => tc.id === c.id));

  return (
    <div className="space-y-8">
      {/* HEADER DAN TOMBOL ACTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {data.peran.replace("_", " ")} {data.namaKelasWali && `• Wali Kelas ${data.namaKelasWali}`}
          </span>
          <h2 className="text-2xl font-bold mt-2 text-zinc-800 dark:text-zinc-100">
            {showExecutiveWidgets ? "Panel Eksekutif Sekolah" : "Ikhtisar Kehadiran Hari Ini"}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Guru Piket Activity Count */}
          {showExecutiveWidgets && data.piketActivityCount !== undefined && data.piketActivityCount > 0 && (
            <div className="py-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>{data.piketActivityCount} Piket Manual</span>
            </div>
          )}

          {/* Tombol Broadcast (Hanya untuk Admin & Kepala Sekolah) */}
          {(data.peran === "ADMIN" || data.peran === "KEPALA_SEKOLAH") && (
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold tracking-wide flex items-center gap-2 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-700/30 transition-all cursor-pointer grow md:grow-0 justify-center"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Kirim Broadcast WA</span>
            </button>
          )}
        </div>
      </div>

      {/* WARNING THRESHOLD BULANAN (< 90%) */}
      {isKehadiranRendah && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 flex gap-3 text-red-700 dark:text-red-400 animate-pulse">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">PERINGATAN: Kehadiran di bawah standar minimal sekolah!</h4>
            <p className="text-xs mt-1 leading-relaxed">
              Rata-rata kumulatif kehadiran bulan ini berada di angka{" "}
              <span className="font-bold font-mono">{rataRata}%</span> (Batas minimal kelayakan sekolah adalah 90%).
              Mohon segera lakukan peninjauan log konseling siswa rawan mangkir di BK.
            </p>
          </div>
        </div>
      )}

      {/* WARNING: SISWA BELUM ABSEN (Admin Only) */}
      {data.peran === "ADMIN" && data.ringkasanHariIni.belumAbsen > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <h4 className="font-bold text-sm text-amber-700 dark:text-amber-400">
                {data.ringkasanHariIni.belumAbsen} Siswa Belum Absen Hari Ini
              </h4>
              <p className="text-xs mt-1 leading-relaxed text-amber-600 dark:text-amber-500">
                Masih ada siswa yang belum memiliki catatan kehadiran. Klik tombol di samping untuk memproses Alpha secara manual.
              </p>
            </div>
          </div>
          <button
            onClick={handleManualAlpha}
            disabled={processingAlpha}
            className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 justify-center"
          >
            {processingAlpha ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>Proses Alpha Manual</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* BENTO GRID: KARTU RINGKASAN HARI INI */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Siswa */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm col-span-2 lg:col-span-2">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Siswa Terdaftar</span>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 font-mono block mt-4">
            {data.totalSiswa}
          </span>
          <span className="text-[10px] text-zinc-400 font-semibold block mt-1">Siswa Aktif</span>
        </div>

        {/* Hadir */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Hadir</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono block mt-4">
            {data.ringkasanHariIni.hadir}
          </span>
          <span className="text-[10px] text-zinc-400 font-semibold block mt-1">Absensi Sukses</span>
        </div>

        {/* Telat */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Telat</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono block mt-4">
            {data.ringkasanHariIni.terlambat}
          </span>
          <span className="text-[10px] text-zinc-400 font-semibold block mt-1">Dalam Toleransi</span>
        </div>

        {/* Sakit / Izin */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Sakit/Izin</span>
            <HelpCircle className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono block mt-4">
            {data.ringkasanHariIni.sakit + data.ringkasanHariIni.izin}
          </span>
          <span className="text-[10px] text-zinc-400 font-semibold block mt-1">
            S: {data.ringkasanHariIni.sakit} • I: {data.ringkasanHariIni.izin}
          </span>
        </div>

        {/* Alpha */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Alpha</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <span className="text-2xl font-extrabold text-red-600 dark:text-red-400 font-mono block mt-4">
            {data.ringkasanHariIni.alpha}
          </span>
          <span className="text-[10px] text-zinc-400 font-semibold block mt-1">Mangkir Absen</span>
        </div>
      </div>

      {/* EXECUTIVE LEVEL SECTION (Only Admin, Kepsek, Guru BK) */}
      {showExecutiveWidgets && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Weekly Attendance Trend Chart (7 columns) */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span>Tren Kehadiran Sekolah (7 Hari Aktif Terakhir)</span>
              </h3>
            </div>

            {svgData ? (
              <div className="relative w-full h-[180px]">
                <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guidelines */}
                  {[0, 25, 50, 75, 100].map((gl) => {
                    const y = 150 - 20 - (gl / 100) * 110;
                    return (
                      <g key={gl}>
                        <line
                          x1="40"
                          y1={y}
                          x2="480"
                          y2={y}
                          stroke="#e4e4e7"
                          strokeDasharray="3,3"
                          className="dark:stroke-zinc-800"
                        />
                        <text
                          x="10"
                          y={y + 4}
                          fontSize="8"
                          fontWeight="bold"
                          className="fill-zinc-400 font-mono"
                        >
                          {gl}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Filled Gradient Area */}
                  <path d={svgData.areaD} fill="url(#areaGrad)" />

                  {/* Bezier Trend Line */}
                  <path
                    d={svgData.lineD}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Data Point Circles */}
                  {svgData.points.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="4"
                        fill="#ffffff"
                        stroke="#10b981"
                        strokeWidth="2.5"
                      />
                      <text
                        x={p.x}
                        y={p.y - 8}
                        fontSize="8"
                        fontWeight="extrabold"
                        textAnchor="middle"
                        className="fill-emerald-600 dark:fill-emerald-400 font-mono"
                      >
                        {trend[idx].persentase}%
                      </text>
                      <text
                        x={p.x}
                        y="142"
                        fontSize="8"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="fill-zinc-500"
                      >
                        {trend[idx].label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-zinc-400 text-xs italic">
                Belum ada tren sekolah terhimpun.
              </div>
            )}
          </div>

          {/* Class Leaderboard Widget (5 columns) */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Award className="w-5 h-5 text-emerald-600" />
              <span>Leaderboard Kehadiran Kelas Hari Ini</span>
            </h3>

            <div className="space-y-4">
              {/* Top performing classes */}
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-2">
                  Tingkat Kehadiran Terbaik (Top 3)
                </span>
                {topClasses.length > 0 ? (
                  <div className="space-y-2">
                    {topClasses.map((c, i) => (
                      <div key={c.id} className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600">#{i + 1}</span>
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Kelas {c.nama}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400 font-medium">({c.totalSiswa} Siswa)</span>
                          <span className="font-extrabold font-mono text-emerald-600">{c.persentase}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-400 italic">Belum ada data</p>
                )}
              </div>

              {/* Bottom performing classes */}
              {bottomClasses.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-2">
                    Perlu Perhatian Khusus
                  </span>
                  <div className="space-y-2">
                    {bottomClasses.map((c) => (
                      <div key={c.id} className="p-3 bg-red-50/20 dark:bg-red-950/10 border border-red-200/10 rounded-xl flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                          <span>⚠</span>
                          <span>Kelas {c.nama}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400">({c.totalSiswa} Siswa)</span>
                          <span className="font-extrabold font-mono text-red-600 dark:text-red-400">{c.persentase}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GRID CONTAINER BAWAH (LOGS & ALPHAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* PANEL KIRI: STATS DONUT + LOG ALPHA (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* DONUT CHART WIDGET */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-zinc-100 dark:text-zinc-800"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="38"
                  cx="50"
                  cy="50"
                />
                <circle
                  className={`transition-all duration-1000 ease-out ${
                    isKehadiranRendah ? "text-red-500 stroke-red-500" : "text-emerald-600 stroke-emerald-600"
                  }`}
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - rataRata / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="38"
                  cx="50"
                  cy="50"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold font-mono text-zinc-800 dark:text-zinc-100">
                  {rataRata}%
                </span>
                <p className="text-[9px] text-zinc-400 font-semibold uppercase mt-0.5">Rata-Rata Bulanan</p>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200">
                Persentase Kehadiran Kumulatif
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Menghitung rata-rata kumulatif kehadiran siswa di bulan berjalan. Jika indikator menunjukkan warna
                merah, ini berarti kehadiran kelas bimbingan Anda berada di bawah standar minimal sekolah (90%).
              </p>
            </div>
          </div>

          {/* DAFTAR SISWA ALPHA & MANUAL CHAT BUTTONS */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>Siswa Alpha Hari Ini ({data.daftarAlpha.length})</span>
            </h3>

            <div className="border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.daftarAlpha.length > 0 ? (
                data.daftarAlpha.map((siswa) => (
                  <div key={siswa.idSiswa} className="p-4 flex justify-between items-center text-sm gap-4">
                    <div className="min-w-0">
                      <span className="font-bold text-zinc-800 dark:text-zinc-100 block truncate max-w-[200px]">
                        {siswa.nama}
                      </span>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        Kelas {siswa.kelas} • Ortu: {siswa.teleponOrangTua}
                      </span>
                    </div>

                    <a
                      href={getWaMeUrl(siswa.nama, siswa.teleponOrangTua)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-emerald-200/30 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Hubungi Ortu</span>
                    </a>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-400 text-xs italic">
                  Luar biasa! Tidak ada siswa Alpha/mangkir hari ini.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANEL KANAN: TERBARU DIKIRIM (5 columns) */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col min-h-[400px]">
          <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2 mb-6 shrink-0">
            <Activity className="w-5 h-5 text-emerald-600" />
            Notifikasi WhatsApp Gateway Terbaru (Max. 5)
          </h3>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {data.logWaTerbaru.length > 0 ? (
              data.logWaTerbaru.map((log) => {
                let badge = "bg-zinc-100 text-zinc-600";
                if (log.status === "TERKIRIM") badge = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400";
                if (log.status === "TERTUNDA") badge = "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 animate-pulse";
                if (log.status === "GAGAL" || log.status === "GAGAL_OFFLINE") badge = "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400";

                return (
                  <div key={log.id} className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 text-xs shadow-inner">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">
                        {log.namaSiswa}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-mono">{log.sentAt} WIB</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 block truncate">
                      Tujuan: {log.telepon} • Kelas {log.kelasSiswa}
                    </p>
                    <div className="mt-3 flex justify-between items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${badge}`}>
                        {log.status.replace("_", " ")}
                      </span>
                      {log.error && (
                        <span className="text-[10px] text-red-500 italic max-w-[120px] truncate" title={log.error}>
                          Err: {log.error}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-zinc-400 text-xs italic py-12">
                Belum ada aktivitas notifikasi WhatsApp hari ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BROADCAST MODAL POPUP */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                Custom WhatsApp Broadcast Massal
              </h3>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              {/* Category Filter */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Target Orang Tua / Wali Murid
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Semua Siswa", val: "SEMUA" },
                    { label: "Terlambat Hari Ini", val: "TERLAMBAT" },
                    { label: "Alpha Hari Ini", val: "ALPHA" }
                  ].map((cat) => (
                    <button
                      key={cat.val}
                      type="button"
                      onClick={() => setBroadcastCategory(cat.val)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        broadcastCategory === cat.val
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                          : "bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Message */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Isi Pesan Broadcast
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">Variabel: {'{Nama_Siswa}'}, {'{Nama_Kelas}'}</span>
                </div>
                <textarea
                  required
                  rows={6}
                  disabled={sendingBroadcast}
                  placeholder="Ketik isi pengumuman broadcast di sini..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-zinc-400 leading-relaxed"
                />
              </div>

              {/* Info Help Message */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/50 rounded-xl text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed flex gap-2">
                <Info className="w-4 h-4 shrink-0 text-emerald-600" />
                <div>
                  Pesan Anda akan dimasukkan ke dalam antrean asinkronus Next.js dan dikirimkan secara berkala dengan jeda delay acak untuk mematuhi regulasi anti-spam WhatsApp Meta.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {sendingBroadcast ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengantrekan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Broadcast</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Info helper component
function Info({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 1 1 1.08 1.04l-.425.847a.75.75 0 0 0-.424.676v.117m0 2.176h.008v.008H12v-.008Zm9.228-3.176a9 9 0 1 1-18.001 0 9 9 0 0 1 18.001 0Z" />
    </svg>
  );
}
