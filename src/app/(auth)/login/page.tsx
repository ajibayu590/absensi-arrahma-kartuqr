"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { getBrowserFingerprint } from "@/lib/fingerprint";
import { Eye, EyeOff, Lock, User, RefreshCw } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState("");

  // Ambil fingerprint browser saat halaman dimuat di client-side
  useEffect(() => {
    const fp = getBrowserFingerprint();
    setFingerprint(fp);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !kataSandi.trim()) {
      toast.error("Semua input wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
          kataSandi: kataSandi.trim(),
          sidikJariBrowser: fingerprint,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login gagal.");
      }

      toast.success(data.message || "Selamat datang!");

      // Simpan info pengguna ke localStorage jika perlu untuk state client-side non-sensitif
      localStorage.setItem("pengguna", JSON.stringify(data.pengguna));

      // Redirect berdasarkan isPasswordSementara
      if (data.pengguna.isPasswordSementara) {
        toast.custom(
          (t) => (
            <div className="bg-amber-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-2">
              <span>⚠️ Anda wajib mengubah kata sandi sementara terlebih dahulu!</span>
            </div>
          ),
          { duration: 5000 }
        );
        router.push("/change-password");
        return;
      }

      // Redirect berdasarkan peran atau callbackUrl
      if (callbackUrl) {
        router.push(callbackUrl);
      } else if (data.pengguna.peran === "SISWA") {
        router.push("/student");
      } else if (data.pengguna.peran === "GURU_PIKET") {
        router.push("/scan");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Koneksi gagal atau kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
          <img
            src="/logo.webp"
            alt="Logo SMK AR-RAHMA"
            className="w-full h-full object-contain"
          />
        </div>
        <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
          SMK AR-RAHMA MANDIRI INDONESIA
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Sistem Absensi Kehadiran Siswa
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        {/* Input NISN / Email */}
        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Email / NISN / Username
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <User className="w-5 h-5" />
            </span>
            <input
              type="text"
              required
              disabled={loading}
              placeholder="Masukkan Email atau NISN"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Input Sandi */}
        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Kata Sandi
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <Lock className="w-5 h-5" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              disabled={loading}
              placeholder="Masukkan Kata Sandi"
              value={kataSandi}
              onChange={(e) => setKataSandi(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Tombol Login */}
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
            <span>Masuk ke Sistem</span>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-600 border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
        Fingerprint Sesi Aktif: <span className="font-mono text-zinc-500">{fingerprint || "Mendeteksi..."}</span>
      </div>
    </div>
  );
}
