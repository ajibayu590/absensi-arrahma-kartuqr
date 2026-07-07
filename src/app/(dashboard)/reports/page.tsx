"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import {
  Calendar,
  Filter,
  Download,
  Printer,
  ChevronRight,
  ChevronLeft,
  X,
  User,
  Phone,
  MessageSquare,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Save,
  Trash2,
  Send,
  Loader2,
  Activity,
  CheckCircle,
  Clock,
  HelpCircle,
  Info
} from "lucide-react";
import * as XLSX from "xlsx";

// Dynamic import of PDF components to prevent SSR errors in Next.js App Router
const RekapPdfButton = dynamic(
  () => import("@/components/pdf/RekapPdfButton"),
  { ssr: false }
);

// Types matching database schema
interface Kelas {
  id: number;
  nama: string;
}

interface Siswa {
  id: number;
  nisn: string;
  nama: string;
  teleponOrangTua: string;
  sedangMagang: boolean;
}

interface Kehadiran {
  id: number;
  idSiswa: number;
  tanggal: string;
  status: "HADIR" | "TERLAMBAT" | "SAKIT" | "IZIN" | "ALPHA";
  tanggalStr: string;
  jamMasuk: string | null;
  catatan: string | null;
}

interface HariLibur {
  tanggalStr: string;
  nama: string;
}

interface ReportData {
  daftarKelas: Kelas[];
  kelasTerpilih: Kelas | null;
  siswa: Siswa[];
  kehadiran: Kehadiran[];
  hariLibur: HariLibur[];
}

