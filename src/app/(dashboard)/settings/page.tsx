"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Settings,
  MapPin,
  Clock,
  Database,
  Smartphone,
  ShieldAlert,
  Save,
  Send,
  Loader2,
  Download,
  ArrowUpCircle,
  Award,
  RefreshCw,
  Info,
  CheckCircle,
  XCircle
} from "lucide-react";

interface SettingItem {
  id: number;
  kunci: string;
  nilai: string;
}

interface WaStatus {
  success?: boolean;
  status: "CONNECTED" | "DISCONNECTED";
  deviceName?: string;
  deviceNumber?: string;
  quota: number;
  expired?: string;
  error?: string;
}

interface Kelas {
  id: number;
  nama: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [geofencingAktif, setGeofencingAktif] = useState(true);

  // Database settings
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("");
  const [jamMasuk, setJamMasuk] = useState("");
  const [jamToleransi, setJamToleransi] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waUrl, setWaUrl] = useState("");
  const [waDelayMin, setWaDelayMin] = useState("");
  const [waDelayMax, setWaDelayMax] = useState("");

  // WA Diagnostic status states
  const [waStatus, setWaStatus] = useState<WaStatus | null>(null);
  const [checkingWa, setCheckingWa] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Lifecycle states
  const [classesList, setClassesList] = useState<Kelas[]>([]);
  const [sourceClass, setSourceClass] = useState("");
  const [targetClass, setTargetClass] = useState("");
  const [graduatingClass, setGraduatingClass] = useState("");
  const [processingLifecycle, setProcessingLifecycle] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [downloadingDefaultUsers, setDownloadingDefaultUsers] = useState(false);
  const [cleaningToday, setCleaningToday] = useState(false);

  const fetchSettingsAndData = async () => {
    setLoading(true);
    try {
      // 1. Fetch system configs
      const resSettings = await fetch("/api/admin/settings");
      const dataSettings = await resSettings.json();
      if (!resSettings.ok) throw new Error(dataSettings.error || "Gagal memuat pengaturan.");

      const sMap = new Map<string, string>();
      dataSettings.settings.forEach((s: SettingItem) => {
        sMap.set(s.kunci, s.nilai);
      });

      setLat(sMap.get("gps_sekolah_latitude") || sMap.get("sekolah_latitude") || "");
      setLng(sMap.get("gps_sekolah_longitude") || sMap.get("sekolah_longitude") || "");
      setRadius(sMap.get("gps_sekolah_radius") || sMap.get("sekolah_radius_meter") || "");
      setGeofencingAktif(sMap.get("gps_geofencing_aktif") !== "false");
      setJamMasuk(sMap.get("jam_masuk") || "07:00");
      setJamToleransi(sMap.get("jam_toleransi") || sMap.get("jam_toleransi_telat") || "07:15");
      setWaToken(sMap.get("wa_gateway_token") || "");
      setWaUrl(sMap.get("wa_gateway_url") || "https://api.fonnte.com");
      setWaDelayMin(sMap.get("wa_delay_min") || "2");
      setWaDelayMax(sMap.get("wa_delay_max") || "5");

      // 2. Fetch classes for lifecycle dropdown
      const resReports = await fetch("/api/reports");
      const dataReports = await resReports.json();
      if (resReports.ok && dataReports.daftarKelas) {
        setClassesList(dataReports.daftarKelas);
      }

      // 3. Trigger WhatsApp gateway check
      checkWaGateway();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengambil data pengaturan.");
    } finally {
      setLoading(false);
    }
  };

  const checkWaGateway = async () => {
    setCheckingWa(true);
    try {
      const res = await fetch("/api/admin/wa-status");
      const result = await res.json();
      setWaStatus(result);
    } catch (err) {
      setWaStatus({ status: "DISCONNECTED", quota: 0, error: "Koneksi gateway gagal." });
    } finally {
      setCheckingWa(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndData();
  }, []);

  // Save Settings Changes
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      const payload = {
        settings: [
          { kunci: "gps_sekolah_latitude", nilai: lat },
          { kunci: "gps_sekolah_longitude", nilai: lng },
          { kunci: "gps_sekolah_radius", nilai: radius },
          { kunci: "gps_geofencing_aktif", nilai: geofencingAktif ? "true" : "false" },
          { kunci: "jam_masuk", nilai: jamMasuk },
          { kunci: "jam_toleransi", nilai: jamToleransi },
          { kunci: "wa_gateway_token", nilai: waToken },
          { kunci: "wa_gateway_url", nilai: waUrl },
          { kunci: "wa_delay_min", nilai: waDelayMin },
          { kunci: "wa_delay_max", nilai: waDelayMax }
        ]
      };

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan pengaturan.");

      toast.success("Pengaturan sistem berhasil diperbarui.");
      // Refresh status WA gateway because token might have changed
      checkWaGateway();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pengaturan.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Get current mobile/browser GPS location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser Anda tidak mendukung deteksi lokasi GPS.");
      return;
    }

    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude.toString());
        setLng(longitude.toString());
        toast.success(`Berhasil mendapatkan lokasi GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setLoadingGps(false);
      },
      (error) => {
        setLoadingGps(false);
        let errorMsg = "Gagal mengambil lokasi GPS.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Akses lokasi ditolak. Harap aktifkan GPS dan izinkan lokasi pada browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Informasi lokasi tidak tersedia. Pastikan GPS aktif.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Waktu pencarian GPS habis.";
        }
        toast.error(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Send Test Message
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber.trim()) {
      toast.error("Masukkan nomor tujuan uji coba!");
      return;
    }

    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/wa-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telepon: testNumber })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Uji coba pengiriman gagal.");

      toast.success(result.message || "Pesan uji coba terkirim!");
      setTestNumber("");
    } catch (err: any) {
      toast.error(err.message || "Uji coba WA gagal.");
    } finally {
      setSendingTest(false);
    }
  };

  // Perform Student Class Promotion
  const handlePromoteStudents = async () => {
    if (!sourceClass || !targetClass) {
      toast.error("Pilih kelas asal dan kelas tujuan!");
      return;
    }

    const cSource = classesList.find(c => c.id.toString() === sourceClass)?.nama;
    const cTarget = classesList.find(c => c.id.toString() === targetClass)?.nama;

    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white dark:bg-zinc-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <ArrowUpCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Konfirmasi Kenaikan Kelas Massal
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Anda yakin ingin MENAIKKAN KELAS seluruh siswa aktif dari Kelas <span className="font-semibold">{cSource}</span> ke Kelas <span className="font-semibold">{cTarget}</span>?
                Tindakan ini akan memperbarui database siswa secara massal.
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-zinc-700">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setProcessingLifecycle(true);
              try {
                const res = await fetch("/api/admin/lifecycle", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "promote",
                    sourceClassId: sourceClass,
                    targetClassId: targetClass
                  })
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Gagal melaksanakan kenaikan kelas.");

                toast.success(result.message || "Kenaikan kelas massal selesai.");
                setSourceClass("");
                setTargetClass("");
              } catch (err: any) {
                toast.error(err.message || "Proses kenaikan kelas gagal.");
              } finally {
                setProcessingLifecycle(false);
              }
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Ya, Lanjutkan
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

  // Perform Alumni Graduation
  const handleGraduateStudents = async () => {
    if (!graduatingClass) {
      toast.error("Pilih kelas XII alumni!");
      return;
    }

    const cGrad = classesList.find(c => c.id.toString() === graduatingClass)?.nama;

    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white dark:bg-zinc-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Konfirmasi Kelulusan Siswa (Alumni)
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                PERINGATAN SANGAT PENTING: Anda yakin ingin MELULUSKAN seluruh siswa di Kelas <span className="font-semibold">{cGrad}</span>?
                Tindakan ini akan menonaktifkan status aktif login seluruh siswa di kelas tersebut (menjadikan mereka ALUMNI).
                Data kehadiran lampau mereka akan tetap tersimpan.
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-zinc-700">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setProcessingLifecycle(true);
              try {
                const res = await fetch("/api/admin/lifecycle", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "graduate",
                    classId: graduatingClass
                  })
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Gagal memproses kelulusan.");

                toast.success(result.message || "Proses kelulusan alumni massal selesai.");
                setGraduatingClass("");
              } catch (err: any) {
                toast.error(err.message || "Proses kelulusan gagal.");
              } finally {
                setProcessingLifecycle(false);
              }
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Ya, Luluskan
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

  // Kirim Laporan Ringkas Harian WA secara manual ke seluruh Wali Kelas
  const handleSendManualDigest = async () => {
    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white dark:bg-zinc-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <Send className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Konfirmasi Pengiriman Laporan WA
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Apakah Anda yakin ingin mengirimkan Laporan Absensi Harian WhatsApp ke seluruh Wali Kelas sekarang secara manual?
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-zinc-700">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setSendingDigest(true);
              try {
                const res = await fetch("/api/cron/wa-digest");
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Gagal mengirim laporan harian.");

                toast.success(result.message || `Laporan harian berhasil dikirim ke ${result.results?.length || 0} Wali Kelas.`);
              } catch (err: any) {
                toast.error(err.message || "Proses pengiriman laporan gagal.");
              } finally {
                setSendingDigest(false);
              }
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Ya, Kirim
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

  // Unduh daftar pengguna dengan password default
  const handleDownloadDefaultUsers = async () => {
    setDownloadingDefaultUsers(true);
    try {
      const res = await fetch("/api/admin/users?download=true");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengambil data pengguna.");

      const users = data.users || [];
      if (users.length === 0) {
        toast.success("Tidak ada pengguna yang menggunakan password default.");
        return;
      }

      // Convert ke CSV sederhana
      const headers = ["Nama", "Email", "Peran", "NIP", "Telepon"];
      const rows = users.map((u: any) => [
        u.nama,
        u.email,
        u.peran,
        u.nip || "-",
        u.telepon || "-"
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `User_Password_Default_${new Date().getFullYear()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Berhasil mengunduh ${users.length} data pengguna.`);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunduh data.");
    } finally {
      setDownloadingDefaultUsers(false);
    }
  };

  // Hapus data absensi hari ini secara massal
  const handleCleanTodayData = async () => {
    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white dark:bg-zinc-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Konfirmasi Hapus Data Absensi Hari Ini
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                PERINGATAN: Anda yakin ingin menghapus SELURUH data kehadiran dan log WhatsApp hari ini?
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-zinc-700">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setCleaningToday(true);
              try {
                const res = await fetch("/api/admin/settings", {
                  method: "DELETE"
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Gagal menghapus data hari ini.");
                toast.success(result.message || "Data hari ini berhasil dibersihkan.");
              } catch (err: any) {
                toast.error(err.message || "Gagal membersihkan data.");
              } finally {
                setCleaningToday(false);
              }
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Ya, Hapus Permanen
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Check if WhatsApp quota is low
  const isQuotaLow = waStatus && waStatus.success && waStatus.quota < 100;

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-600" />
          <span>Pengaturan Sistem</span>
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
          Kelola koordinat GPS sekolah, setelan jam toleransi presensi, integrasi WhatsApp Gateway, backup database SQL, dan siklus promosi siswa.
        </p>
      </div>

      {/* BENTO GRID CONTROL PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: CORE SYSTEM FORM (7 cols) */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-7 space-y-6">
          {/* GPS Coordinates & Geofencing Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>Lokasi Sekolah & Geofencing</span>
            </h3>

            {/* TOGGLE GEOFENCING ON/OFF */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="pr-4">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Status Pembatasan Jarak (Geofencing)</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-1 leading-relaxed">
                  Bila dinonaktifkan, siswa dapat melakukan absensi dari lokasi mana pun tanpa validasi GPS.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                <input
                  type="checkbox"
                  checked={geofencingAktif}
                  onChange={(e) => setGeofencingAktif(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Latitude GPS
                </label>
                <input
                  type="text"
                  required={geofencingAktif}
                  disabled={!geofencingAktif}
                  placeholder="Contoh: -6.824123"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Longitude GPS
                </label>
                <input
                  type="text"
                  required={geofencingAktif}
                  disabled={!geofencingAktif}
                  placeholder="Contoh: 107.135412"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex pt-1">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={loadingGps || !geofencingAktif}
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loadingGps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                <span>Gunakan Lokasi GPS HP Admin Saat Ini</span>
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                Radius Maksimal Scan (Meter)
              </label>
              <input
                type="number"
                required={geofencingAktif}
                disabled={!geofencingAktif}
                placeholder="Rekomendasi: 50"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono disabled:opacity-50"
              />
              <span className="text-[10px] text-zinc-400 mt-1.5 block">
                Siswa di luar radius ini tidak dapat memindai token QR untuk menghindari kecurangan titip absen.
              </span>
            </div>
          </div>

          {/* Timing Limits Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>Jam Masuk & Toleransi Keterlambatan</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Jam Mulai Masuk (WIB)
                </label>
                <input
                  type="time"
                  required
                  value={jamMasuk}
                  onChange={(e) => setJamMasuk(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Batas Jam Toleransi (WIB)
                </label>
                <input
                  type="time"
                  required
                  value={jamToleransi}
                  onChange={(e) => setJamToleransi(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer font-mono"
                />
              </div>
            </div>
            <span className="text-[10px] text-zinc-400 block mt-1.5 leading-relaxed">
              Siswa yang memindai melampaui Jam Mulai hingga Batas Jam Toleransi akan dicatat berstatus <span className="font-bold text-amber-500">TERLAMBAT</span>. Melampaui Batas Toleransi dianggap mangkir/Alpha.
            </span>
          </div>

          {/* Random WA Delay Queue Settings Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              <span>WhatsApp Random Queue Delay</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Minimal Delay (Detik)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 2"
                  value={waDelayMin}
                  onChange={(e) => setWaDelayMin(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Maksimal Delay (Detik)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 5"
                  value={waDelayMax}
                  onChange={(e) => setWaDelayMax(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
            <span className="text-[10px] text-zinc-400 block mt-1.5 leading-relaxed">
              Jeda acak (detik) antar pengiriman pesan ke gerbang WA untuk mematuhi kebijakan anti-spam.
            </span>
          </div>

          {/* Submit Save Button */}
          <button
            type="submit"
            disabled={savingSettings}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 cursor-pointer disabled:opacity-50"
          >
            {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>Simpan Seluruh Konfigurasi</span>
          </button>
        </form>

        {/* RIGHT COLUMN: INTEGRATION TOOLS & LIFE CYCLE (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* WhatsApp Status Console Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              <span>Konsol WhatsApp Gateway {waUrl.includes("fonnte.com") ? "(Fonnte)" : "(Open WA)"}</span>
            </h3>

            {/* WA Gateway Status Display */}
            {checkingWa ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            ) : waStatus ? (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Status Server:</span>
                  <span className={`px-2 py-0.5 rounded font-extrabold uppercase text-[9px] flex items-center gap-1 ${
                    waStatus.status === "CONNECTED"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                      : "bg-red-50 text-red-600 dark:bg-red-950/20"
                  }`}>
                    {waStatus.status === "CONNECTED" ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>Tersambung</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>Terputus</span>
                      </>
                    )}
                  </span>
                </div>

                {waStatus.deviceName && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Nama Perangkat:</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{waStatus.deviceName}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Sisa Kuota WA:</span>
                  <span className={`font-extrabold font-mono text-sm ${isQuotaLow && waUrl.includes("fonnte.com") ? "text-red-500 animate-pulse" : "text-zinc-800 dark:text-zinc-200"}`}>
                    {waUrl.includes("fonnte.com") ? `${waStatus.quota.toLocaleString()} Pesan` : "Tak Terbatas (Self-Hosted)"}
                  </span>
                </div>

                {/* Low quota alert warning */}
                {isQuotaLow && waUrl.includes("fonnte.com") && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/20 rounded-xl p-2.5 flex gap-2 text-red-600 dark:text-red-400 text-[10px] leading-relaxed">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Peringatan: Saldo sisa kuota WhatsApp di bawah 100 pesan! Segera lakukan isi ulang di Fonnte dashboard.
                    </span>
                  </div>
                )}

                {waStatus.error && (
                  <p className="text-[10px] text-red-500 italic leading-relaxed">
                    Err: {waStatus.error}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">Belum diperiksa.</p>
            )}

            {/* WhatsApp Gateway URL input */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                WhatsApp Gateway URL (Fonnte / Open WA)
              </label>
              <input
                type="text"
                placeholder="Contoh: https://api.fonnte.com atau http://localhost:8080"
                value={waUrl}
                onChange={(e) => setWaUrl(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Fonnte API Token config input */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                WhatsApp API Token / Key
              </label>
              <input
                type="password"
                placeholder="Masukkan Token Fonnte atau API Key Open WA..."
                value={waToken}
                onChange={(e) => setWaToken(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Check health connection button */}
            <button
              type="button"
              onClick={checkWaGateway}
              disabled={checkingWa}
              className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingWa ? "animate-spin" : ""}`} />
              <span>Cek Kesehatan Gateway</span>
            </button>

            {/* Diagnostics Message Test Form */}
            <form onSubmit={handleSendTestMessage} className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Uji Coba Pengiriman WA Diagnostik
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="No HP: 0812..."
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Tes</span>
                </button>
              </div>
            </form>
          </div>

          {/* Laporan WhatsApp Manual Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Send className="w-5 h-5 text-emerald-600" />
              <span>Laporan Ringkas Wali Kelas</span>
            </h3>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Kirim laporan ringkasan kehadiran harian (hadir, telat, sakit, izin, alpha) secara manual ke seluruh nomor WhatsApp Wali Kelas yang terdaftar saat ini.
            </p>

            <button
              type="button"
              onClick={handleSendManualDigest}
              disabled={sendingDigest}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-50"
            >
              {sendingDigest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim Laporan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Laporan Harian Ke Wali Kelas</span>
                </>
              )}
            </button>
          </div>

          {/* Database cPanel Backup Exporter Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Database className="w-5 h-5 text-emerald-600" />
              <span>Pencadangan Database</span>
            </h3>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Ekspor seluruh skema dan relasi data absensi ke format SQL script. Berkas ini 100% kompatibel untuk di-import langsung di Hosting cPanel (phpMyAdmin).
            </p>

            <a
              href="/api/admin/backup-db"
              download
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-zinc-800/10 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Database (.sql)</span>
            </a>
          </div>

          {/* Clean Today's Attendance Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>Hapus Data Absensi Hari Ini</span>
            </h3>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Menghapus seluruh data kehadiran siswa dan antrean log WA yang terdata hari ini. Gunakan fitur ini jika ingin mengulang kembali pengujian/proses auto-alpha dari awal.
            </p>

            <button
              type="button"
              onClick={handleCleanTodayData}
              disabled={cleaningToday}
              className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-600/10 cursor-pointer disabled:opacity-50"
            >
              {cleaningToday ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menghapus Data...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Hapus Data Hari Ini</span>
                </>
              )}
            </button>
          </div>

          {/* User Security Auditor Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>Audit Keamanan Pengguna</span>
            </h3>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Unduh daftar Guru dan Staf yang <b>belum mengganti</b> kata sandi bawaan sistem (Password Sementara).
            </p>

            <button
              type="button"
              onClick={handleDownloadDefaultUsers}
              disabled={downloadingDefaultUsers}
              className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {downloadingDefaultUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Unduh Daftar User Password Default</span>
            </button>
          </div>

          {/* Student Lifecycle Manager Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Award className="w-5 h-5 text-emerald-600" />
              <span>Siklus Tahun Ajaran Baru</span>
            </h3>

            {/* Mass Class Promotion Panel */}
            <div className="space-y-3">
              <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                1. Kenaikan Kelas Massal
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-400 block mb-1">Dari Kelas</label>
                  <select
                    value={sourceClass}
                    onChange={(e) => setSourceClass(e.target.value)}
                    disabled={processingLifecycle}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="">Pilih</option>
                    {classesList.map(c => (
                      <option key={c.id} value={c.id.toString()}>{c.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 block mb-1">Ke Kelas Baru</label>
                  <select
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    disabled={processingLifecycle}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="">Pilih</option>
                    {classesList.map(c => (
                      <option key={c.id} value={c.id.toString()}>{c.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePromoteStudents}
                disabled={processingLifecycle || !sourceClass || !targetClass}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {processingLifecycle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                <span>Pindahkan Siswa Kelas</span>
              </button>
            </div>

            {/* Mass Graduation Panel */}
            <div className="space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <span className="block text-[10px] font-bold text-red-500 uppercase tracking-wider">
                2. Kelulusan Siswa (Alumni)
              </span>
              <div>
                <label className="text-[9px] text-zinc-400 block mb-1">Pilih Kelas XII Alumni</label>
                <select
                  value={graduatingClass}
                  onChange={(e) => setGraduatingClass(e.target.value)}
                  disabled={processingLifecycle}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value="">-- Pilih Kelas XII --</option>
                  {classesList.map(c => (
                    <option key={c.id} value={c.id.toString()}>Kelas {c.nama}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleGraduateStudents}
                disabled={processingLifecycle || !graduatingClass}
                className="w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {processingLifecycle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                <span>Luluskan Sebagai Alumni</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
