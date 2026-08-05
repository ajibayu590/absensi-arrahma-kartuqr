"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Loader2,
  Users,
  Search,
  UploadCloud,
  Printer
} from "lucide-react";

interface Kelas {
  id: number;
  nama: string;
  tahunAjaran: string;
  idGuru: number | null;
  namaWali: string;
  jumlahSiswa: number;
}

interface Guru {
  id: number;
  nip: string;
  telepon: string | null;
  sudahWali: boolean;
  namaWaliKelas: string;
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Student detail modal states
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<{ id: number; nama: string } | null>(null);
  const [classStudents, setClassStudents] = useState<{ id: number; nisn: string; nama: string; sedangMagang: boolean }[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Import modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const openStudentsModal = async (classId: number, className: string) => {
    setSelectedClassForStudents({ id: classId, nama: className });
    setShowStudentsModal(true);
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/admin/classes/${classId}/students`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengambil daftar siswa.");
      setClassStudents(result.students || []);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat daftar siswa.");
    } finally {
      setLoadingStudents(false);
    }
  };

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activeClassId, setActiveClassId] = useState<number | null>(null);

  // Form states
  const [formNama, setFormNama] = useState("");
  const [formTahunAjaran, setFormTahunAjaran] = useState("");
  const [formGuruId, setFormGuruId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [printingCards, setPrintingCards] = useState(false);

  const handlePrintClassCards = async (classId: number, className: string) => {
    setPrintingCards(true);
    try {
      // 1. Dapatkan daftar siswa di kelas ini dari API kelas
      const resStudents = await fetch(`/api/admin/classes/${classId}/students`);
      const dataStudents = await resStudents.json();
      if (!resStudents.ok) throw new Error(dataStudents.error || "Gagal mendapatkan daftar siswa.");

      const students = dataStudents.students || [];
      if (students.length === 0) {
        toast.error(`Tidak ada siswa terdaftar di kelas ${className}.`);
        return;
      }

      // 2. Kirim ke API qr-print
      const studentIds = students.map((s: any) => s.id);
      const resPrint = await fetch("/api/admin/students/qr-print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: studentIds })
      });
      const dataPrint = await resPrint.json();
      if (!resPrint.ok) throw new Error(dataPrint.error || "Gagal mendapatkan data QR.");

      // 3. Generate PDF
      const { pdf } = await import("@react-pdf/renderer");
      const KartuSiswaPdfDocument = (await import("@/components/pdf/KartuSiswaPdf")).default;
      const blob = await pdf(<KartuSiswaPdfDocument siswaList={dataPrint.data} />).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Kartu_Absensi_Kelas_${className}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Kartu ${students.length} siswa kelas ${className} berhasil diunduh!`);
    } catch (err: any) {
      console.error("Gagal cetak kartu kelas:", err);
      toast.error(err.message || "Gagal membuat kartu PDF.");
    } finally {
      setPrintingCards(false);
    }
  };

  const fetchClassesData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/classes");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengambil data kelas.");

      setClasses(result.kelas);
      setTeachers(result.guruPilihan);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat kelas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassesData();
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setFormNama("");
    setFormTahunAjaran("2025/2026");
    setFormGuruId("");
    setShowModal(true);
  };

  const openEditModal = (k: Kelas) => {
    setModalMode("edit");
    setActiveClassId(k.id);
    setFormNama(k.nama);
    setFormTahunAjaran(k.tahunAjaran);
    setFormGuruId(k.idGuru ? k.idGuru.toString() : "");
    setShowModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formTahunAjaran.trim()) {
      toast.error("Nama kelas dan tahun ajaran wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = "/api/admin/classes";
      const method = modalMode === "create" ? "POST" : "PUT";
      const bodyPayload: any = {
        nama: formNama.trim(),
        tahunAjaran: formTahunAjaran.trim(),
        idGuru: formGuruId ? parseInt(formGuruId, 10) : null
      };

      if (modalMode === "edit" && activeClassId) {
        bodyPayload.id = activeClassId;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan kelas.");

      toast.success(result.message || "Data kelas disimpan.");
      setShowModal(false);
      fetchClassesData();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: number, nama: string) => {
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
                Konfirmasi Penghapusan Kelas
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Apakah Anda yakin ingin menghapus Kelas <span className="font-semibold">{nama}</span> dari sistem?
                Jika ada siswa di kelas ini, penghapusan akan dibatalkan.
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-zinc-700">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const res = await fetch("/api/admin/classes", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id })
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Gagal menghapus kelas.");

                toast.success(result.message || "Kelas terhapus.");
                fetchClassesData();
              } catch (err: any) {
                toast.error(err.message || "Gagal menghapus.");
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

  const handleImportClasses = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error("Pilih file XLSX untuk diimpor.");
      return;
    }

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch("/api/admin/classes/import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengimpor kelas.");

      setImportResult(result);
      if (result.failed > 0) {
        toast.error(`Gagal mengimpor ${result.failed} baris data.`);
      } else {
        toast.success(`${result.success} kelas berhasil diimpor.`);
      }
      fetchClassesData(); // Refresh daftar kelas
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengimpor.");
      setImportResult({ total: 0, success: 0, failed: 0, errors: [{ row: 0, message: err.message || "Kesalahan tidak diketahui." }] });
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tahunAjaran.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            <span>Kelola Kelas</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Daftar ruang kelas aktif dan penunjukan wali kelas bimbingan SMK Ar Rahma.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              setShowImportModal(true);
              setImportResult(null);
            }}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/10 cursor-pointer w-full md:w-auto justify-center"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import XLSX</span>
          </button>
          <button
            onClick={openCreateModal}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/10 cursor-pointer w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelas</span>
          </button>
        </div>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari kelas (misal: X RPL, XI TKJ)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-zinc-400 font-medium"
          />
        </div>
      </div>

      {/* TABLE DATA LIST */}
      {loading ? (
        <div className="flex h-48 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4 w-[60px] text-center">No</th>
                  <th className="p-4">Nama Kelas</th>
                  <th className="p-4">Tahun Ajaran</th>
                  <th className="p-4">Wali Kelas</th>
                  <th className="p-4 text-center">Siswa Terdaftar</th>
                  <th className="p-4 text-center w-[120px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {filteredClasses.map((k, idx) => (
                  <tr key={k.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="p-4 text-center font-mono font-medium">{idx + 1}</td>
                    <td className="p-4 font-bold text-zinc-800 dark:text-zinc-100">Kelas {k.nama}</td>
                    <td className="p-4 font-mono font-medium">{k.tahunAjaran}</td>
                    <td className="p-4">
                      {k.idGuru ? (
                        <span className="font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded">
                          {k.namaWali}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Belum Ditentukan</span>
                      )}
                    </td>
                    <td className="p-4 text-center text-zinc-800 dark:text-zinc-100">
                      <button
                        onClick={() => openStudentsModal(k.id, k.nama)}
                        className="font-bold font-mono inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all cursor-pointer font-semibold text-xs"
                        title="Klik untuk melihat daftar siswa kelas ini"
                      >
                        <Users className="w-4 h-4 text-zinc-400" />
                        <span>{k.jumlahSiswa}</span>
                      </button>
                    </td>
                     <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handlePrintClassCards(k.id, k.nama)}
                          disabled={printingCards}
                          title="Cetak Kartu QR Satu Kelas"
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(k)}
                          className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(k.id, k.nama)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-12 text-center text-zinc-400 text-xs italic shadow-sm">
          Tidak ada kelas yang cocok dengan kata kunci pencarian Anda.
        </div>
      )}

      {/* CREATE/EDIT MODAL POPUP */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-enter">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <span>{modalMode === "create" ? "Tambah Kelas Baru" : "Edit Detail Kelas"}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              {/* Class Name */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Nama Kelas (Unik)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XII RPL 1, X TKJ 2..."
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2025/2026"
                  value={formTahunAjaran}
                  onChange={(e) => setFormTahunAjaran(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Wali Kelas Teacher Selection */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Guru Wali Kelas
                </label>
                <select
                  value={formGuruId}
                  onChange={(e) => setFormGuruId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Tanpa Wali Kelas --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id.toString()}>
                      {t.namaWaliKelas} {t.nip ? `(NIP: ${t.nip})` : "(Tanpa NIP)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Kelas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LAZY LOADED STUDENT DETAIL MODAL */}
      {showStudentsModal && selectedClassForStudents && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-enter">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Anggota Kelas - {selectedClassForStudents.nama}</span>
              </h3>
              <button
                onClick={() => {
                  setShowStudentsModal(false);
                  setClassStudents([]);
                }}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingStudents ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-64 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800">
                  {classStudents.length > 0 ? (
                    classStudents.map((s, idx) => (
                      <div key={s.id} className="p-3 flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-zinc-400 w-5 text-right">{idx + 1}.</span>
                          <div>
                            <span className="text-zinc-800 dark:text-zinc-100 block">{s.nama}</span>
                            <span className="text-[10px] text-zinc-400 font-mono font-medium">NISN: {s.nisn}</span>
                          </div>
                        </div>
                        {s.sedangMagang && (
                          <span className="text-[9px] bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400 px-2 py-0.5 rounded font-extrabold uppercase shrink-0">
                            Magang
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-zinc-400 text-xs italic font-medium">
                      Tidak ada siswa terdaftar di kelas ini.
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-zinc-500 font-bold">
                    Total: {classStudents.length} Siswa
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowStudentsModal(false);
                        setClassStudents([]);
                      }}
                      className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Tutup
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/students?classId=${selectedClassForStudents.id}`);
                      }}
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Kelola Siswa Kelas Ini</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-enter animate-duration-200">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <span>Import Data Kelas dari XLSX</span>
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!importResult ? (
              <form onSubmit={handleImportClasses} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                    File XLSX
                  </label>
                  <input
                    type="file"
                    required
                    accept=".xlsx, .xls"
                    onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-sm text-zinc-800 dark:text-zinc-100
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-emerald-50 file:text-emerald-700
                      hover:file:bg-emerald-100"
                  />
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Unduh template: <a href="/templates/template_kelas.xlsx" download className="text-emerald-600 hover:underline">template_kelas.xlsx</a>
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={importing || !importFile}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    <span>Import</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">Hasil Import:</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Total data diproses: {importResult.total}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Berhasil diimpor: {importResult.success}</p>
                {importResult.failed > 0 && (
                  <>
                    <p className="text-xs text-red-600 dark:text-red-400">Gagal diimpor: {importResult.failed}</p>
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-3 max-h-40 overflow-y-auto text-xs text-red-700 dark:text-red-400">
                      <p className="font-bold mb-2">Detail Kegagalan:</p>
                      {importResult.errors.map((err, idx) => (
                        <p key={idx}>Baris {err.row}: {err.message}</p>
                      ))}
                    </div>
                  </>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
