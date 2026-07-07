"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Lock, RefreshCw } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [kataSandiLama, setKataSandiLama] = useState("");
  const [kataSandiBaru, setKataSandiBaru] = useState("");
  const [konfirmasiSandi, setKonfirmasiSandi] = useState("");
  const [loading, setLoading] = useState(false);
  const [pengguna, setPengguna] = useState<any>(null);

  // Ambil data pengguna dari localStorage
  useEffect(() => {
    const dataStr = localStorage.getItem("pengguna");
    if (!dataStr) {
      toast.error("Sesi tidak ditemukan. Silakan login kembali.");
      router.push("/login");
      return;
    }
    setPengguna(JSON.parse(dataStr));
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kataSandiLama || !kataSandiBaru || !konfirmasiSandi) {
      toast.error("Semua field wajib diisi!");
      return;
    }

    if (kataSandiBaru !== konfirmasiSandi) {
      toast.error("Konfirmasi kata sandi baru tidak cocok!");
      return;
    }

    if (kataSandiBaru.length < 8) {
      toast.error("Kata sandi baru minimal harus 8 karakter!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kataSandiLama,
          kataSandiBaru,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengubah kata sandi.");
      }

      toast.success("Kata sandi berhasil diperbarui!");

      // Update data di localStorage
      if (pengguna) {
        const updatedPengguna = { ...pengguna, isPasswordSementara: false };
        localStorage.setItem("pengguna", JSON.stringify(updatedPengguna));

        // Redirect berdasarkan peran
        if (updatedPengguna.peran === "SISWA") {
          router.push("/student");
        } else if (updatedPengguna.peran === "GURU_PIKET") {
          router.push("/scan");
        } else {
          router.push("/");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
          Ubah Kata Sandi
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Perbarui kata sandi bawaan Anda demi keamanan akun.
        </p>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-6">
        {/* Kata Sandi Lama */}
        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Kata Sandi Lama / Sementara
          </label>
          <input
            type="password"
            required
            disabled={loading}
            placeholder="Masukkan Kata Sandi Lama"
            value={kataSandiLama}
            onChange={(e) => setKataSandiLama(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
          />
        </div>

        {/* Kata Sandi Baru */}
        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Kata Sandi Baru
          </label>
          <input
            type="password"
            required
            disabled={loading}
            placeholder="Masukkan Kata Sandi Baru (Min. 8 karakter)"
            value={kataSandiBaru}
            onChange={(e) => setKataSandiBaru(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
          />
        </div>

        {/* Konfirmasi Kata Sandi Baru */}
        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Konfirmasi Kata Sandi Baru
          </label>
          <input
            type="password"
            required
            disabled={loading}
            placeholder="Ketik Ulang Kata Sandi Baru"
            value={konfirmasiSandi}
            onChange={(e) => setKonfirmasiSandi(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
          />
        </div>

        {/* Tombol Simpan */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 dark:shadow-none hover:shadow-emerald-700/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <span>Simpan & Perbarui</span>
          )}
        </button>
      </form>
    </div>
  );
}
