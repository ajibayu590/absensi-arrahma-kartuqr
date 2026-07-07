"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import {
  ShieldAlert,
  Search,
  User,
  Phone,
  Calendar,
  Plus,
  Save,
  FileText,
  Loader2,
  X,
  AlertTriangle,
  Clock,
  ArrowRight,
  UserCheck,
  Send,
  MessageSquare,
  Info
} from "lucide-react";

// Dynamic import of PDF components to prevent SSR errors in Next.js App Router
const SpPdfButton = dynamic(
  () => import("@/components/pdf/SpPdfButton"),
  { ssr: false }
);

interface LogKonseling {
  id: number;
  idSiswa: number;
  idBk: number;
  detail: string;
  dibuatPada: string;
  guruBk: {
    nama: string;
  };
}

interface FlaggedStudent {
  id: number;
  nisn: string;
  nama: string;
  kelas: string;
  teleponOrangTua: string;
  sedangMagang: boolean;
  stats: {
    hadir: number;
    terlambat: number;
    sakit: number;
    izin: number;
    alpha: number;
  };
  ewsReason: string;
  counselingCount: number;
  logKonselingBk: LogKonseling[];
}

export default function BkPage() {
  const [isClient, setIsClient] = useState(false);
  const [flaggedStudents, setFlaggedStudents] = useState<FlaggedStudent[]>([]);
  const [bulanTahun, setBulanTahun] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Counseling detail / log states
  const [selectedStudent, setSelectedStudent] = useState<FlaggedStudent | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newLogDetail, setNewLogDetail] = useState("");
  const [savingLog, setSavingLog] = useState(false);

  // SP (Surat Panggilan) modal states
  const [showSpModal, setShowSpModal] = useState(false);
  const [spLevel, setSpLevel] = useState<"1" | "2" | "3">("1");
  const [spMeetingDate, setSpMeetingDate] = useState("");
  const [spMeetingTime, setSpMeetingTime] = useState("09:00 WIB");
  const [spMeetingRoom, setSpMeetingRoom] = useState("Ruang Bimbingan Konseling (BK)");

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchEws = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bk/ews");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengambil data EWS BK.");

      setFlaggedStudents(result.flaggedStudents);
      setBulanTahun(result.bulanTahun);

      // Sinkronkan data jika ada siswa terpilih sebelumnya
      if (selectedStudent) {
        const updated = result.flaggedStudents.find((s: FlaggedStudent) => s.id === selectedStudent.id);
        if (updated) setSelectedStudent(updated);
      }
    } catch (err: any) {
      toast.error(err.message || "Kesalahan memuat data EWS.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isClient) {
      fetchEws();
    }
  }, [isClient]);

  // Submit Counseling Session Log
  const handleSaveCounselingLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newLogDetail.trim()) return;

    setSavingLog(true);
    try {
      const res = await fetch("/api/bk/counseling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idSiswa: selectedStudent.id,
          detail: newLogDetail,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan log konseling.");

      toast.success("Catatan log konseling BK berhasil disimpan.");
      setNewLogDetail("");
      setShowLogModal(false);
      fetchEws(); // Refresh data
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan log.");
    } finally {
      setSavingLog(false);
    }
  };

  // Filter flagged students list by search query
  const filteredStudents = flaggedStudents.filter(
    (s) =>
      s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn.includes(searchQuery) ||
      s.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Formulasi link wa.me otomatis untuk Guru BK
  const getWaMeUrl = (s: FlaggedStudent) => {
    const message = `Assalamu'alaikum Wr. Wb. Bapak/Ibu Wali dari *${s.nama}* (Kelas ${s.kelas}). Kami dari BK SMK Ar Rahma ingin mengundang Bapak/Ibu berdiskusi mengenai absensi kehadiran sekolah putra/putri Bapak/Ibu. Mohon hubungi Guru BK di sekolah. Terima kasih.`;
    const phoneClean = s.teleponOrangTua.replace(/[^0-9]/g, "");
    return `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            <span>Konseling & EWS BK</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Sistem Deteksi Dini pelanggaran absensi kelas ({bulanTahun}). Ambil tindakan konseling dan cetak Surat Panggilan (SP) resmi.
          </p>
        </div>
      </div>

      {/* BODY CONTENT: LEFT LIST, RIGHT DETAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: LIST OF FLAGGED STUDENTS (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Search Box */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-4 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari siswa rawan mangkir..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-zinc-400"
              />
            </div>
          </div>

          {/* Flagged Students Card List */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm flex-grow min-h-[400px] flex flex-col">
            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Daftar Pelanggaran ({filteredStudents.length})
              </span>
              <button
                onClick={fetchEws}
                className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex-grow flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="flex-grow overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[500px]">
                {filteredStudents.map((s) => {
                  const isSelected = selectedStudent?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className={`p-4 transition-all cursor-pointer flex justify-between items-start gap-3 border-l-4 ${
                        isSelected
                          ? "bg-red-50/40 dark:bg-red-950/5 border-red-600"
                          : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 border-transparent"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100 block">
                          {s.nama}
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          Kelas {s.kelas} • NISN {s.nisn}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-bold mt-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200/30 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{s.ewsReason}</span>
                        </span>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                          Log Konseling
                        </span>
                        <span className="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300 block mt-1">
                          {s.counselingCount} Kali
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-8 text-zinc-400 text-xs italic">
                Aman! Tidak ada siswa yang terdeteksi rawan pelanggaran saat ini.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHOSEN STUDENT DETAILS & ACTION CABINET (7 cols) */}
        <div className="lg:col-span-7">
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 rounded-2xl flex items-center justify-center font-extrabold text-lg uppercase shrink-0">
                      {selectedStudent.nama.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
                        {selectedStudent.nama}
                      </h3>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">
                        Kelas {selectedStudent.kelas} • NISN {selectedStudent.nisn}
                      </p>
                      <div className="flex gap-4 mt-3 text-xs">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Ortu: {selectedStudent.teleponOrangTua}</span>
                        </span>
                        {selectedStudent.sedangMagang && (
                          <span className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            Magang / PKL
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Quick Chat */}
                  <a
                    href={getWaMeUrl(selectedStudent)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-200/30 transition-all cursor-pointer shadow-sm shadow-emerald-600/5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Hubungi Ortu</span>
                  </a>
                </div>

                {/* EWS Warning Banner */}
                <div className="bg-red-50 dark:bg-red-950/25 border border-red-200/40 rounded-2xl p-4 flex gap-3 text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">Pemicu EWS Terdeteksi!</h4>
                    <p className="text-[11px] mt-1 leading-relaxed">
                      Siswa ini masuk daftar pengawasan Guru BK karena terdata: <span className="font-bold">{selectedStudent.ewsReason}</span>. Mohon jadwalkan panggilan wali murid.
                    </p>
                  </div>
                </div>

                {/* Attendance Summary Grid */}
                <div className="grid grid-cols-5 gap-2 pt-2">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-center border border-zinc-200/30">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Hadir</span>
                    <span className="text-sm font-bold font-mono text-emerald-600 block mt-1">{selectedStudent.stats.hadir}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-center border border-zinc-200/30">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Telat</span>
                    <span className="text-sm font-bold font-mono text-amber-500 block mt-1">{selectedStudent.stats.terlambat}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-center border border-zinc-200/30">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Sakit</span>
                    <span className="text-sm font-bold font-mono text-blue-500 block mt-1">{selectedStudent.stats.sakit}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-center border border-zinc-200/30">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Izin</span>
                    <span className="text-sm font-bold font-mono text-indigo-500 block mt-1">{selectedStudent.stats.izin}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-center border border-zinc-200/30">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Alpha</span>
                    <span className="text-sm font-bold font-mono text-red-600 block mt-1">{selectedStudent.stats.alpha}</span>
                  </div>
                </div>

                {/* Call Letter Action Button */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowSpModal(true)}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-600/10"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Cetak Surat Panggilan Orang Tua (SP 1/2/3)</span>
                  </button>
                </div>
              </div>

              {/* Counseling logs panel */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    <span>Riwayat Hasil Konseling ({selectedStudent.logKonselingBk.length})</span>
                  </h3>
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Log</span>
                  </button>
                </div>

                {/* Log timeline list */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {selectedStudent.logKonselingBk.length > 0 ? (
                    selectedStudent.logKonselingBk.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl text-xs space-y-2 shadow-inner"
                      >
                        <div className="flex justify-between items-center text-[10px] text-zinc-400">
                          <span className="font-bold text-zinc-600 dark:text-zinc-300">
                            Dicatat: {log.guruBk.nama}
                          </span>
                          <span>
                            {new Date(log.dibuatPada).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })} WIB
                          </span>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                          {log.detail}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-zinc-400 text-xs italic">
                      Belum ada riwayat log bimbingan konseling untuk siswa ini.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-12 text-center shadow-sm flex flex-col justify-center items-center min-h-[450px] space-y-3">
              <ShieldAlert className="w-12 h-12 text-zinc-300 dark:text-zinc-800 animate-pulse" />
              <h3 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">Pilih Siswa</h3>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                Silakan pilih salah satu siswa dari daftar pelanggaran di sebelah kiri untuk melihat catatan riwayat bimbingan konseling, menginput log konsultasi baru, dan mencetak surat panggilan resmi.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD NEW COUNSELING LOG */}
      {showLogModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Input Catatan Konseling BK
              </h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCounselingLog} className="space-y-4">
              <div className="text-xs bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200/40">
                Siswa: <span className="font-bold">{selectedStudent.nama}</span> (Kelas {selectedStudent.kelas})
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Detail / Catatan Pertemuan Konseling
                </label>
                <textarea
                  required
                  rows={5}
                  disabled={savingLog}
                  placeholder="Ketik rincian hasil konseling, komitmen siswa, atau kesepakatan dengan orang tua di sini..."
                  value={newLogDetail}
                  onChange={(e) => setNewLogDetail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-zinc-400 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingLog}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {savingLog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Catatan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SP CONFIG & GENERATOR */}
      {showSpModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-red-600" />
                Cetak Surat Panggilan Orang Tua
              </h3>
              <button
                onClick={() => setShowSpModal(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* SP Level Select */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Tingkat Surat Panggilan (SP)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["1", "2", "3"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSpLevel(lvl)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        spLevel === lvl
                          ? "bg-red-600 text-white border-red-500 shadow-sm"
                          : "bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      SP {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meeting Date Input */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Tanggal Pertemuan
                </label>
                <input
                  type="date"
                  required
                  value={spMeetingDate}
                  onChange={(e) => setSpMeetingDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
                />
              </div>

              {/* Meeting Time Input */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Jam Pertemuan
                </label>
                <input
                  type="text"
                  required
                  value={spMeetingTime}
                  onChange={(e) => setSpMeetingTime(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              {/* Meeting Room Input */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Tempat Pertemuan
                </label>
                <input
                  type="text"
                  required
                  value={spMeetingRoom}
                  onChange={(e) => setSpMeetingRoom(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              {/* Info Tips */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 rounded-xl text-[10px] text-zinc-400 leading-relaxed flex gap-2">
                <Info className="w-4 h-4 shrink-0 text-red-500" />
                <span>
                  Surat Panggilan SP {spLevel} akan menyertakan data pemicu EWS siswa ini. Harap diprint pada kertas A4 resmi sekolah.
                </span>
              </div>

              {/* Action Buttons with react-pdf download link */}
              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowSpModal(false)}
                  className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>

                {isClient && spMeetingDate && (
                  <SpPdfButton
                    student={selectedStudent}
                    level={spLevel}
                    mDate={spMeetingDate}
                    mTime={spMeetingTime}
                    mRoom={spMeetingRoom}
                  />
                )}

                {(!spMeetingDate) && (
                  <button
                    disabled
                    className="py-2.5 px-5 bg-zinc-300 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 rounded-xl text-xs font-bold cursor-not-allowed"
                  >
                    Lengkapi Tanggal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