export default function ReportsPage() {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // States for filters
  const [selectedKelasId, setSelectedKelasId] = useState<string>("");
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>("");
  const [selectedBulan, setSelectedBulan] = useState<number>(new Date().getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState<number>(new Date().getFullYear());

  // Slide-over drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{
    siswa: Siswa;
    dateStr: string;
    dayNum: number;
    record: Kehadiran | null;
  } | null>(null);

  // Edit form states
  const [editStatus, setEditStatus] = useState<"HADIR" | "TERLAMBAT" | "SAKIT" | "IZIN" | "ALPHA">("HADIR");
  const [editCatatan, setEditCatatan] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        bulan: selectedBulan.toString(),
        tahun: selectedTahun.toString(),
      });
      if (selectedKelasId) {
        params.append("kelasId", selectedKelasId);
      }
      if (selectedTahunAjaran) {
        params.append("tahunAjaran", selectedTahunAjaran);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal memuat data laporan.");
      }

      setData(result);
      if (result.kelasTerpilih && !selectedKelasId) {
        setSelectedKelasId(result.kelasTerpilih.id.toString());
      }
      if (result.tahunAjaranTerpilih && !selectedTahunAjaran) {
        setSelectedTahunAjaran(result.tahunAjaranTerpilih);
      }
    } catch (err: any) {
      toast.error(err.message || "Kesalahan memuat laporan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isClient) {
      fetchReports();
    }
  }, [selectedKelasId, selectedTahunAjaran, selectedBulan, selectedTahun, isClient]);

  if (!isClient) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Generate days array for the selected month
  const totalDays = new Date(selectedTahun, selectedBulan, 0).getDate();
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Helper mapping attendance for instant O(1) lookup
  const attendanceMap = new Map<string, Kehadiran>();
  if (data?.kehadiran) {
    data.kehadiran.forEach((k) => {
      // Key: idSiswa_YYYY-MM-DD
      const key = `${k.idSiswa}_${k.tanggalStr}`;
      attendanceMap.set(key, k);
    });
  }

  // Helper mapping holidays
  const holidayMap = new Map<string, string>();
  if (data?.hariLibur) {
    data.hariLibur.forEach((hl) => {
      holidayMap.set(hl.tanggalStr, hl.nama);
    });
  }

  // Check if a specific date is weekend
  const isWeekend = (dayNum: number) => {
    const dayOfWeek = new Date(selectedTahun, selectedBulan - 1, dayNum).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Minggu, 6 = Sabtu
  };

  // Format date to YYYY-MM-DD
  const formatDateStr = (dayNum: number) => {
    const mm = String(selectedBulan).padStart(2, "0");
    const dd = String(dayNum).padStart(2, "0");
    return `${selectedTahun}-${mm}-${dd}`;
  };

  // Open drawer on grid cell click
  const handleCellClick = (siswa: Siswa, dayNum: number) => {
    const dateStr = formatDateStr(dayNum);
    const record = attendanceMap.get(`${siswa.id}_${dateStr}`) || null;

    setActiveCell({ siswa, dateStr, dayNum, record });
    setEditStatus(record ? record.status : "HADIR");
    setEditCatatan(record?.catatan || "");
    setDrawerOpen(true);
  };

  // Save manual attendance correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCell) return;

    setSavingEdit(true);
    try {
      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idSiswa: activeCell.siswa.id,
          tanggal: activeCell.dateStr,
          status: editStatus,
          catatan: editCatatan,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan presensi.");

      toast.success("Presensi berhasil diperbarui.");
      setDrawerOpen(false);
      fetchReports(); // Refresh data
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui presensi.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete attendance record (Cancel presence)
  const handleDeleteRecord = async () => {
    if (!activeCell || !activeCell.record) return;

    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white dark:bg-zinc-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Konfirmasi Pembatalan Absensi
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Apakah Anda yakin ingin membatalkan dan menghapus catatan absensi ini? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-zinc-700">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setSavingEdit(true);
              try {
                const res = await fetch("/api/attendance/manual", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    idKehadiran: activeCell.record?.id,
                  }),
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Gagal membatalkan presensi.");

                toast.success("Catatan absensi berhasil dibatalkan.");
                setDrawerOpen(false);
                fetchReports(); // Refresh data
              } catch (err: any) {
                toast.error(err.message || "Gagal membatalkan absensi.");
              } finally {
                setSavingEdit(false);
              }
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Ya, Hapus
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

  // Count metrics for a student in this month
  const getStudentStats = (siswaId: number) => {
    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpha = 0;

    daysArray.forEach((d) => {
      const dStr = formatDateStr(d);
      const k = attendanceMap.get(`${siswaId}_${dStr}`);
      if (k) {
        if (k.status === "HADIR") hadir++;
        else if (k.status === "TERLAMBAT") terlambat++;
        else if (k.status === "SAKIT") sakit++;
        else if (k.status === "IZIN") izin++;
        else if (k.status === "ALPHA") alpha++;
      }
    });

    // Hari kerja efektif = total hari - weekend - hari libur kustom
    let hariEfektif = 0;
    daysArray.forEach((d) => {
      const dStr = formatDateStr(d);
      if (!isWeekend(d) && !holidayMap.has(dStr)) {
        hariEfektif++;
      }
    });

    const totalMasuk = hadir + terlambat;
    const persentase = hariEfektif > 0 ? Math.round((totalMasuk / hariEfektif) * 100) : 100;

    return { hadir, terlambat, sakit, izin, alpha, persentase, hariEfektif };
  };

  // Export to Excel with conditional color format simulation
  const handleExportExcel = () => {
    if (!data || data.siswa.length === 0) {
      toast.error("Tidak ada data untuk diekspor!");
      return;
    }

    const headers = ["No", "NISN", "Nama Siswa", ...daysArray.map(String), "Hadir", "Telat", "Sakit", "Izin", "Alpha", "% Kehadiran"];

    const excelData = data.siswa.map((s, idx) => {
      const stats = getStudentStats(s.id);
      const row: any = {
        No: idx + 1,
        NISN: s.nisn,
        "Nama Siswa": s.nama,
      };

      // Set cell values for each day
      daysArray.forEach((d) => {
        const dStr = formatDateStr(d);
        const k = attendanceMap.get(`${s.id}_${dStr}`);
        let code = "-";
        if (k) {
          if (k.status === "HADIR") code = "H";
          else if (k.status === "TERLAMBAT") code = "T";
          else if (k.status === "SAKIT") code = "S";
          else if (k.status === "IZIN") code = "I";
          else if (k.status === "ALPHA") code = "A";
        } else if (isWeekend(d)) {
          code = "L (Weekend)";
        } else if (holidayMap.has(dStr)) {
          code = `L (${holidayMap.get(dStr)})`;
        } else if (s.sedangMagang) {
          code = "M (Magang)";
        }
        row[String(d)] = code;
      });

      row["Hadir"] = stats.hadir;
      row["Telat"] = stats.terlambat;
      row["Sakit"] = stats.sakit;
      row["Izin"] = stats.izin;
      row["Alpha"] = stats.alpha;
      row["% Kehadiran"] = `${stats.persentase}%`;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Presensi");

    // Write file
    XLSX.writeFile(
      workbook,
      `Rekap_Absensi_Kelas_${data.kelasTerpilih?.nama || "Unknown"}_${selectedBulan}_${selectedTahun}.xlsx`
    );

    // Create a Blob to simulate profissional download with headers (optional if XLSX is enough)
    toast.success("Excel laporan berhasil diunduh.");
  };

  // Generate local wa.me template url for parents of Alpha students
  const getWaMeUrl = (siswa: Siswa, dateStr: string, currentStatus: string) => {
    const dateObj = new Date(dateStr);
    const dayName = dateObj.toLocaleDateString("id-ID", { weekday: "long" });
    const formattedDate = dateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const message = `Assalamu'alaikum Wr. Wb. Bapak/Ibu Wali dari *${siswa.nama}*. Kami dari pihak sekolah SMK Ar Rahma mengabarkan bahwa pada *${dayName}*, *${formattedDate}*, putra/putri Bapak/Ibu terdata *${currentStatus}* di sekolah. Mohon konfirmasi keterangannya ke Wali Kelas. Terima kasih.`;
    const phoneClean = siswa.teleponOrangTua.replace(/[^0-9]/g, "");

    return `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(message)}`;
  };

  // PDF design styles and layout have been moved to a separate modular file src/components/pdf/RekapAbsensiPdf.tsx to prevent SSR dynamic render failures.

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            <span>Laporan & Laci Wali</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Kelola rekap presensi kelas bulanan, ekspor data, cetak PDF resmi, dan perbarui status siswa secara manual.
          </p>
        </div>

        {/* Action Buttons */}
        {data && data.siswa.length > 0 && (
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Excel Download Button */}
            <button
              onClick={handleExportExcel}
              className="py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer grow md:grow-0 justify-center"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel</span>
            </button>

            {/* PDF Download Button (Client-side rendering guard) */}
            {isClient && (
              <RekapPdfButton
                kelasNama={data.kelasTerpilih?.nama || "-"}
                bulanNama={new Date(selectedTahun, selectedBulan - 1, 1).toLocaleDateString("id-ID", { month: "long" })}
                tahun={selectedTahun}
                siswaList={data.siswa.map((s, idx) => {
                  const stats = getStudentStats(s.id);
                  return {
                    no: idx + 1,
                    nisn: s.nisn,
                    nama: s.nama,
                    hadir: stats.hadir,
                    terlambat: stats.terlambat,
                    sakit: stats.sakit,
                    izin: stats.izin,
                    alpha: stats.alpha,
                    persentase: stats.persentase,
                  };
                })}
              />
            )}
          </div>
        )}
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-4 shadow-sm flex flex-wrap gap-4 items-end">
        {/* Tahun Ajaran Selection */}
        <div className="w-full md:w-1/5">
          <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
            Tahun Ajaran
          </label>
          <select
            value={selectedTahunAjaran}
            onChange={(e) => setSelectedTahunAjaran(e.target.value)}
            disabled={loading}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
          >
            <option value="">-- Semua --</option>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data as any)?.daftarTahunAjaran?.map((ta: string) => (
              <option key={ta} value={ta}>
                {ta}
              </option>
            ))}
          </select>
        </div>

        {/* Class Selection Dropdown */}
        <div className="w-full md:w-1/4">
          <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-emerald-600" />
            <span>Pilih Kelas</span>
          </label>
          <select
            value={selectedKelasId}
            onChange={(e) => setSelectedKelasId(e.target.value)}
            disabled={loading || !data}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer disabled:opacity-60"
          >
            <option value="" disabled>-- Pilih Kelas --</option>
            {data?.daftarKelas.map((c) => (
              <option key={c.id} value={c.id.toString()}>
                Kelas {c.nama}
              </option>
            ))}
          </select>
        </div>

        {/* Month Selection Dropdown */}
        <div className="w-full md:w-1/4">
          <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
            Pilih Bulan
          </label>
          <select
            value={selectedBulan}
            onChange={(e) => setSelectedBulan(parseInt(e.target.value, 10))}
            disabled={loading}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
          >
            {[
              { id: 1, nama: "Januari" },
              { id: 2, nama: "Februari" },
              { id: 3, nama: "Maret" },
              { id: 4, nama: "April" },
              { id: 5, nama: "Mei" },
              { id: 6, nama: "Juni" },
              { id: 7, nama: "Juli" },
              { id: 8, nama: "Agustus" },
              { id: 9, nama: "September" },
              { id: 10, nama: "Oktober" },
              { id: 11, nama: "November" },
              { id: 12, nama: "Desember" }
            ].map((m) => (
              <option key={m.id} value={m.id}>
                {m.nama}
              </option>
            ))}
          </select>
        </div>

        {/* Year Selection Dropdown */}
        <div className="w-full md:w-1/4">
          <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
            Pilih Tahun
          </label>
          <select
            value={selectedTahun}
            onChange={(e) => setSelectedTahun(parseInt(e.target.value, 10))}
            disabled={loading}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                Tahun {y}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchReports}
          disabled={loading}
          className="w-full md:w-auto py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Refresh</span>
        </button>
      </div>

      {/* SKELETON LOADER OR EMPTY STATES */}
      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-12 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-zinc-400 text-xs italic">Memuat kueri data absensi kelas...</p>
          </div>
        </div>
      ) : !data || data.siswa.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-12 text-center shadow-sm">
          <div className="max-w-md mx-auto space-y-3">
            <AlertCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
            <h3 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">Tidak Ada Data Siswa</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Belum ada siswa aktif yang terdaftar di kelas terpilih, atau parameter kueri Anda menghasilkan catatan kosong. Silakan periksa kembali filter Anda.
            </p>
          </div>
        </div>
      ) : (
        /* INTERACTIVE ATTENDANCE GRID BLOCK */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          {/* Legend Banner */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex flex-wrap gap-4 text-xs">
            <span className="text-zinc-500 font-bold uppercase tracking-wider mr-2 self-center text-[10px]">Indikator:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-emerald-600 rounded-md" />
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">Hadir (H)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-amber-500 rounded-md" />
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">Telat (T)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-blue-500 rounded-md" />
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">Sakit (S)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-indigo-500 rounded-md" />
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">Izin (I)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-red-600 rounded-md" />
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">Alpha (A)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md" />
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">Libur/Weekend (-)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-purple-100 dark:bg-purple-950/30 border border-purple-200/30 rounded-md" />
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">PKL / Magang (M)</span>
            </div>
          </div>

          {/* Table Container with Sticky Column & Row */}
          <div className="overflow-x-auto max-w-full">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  {/* Sticky corner header cell */}
                  <th className="sticky left-0 top-0 bg-zinc-50 dark:bg-zinc-950 p-4 font-bold text-xs text-zinc-500 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800 z-30 min-w-[200px]">
                    Nama Siswa
                  </th>
                  {/* Calendar Days headers */}
                  {daysArray.map((d) => {
                    const dStr = formatDateStr(d);
                    const isHoliday = holidayMap.has(dStr);
                    const label = isHoliday ? holidayMap.get(dStr) : "";
                    const weekend = isWeekend(d);

                    return (
                      <th
                        key={d}
                        title={label || undefined}
                        className={`p-2 text-center text-[10px] font-bold border-r border-zinc-200 dark:border-zinc-800/50 min-w-[36px] select-none ${
                          weekend
                            ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-400"
                            : isHoliday
                            ? "bg-red-50 dark:bg-red-950/20 text-red-500"
                            : "bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        <div className="font-mono">{d}</div>
                        <div className="text-[8px] font-normal uppercase opacity-75 mt-0.5">
                          {new Date(selectedTahun, selectedBulan - 1, d)
                            .toLocaleDateString("id-ID", { weekday: "narrow" })
                            .slice(0, 1)}
                        </div>
                      </th>
                    );
                  })}
                  {/* Summary Metric headers */}
                  <th className="p-3 text-center text-xs font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-950 min-w-[48px]">H</th>
                  <th className="p-3 text-center text-xs font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-950 min-w-[48px]">T</th>
                  <th className="p-3 text-center text-xs font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-950 min-w-[48px]">S</th>
                  <th className="p-3 text-center text-xs font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-950 min-w-[48px]">I</th>
                  <th className="p-3 text-center text-xs font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-950 min-w-[48px]">A</th>
                  <th className="p-3 text-center text-xs font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-950 min-w-[64px] border-l border-zinc-200 dark:border-zinc-800">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.siswa.map((s) => {
                  const stats = getStudentStats(s.id);
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors"
                    >
                      {/* Sticky student name column */}
                      <td className="sticky left-0 bg-white dark:bg-zinc-900 p-4 border-r border-zinc-200 dark:border-zinc-800 z-10 font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                        <div>
                          <div className="truncate max-w-[180px]">{s.nama}</div>
                          <span className="font-mono text-[9px] text-zinc-400 font-normal">NISN {s.nisn}</span>
                        </div>
                      </td>

                      {/* Interactive grid cells */}
                      {daysArray.map((d) => {
                        const dStr = formatDateStr(d);
                        const record = attendanceMap.get(`${s.id}_${dStr}`);
                        const weekend = isWeekend(d);
                        const holidayName = holidayMap.get(dStr);

                        // Calculate cell color/classes
                        let cellBg = "bg-transparent text-zinc-400 dark:text-zinc-600";
                        let statusAbbreviation = "";
                        let tooltip = `${s.nama} - Tanggal ${d}`;

                        if (record) {
                          statusAbbreviation = record.status.charAt(0);
                          tooltip += ` (${record.status})`;
                          if (record.status === "HADIR") cellBg = "bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/10";
                          else if (record.status === "TERLAMBAT") cellBg = "bg-amber-500 text-white font-bold shadow-sm shadow-amber-500/10";
                          else if (record.status === "SAKIT") cellBg = "bg-blue-500 text-white font-bold shadow-sm shadow-blue-500/10";
                          else if (record.status === "IZIN") cellBg = "bg-indigo-500 text-white font-bold shadow-sm shadow-indigo-500/10";
                          else if (record.status === "ALPHA") cellBg = "bg-red-600 text-white font-bold shadow-sm shadow-red-600/10";
                        } else if (weekend) {
                          statusAbbreviation = "-";
                          cellBg = "bg-zinc-100 dark:bg-zinc-900 text-zinc-300 dark:text-zinc-700 cursor-not-allowed";
                          tooltip += " (Weekend)";
                        } else if (holidayName) {
                          statusAbbreviation = "L";
                          cellBg = "bg-red-50 dark:bg-red-950/10 text-red-300 dark:text-red-900/40 cursor-not-allowed";
                          tooltip += ` (Libur: ${holidayName})`;
                        } else if (s.sedangMagang) {
                          statusAbbreviation = "M";
                          cellBg = "bg-purple-100 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400";
                          tooltip += " (PKL / Magang)";
                        } else {
                          statusAbbreviation = "";
                          cellBg = "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-transparent hover:text-zinc-400";
                        }

                        return (
                          <td
                            key={d}
                            onClick={() => handleCellClick(s, d)}
                            title={tooltip}
                            className={`p-1.5 text-center text-[10px] font-mono border-r border-zinc-200/50 dark:border-zinc-800/30 cursor-pointer select-none transition-all ${cellBg}`}
                          >
                            <div className="w-6 h-6 mx-auto rounded-md flex items-center justify-center">
                              {statusAbbreviation}
                            </div>
                          </td>
                        );
                      })}

                      {/* Student Stats columns */}
                      <td className="p-3 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{stats.hadir}</td>
                      <td className="p-3 text-center text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">{stats.terlambat}</td>
                      <td className="p-3 text-center text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">{stats.sakit}</td>
                      <td className="p-3 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">{stats.izin}</td>
                      <td className="p-3 text-center text-xs font-bold text-red-600 dark:text-red-400 font-mono">{stats.alpha}</td>
                      <td className={`p-3 text-center text-xs font-extrabold font-mono border-l border-zinc-200 dark:border-zinc-800 ${
                        stats.persentase < 90 ? "text-red-500" : "text-zinc-800 dark:text-zinc-200"
                      }`}>
                        {stats.persentase}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DRAWER (CELL DETAILS & EDIT PANEL) */}
      {drawerOpen && activeCell && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end transition-opacity duration-300">
          {/* Click outside backdrop triggers close */}
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />

          {/* Drawer main panel */}
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl h-full flex flex-col animate-slide-in">
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 className="font-bold text-sm text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Detail Presensi</h3>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {new Date(activeCell.dateStr).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {/* Student Metadata Card */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-4 flex gap-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center font-bold text-base uppercase shrink-0">
                  {activeCell.siswa.nama.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200 truncate">{activeCell.siswa.nama}</h4>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">NISN {activeCell.siswa.nisn}</p>
                  <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Ortu: {activeCell.siswa.teleponOrangTua}</span>
                  </p>
                </div>
              </div>

              {/* Status info bar */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status Saat Ini</span>
                {activeCell.record ? (
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-800/40 rounded-xl flex justify-between items-center">
                    <div>
                      <span className={`px-2.5 py-0.5 rounded font-extrabold uppercase tracking-wider text-[10px] ${
                        activeCell.record.status === "HADIR" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" :
                        activeCell.record.status === "TERLAMBAT" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400" :
                        activeCell.record.status === "SAKIT" || activeCell.record.status === "IZIN" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400" :
                        "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                      }`}>
                        {activeCell.record.status}
                      </span>
                      {activeCell.record.jamMasuk && (
                        <span className="text-[11px] text-zinc-500 font-mono block mt-1.5">
                          Masuk: {activeCell.record.jamMasuk} WIB
                        </span>
                      )}
                      {activeCell.record.catatan && (
                        <p className="text-xs text-zinc-400 mt-2 leading-relaxed italic">
                          Catatan: &ldquo;{activeCell.record.catatan}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Quick WhatsApp Alert URL */}
                    <a
                      href={getWaMeUrl(activeCell.siswa, activeCell.dateStr, activeCell.record.status)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/10 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Hubungi</span>
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-800/40 rounded-xl text-xs text-zinc-400 italic">
                    Belum mencatatkan presensi pada tanggal ini (Sistem menganggap Mangkir/Alpha saat penutupan presensi).
                  </div>
                )}
              </div>

              {/* Edit form */}
              <form onSubmit={handleSaveCorrection} className="space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Formulir Pembaruan</span>

                {/* Status Radio Buttons */}
                <div className="space-y-2">
                  <label className="block text-xs text-zinc-500">Pilih Status Baru:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["HADIR", "TERLAMBAT", "SAKIT", "IZIN", "ALPHA"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditStatus(st)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          editStatus === st
                            ? st === "HADIR" ? "bg-emerald-600 text-white border-emerald-500 shadow-sm" :
                              st === "TERLAMBAT" ? "bg-amber-500 text-white border-amber-400 shadow-sm" :
                              st === "SAKIT" || st === "IZIN" ? "bg-blue-500 text-white border-blue-400 shadow-sm" :
                              "bg-red-600 text-white border-red-500 shadow-sm"
                            : "bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes Input */}
                <div className="space-y-2">
                  <label className="block text-xs text-zinc-500">Catatan / Alasan (Opsional):</label>
                  <input
                    type="text"
                    placeholder="Contoh: Sakit demam tinggi, izin keperluan keluarga..."
                    value={editCatatan}
                    onChange={(e) => setEditCatatan(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-zinc-400"
                  />
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/10 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Perubahan</span>
                </button>
              </form>

              {/* Delete / Cancel button if record exists */}
              {activeCell.record && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6">
                  <button
                    type="button"
                    onClick={handleDeleteRecord}
                    disabled={savingEdit}
                    className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Catatan Absensi (Batalkan)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
