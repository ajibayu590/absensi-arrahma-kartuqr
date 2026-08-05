"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Calendar,
  LogOut,
  RefreshCw,
  Info,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  QrCode
} from "lucide-react";

function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

interface StudentProfile {
  nisn: string;
  nama: string;
  kelas: string;
  sedangMagang: boolean;
  isAbsenDiblokir: boolean;
  detikBlokirTersisa: number;
}

interface AttendanceStat {
  totalHari: number;
  jumlahHadir: number;
  jumlahTerlambat: number;
  jumlahSakit: number;
  jumlahIzin: number;
  jumlahAlpha: number;
  persentaseKehadiran: number;
}

interface AttendanceLog {
  id: number;
  tanggal: string;
  status: "HADIR" | "TERLAMBAT" | "SAKIT" | "IZIN" | "ALPHA";
  waktuMasuk: string | null;
  catatan: string | null;
}

export default function StudentPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<AttendanceStat | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [riwayat, setRiwayat] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const [dispList, setDispList] = useState<{ id: number; tanggal: string; alasan: string; status: string; fotoBukti: string | null }[]>([]);
  const [showDispForm, setShowDispForm] = useState(false);
  const [dispAlasan, setDispAlasan] = useState("");
  const [dispFoto, setDispFoto] = useState<File | null>(null);
  const [dispSubmitting, setDispSubmitting] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const activeTheme = savedTheme || systemTheme;
    setTheme(activeTheme);
    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isIos && !isStandalone) {
      setShowIosPrompt(true);
    }
  }, []);

  async function fetchDispHistory() {
    try {
      const res = await fetch("/api/student/dispensation");
      const data = await res.json();
      if (data.dispensations) {
        setDispList(data.dispensations);
      }
    } catch (err) {
      console.error("Gagal mengambil riwayat dispensasi:", err);
    }
  }

  const handleRequestDispensation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispAlasan.trim()) {
      toast.error("Alasan dispensasi wajib diisi!");
      return;
    }

    setDispSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("alasan", dispAlasan.trim());
      if (dispFoto) {
        try {
          const compressedBlob = await compressImage(dispFoto);
          formData.append("foto", compressedBlob, "bukti.jpg");
        } catch (compressErr) {
          console.error("Gagal kompresi foto, gunakan berkas asli:", compressErr);
          formData.append("foto", dispFoto);
        }
      }

      const res = await fetch("/api/student/dispensation", {
        method: "POST",
        body: formData
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengirim pengajuan.");

      toast.success(result.message || "Dispensasi berhasil diajukan.");
      setDispAlasan("");
      setDispFoto(null);
      setShowDispForm(false);
      fetchDispHistory();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses pengajuan.");
    } finally {
      setDispSubmitting(false);
    }
  };

  async function fetchDashboardData() {
    try {
      const res = await fetch("/api/student/dashboard");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengambil data dashboard.");
      }
      setProfile(data.profil);
      setStats(data.statistik);
      setRiwayat(data.riwayat);
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Gagal memuat data.");
      if (error.message?.includes("Akses ditolak")) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchQrToken() {
    try {
      const res = await fetch("/api/student/qr-token");
      const data = await res.json();
      if (res.ok && data.qrToken) {
        setQrToken(data.qrToken);
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(data.qrToken, {
          width: 300,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
          errorCorrectionLevel: "M"
        });
        setQrDataUrl(dataUrl);
      }
    } catch (err) {
      console.error("Gagal mengambil QR token:", err);
    }
  }

  useEffect(() => {
    fetchDashboardData();
    fetchDispHistory();
    fetchQrToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("pengguna");
      toast.success("Berhasil keluar.");
      router.push("/login");
    } catch (err) {
      toast.error("Gagal logout.");
    }
  };

  const getProgressColor = () => {
    if (!stats) return "stroke-emerald-500";
    return stats.persentaseKehadiran < 90 ? "stroke-red-500" : "stroke-emerald-600";
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-600" />
          <p className="text-zinc-500 font-medium">Memuat Portal Siswa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 max-w-md mx-auto shadow-2xl relative">
      <header className="bg-emerald-700 text-white px-6 py-4 rounded-b-[2rem] shadow-lg sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white/10 p-0.5 border border-white/20">
            <img
              src="/logo.webp"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="text-[10px] bg-emerald-800 text-emerald-100 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Portal Siswa
            </span>
            <h1 className="text-xs font-black mt-1 leading-tight tracking-tight">SMK AR-RAHMA MANDIRI INDONESIA</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 rounded-xl transition-all text-emerald-100 cursor-pointer"
            title="Ganti Tema"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 rounded-xl transition-all text-emerald-100 cursor-pointer"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 overflow-y-auto pb-24">
        {showIosPrompt && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-4 flex gap-3 text-emerald-800 dark:text-emerald-300 relative animate-item-in">
            <div className="flex-1 pr-6">
              <h4 className="font-bold text-xs uppercase tracking-wide">Tambahkan Ke Layar Utama</h4>
              <p className="text-[11px] mt-1 leading-relaxed text-zinc-600 dark:text-zinc-400">
                Untuk pengalaman terbaik di iPhone: ketuk ikon <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Bagikan (Share)</span> di bagian bawah Safari, lalu pilih <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Tambah ke Layar Utama (Add to Home Screen)</span>.
              </p>
            </div>
            <button
              onClick={() => setShowIosPrompt(false)}
              className="absolute top-2.5 right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 cursor-pointer"
            >
              X
            </button>
          </div>
        )}

        {profile && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold text-xl uppercase shadow-inner">
              {profile.nama.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-zinc-800 dark:text-zinc-100 truncate text-base">
                {profile.nama}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                Kelas {profile.kelas} &bull; NISN {profile.nisn}
              </p>
              {profile.sedangMagang && (
                <span className="inline-block mt-2 text-[10px] bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 px-2 py-0.5 rounded font-semibold uppercase">
                  Status: Sedang Magang/PKL
                </span>
              )}
            </div>
          </div>
        )}

        {/* QR CODE STATIS CARD */}
        {qrDataUrl && profile && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col items-center space-y-4">
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 uppercase tracking-wider">
              <QrCode className="w-5 h-5 text-emerald-600" />
              Kartu QR Absensi Anda
            </h4>
            <button
              onClick={() => setShowQr(!showQr)}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              {showQr ? "Sembunyikan QR" : "Tampilkan QR Code"}
            </button>
            {showQr && (
              <div className="flex flex-col items-center space-y-3 animate-in">
                <div className="p-3 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-lg">
                  <img src={qrDataUrl} alt="QR Code Absensi" className="w-56 h-56" />
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center max-w-xs leading-relaxed">
                  Tunjukkan QR ini kepada Guru Piket saat absensi. QR ini bersifat permanen dan unik untuk akun Anda.
                </p>
              </div>
            )}
          </div>
        )}

        {stats && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col items-center">
            <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-4 text-center">
              Kehadiran Bulan Ini
            </h4>

            <div className="relative flex items-center justify-center w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-zinc-200 dark:text-zinc-800"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className={`transition-[stroke-dashoffset] duration-1000 ease-out ${getProgressColor()}`}
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={
                    2 * Math.PI * 40 * (1 - stats.persentaseKehadiran / 100)
                  }
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 font-mono">
                  {stats.persentaseKehadiran}%
                </span>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase mt-0.5">
                  Hadir & Telat
                </p>
              </div>
            </div>

            {stats.persentaseKehadiran < 90 ? (
              <div className="mt-4 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900/20">
                <Info className="w-4 h-4" />
                <span>Kehadiran Anda di bawah batas 90%!</span>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/20">
                <CheckCircle className="w-4 h-4" />
                <span>Persentase kehadiran Anda aman.</span>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2 w-full mt-6 text-center border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
              <div>
                <span className="text-xs text-emerald-600 font-bold block">{stats.jumlahHadir}</span>
                <span className="text-[9px] text-zinc-400 uppercase font-semibold">Hadir</span>
              </div>
              <div>
                <span className="text-xs text-amber-500 font-bold block">{stats.jumlahTerlambat}</span>
                <span className="text-[9px] text-zinc-400 uppercase font-semibold">Telat</span>
              </div>
              <div>
                <span className="text-xs text-blue-500 font-bold block">{stats.jumlahSakit}</span>
                <span className="text-[9px] text-zinc-400 uppercase font-semibold">Sakit</span>
              </div>
              <div>
                <span className="text-xs text-sky-500 font-bold block">{stats.jumlahIzin}</span>
                <span className="text-[9px] text-zinc-400 uppercase font-semibold">Izin</span>
              </div>
              <div>
                <span className="text-xs text-red-500 font-bold block">{stats.jumlahAlpha}</span>
                <span className="text-[9px] text-zinc-400 uppercase font-semibold">Alpha</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-emerald-600" />
            <span>Riwayat Kehadiran (7 Hari Terakhir)</span>
          </h4>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {riwayat.length > 0 ? (
              riwayat.map((log) => {
                let statusBg = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
                if (log.status === "HADIR") statusBg = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
                if (log.status === "TERLAMBAT") statusBg = "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
                if (log.status === "SAKIT") statusBg = "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
                if (log.status === "IZIN") statusBg = "bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400";
                if (log.status === "ALPHA") statusBg = "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";

                return (
                  <div key={log.id} className="p-4 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">
                        {new Date(log.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                      {log.waktuMasuk && (
                        <span className="text-[11px] text-zinc-400 font-mono mt-0.5 block">
                          Masuk: {log.waktuMasuk} WIB
                        </span>
                      )}
                      {log.catatan && (
                        <span className="text-xs text-zinc-400 italic mt-0.5 block">
                          Keterangan: {log.catatan}
                        </span>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBg}`}>
                      {log.status}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-zinc-400 text-sm italic">
                Belum ada riwayat absensi tercatat bulan ini.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              <span>Dispensasi Keterlambatan</span>
            </h4>
            <button
              onClick={() => setShowDispForm(!showDispForm)}
              className="py-1 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              {showDispForm ? "Sembunyikan" : "Ajukan Baru"}
            </button>
          </div>

          {showDispForm && (
            <form onSubmit={handleRequestDispensation} className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Alasan Keterlambatan
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Tulis alasan keterlambatan Anda secara lengkap..."
                  value={dispAlasan}
                  onChange={(e) => setDispAlasan(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-base focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Unggah Foto Bukti (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDispFoto(e.target.files?.[0] || null)}
                  className="w-full text-base text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-base file:font-bold file:bg-zinc-100 file:text-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-300 hover:file:bg-zinc-200 cursor-pointer"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={dispSubmitting}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {dispSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                  <span>Kirim Pengajuan</span>
                </button>
              </div>
            </form>
          )}

          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {dispList.length > 0 ? (
              dispList.map((d) => {
                let statusColor = "text-amber-500 bg-amber-50 dark:bg-amber-950/20";
                if (d.status === "DISETUJUI") statusColor = "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20";
                if (d.status === "DITOLAK") statusColor = "text-red-500 bg-red-50 dark:bg-red-950/20";

                return (
                  <div key={d.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start text-xs font-semibold">
                      <div>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300 block">
                          {new Date(d.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })}
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-1 block">
                          Alasan: {d.alasan}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider shrink-0 ${statusColor}`}>
                        {d.status}
                      </span>
                    </div>
                    {d.fotoBukti && (
                      <a
                        href={d.fotoBukti}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-amber-600 hover:text-amber-700 font-bold underline self-start cursor-pointer"
                      >
                        Lihat Foto Bukti
                      </a>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-zinc-400 text-xs italic font-medium">
                Belum ada pengajuan dispensasi.
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="absolute bottom-0 left-0 w-full p-4 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200/50 dark:border-zinc-800/50 z-10 flex justify-center">
        <button
          onClick={() => setShowQr(!showQr)}
          className="w-full max-w-xs py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/30 hover:shadow-emerald-700/40 flex items-center justify-center gap-2.5 transition-all text-sm cursor-pointer"
        >
          <QrCode className="w-5 h-5" />
          <span>{showQr ? "Sembunyikan QR Code" : "Tampilkan QR Absensi"}</span>
        </button>
      </div>
    </div>
  );
}
