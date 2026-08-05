"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Loader2,
  Search,
  Filter,
  Phone,
  BookOpen,
  Briefcase,
  Key,
  UploadCloud,
  Printer
} from "lucide-react";

interface Siswa {
  id: number;
  nisn: string;
  nama: string;
  idKelas: number;
  namaKelas: string;
  teleponOrangTua: string;
  sedangMagang: boolean;
  email: string;
  aktif: boolean;
  pengguna: {
    aktif: boolean;
  };
}

interface Kelas {
  id: number;
  nama: string;
}

function StudentsPageContent() {
  const searchParams = useSearchParams();
  const classIdParam = searchParams.get("classId");

  const [students, setStudents] = useState<Siswa[]>([]);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKelasId, setFilterKelasId] = useState("");

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

  const filteredStudents = students.filter(
    (s) =>
      s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn.includes(searchQuery)
  );

  useEffect(() => {
    if (classIdParam) {
      setFilterKelasId(classIdParam);
    }
  }, [classIdParam]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);

  // Form states
  const [formNisn, setFormNisn] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formKelasId, setFormKelasId] = useState("");
  const [formTeleponOrangTua, setFormTeleponOrangTua] = useState("");
  const [formSedangMagang, setFormSedangMagang] = useState(false);
  const [formAktif, setFormAktif] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Bulk Magang States
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMagangVal, setBulkMagangVal] = useState(false);
  const [formTanggalMulai, setFormTanggalMulai] = useState("");
  const [formTanggalSelesai, setFormTanggalSelesai] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [printingCards, setPrintingCards] = useState(false);

  const handlePrintCards = async (studentIds: number[]) => {
    if (studentIds.length === 0) {
      toast.error("Tidak ada siswa yang dipilih.");
      return;
    }
    setPrintingCards(true);
    try {
      const res = await fetch("/api/admin/students/qr-print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: studentIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendapatkan data QR.");

      const { pdf } = await import("@react-pdf/renderer");
      const KartuSiswaPdfDocument = (await import("@/components/pdf/KartuSiswaPdf")).default;
      const blob = await pdf(<KartuSiswaPdfDocument siswaList={data.data} />).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Kartu_Absensi_${studentIds.length > 1 ? "Massal" : data.data[0].nama}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Kartu ${studentIds.length} siswa berhasil diunduh!`);
    } catch (err: any) {
      console.error("Gagal cetak kartu:", err);
      toast.error(err.message || "Gagal membuat kartu PDF.");
    } finally {
      setPrintingCards(false);
    }
  };

  const handleToggleSelectStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredStudents.map((s) => s.id);
    const allSelected = visibleIds.every((id) => selectedStudentIds.includes(id));

    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => {
        const next = [...prev];
        visibleIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const isAllVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.map((s) => s.id).every((id) => selectedStudentIds.includes(id));

  const handleSaveBulkMagang = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/admin/students/bulk-internship", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          sedangMagang: bulkMagangVal,
          tanggalMulai: bulkMagangVal && formTanggalMulai ? formTanggalMulai : null,
          tanggalSelesai: bulkMagangVal && formTanggalSelesai ? formTanggalSelesai : null
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal diperbarui.");

      toast.success(result.message || "Status magang siswa berhasil diperbarui.");
      setShowBulkModal(false);
      setSelectedStudentIds([]);
      fetchStudentsData();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses pembaruan massal.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const fetchStudentsData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterKelasId) {
        params.append("kelasId", filterKelasId);
      }

      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengambil data siswa.");

      setStudents(result.siswa);
      setClasses(result.kelasList);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat siswa.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsData();
  }, [filterKelasId]);

  const openCreateModal = () => {
    setModalMode("create");
    setFormNisn("");
    setFormNama("");
    setFormKelasId("");
    setFormTeleponOrangTua("");
    setFormSedangMagang(false);
    setFormAktif(true);
    setShowModal(true);
  };

  const openEditModal = (s: Siswa) => {
    setModalMode("edit");
    setActiveStudentId(s.id);
    setFormNisn(s.nisn);
    setFormNama(s.nama);
    setFormKelasId(s.idKelas.toString());
    setFormTeleponOrangTua(s.teleponOrangTua);
    setFormSedangMagang(s.sedangMagang);
    setFormAktif(s.aktif);
    setShowModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNisn.trim() || !formNama.trim() || !formKelasId || !formTeleponOrangTua.trim()) {
      toast.error("Seluruh formulir wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = "/api/admin/students";
      const method = modalMode === "create" ? "POST" : "PUT";
      const bodyPayload: any = {
        nisn: formNisn.trim(),
        nama: formNama.trim(),
        idKelas: parseInt(formKelasId, 10),
        teleponOrangTua: formTeleponOrangTua.trim(),
        sedangMagang: formSedangMagang
      };

      if (modalMode === "edit" && activeStudentId) {
        bodyPayload.id = activeStudentId;
        bodyPayload.aktif = formAktif;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan data siswa.");

      toast.success(result.message || "Data siswa disimpan.");
      setShowModal(false);
      fetchStudentsData();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id: number, nama: string) => {
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
                Konfirmasi Penghapusan Siswa
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Apakah Anda yakin ingin menghapus Siswa <span className="font-semibold">{nama}</span>? Akun login siswa ini juga akan dihapus permanen dari sistem.
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-zinc-700">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const res = await fetch("/api/admin/students", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                toast.success(data.message);
                fetchStudentsData();
              } catch (error: any) {
                toast.error(error.message || "Gagal menghapus siswa.");
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

  const handleResetPassword = async (s: Siswa) => {
    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white dark:bg-zinc-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <Key className="w-6 h-6 text-blue-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Konfirmasi Reset Kata Sandi
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Apakah Anda yakin ingin mereset kata sandi Siswa <span className="font-semibold">{s.nama}</span>?
                Kata sandi akan diubah kembali ke default (nomor NISN: <span className="font-semibold">{s.nisn}</span>)
                dan siswa akan dipaksa mengubah kata sandi pada login berikutnya.
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-zinc-700">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const res = await fetch("/api/admin/students", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: s.id,
                    nisn: s.nisn,
                    nama: s.nama,
                    idKelas: s.idKelas,
                    teleponOrangTua: s.teleponOrangTua,
                    sedangMagang: s.sedangMagang,
                    aktif: s.aktif,
                    resetPassword: true,
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                toast.success(data.message);
                fetchStudentsData();
              } catch (error: any) {
                toast.error(error.message || "Gagal mereset kata sandi.");
              }
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Ya, Reset
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

  const handleImportStudents = async (e: React.FormEvent) => {
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
      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengimpor siswa.");

      setImportResult(result);
      if (result.failed > 0) {
        toast.error(`Gagal mengimpor ${result.failed} baris data.`);
      } else {
        toast.success(`${result.success} siswa berhasil diimpor.`);
      }
      fetchStudentsData();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengimpor.");
      setImportResult({ total: 0, success: 0, failed: 0, errors: [{ row: 0, message: err.message || "Kesalahan tidak diketahui." }] });
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>Kelola Siswa</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Pendaftaran siswa aktif, manajemen akun login, registrasi nomor telepon orang tua, dan status Magang/PKL.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              handlePrintCards(filteredStudents.map((s) => s.id));
            }}
            disabled={printingCards || filteredStudents.length === 0}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 cursor-pointer w-full md:w-auto justify-center disabled:opacity-50"
          >
            {printingCards ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>Cetak Kartu {filterKelasId ? "Kelas" : "Semua"}</span>
          </button>
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
            <span>Daftarkan Siswa</span>
          </button>
        </div>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
            Cari Nama / NISN
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari siswa (misal: Budi, 008123)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-zinc-400 font-medium"
            />
          </div>
        </div>

        <div className="w-full md:w-1/4">
          <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Filter className="w-3 h-3 text-emerald-600" />
            <span>Saring Kelas</span>
          </label>
          <select
            value={filterKelasId}
            onChange={(e) => setFilterKelasId(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
          >
            <option value="">-- Semua Kelas --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id.toString()}>
                Kelas {c.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE DATA LIST */}
      {loading ? (
        <div className="flex h-48 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4 w-[40px] text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={handleSelectAllVisible}
                      className="w-4 h-4 text-emerald-600 bg-zinc-100 border-zinc-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 w-[60px] text-center">No</th>
                  <th className="p-4">NISN / Email</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Kelas</th>
                  <th className="p-4">No WA Ortu</th>
                  <th className="p-4 text-center">Magang</th>
                  <th className="p-4 text-center">Status Akun</th>
                  <th className="p-4 text-center w-[120px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => handleToggleSelectStudent(s.id)}
                        className="w-4 h-4 text-emerald-600 bg-zinc-100 border-zinc-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 text-center font-mono font-medium">{idx + 1}</td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-800 dark:text-zinc-100 font-mono text-xs">{s.nisn}</div>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">{s.email}</span>
                    </td>
                    <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-100">{s.nama}</td>
                    <td className="p-4 font-bold">Kelas {s.namaKelas}</td>
                    <td className="p-4">
                      <span className="font-mono text-xs inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        <span>+{s.teleponOrangTua}</span>
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {s.sedangMagang ? (
                        <span className="inline-flex items-center gap-1 text-[9px] bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400 px-2 py-0.5 rounded font-bold uppercase">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>Magang</span>
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase ${
                        s.aktif
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                      }`}>
                        {s.aktif ? "Aktif" : "Non-Aktif"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openEditModal(s)}
                          title="Edit Detail Siswa"
                          className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(s)}
                          title="Reset Kata Sandi Ke Default (NISN)"
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-lg cursor-pointer transition-colors"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePrintCards([s.id])}
                          title="Cetak Kartu QR Siswa"
                          disabled={printingCards}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.id, s.nama)}
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
          Tidak ada siswa yang cocok dengan kueri filter Anda.
        </div>
      )}

      {/* CREATE/EDIT MODAL POPUP */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-enter">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>{modalMode === "create" ? "Registrasi Siswa Baru" : "Edit Detail Siswa"}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              {/* NISN */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Nomor Induk Siswa Nasional (NISN)
                </label>
                <input
                  type="text"
                  required
                  disabled={modalMode === "edit"}
                  placeholder="Contoh: 0081234567"
                  value={formNisn}
                  onChange={(e) => setFormNisn(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {modalMode === "create" && (
                  <span className="text-[9px] text-zinc-400 mt-1 block">
                    NISN akan digunakan sebagai nama email (`nisn@arrahma.sch.id`) and password sementara awal.
                  </span>
                )}
              </div>

              {/* Student Name */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Budi Utomo"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Class Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Pilih Kelas
                </label>
                <select
                  value={formKelasId}
                  onChange={(e) => setFormKelasId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="" disabled>-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id.toString()}>
                      Kelas {c.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parents WA Phone Number */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  No WhatsApp Wali Murid / Orang Tua
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 081234567890"
                  value={formTeleponOrangTua}
                  onChange={(e) => setFormTeleponOrangTua(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Magang checkbox & Active account toggle */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={formSedangMagang}
                    onChange={(e) => setFormSedangMagang(e.target.checked)}
                    className="w-4.5 h-4.5 text-emerald-600 bg-zinc-100 border-zinc-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Siswa Sedang Mengikuti Magang / PKL</span>
                </label>

                {modalMode === "edit" && (
                  <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 p-3 rounded-xl">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Status Akun Aktif:</span>
                    <button
                      type="button"
                      onClick={() => setFormAktif(!formAktif)}
                      className={`py-1 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        formAktif
                          ? "bg-emerald-600 text-white border-emerald-500"
                          : "bg-red-600 text-white border-red-500"
                      }`}
                    >
                      {formAktif ? "Aktif" : "Non-Aktif"}
                    </button>
                  </div>
                )}
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
                  <span>Simpan Siswa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BAR FOR BULK OPERATIONS */}
      {selectedStudentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 border border-zinc-800 text-white px-6 py-4 rounded-2xl flex items-center gap-6 shadow-2xl backdrop-blur-md transition-all animate-enter">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-xs font-bold font-mono text-zinc-200">
              {selectedStudentIds.length} Siswa Terpilih
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePrintCards(selectedStudentIds)}
              disabled={printingCards}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {printingCards ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>Cetak Kartu ({selectedStudentIds.length})</span>
            </button>
            <button
              onClick={() => {
                setBulkMagangVal(false);
                setFormTanggalMulai("");
                setFormTanggalSelesai("");
                setShowBulkModal(true);
              }}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] shadow-lg shadow-emerald-600/10"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Atur Status Magang</span>
            </button>
            <button
              onClick={() => setSelectedStudentIds([])}
              className="py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* BULK MAGANG UPDATE MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-enter">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                <span>Atur Status Magang Massal ({selectedStudentIds.length} Siswa)</span>
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBulkMagang} className="space-y-4">
              {/* Sedang Magang checkbox */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={bulkMagangVal}
                    onChange={(e) => setBulkMagangVal(e.target.checked)}
                    className="w-4.5 h-4.5 text-emerald-600 bg-zinc-100 border-zinc-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Ubah Status: Sedang Mengikuti Magang / PKL</span>
                </label>
              </div>

              {/* Tanggal Mulai & Selesai */}
              {bulkMagangVal && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                      Tanggal Mulai Magang
                    </label>
                    <input
                      type="date"
                      required
                      value={formTanggalMulai}
                      onChange={(e) => setFormTanggalMulai(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                      Tanggal Selesai Magang
                    </label>
                    <input
                      type="date"
                      required
                      value={formTanggalSelesai}
                      onChange={(e) => setFormTanggalSelesai(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {bulkSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Perbarui Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-enter">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <span>Import Data Siswa dari XLSX</span>
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!importResult ? (
              <form onSubmit={handleImportStudents} className="space-y-4">
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
                    Unduh template: <a href="/templates/template_siswa.xlsx" download className="text-emerald-600 hover:underline">template_siswa.xlsx</a>
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

export default function StudentsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-48 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-zinc-500 font-medium text-sm">Memuat data siswa...</p>
        </div>
      </div>
    }>
      <StudentsPageContent />
    </Suspense>
  );
}
