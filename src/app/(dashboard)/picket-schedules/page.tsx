"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  Plus,
  Trash2,
  Loader2,
  Users,
  Clock,
  UserPlus,
  Info,
  Printer,
  FileDown
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import JadwalPiketPdfDocument from "@/components/pdf/JadwalPiketPdf";

interface PicketSchedule {
  id: number;
  hari: "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT" | "SABTU";
  idGuru: number;
  nip: string | null;
  nama: string;
  telepon: string | null;
}

interface TeacherDropdownItem {
  id: number;
  nip: string | null;
  nama: string;
}

const HARI_LIST: { key: PicketSchedule["hari"]; label: string }[] = [
  { key: "SENIN", label: "Senin" },
  { key: "SELASA", label: "Selasa" },
  { key: "RABU", label: "Rabu" },
  { key: "KAMIS", label: "Kamis" },
  { key: "JUMAT", label: "Jumat" },
  { key: "SABTU", label: "Sabtu" }
];

export default function PicketSchedulesPage() {
  const [schedules, setSchedules] = useState<PicketSchedule[]>([]);
  const [teachers, setTeachers] = useState<TeacherDropdownItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for adding
  const [selectedHari, setSelectedHari] = useState<PicketSchedule["hari"] | "">("");
  const [selectedGuruId, setSelectedGuruId] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchSchedulesData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/picket-schedules");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengambil data jadwal piket.");

      setSchedules(result.schedules);
      setTeachers(result.teachers);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat jadwal piket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulesData();
  }, []);

  const openAddModal = (hari: PicketSchedule["hari"]) => {
    setSelectedHari(hari);
    setSelectedGuruId("");
    setShowAddModal(true);
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHari || !selectedGuruId) {
      toast.error("Hari dan Nama Guru wajib dipilih!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/picket-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hari: selectedHari,
          idGuru: parseInt(selectedGuruId, 10)
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menambahkan jadwal piket.");

      toast.success(result.message || "Guru berhasil ditugaskan ke jadwal piket.");
      setShowAddModal(false);
      fetchSchedulesData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan jadwal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: number, namaGuru: string, hari: string) => {
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
                Konfirmasi Penghapusan Jadwal Piket
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Apakah Anda yakin ingin menghapus <span className="font-semibold">{namaGuru}</span> dari tim piket hari <span className="font-semibold">{hari}</span>?
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-zinc-700">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const res = await fetch("/api/admin/picket-schedules", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Gagal menghapus jadwal piket.");
                toast.success(result.message || "Jadwal piket berhasil dihapus.");
                fetchSchedulesData();
              } catch (err: any) {
                toast.error(err.message || "Gagal menghapus jadwal.");
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

  // Mengelompokkan jadwal berdasarkan hari
  const getSchedulesForDay = (hari: PicketSchedule["hari"]) => {
    return schedules.filter((s) => s.hari === hari);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            <span>Penjadwalan Piket Mingguan</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Atur penugasan tim guru piket yang bertanggung jawab melakukan pemindaian/absensi harian siswa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {schedules.length > 0 && (
            <PDFDownloadLink
              document={
                <JadwalPiketPdfDocument
                  data={schedules.map((s, idx) => ({
                    no: idx + 1,
                    hari: HARI_LIST.find((h) => h.key === s.hari)?.label || s.hari,
                    nama: s.nama,
                    nip: s.nip,
                    telepon: s.telepon,
                  }))}
                />
              }
              fileName={`Jadwal_Piket_Guru_${new Date().getFullYear()}.pdf`}
            >
              {({ loading: pdfLoading }) => (
                <button
                  disabled={pdfLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-xl text-xs font-bold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {pdfLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  <span>Cetak Jadwal</span>
                </button>
              )}
            </PDFDownloadLink>
          )}
        </div>
      </div>

      {/* INFO CARD */}
      <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/20 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1 font-medium">
          <p className="font-bold">Informasi Penugasan Piket:</p>
          <p>Guru yang dijadwalkan piket akan memiliki akses untuk membuka menu pencatatan absensi siswa.</p>
          <p>Untuk mendukung fleksibilitas di lapangan, guru piket hari lain tetap diperbolehkan melakukan absensi siswa pengganti (infal), namun aktivitasnya akan tercatat di log audit admin.</p>
        </div>
      </div>

      {/* SCHEDULES GRID */}
      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {HARI_LIST.map((h) => {
            const daySchedules = getSchedulesForDay(h.key);
            return (
              <div
                key={h.key}
                className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col min-h-[250px]"
              >
                {/* Day Header */}
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="font-extrabold text-sm text-zinc-800 dark:text-zinc-100">{h.label}</span>
                  </div>
                  <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-mono">
                    {daySchedules.length} Guru
                  </span>
                </div>

                {/* Assigned Teachers List */}
                <div className="flex-1 space-y-3">
                  {daySchedules.length > 0 ? (
                    daySchedules.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 group hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate">
                            {s.nama}
                          </div>
                          {s.nip && (
                            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                              NIP: {s.nip}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteSchedule(s.id, s.nama, h.label)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg cursor-pointer transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                          title="Hapus jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-28 text-center text-zinc-400 dark:text-zinc-500 text-xs italic border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                      <span>Belum ada jadwal piket</span>
                    </div>
                  )}
                </div>

                {/* Day Footer Add Button */}
                <button
                  onClick={() => openAddModal(h.key)}
                  className="mt-4 w-full py-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-200/50 dark:border-zinc-800/50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Guru Piket</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD SCHEDULE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>Tambah Jadwal Hari {HARI_LIST.find((h) => h.key === selectedHari)?.label}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4">
              {/* Teacher Selection */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Pilih Guru Piket
                </label>
                <select
                  required
                  value={selectedGuruId}
                  onChange={(e) => setSelectedGuruId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer font-medium"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map((t) => {
                    // Saring guru yang sudah terjadwal di hari ini
                    const isAlreadyAssigned = schedules.some(
                      (s) => s.hari === selectedHari && s.idGuru === t.id
                    );
                    return (
                      <option key={t.id} value={t.id.toString()} disabled={isAlreadyAssigned}>
                        {t.nama} {isAlreadyAssigned ? "(Sudah Piket Hari Ini)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Tugaskan Guru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
