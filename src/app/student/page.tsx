"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { playSuccessFeedback, playErrorFeedback } from "@/lib/feedback";
import {
  Camera,
  MapPin,
  Calendar,
  LogOut,
  ChevronLeft,
  RefreshCw,
  Zap,
  ZoomIn,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sun,
  Moon
} from "lucide-react";
import { Html5Qrcode, CameraDevice } from "html5-qrcode";

// Kompresi gambar sisi klien sebelum unggah untuk menghemat bandwidth
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
  const [geofencingAktif, setGeofencingAktif] = useState(true);

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
    // Cek apakah perangkat iOS dan belum di-install sebagai PWA
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIos && !isStandalone) {
      setShowIosPrompt(true);
    }
  }, []);
  const [riwayat, setRiwayat] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  // Dispensasi States
  const [dispList, setDispList] = useState<{ id: number; tanggal: string; alasan: string; status: string; fotoBukti: string | null }[]>([]);
  const [showDispForm, setShowDispForm] = useState(false);
  const [dispAlasan, setDispAlasan] = useState("");
  const [dispFoto, setDispFoto] = useState<File | null>(null);
  const [dispSubmitting, setDispSubmitting] = useState(false);

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

  // Scanner States
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // Zoom level state (1x or 2.5x)
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: "success" | "error"; message: string } | null>(null);

  // Simulated Scanning state for dev testing
  const [showSimulateInput, setShowSimulateInput] = useState(false);
  const [simulatedToken, setSimulatedToken] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScan = useRef(false); // Add this ref for scan processing guard

  // Mengambil data dashboard
  async function fetchDashboardData() {
    try {
      // 1. Fetch student dashboard data
      const res = await fetch("/api/student/dashboard");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengambil data dashboard.");
      }
      setProfile(data.profil);
      setStats(data.statistik);
      setRiwayat(data.riwayat);

      // 2. Fetch geofencing setting
      const resGeofencing = await fetch("/api/settings/geofencing");
      const dataGeofencing = await resGeofencing.json();
      if (resGeofencing.ok) {
        setGeofencingAktif(dataGeofencing.geofencingAktif);
      } else {
        console.error("Gagal mengambil pengaturan geofencing, default ke aktif.");
        setGeofencingAktif(true); // Default to active if fetch fails
      }
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

  useEffect(() => {
    fetchDashboardData();
    fetchDispHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer Hitung Mundur Sisa Waktu Blokir Sesi Ganda
  useEffect(() => {
    if (!profile?.isAbsenDiblokir) return;

    const timer = setInterval(() => {
      setProfile((prev) => {
        if (!prev) return null;
        const newDetik = prev.detikBlokirTersisa - 1;
        if (newDetik <= 0) {
          clearInterval(timer);
          return {
            ...prev,
            isAbsenDiblokir: false,
            detikBlokirTersisa: 0
          };
        }
        return {
          ...prev,
          detikBlokirTersisa: newDetik
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [profile?.isAbsenDiblokir]);

  async function initScanner() {
    try {
      setScannerInitialized(false);
      setScanResult(null);

      let devices: CameraDevice[] = [];
      try {
        // Minta izin kamera dan list devices (bisa gagal/kosong di iOS Safari/mode PWA jika belum diberi izin)
        devices = await Html5Qrcode.getCameras();
        setCameras(devices);
      } catch (err) {
        console.warn("Html5Qrcode.getCameras() gagal/diblokir, menggunakan fallback constraints:", err);
      }

      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;

      // Jika devices ditemukan, gunakan deviceId. Jika kosong/iOS Safari, langsung pakai constraint facingMode.
      const cameraSource = (devices && devices.length > 0)
        ? (devices[selectedCameraIndex]?.id || devices[0].id)
        : { facingMode: "environment" };

      const qrBoxFunction = (width: number, height: number) => {
        const min = Math.min(width, height);
        const qrBoxSize = Math.floor(min * 0.85); // Memperluas area bidik
        return { width: qrBoxSize, height: qrBoxSize };
      };

      // Konfigurasi 1: Resolusi Tinggi & Continuous Autofocus
      const configWithHighRes = {
        fps: 10,
        qrbox: qrBoxFunction,
        aspectRatio: 1,
        videoConstraints: {
          facingMode: "environment",
        }
      };

      // Konfigurasi 2 (Fallback): Sangat kompatibel untuk Safari/iOS PWA
      const configFallback = {
        fps: 10,
        qrbox: qrBoxFunction,
        aspectRatio: 1,
        videoConstraints: {
          facingMode: "environment"
        }
      };

      try {
        // Cobakan konfigurasi ideal dulu
        await scanner.start(
          cameraSource,
          configWithHighRes,
          async (decodedText) => {
            if (isProcessingScan.current) return;
            isProcessingScan.current = true;
            console.log("QR TERBACA:", decodedText); // Debugging line
            await kirimAbsensi(decodedText);
          },
          (errorMessage) => {}
        );
      } catch (startErr) {
        console.warn("Gagal start dengan configWithHighRes, mencoba fallback config:", startErr);
        
        // Cobakan dengan konfigurasi aman
        await scanner.start(
          { facingMode: "environment" },
          configFallback,
          async (decodedText) => {
            if (isProcessingScan.current) return;
            isProcessingScan.current = true;
            console.log("QR TERBACA:", decodedText); // Debugging line
            await kirimAbsensi(decodedText);
          },
          (errorMessage) => {}
        );
      }

      const videoElement = document.querySelector("#reader video") as HTMLVideoElement;
      if (videoElement) {
        videoElement.setAttribute("playsinline", "true");
      }

      setScannerInitialized(true);
    } catch (err) {
      const error = err as Error;
      console.error(error);
      toast.error(error.message || "Gagal mengaktifkan kamera. Periksa Pengaturan > Privasi & Keamanan > Kamera, dan berikan izin untuk Safari/browser ini.");
      setIsScanning(false);
    }
  }

  function cleanupScanner() {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current = null;
          setScannerInitialized(false);
        }).catch(err => {
          console.error("Gagal stop scanner:", err);
        });
      } else {
        scannerRef.current = null;
        setScannerInitialized(false);
      }
    }
    setFlashOn(false);
    setZoomLevel(1);
    const video = document.querySelector("#reader video") as HTMLVideoElement;
    if (video) {
      video.style.transform = "scale(1.0)";
    }
  }

  // Handler Kamera Scanner (Html5Qrcode)
  useEffect(() => {
    if (!isScanning) {
      cleanupScanner();
      return;
    }

    // Tunggu DOM elemen #reader siap
    const timer = setTimeout(() => {
      initScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      cleanupScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning, selectedCameraIndex]);

  // Balik Kamera
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    setSelectedCameraIndex((prev) => (prev + 1) % cameras.length);
  };

  // Toggle Flash
  const handleToggleFlash = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      const nextFlashState = !flashOn;
      // Dapatkan track kamera
      const capabilities = scannerRef.current.getRunningTrackCapabilities();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((capabilities as any).torch) {
        await scannerRef.current.applyVideoConstraints({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advanced: [{ torch: nextFlashState } as any]
        });
        setFlashOn(nextFlashState);
      } else {
        toast.error("Flash tidak didukung pada kamera ini.");
      }
    } catch (err) {
      toast.error("Gagal mengontrol Flash.");
    }
  };

  // Toggle Zoom Kamera (Mendukung Android Hardware Zoom & iOS Preview Zoom)
  const handleToggleZoom = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      const capabilities = scannerRef.current.getRunningTrackCapabilities();
      const nextZoom = zoomLevel === 1 ? 2.5 : 1; // Toggle antara 1x dan 2.5x
      
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((capabilities as any).zoom) {
            await scannerRef.current.applyVideoConstraints({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              advanced: [{ zoom: nextZoom } as any]
            });
            setZoomLevel(nextZoom);
          } else {
            // Fallback: Terapkan digital CSS preview zoom untuk iPhone/iOS/HP tanpa zoom hardware
            const video = document.querySelector("#reader video") as HTMLVideoElement;
            if (video) {
              video.style.transform = nextZoom > 1 ? "scale(2.5)" : "scale(1.0)"; // Changed scale to 2.5
              video.style.transformOrigin = "center";
              setZoomLevel(nextZoom);
            } else {
              toast.error("Zoom optik tidak didukung pada perangkat ini. Menggunakan zoom digital (CSS).");
            }
          }
    } catch (err) {
      toast.error("Gagal mengatur zoom kamera.");
    }
  };

  // Kirim data absensi
  async function kirimAbsensi(tokenString: string) {
    // Matikan pemindaian agar tidak dobel request
    cleanupScanner();
    setGpsLoading(true);

    let finalLatitude: number | null = null;
    let finalLongitude: number | null = null;

    if (geofencingAktif) {
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <MapPin className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Izin Lokasi Diperlukan
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Untuk melakukan absensi, kami perlu mengakses lokasi GPS Anda untuk memverifikasi Anda berada di area sekolah.
                  Pastikan GPS perangkat Anda aktif.
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigator.geolocation.getCurrentPosition(
                  async (position) => {
                    finalLatitude = position.coords.latitude;
                    finalLongitude = position.coords.longitude;
                    setGpsLoading(false);
                    isProcessingScan.current = false; // Reset flag after getting GPS
                    await sendAttendanceRequest(tokenString, finalLatitude, finalLongitude);
                  },
                  (error) => {
                    setGpsLoading(false);
                    playErrorFeedback();
                    isProcessingScan.current = false; // Reset flag on error
                    let errorMsg = "Gagal mendapatkan lokasi GPS.";
                    if (error.code === error.PERMISSION_DENIED) {
                      errorMsg = "Akses lokasi diblokir. Buka Pengaturan > Privasi & Keamanan > Layanan Lokasi dan izinkan akses lokasi untuk Safari/browser ini.";
                    }
                    setScanResult({
                      status: "error",
                      message: errorMsg
                    });
                    toast.error("Izin GPS dibutuhkan!");
                  },
                  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-emerald-600 hover:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      ), { duration: Infinity });
    } else {
      setGpsLoading(false);
      isProcessingScan.current = false; // Reset flag if no GPS needed
      await sendAttendanceRequest(tokenString, null, null);
    }
  }

  async function sendAttendanceRequest(tokenString: string, latitude: number | null, longitude: number | null) {
    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: tokenString,
          latitude,
          longitude
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan absensi.");
      }

      // Sukses absensi
      playSuccessFeedback();
      setScanResult({
        status: "success",
        message: `ABSENSI BERHASIL! Tercatat sebagai ${data.kehadiran.status} pada ${data.kehadiran.waktuMasuk} WIB`
      });
      toast.success("Absensi Sukses!");
      fetchDashboardData(); // Refresh data statistik & riwayat
    } catch (err) {
      const error = err as Error;
      playErrorFeedback();
      setScanResult({
        status: "error",
        message: error.message || "Gagal memproses absensi."
      });
      toast.error(error.message || "Gagal Absen.");
    }
  }

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

  // Menentukan warna progress bulat kehadiran
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
      {/* HEADER BAR */}
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
          {/* Theme Toggle Button */}
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

      {/* BODY CONTENT */}
      <main className={`flex-1 p-6 space-y-6 overflow-y-auto pb-24 ${isScanning ? "hidden" : ""}`}>
          {/* iOS PWA Install Education Banner */}
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
                ✕
              </button>
            </div>
          )}

          {/* PROFILE CARD */}
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
                  Kelas {profile.kelas} • NISN {profile.nisn}
                </p>
                {profile.sedangMagang && (
                  <span className="inline-block mt-2 text-[10px] bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 px-2 py-0.5 rounded font-semibold uppercase">
                    Status: Sedang Magang/PKL
                  </span>
                )}
              </div>
            </div>
          )}

          {/* WARNING BLOKIR SESI GANDA */}
          {profile?.isAbsenDiblokir && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 flex gap-3 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="font-bold text-sm">Pemindaian Diblokir!</h4>
                <p className="text-xs mt-1 leading-relaxed">
                  Kami mendeteksi aktivitas login sharing di perangkat lain. Pemindaian QR diblokir selama{" "}
                  <span className="font-bold font-mono bg-red-100 dark:bg-red-950 px-1 py-0.5 rounded">
                    {Math.floor(profile.detikBlokirTersisa / 60)}m {profile.detikBlokirTersisa % 60}s
                  </span>{" "}
                  untuk keamanan sesi tunggal.
                </p>
              </div>
            </div>
          )}

          {/* VISUAL MONTHLY ATTENDANCE GAUGE */}
          {stats && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col items-center">
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-4 text-center">
                Kehadiran Bulan Ini
              </h4>

              <div className="relative flex items-center justify-center w-40 h-40">
                {/* SVG Progress Circle */}
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
                    className={`transition-all duration-1000 ease-out ${getProgressColor()}`}
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

              {/* Status Indicator text */}
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

              {/* Mini detail counters */}
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

          {/* 7-DAY HISTORY */}
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

          {/* DISPENSASI KETERLAMBATAN CARD */}
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
                    {dispSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    <span>Kirim Pengajuan</span>
                  </button>
                </div>
              </form>
            )}

            {/* Riwayat Pengajuan Dispensasi */}
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

        {/* CAMERA SCANNER SCREEN */}
        <main className={`flex-1 flex flex-col bg-black text-white p-6 relative ${isScanning ? "" : "hidden"}`}>
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setIsScanning(false)}
              className="flex items-center gap-1.5 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-semibold transition-all text-xs border border-zinc-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <h3 className="font-bold text-sm text-emerald-400 uppercase tracking-widest">
              Scan Absen QR
            </h3>
            <div className="w-16"></div> {/* Spacer */}
          </div>

          <div className={`flex-1 flex flex-col justify-center items-center ${scanResult ? "hidden" : ""}`}>
              {/* Style tag helper to force injected video to scale properly */}
              <style dangerouslySetInnerHTML={{__html: `
                #reader video {
                  width: 100% !important;
                  height: 100% !important;
                  object-fit: cover !important;
                }
              `}} />

              {/* CONTAINER PEMBUNGKUS SCANNER */}
              <div className="w-72 h-72 rounded-3xl overflow-hidden border-4 border-emerald-500/80 shadow-2xl relative bg-zinc-900 mb-6">
                {/* ELEMEN SCANNER CONTAINER (Dibiarkan kosong tanpa anak React agar tidak crash removeChild saat unmount) */}
                <div id="reader" className="w-full h-full" />

                {/* SKELETON LOADER SELAMA INISIALISASI KAMERA */}
                {!scannerInitialized && (
                  <div className="absolute inset-0 bg-zinc-900 z-20 flex flex-col items-center justify-center text-center p-4">
                    <Camera className="w-12 h-12 mx-auto text-zinc-500 animate-bounce mb-2" />
                    <span className="text-xs text-zinc-500 font-semibold uppercase">Mengaktifkan Kamera...</span>
                  </div>
                )}

                {/* Laser scan lines */}
                {scannerInitialized && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400 opacity-60 animate-bounce z-10"></div>
                )}
              </div>

              {/* BUTTON CONTROLS (Min. 48px touch area) */}
              {scannerInitialized && (
                <div className="flex justify-center items-center gap-6 mt-2 mb-6">
                  {/* Switch Camera */}
                  {cameras.length > 1 && (
                    <button
                      onClick={handleSwitchCamera}
                      className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 rounded-full flex items-center justify-center transition-all cursor-pointer border border-zinc-700 text-zinc-300"
                      title="Balik Kamera"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  )}
                  {/* Zoom Toggle */}
                  <button
                    onClick={handleToggleZoom}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                      zoomLevel > 1
                        ? "bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/20"
                        : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                    }`}
                    title="Perbesar Kamera"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  {/* Flash Toggle */}
                  <button
                    onClick={handleToggleFlash}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                      flashOn
                        ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20"
                        : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                    }`}
                    title="Nyalakan Flashlight"
                  >
                    <Zap className="w-5 h-5" />
                  </button>
                </div>
              )}

              <p className="text-xs text-zinc-400 text-center max-w-xs mt-6 leading-relaxed">
                Posisikan kotak QR TV lobi berada di dalam area pemindai kamera.{geofencingAktif ? " GPS HP Anda wajib diaktifkan." : " GPS tidak dibutuhkan."}
              </p>
              
              {/* SIMULATED SCAN BUTTON IN DEVELOPMENT */}
              {process.env.NODE_ENV !== "production" && (
                <div className="mt-8 pt-6 border-t border-zinc-800/80 w-full flex flex-col items-center">
                  <button
                    onClick={() => setShowSimulateInput(!showSimulateInput)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 underline font-medium transition-colors"
                  >
                    {showSimulateInput ? "Sembunyikan Simulasi" : "Simulasi Pemindaian (Dev Mode)"}
                  </button>

                  {showSimulateInput && (
                    <div className="mt-4 flex flex-col gap-3 w-full">
                      <input
                        type="text"
                        placeholder="Masukkan Token QR Terenkripsi"
                        value={simulatedToken}
                        onChange={(e) => setSimulatedToken(e.target.value)}
                        className="w-full text-base bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        onClick={async () => {
                          if (!simulatedToken.trim()) {
                            toast.error("Token simulasi kosong!");
                            return;
                          }
                          await kirimAbsensi(simulatedToken.trim());
                        }}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold tracking-wider transition-colors cursor-pointer"
                      >
                        Tembak Token Simulasi
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SCAN RESULT SCREEN WITH ELASTIC CHANGER FEEDBACK */}
            <div className={`flex-grow flex flex-col items-center justify-center text-center animate-pulse ${scanResult ? "" : "hidden"}`}>
              {scanResult && (
                scanResult.status === "success" ? (
                  <div className="space-y-6">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 scale-110 duration-500 animate-bounce">
                      <CheckCircle className="w-16 h-16" />
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-400">ABSENSI BERHASIL</h3>
                    <p className="text-sm text-zinc-300 max-w-xs mx-auto leading-relaxed">
                      {scanResult.message}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/10 animate-bounce">
                      <XCircle className="w-16 h-16" />
                    </div>
                    <h3 className="text-2xl font-bold text-red-500">ABSENSI GAGAL</h3>
                    <p className="text-sm text-zinc-300 max-w-xs mx-auto leading-relaxed">
                      {scanResult.message}
                    </p>
                  </div>
                )
              )}

              <button
                onClick={() => {
                  setScanResult(null);
                  setIsScanning(false);
                }}
                className="mt-12 py-3 px-8 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold border border-zinc-700 transition-colors cursor-pointer"
              >
                Kembali ke Dashboard
              </button>
            </div>
          </main>

      {/* GPS LOADING SCREEN OVERLAY */}
      {gpsLoading && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col justify-center items-center text-white">
          <div className="relative flex items-center justify-center w-16 h-16 bg-emerald-600/30 rounded-full mb-4">
            <MapPin className="w-8 h-8 text-emerald-400 animate-bounce" />
            <span className="absolute w-full h-full rounded-full border-4 border-emerald-400/50 animate-ping"></span>
          </div>
          <p className="font-semibold text-sm">Mengambil Lokasi GPS Perangkat...</p>
          <span className="text-xs text-zinc-400 mt-2">Pastikan GPS aktif dan berada di radius sekolah.</span>
        </div>
      )}

      {/* BOTTOM ACTION BUTTON */}
      <div className={`absolute bottom-0 left-0 w-full p-4 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200/50 dark:border-zinc-800/50 z-10 flex justify-center ${isScanning ? "hidden" : ""}`}>
        <button
          onClick={() => {
            if (profile?.isAbsenDiblokir) {
              toast.error("Akun Anda diblokir sementara karena deteksi sesi ganda!");
              return;
            }
            setIsScanning(true);
          }}
          disabled={profile?.isAbsenDiblokir}
          className="w-full max-w-xs py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/30 hover:shadow-emerald-700/40 flex items-center justify-center gap-2.5 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Camera className="w-5 h-5" />
          <span>Mulai Scan Absen Masuk</span>
        </button>
      </div>
    </div>
  );
}
