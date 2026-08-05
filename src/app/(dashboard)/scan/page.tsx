"use client";

import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { db, type LocalSiswa, type KehadiranTertunda } from "@/lib/db";
import {
  Search,
  Users,
  Wifi,
  WifiOff,
  Clock,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Camera,
  QrCode
} from "lucide-react";

interface RecentLog {
  id: number;
  idSiswa: number;
  namaSiswa: string;
  kelasSiswa: string;
  status: "HADIR" | "TERLAMBAT" | "SAKIT" | "IZIN" | "ALPHA";
  waktuMasuk: string; // HH:MM
  createdAt: number; // local timestamp to track 10s cancellation window
  statusSync: "ONLINE" | "PENDING";
}

export default function PiketScanPage() {
  const [activeTab, setActiveTab] = useState<"scan" | "dispensation">("scan");
  const [students, setStudents] = useState<LocalSiswa[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<LocalSiswa[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  // QR Scanner States
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const scannerRef = useRef<any>(null);
  const isProcessingScan = useRef(false);

  // Dispensations States
  const [dispensations, setDispensations] = useState<{
    id: number;
    namaSiswa: string;
    nisn: string;
    kelas: string;
    tanggal: string;
    alasan: string;
    fotoBukti: string | null;
    status: "MENUNGGU" | "DISETUJUI" | "DITOLAK";
  }[]>([]);
  const [loadingDisp, setLoadingDisp] = useState(false);

  // Menyimpan interval untuk me-refresh timer tombol Batal setiap detik
  const [, setTick] = useState(0);

  const fetchDispensations = async () => {
    setLoadingDisp(true);
    try {
      const res = await fetch("/api/picket/dispensations");
      const data = await res.json();
      if (data.dispensations) {
        setDispensations(data.dispensations);
      }
    } catch (err) {
      console.error("Gagal memuat dispensasi:", err);
      toast.error("Gagal memuat data dispensasi.");
    } finally {
      setLoadingDisp(false);
    }
  };

  useEffect(() => {
    if (activeTab === "dispensation") {
      fetchDispensations();
    }
  }, [activeTab]);

  const handleVerifyDispensation = async (id: number, status: "DISETUJUI" | "DITOLAK") => {
    try {
      const res = await fetch("/api/picket/dispensations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memproses verifikasi.");

      toast.success(result.message || `Dispensasi berhasil diverifikasi sebagai ${status}`);
      fetchDispensations();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses.");
    }
  };

  // Filter siswa berdasarkan input pencarian
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setFilteredStudents([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = students.filter(
      (s) =>
        s.nama.toLowerCase().includes(query) ||
        s.nisn.includes(query) ||
        s.namaKelas.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered.slice(0, 10)); // Batasi 10 hasil agar tidak padat
  }, [searchQuery, students]);

  // Unduh daftar siswa aktif (jika online) dan simpan ke Dexie
  async function loadStudentData() {
    setLoading(true);
    try {
      if (window.navigator.onLine) {
        const res = await fetch("/api/attendance/piket-students");
        const data = await res.json();
        
        if (res.ok && data.siswa) {
          // Bersihkan tabel lokal lama dan simpan yang baru
          await db.siswa.clear();
          await db.siswa.bulkPut(data.siswa);
          setStudents(data.siswa);
        }
      } else {
        // Ambil dari Dexie jika offline
        const localStudents = await db.siswa.toArray();
        setStudents(localStudents);
      }
    } catch (err) {
      console.error("Gagal memuat data siswa:", err);
      // Fallback ke Dexie
      const localStudents = await db.siswa.toArray();
      setStudents(localStudents);
    } finally {
      setLoading(false);
    }
  };

  // Sinkronisasi data offline ke MySQL
  async function syncOfflineData() {
    try {
      setSyncing(true);
      const pendingLogs = await db.kehadiran_tertunda.toArray();
      
      if (pendingLogs.length === 0) {
        setSyncing(false);
        return;
      }

      // Format data untuk bulk sync API
      const formattedLogs = pendingLogs.map((p) => ({
        idSiswa: p.idSiswa,
        tanggal: p.tanggal,
        status: p.status,
        waktuMasuk: p.waktuMasuk,
        catatan: p.catatan
      }));

      const res = await fetch("/api/attendance/bulk-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ logs: formattedLogs })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Sinkronisasi Berhasil! ${data.statistik?.suksesCount} data di-upload.`);
        // Kosongkan tabel antrean lokal
        await db.kehadiran_tertunda.clear();
        
        // Pindahkan log offline terakhir ke log aktif visual dengan status ONLINE
        const newRecentLogs = pendingLogs.map((p) => ({
          id: p.id || Math.random(),
          idSiswa: p.idSiswa,
          namaSiswa: p.namaSiswa,
          kelasSiswa: p.kelasSiswa,
          status: p.status,
          waktuMasuk: new Date(p.waktuMasuk).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
          }),
          createdAt: Date.now() - 31000, // Matikan tombol batal untuk item sync lama
          statusSync: "ONLINE" as const
        }));
        
        setRecentLogs((prev) => [...newRecentLogs, ...prev].slice(0, 5));
      } else {
        throw new Error(data.error || "Gagal sinkronisasi data.");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyelaraskan data offline.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Track status online/offline
    setIsOnline(window.navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Koneksi internet pulih. Memulai sinkronisasi...");
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Koneksi internet terputus. Beralih ke Mode Offline.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Refresh tombol batal setiap 1 detik
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    // Load data siswa
    loadStudentData();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(timer);
    };
  }, []);

  // Tampilkan Bouncy Toast Notifikasi Hijau Khas Siswa
  const showBouncyToast = (nama: string, status: string, isLocal: boolean) => {
    // Ambil inisial nama
    const inisial = nama
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();

    // Pilih warna background inisial acak yang kontras
    const colors = [
      "bg-emerald-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-purple-500",
      "bg-amber-500"
    ];
    const randColor = colors[Math.floor(Math.random() * colors.length)];

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-bounce" : "opacity-0"
          } max-w-md w-full bg-white dark:bg-zinc-900 shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 p-4 border ${
            isLocal ? "border-amber-500/25" : "border-emerald-500/25"
          } transition-all duration-300`}
        >
          <div className="flex-1 w-0 flex items-center">
            <div className="flex-shrink-0 pt-0.5">
              <div
                className={`w-10 h-10 rounded-full ${
                  isLocal ? "bg-amber-500" : randColor
                } text-white flex items-center justify-center font-bold text-sm uppercase shadow-sm`}
              >
                {inisial}
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {isLocal ? "Tersimpan Offline" : "Absensi Sukses"}
              </p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                Absen *{nama}* ({status}) berhasil direkam!
              </p>
            </div>
          </div>
        </div>
      ),
      { duration: 2500 }
    );
  };

  // Kirim absensi manual satu klik
  const handleRecordAttendance = async (
    siswa: LocalSiswa,
    status: "HADIR" | "TERLAMBAT" | "SAKIT" | "IZIN"
  ) => {
    // Susun tanggal lokal saat ini (Format YYYY-MM-DD)
    const tglLocalStr = new Date().toISOString().split("T")[0];
    const jamMenitVisual = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit"
    });

    if (isOnline) {
      try {
        const res = await fetch("/api/attendance/manual", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            idSiswa: siswa.id,
            tanggal: tglLocalStr,
            status,
            catatan: `Dicatat manual oleh piket`
          })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Gagal mencatat absensi.");
        }

        // Tampilkan bouncy toast sukses
        showBouncyToast(siswa.nama, status, false);

        // Masukkan ke log visual paling atas
        const newLog: RecentLog = {
          id: data.kehadiran.id,
          idSiswa: siswa.id,
          namaSiswa: siswa.nama,
          kelasSiswa: siswa.namaKelas,
          status,
          waktuMasuk: jamMenitVisual,
          createdAt: Date.now(),
          statusSync: "ONLINE"
        };
        setRecentLogs((prev) => [newLog, ...prev].slice(0, 5));
        setSearchQuery(""); // Kosongkan pencarian
      } catch (err: any) {
        toast.error(err.message || "Gagal menghubungi server.");
      }
    } else {
      // PROSES OFFLINE CACHE (IndexedDB via Dexie)
      try {
        const payloadOffline: KehadiranTertunda = {
          idSiswa: siswa.id,
          namaSiswa: siswa.nama,
          kelasSiswa: siswa.namaKelas,
          tanggal: tglLocalStr,
          status,
          waktuMasuk: new Date().toISOString(),
          catatan: "Dicatat offline oleh piket",
          statusSync: "PENDING"
        };

        const idOffline = await db.kehadiran_tertunda.add(payloadOffline);
        
        // Tampilkan bouncy toast kuning/offline
        showBouncyToast(siswa.nama, status, true);

        // Masukkan ke log visual sebagai PENDING
        const newLog: RecentLog = {
          id: idOffline,
          idSiswa: siswa.id,
          namaSiswa: siswa.nama,
          kelasSiswa: siswa.namaKelas,
          status,
          waktuMasuk: jamMenitVisual,
          createdAt: Date.now(),
          statusSync: "PENDING"
        };
        setRecentLogs((prev) => [newLog, ...prev].slice(0, 5));
        setSearchQuery(""); // Kosongkan pencarian
      } catch (err) {
        toast.error("Gagal menyimpan ke database offline browser.");
      }
    }
  };

  // Batalkan absensi (Batal / Delete)
  const handleCancelAttendance = async (log: RecentLog) => {
    const timeElapsed = Date.now() - log.createdAt;
    if (timeElapsed > 10000) {
      toast.error("Batas waktu pembatalan 10 detik telah berakhir.");
      return;
    }

    if (log.statusSync === "ONLINE") {
      try {
        const res = await fetch("/api/attendance/manual", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ idKehadiran: log.id })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Gagal membatalkan.");
        }

        toast.success("Absensi berhasil dibatalkan!");
        // Hapus dari list log visual
        setRecentLogs((prev) => prev.filter((item) => item.id !== log.id));
      } catch (err: any) {
        toast.error(err.message || "Gagal membatalkan.");
      }
    } else {
      // Hapus dari Dexie offline queue
      try {
        await db.kehadiran_tertunda.delete(log.id);
        toast.success("Antrean absensi offline berhasil dibatalkan!");
        setRecentLogs((prev) => prev.filter((item) => item.id !== log.id));
      } catch (err) {
        toast.error("Gagal membatalkan data lokal.");
      }
    }
  };

  // === QR SCANNER FUNCTIONS ===
  async function initScanner() {
    try {
      setScannerInitialized(false);
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("piket-reader");
      scannerRef.current = scanner;

      const qrBoxFunction = (width: number, height: number) => {
        const min = Math.min(width, height);
        const qrBoxSize = Math.floor(min * 0.8);
        return { width: qrBoxSize, height: qrBoxSize };
      };

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: qrBoxFunction,
          aspectRatio: 1,
          videoConstraints: { facingMode: "environment" }
        },
        async (decodedText: string) => {
          if (isProcessingScan.current) return;
          isProcessingScan.current = true;
          await handleQrScanResult(decodedText);
        },
        () => {}
      );

      const videoElement = document.querySelector("#piket-reader video") as HTMLVideoElement;
      if (videoElement) {
        videoElement.setAttribute("playsinline", "true");
      }

      setScannerInitialized(true);
    } catch (err: any) {
      console.error("Scanner init error:", err);
      toast.error(err.message || "Gagal mengaktifkan kamera. Periksa izin kamera di pengaturan browser.");
      setIsScannerActive(false);
    }
  }

  async function cleanupScanner() {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
        } catch (err) {
          console.error("Gagal stop scanner:", err);
        }
      }
      scannerRef.current = null;
      setScannerInitialized(false);
    }
  }

  useEffect(() => {
    if (!isScannerActive) {
      cleanupScanner();
      return;
    }
    const timer = setTimeout(() => {
      initScanner();
    }, 300);
    return () => {
      clearTimeout(timer);
      cleanupScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScannerActive]);

  async function handleQrScanResult(token: string) {
    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "QR_LIMIT_EXCEEDED") {
          toast.error(data.error);
        } else if (data.code === "AUTO_ALPHA_TRIGGERED") {
          toast.error(data.error);
        } else {
          throw new Error(data.error || "Gagal memproses scan.");
        }
        isProcessingScan.current = false;
        return;
      }

      const jamMenitVisual = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
      });

      showBouncyToast(data.kehadiran.namaSiswa || "Siswa", data.kehadiran.status, false);

      const newLog: RecentLog = {
        id: data.kehadiran.id,
        idSiswa: data.kehadiran.idSiswa || 0,
        namaSiswa: data.kehadiran.namaSiswa || "Siswa",
        kelasSiswa: data.kehadiran.kelasSiswa || "",
        status: data.kehadiran.status,
        waktuMasuk: data.kehadiran.waktuMasuk || jamMenitVisual,
        createdAt: Date.now(),
        statusSync: "ONLINE"
      };
      setRecentLogs((prev) => [newLog, ...prev].slice(0, 5));
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses scan.");
    } finally {
      isProcessingScan.current = false;
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* TAB SWITCHER */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-2">
        <button
          onClick={() => setActiveTab("scan")}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === "scan"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Pencatatan Kehadiran
        </button>
        <button
          onClick={() => setActiveTab("dispensation")}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === "dispensation"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Dispensasi Keterlambatan
        </button>
      </div>

      {activeTab === "scan" && (
        <>
          {/* MONITOR KONEKSI INTERNET & BAR JUDUL */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                <Users className="text-emerald-600 w-6 h-6" />
                Lobby Gerbang - Pencatatan Kehadiran Cepat
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Gunakan antarmuka cari dan satu-klik di bawah ini untuk mencatat siswa yang masuk.
              </p>
            </div>

            {/* Koneksi Status Badge */}
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                  <Wifi className="w-4 h-4" />
                  Mode Online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-500/10 animate-pulse">
                  <WifiOff className="w-4 h-4" />
                  Mode Offline
                </span>
              )}

              {/* Sync Button */}
              {syncing && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sync...
                </span>
              )}
            </div>
          </div>

          {/* QR SCANNER KAMERA */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                Scan QR Kartu Siswa
              </h3>
              <button
                onClick={() => setIsScannerActive(!isScannerActive)}
                className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isScannerActive
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                <Camera className="w-4 h-4" />
                {isScannerActive ? "Matikan Kamera" : "Aktifkan Kamera"}
              </button>
            </div>

            {isScannerActive && (
              <div className="flex flex-col items-center space-y-3">
                <style dangerouslySetInnerHTML={{__html: `
                  #piket-reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                  }
                `}} />
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden border-4 border-emerald-500/80 shadow-xl relative bg-zinc-900">
                  <div id="piket-reader" className="w-full h-full" />
                  {!scannerInitialized && (
                    <div className="absolute inset-0 bg-zinc-900 z-20 flex flex-col items-center justify-center text-center p-4">
                      <Camera className="w-10 h-10 text-zinc-500 animate-bounce mb-2" />
                      <span className="text-xs text-zinc-500 font-semibold uppercase">Mengaktifkan Kamera...</span>
                    </div>
                  )}
                  {scannerInitialized && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400 opacity-60 animate-bounce z-10"></div>
                  )}
                </div>
                <p className="text-xs text-zinc-400 text-center max-w-sm leading-relaxed">
                  Arahkan kamera ke QR Code kartu siswa. Absensi otomatis tercatat saat QR berhasil dipindai.
                </p>
              </div>
            )}
          </div>

          {/* FIELD PENCARIAN UTAMA */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Cari Nama Siswa / NISN / Kelas
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                  <Search className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="Ketik minimal 2 karakter untuk menyaring..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* LOADING INDICATOR FOR STUDENTS */}
            {loading && (
              <div className="flex justify-center items-center py-8 gap-2 text-zinc-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                <span>Memuat database siswa lokal...</span>
              </div>
            )}

            {/* HASIL PENCARIAN (GRID SISWA & SATU-KLIK STATUS) */}
            {!loading && filteredStudents.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">
                  Hasil Pencarian ({filteredStudents.length})
                </h3>
                
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                  {filteredStudents.map((siswa) => (
                    <div
                      key={siswa.id}
                      className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100 block">
                          {siswa.nama}
                        </span>
                        <span className="text-xs text-zinc-400 font-semibold block mt-0.5">
                          Kelas {siswa.namaKelas} • NISN {siswa.nisn}
                        </span>
                      </div>

                      {/* 4 Tombol Pintas Status (Tanpa Modal Dialog) */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleRecordAttendance(siswa, "HADIR")}
                          className="flex-1 sm:flex-initial py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wider transition-colors cursor-pointer shadow-sm shadow-emerald-500/10"
                        >
                          HADIR
                        </button>
                        <button
                          onClick={() => handleRecordAttendance(siswa, "TERLAMBAT")}
                          className="flex-1 sm:flex-initial py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold tracking-wider transition-colors cursor-pointer shadow-sm shadow-amber-500/10"
                        >
                          TELAT
                        </button>
                        <button
                          onClick={() => handleRecordAttendance(siswa, "IZIN")}
                          className="flex-1 sm:flex-initial py-2.5 px-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl text-xs font-bold tracking-wider transition-colors cursor-pointer shadow-sm shadow-blue-500/10"
                        >
                          IZIN
                        </button>
                        <button
                          onClick={() => handleRecordAttendance(siswa, "SAKIT")}
                          className="flex-1 sm:flex-initial py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-xs font-bold tracking-wider transition-colors cursor-pointer shadow-sm shadow-indigo-500/10"
                        >
                          SAKIT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EMPTY STATE PENCARIAN */}
            {!loading && searchQuery.trim().length >= 2 && filteredStudents.length === 0 && (
              <div className="text-center py-8 text-zinc-400 text-sm flex flex-col items-center justify-center gap-1.5">
                <AlertCircle className="w-6 h-6 text-zinc-300" />
                <p className="font-semibold">Siswa tidak ditemukan</p>
                <span className="text-xs text-zinc-500">Periksa ejaan nama, kelas, atau digit NISN yang Anda ketik.</span>
              </div>
            )}
          </div>

          {/* FLOAT LOG HARIAN: RECENTLY RECORDED LOGS (5 LATEST) */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>Aktivitas Pencatatan Terakhir Anda (Max. 5)</span>
            </h3>

            <div className="border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => {
                  const sisaDetik = Math.max(
                    0,
                    10 - Math.floor((Date.now() - log.createdAt) / 1000)
                  );
                  const bisaBatal = sisaDetik > 0;

                  let badgeStyle = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
                  if (log.status === "HADIR") badgeStyle = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400";
                  if (log.status === "TERLAMBAT") badgeStyle = "bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400";
                  if (log.status === "SAKIT") badgeStyle = "bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400";
                  if (log.status === "IZIN") badgeStyle = "bg-sky-100 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400";

                  return (
                    <div key={log.id} className="p-4 flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-zinc-400 dark:text-zinc-500 font-mono text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {log.waktuMasuk}
                        </div>
                        <div>
                          <span className="font-bold text-zinc-800 dark:text-zinc-100 block">
                            {log.namaSiswa}
                          </span>
                          <span className="text-[11px] text-zinc-500 block mt-0.5">
                            Kelas {log.kelasSiswa} •{" "}
                            {log.statusSync === "PENDING" ? (
                              <span className="text-amber-500 font-bold uppercase tracking-wider">Antrean Offline</span>
                            ) : (
                              <span className="text-zinc-400">Tersimpan di Cloud</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badgeStyle}`}>
                          {log.status}
                        </span>

                        {bisaBatal ? (
                          <button
                            onClick={() => handleCancelAttendance(log)}
                            className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border border-red-200/50 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            <span>Batal ({sisaDetik}s)</span>
                          </button>
                        ) : (
                          <div className="w-20"></div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-zinc-400 text-sm italic">
                  Belum ada aktivitas absensi tercatat dalam sesi ini.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "dispensation" && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-6 animate-enter">
          <div>
            <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-100">
              Daftar Pengajuan Dispensasi Keterlambatan
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Verifikasi bukti pengajuan dispensasi dari siswa. Menyetujui dispensasi akan mengupdate status absensi siswa hari itu menjadi TERLAMBAT.
            </p>
          </div>

          {loadingDisp ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : dispensations.length > 0 ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
              {dispensations.map((d) => (
                <div key={d.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-all">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate">
                        {d.namaSiswa}
                      </span>
                      <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">
                        Kelas {d.kelas}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                      Alasan: {d.alasan}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-zinc-400 font-medium">
                      <span>NISN: {d.nisn}</span>
                      <span>•</span>
                      <span>Tanggal: {d.tanggal}</span>
                      {d.fotoBukti && (
                        <>
                          <span>•</span>
                          <a
                            href={d.fotoBukti}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                          >
                            Lihat Foto Bukti
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {d.status === "MENUNGGU" ? (
                      <>
                        <button
                          onClick={() => handleVerifyDispensation(d.id, "DISETUJUI")}
                          className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleVerifyDispensation(d.id, "DITOLAK")}
                          className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Tolak
                        </button>
                      </>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                        d.status === "DISETUJUI"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                      }`}>
                        {d.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-400 text-xs italic">
              Tidak ada pengajuan dispensasi terdaftar.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

