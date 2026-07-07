"use client";

import React, { useState, useEffect } from "react";
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
  Shield,
  Phone,
  BookOpen,
  Award,
  Lock,
  CheckCircle,
  XCircle,
  UploadCloud
} from "lucide-react";

interface UserItem {
  id: number;
  nama: string;
  email: string;
  peran: "ADMIN" | "KEPALA_SEKOLAH" | "GURU";
  isPasswordSementara: boolean;
  aktif: boolean;
  nip: string | null;
  telepon: string | null;
  isBk: boolean;
  isPiket: boolean;
  namaKelasWali: string | null;
}

export default function TeachersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activeUserId, setActiveUserId] = useState<number | null>(null);

  // Form states
  const [formNama, setFormNama] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formKataSandi, setFormKataSandi] = useState("");
  const [formPeran, setFormPeran] = useState<"ADMIN" | "KEPALA_SEKOLAH" | "GURU">("GURU");
  const [formAktif, setFormAktif] = useState(true);
  const [formIsPasswordSementara, setFormIsPasswordSementara] = useState(true);
  const [formNip, setFormNip] = useState("");
  const [formTelepon, setFormTelepon] = useState("");
  const [formIsBk, setFormIsBk] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const fetchUsersData = async () => {
    setLoading(true);
    try {
      // Dapatkan data profil admin aktif saat ini
      const profileRes = await fetch("/api/auth/profile");
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setCurrentAdminId(profileData.pengguna?.id || null);
      }

      const res = await fetch("/api/admin/users");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengambil data staf.");

      setUsers(result.users);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat daftar guru dan staf.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setFormNama("");
    setFormEmail("");
    setFormKataSandi("");
    setFormPeran("GURU");
    setFormAktif(true);
    setFormIsPasswordSementara(true);
    setFormNip("");
    setFormTelepon("");
    setFormIsBk(false);
    setShowModal(true);
  };

  const openEditModal = (u: UserItem) => {
    setModalMode("edit");
    setActiveUserId(u.id);
    setFormNama(u.nama);
    setFormEmail(u.email);
    setFormKataSandi(""); // Kosongkan password untuk edit (opsional ganti)
    setFormPeran(u.peran);
    setFormAktif(u.aktif);
    setFormIsPasswordSementara(u.isPasswordSementara);
    setFormNip(u.nip || "");
    setFormTelepon(u.telepon || "");
    setFormIsBk(u.isBk);
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNama.trim() || !formEmail.trim() || !formPeran) {
      toast.error("Nama, Email, dan Peran wajib diisi!");
      return;
    }

    if (modalMode === "create" && !formKataSandi.trim()) {
      toast.error("Kata sandi wajib diisi untuk pengguna baru!");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = "/api/admin/users";
      const method = modalMode === "create" ? "POST" : "PUT";
      const bodyPayload: any = {
        nama: formNama.trim(),
        email: formEmail.trim(),
        peran: formPeran,
        aktif: formAktif,
        isPasswordSementara: formIsPasswordSementara,
        ...(formKataSandi.trim() ? { kataSandi: formKataSandi.trim() } : {}),
        ...(formPeran === "GURU" ? {
          nip: formNip.trim() || null,
          telepon: formTelepon.trim() || null,
          isBk: formIsBk
        } : {})
      };

      if (modalMode === "edit" && activeUserId) {
        bodyPayload.id = activeUserId;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan data pengguna.");

      toast.success(result.message || "Data pengguna berhasil disimpan.");
      setShowModal(false);
      fetchUsersData();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses pengguna.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number, nama: string) => {
    if (id === currentAdminId) {
      toast.error("Anda tidak diperbolehkan menghapus akun Anda sendiri!");
      return;
    }

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
                Konfirmasi Penghapusan Akun
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Anda yakin ingin menghapus akun <span className="font-semibold">{nama}</span> beserta seluruh profilnya dari sistem?
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-zinc-700">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const res = await fetch("/api/admin/users", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Gagal menghapus pengguna.");
                toast.success(result.message || "Pengguna berhasil dihapus.");
                fetchUsersData();
              } catch (err: any) {
                toast.error(err.message || "Gagal menghapus pengguna.");
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

  const handleImportUsers = async (e: React.FormEvent) => {
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
      const res = await fetch("/api/admin/users/import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengimpor pengguna.");

      setImportResult(result);
      if (result.failed > 0) {
        toast.error(`Gagal mengimpor ${result.failed} baris data.`);
      } else {
        toast.success(`${result.success} pengguna berhasil diimpor.`);
      }
      fetchUsersData();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengimpor.");
      setImportResult({ total: 0, success: 0, failed: 0, errors: [{ row: 0, message: err.message || "Kesalahan tidak diketahui." }] });
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.nip && u.nip.includes(searchQuery));

    const matchesRole =
      roleFilter === "ALL" ||
      (roleFilter === "ADMIN" && u.peran === "ADMIN") ||
      (roleFilter === "KEPALA_SEKOLAH" && u.peran === "KEPALA_SEKOLAH") ||
      (roleFilter === "GURU" && u.peran === "GURU" && !u.isBk && !u.isPiket && !u.namaKelasWali) ||
      (roleFilter === "WALI_KELAS" && u.peran === "GURU" && u.namaKelasWali) ||
      (roleFilter === "GURU_BK" && u.peran === "GURU" && u.isBk) ||
      (roleFilter === "GURU_PIKET" && u.peran === "GURU" && u.isPiket);

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>Kelola Guru & Staf</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manajemen data master guru, administrator, kepala sekolah, dan hak penugasan kerja.
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
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* FILTER SEARCH BAR & JABATAN FILTER */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari guru/staf (nama, email, NIP)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-zinc-400 font-medium text-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="w-full md:w-60">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer font-medium"
          >
            <option value="ALL">Semua Jabatan</option>
            <option value="ADMIN">Administrator</option>
            <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
            <option value="WALI_KELAS">Hanya Wali Kelas</option>
            <option value="GURU_BK">Hanya Staf BK</option>
            <option value="GURU_PIKET">Hanya Tim Piket</option>
            <option value="GURU">Hanya Guru Mapel</option>
          </select>
        </div>
      </div>

      {/* TABLE DATA LIST */}
      {loading ? (
        <div className="flex h-48 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4 w-[60px] text-center">No</th>
                  <th className="p-4">Nama Lengkap</th>
                  <th className="p-4">Email / Akun</th>
                  <th className="p-4">Detail NIP & WA</th>
                  <th className="p-4">Jabatan Terdaftar</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center w-[120px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {filteredUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="p-4 text-center font-mono font-medium">{idx + 1}</td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-800 dark:text-zinc-100">{u.nama}</div>
                      {u.isPasswordSementara && (
                        <div className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5 mt-0.5">
                          <Lock className="w-3 h-3" />
                          <span>Sandi Sementara</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono font-medium text-xs">{u.email}</td>
                    <td className="p-4">
                      {u.peran === "GURU" ? (
                        <div className="space-y-1">
                          {u.nip && (
                            <div className="text-xs font-mono font-medium text-zinc-500">
                              NIP: {u.nip}
                            </div>
                          )}
                          {u.telepon && (
                            <div className="text-xs flex items-center gap-1 text-zinc-500 font-medium">
                              <Phone className="w-3 h-3 text-zinc-400" />
                              <span>+{u.telepon}</span>
                            </div>
                          )}
                          {!u.nip && !u.telepon && (
                            <span className="text-xs text-zinc-400 italic">Data kosong</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">- (Bukan Pendidik)</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {/* Peran Utama */}
                        {u.peran === "ADMIN" && (
                          <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-200/45">
                            ADMINISTRATOR
                          </span>
                        )}
                        {u.peran === "KEPALA_SEKOLAH" && (
                          <span className="text-[10px] font-bold bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded border border-purple-200/45">
                            KEPALA SEKOLAH
                          </span>
                        )}
                        
                        {/* Tugas Guru BK */}
                        {u.peran === "GURU" && u.isBk && (
                          <span className="text-[10px] font-bold bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded border border-pink-200/45">
                            GURU BK
                          </span>
                        )}

                        {/* Tugas Guru Piket */}
                        {u.peran === "GURU" && u.isPiket && (
                          <span className="text-[10px] font-bold bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded border border-teal-200/45">
                            TIM PIKET
                          </span>
                        )}

                        {/* Wali Kelas */}
                        {u.peran === "GURU" && u.namaKelasWali && (
                          <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200/45">
                            WALI KELAS {u.namaKelasWali}
                          </span>
                        )}

                        {/* Hanya Guru Mapel */}
                        {u.peran === "GURU" && !u.isBk && !u.isPiket && !u.namaKelasWali && (
                          <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">
                            GURU MAPEL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {u.aktif ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/10 px-2 py-0.5 rounded">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>AKTIF</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/10 px-2 py-0.5 rounded">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>NONAKTIF</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.nama)}
                          disabled={u.id === currentAdminId}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-lg cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
          Tidak ada data guru atau staf yang cocok dengan kriteria filter Anda.
        </div>
      )}

      {/* CREATE/EDIT MODAL POPUP */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                <Shield className="w-5 h-5 text-emerald-600" />
                <span>{modalMode === "create" ? "Tambah Pengguna Baru" : "Edit Detail Pengguna"}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Drs. Hermawan, M.Pd..."
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Alamat Email (Sebagai Username Login)
                </label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: hermawan@arrahma.sch.id..."
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Kata Sandi {modalMode === "edit" && <span className="text-emerald-600 font-semibold">(Kosongkan jika tidak diganti)</span>}
                </label>
                <input
                  type="password"
                  required={modalMode === "create"}
                  placeholder={modalMode === "create" ? "Min. 6 karakter..." : "Masukkan sandi baru jika ingin mengubah..."}
                  value={formKataSandi}
                  onChange={(e) => setFormKataSandi(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Peran & Kewenangan
                </label>
                <select
                  value={formPeran}
                  onChange={(e) => setFormPeran(e.target.value as any)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer font-medium"
                >
                  <option value="GURU">GURU (Wali Kelas, BK, Piket, Mapel)</option>
                  <option value="ADMIN">ADMINISTRATOR (Super Admin)</option>
                  <option value="KEPALA_SEKOLAH">KEPALA SEKOLAH</option>
                </select>
              </div>

              {/* GURU SPECIFIC FIELDS */}
              {formPeran === "GURU" && (
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 space-y-4">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide border-b border-zinc-200/50 dark:border-zinc-800/50 pb-1.5">
                    Konfigurasi Data Guru
                  </div>
                  
                  {/* NIP */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                      Nomor Induk Pegawai (NIP)
                    </label>
                    <input
                      type="text"
                      placeholder="NIP guru..."
                      value={formNip}
                      onChange={(e) => setFormNip(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                    />
                  </div>

                  {/* WhatsApp Phone */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                      No. WhatsApp (Format Internasional: 628...)
                    </label>
                    <input
                      type="text"
                      placeholder="Format: 62812345..."
                      value={formTelepon}
                      onChange={(e) => setFormTelepon(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                    />
                  </div>

                  {/* BK Flag */}
                  <div className="flex items-center gap-2.5 py-1">
                    <input
                      type="checkbox"
                      id="isBkCheckbox"
                      checked={formIsBk}
                      onChange={(e) => setFormIsBk(e.target.checked)}
                      className="w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 bg-white border-zinc-300 dark:border-zinc-700 cursor-pointer"
                    />
                    <label htmlFor="isBkCheckbox" className="text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer select-none">
                      Tugaskan Sebagai Guru BK (Bimbingan Konseling)
                    </label>
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="isPasswordSementara"
                    checked={formIsPasswordSementara}
                    onChange={(e) => setFormIsPasswordSementara(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 bg-zinc-50 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                  />
                  <label htmlFor="isPasswordSementara" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 cursor-pointer select-none">
                    Wajibkan Ganti Kata Sandi pada Login Pertama
                  </label>
                </div>

                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="formAktif"
                    checked={formAktif}
                    onChange={(e) => setFormAktif(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 bg-zinc-50 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                  />
                  <label htmlFor="formAktif" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 cursor-pointer select-none">
                    Akun Aktif (Bisa Login ke Sistem)
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
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
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Pengguna</span>
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
                <span>Import Data Guru/Staf dari XLSX</span>
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!importResult ? (
              <form onSubmit={handleImportUsers} className="space-y-4">
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
                    Unduh template: <a href="/templates/template_guru.xlsx" download className="text-emerald-600 hover:underline">template_guru.xlsx</a>
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
