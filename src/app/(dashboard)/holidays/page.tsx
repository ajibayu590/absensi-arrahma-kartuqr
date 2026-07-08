"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Info,
  CalendarDays
} from "lucide-react";

interface Holiday {
  id: number;
  tanggal: string;
  tanggalStr: string;
  nama: string;
  isKustom: boolean;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    tanggal: "",
    nama: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch all holidays
  const fetchHolidays = async () => {
    try {
      const res = await fetch("/api/admin/holidays");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengambil data hari libur.");
      setHolidays(result.holidays || []);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat hari libur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleOpenAddModal = () => {
    setSelectedHoliday(null);
    setFormData({
      tanggal: new Date().toISOString().split("T")[0],
      nama: ""
    });
    setShowFormModal(true);
  };

  const handleOpenEditModal = (h: Holiday) => {
    setSelectedHoliday(h);
    setFormData({
      tanggal: h.tanggalStr,
      nama: h.nama
    });
    setShowFormModal(true);
  };

  const handleOpenDeleteModal = (h: Holiday) => {
    setSelectedHoliday(h);
    setShowDeleteModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tanggal || !formData.nama.trim()) {
      toast.error("Semua field wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = !!selectedHoliday;
      const url = "/api/admin/holidays";
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit 
        ? { id: selectedHoliday.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memproses hari libur.");

      toast.success(isEdit ? "Hari libur berhasil diperbarui!" : "Hari libur baru berhasil ditambahkan!");
      setShowFormModal(false);
      fetchHolidays();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat memproses data.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async () => {
    if (!selectedHoliday) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedHoliday.id })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menghapus hari libur.");

      toast.success("Hari libur berhasil dihapus!");
      setShowDeleteModal(false);
      fetchHolidays();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus data.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTanggalIndo = (tglStr: string) => {
    const d = new Date(`${tglStr}T00:00:00`);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const filteredHolidays = holidays.filter(h =>
    h.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-enter">
      {/* HEADER WIDGET */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Admin Area
          </span>
          <h2 className="text-2xl font-bold mt-2 text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-600" />
            <span>Kelola Hari Libur</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Atur hari libur nasional maupun kustom sekolah agar pemicu otomatis Alpha dan sistem absensi dilompati.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold tracking-wide flex items-center gap-2 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-700/30 transition-all cursor-pointer w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Hari Libur</span>
        </button>
      </div>

      {/* INFO CARD */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed flex gap-3">
        <Info className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
        <div>
          <span className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">Catatan Penting:</span>
          Sistem absensi secara otomatis sudah melompati hari **Sabtu** dan **Minggu**. Anda hanya perlu menambahkan hari libur nasional atau libur kustom sekolah (seperti masa ujian, libur semester, atau cuti bersama) pada halaman ini untuk menghindari kesalahan pemicu status Alpha siswa.
        </div>
      </div>

      {/* TABLE AND FILTER CARD */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm p-6 space-y-6">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Cari nama hari libur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-zinc-400"
          />
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400 text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span>Memuat daftar hari libur...</span>
          </div>
        ) : filteredHolidays.length > 0 ? (
          <div className="overflow-x-auto border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl shadow-inner">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-bold border-b border-zinc-200/40 dark:border-zinc-800/40">
                  <th className="py-4 px-6 text-center w-16">No</th>
                  <th className="py-4 px-6">Tanggal Libur</th>
                  <th className="py-4 px-6">Nama Keterangan</th>
                  <th className="py-4 px-6 w-40 text-center">Jenis Libur</th>
                  <th className="py-4 px-6 w-32 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredHolidays.map((h, index) => (
                  <tr key={h.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-950/20 transition-all">
                    <td className="py-4 px-6 text-center font-mono font-bold text-zinc-400">{index + 1}</td>
                    <td className="py-4 px-6 font-bold text-zinc-800 dark:text-zinc-200">
                      {formatTanggalIndo(h.tanggalStr)}
                    </td>
                    <td className="py-4 px-6 text-zinc-600 dark:text-zinc-300 font-medium">
                      {h.nama}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        h.isKustom
                          ? "bg-amber-50 border-amber-200/40 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400"
                          : "bg-emerald-50 border-emerald-200/40 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
                      }`}>
                        {h.isKustom ? "Libur Sekolah" : "Libur Nasional"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(h)}
                          className="p-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 border border-zinc-200/30 rounded-xl transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(h)}
                          className="p-2 bg-zinc-50 hover:bg-red-50 dark:bg-zinc-950 dark:hover:bg-red-950/30 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200/30 rounded-xl transition-all cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-zinc-400 italic text-sm">
            Tidak ada hari libur yang ditemukan.
          </div>
        )}
      </div>

      {/* FORM MODAL (ADD & EDIT) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span>{selectedHoliday ? "Ubah Hari Libur" : "Tambah Hari Libur Baru"}</span>
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Tanggal Libur
                </label>
                <input
                  type="date"
                  required
                  disabled={submitting}
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Nama / Keterangan Libur
                </label>
                <input
                  type="text"
                  required
                  disabled={submitting}
                  placeholder="Contoh: Cuti Bersama Idul Fitri"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-zinc-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  disabled={submitting}
                  className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{selectedHoliday ? "Simpan Perubahan" : "Simpan Hari Libur"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-enter" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              ⚠️ Konfirmasi Hapus
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 leading-relaxed">
              Apakah Anda yakin ingin menghapus hari libur **&quot;{selectedHoliday?.nama}&quot;** pada tanggal **{selectedHoliday && formatTanggalIndo(selectedHoliday.tanggalStr)}**? 
              Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
                className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteHoliday}
                disabled={submitting}
                className="py-2 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
