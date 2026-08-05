"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Tv,
  Users,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ShieldAlert,
  Loader2,
  BookOpen,
  PieChart,
  Sun,
  Moon
} from "lucide-react";

interface UserProfile {
  id: number;
  nama: string;
  email: string;
  peran: "ADMIN" | "KEPALA_SEKOLAH" | "GURU" | "SISWA";
  isPasswordSementara: boolean;
  guru?: {
    id: number;
    nip: string | null;
    telepon: string | null;
    isBk: boolean;
    isPiket: boolean;
    idKelasWali: number | null;
    namaKelasWali: string | null;
  } | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Ambil tema dari localStorage atau default ke preferensi sistem
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const activeTheme = savedTheme || systemTheme;
    
    setTheme(activeTheme);
    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/profile");
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error("Sesi tidak valid.");
        }
        
        const user = data.pengguna as UserProfile;
        setProfile(user);

        // Proteksi: Wajib ganti password sementara
        if (user.isPasswordSementara && pathname !== "/change-password") {
          router.push("/change-password");
          return;
        }

        // Proteksi: Siswa tidak boleh masuk dashboard staf
        if (user.peran === "SISWA") {
          router.push("/student");
          return;
        }

        // Proteksi halaman Admin saja
        const adminRoutes = ["/classes", "/students", "/settings", "/teachers", "/picket-schedules", "/holidays"];
        if (adminRoutes.some(route => pathname.startsWith(route)) && user.peran !== "ADMIN") {
          router.push(user.peran === "GURU" && user.guru?.isPiket && !user.guru?.isBk && !user.guru?.idKelasWali ? "/scan" : "/");
          return;
        }

        // Proteksi untuk peran GURU berdasarkan penugasan
        if (user.peran === "GURU") {
          const isBk = user.guru?.isBk;
          const isPiket = user.guru?.isPiket;
          const isWali = !!user.guru?.idKelasWali;

          // Halaman BK
          if (pathname === "/bk" && !isBk) {
            router.push("/");
            return;
          }

          // Akses /scan hanya untuk Guru Piket atau Admin
          if (pathname === "/scan" && !isPiket) {
            router.push("/");
            return;
          }

          // Halaman Laporan/Dashboard jika bukan Wali/BK
          if ((pathname === "/" || pathname === "/reports") && !isWali && !isBk) {
            if (isPiket) {
              router.push("/scan");
            } else {
              // Jika Guru tidak punya tugas apa-apa, arahkan ke halaman utama/profile saja
              // atau biarkan default
            }
            return;
          }
        }
      } catch (err) {
        toast.error("Silakan masuk terlebih dahulu.");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("pengguna");
      toast.success("Berhasil keluar.");
      router.push("/login");
    } catch (err) {
      toast.error("Gagal logout.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-zinc-500 font-medium text-sm">Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  // Sidebar Menu Items berdasarkan Role (RBAC)
  const menuItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: PieChart,
      roles: ["ADMIN", "KEPALA_SEKOLAH"],
      guruCheck: (guru: any) => guru?.isBk || !!guru?.idKelasWali,
      target: undefined,
    },
    {
      name: "Pencatatan Absensi",
      path: "/scan",
      icon: Users,
      roles: ["ADMIN"],
      guruCheck: (guru: any) => guru?.isPiket,
      target: undefined,
    },
    {
      name: "Kelola Kelas",
      path: "/classes",
      icon: BookOpen,
      roles: ["ADMIN"],
      target: undefined,
    },
    {
      name: "Kelola Guru",
      path: "/teachers",
      icon: User,
      roles: ["ADMIN"],
      target: undefined,
    },
    {
      name: "Jadwal Piket",
      path: "/picket-schedules",
      icon: Calendar,
      roles: ["ADMIN"],
      target: undefined,
    },
    {
      name: "Kelola Hari Libur",
      path: "/holidays",
      icon: Calendar,
      roles: ["ADMIN"],
      target: undefined,
    },
    {
      name: "Kelola Siswa",
      path: "/students",
      icon: Users,
      roles: ["ADMIN"],
      target: undefined,
    },
    {
      name: "Laporan & Laci Wali",
      path: "/reports",
      icon: Calendar,
      roles: ["ADMIN", "KEPALA_SEKOLAH"],
      guruCheck: (guru: any) => guru?.isBk || !!guru?.idKelasWali,
      target: undefined,
    },
    {
      name: "Konseling & EWS BK",
      path: "/bk",
      icon: ShieldAlert,
      roles: ["ADMIN"],
      guruCheck: (guru: any) => guru?.isBk,
      target: undefined,
    },
    {
      name: "Pengaturan Sistem",
      path: "/settings",
      icon: Settings,
      roles: ["ADMIN"],
      target: undefined,
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (!profile) return false;
    if (profile.peran === "ADMIN") return true;
    if (profile.peran === "GURU") {
      return item.guruCheck ? item.guruCheck(profile.guru) : false;
    }
    return item.roles.includes(profile.peran);
  });

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200/60 dark:border-zinc-800/60 h-screen sticky top-0">
        {/* Logo Header */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-transparent">
            <img
              src="/logo.webp"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-xs text-zinc-800 dark:text-zinc-100 truncate" title="SMK AR-RAHMA MANDIRI INDONESIA">SMK AR-RAHMA</h2>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase truncate">Absensi Siswa</p>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.path}
                target={item.target}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Profile & Logout */}
        {profile && (
          <div className="p-4 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center font-bold text-sm uppercase shrink-0">
                  {profile.nama.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 block truncate">
                    {profile.nama}
                  </span>
                  <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block mt-0.5">
                    {profile.peran === "GURU"
                      ? [
                          profile.guru?.isBk ? "BK" : null,
                          profile.guru?.isPiket ? "Piket" : null,
                          profile.guru?.idKelasWali ? "Wali Kelas" : null,
                        ].filter(Boolean).join(" & ") || "GURU"
                      : profile.peran.replace("_", " ")}
                  </span>
                </div>
              </div>
              
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl transition-all cursor-pointer shrink-0"
                title="Ganti Tema"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-200 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:hover:bg-red-950/30 dark:hover:text-red-400 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Sesi</span>
            </button>
          </div>
        )}
      </aside>

      {/* MOBILE HEADER BAR */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800/60 px-4 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-transparent">
              <img
                src="/logo.webp"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-extrabold text-sm truncate max-w-[120px]">SMK AR-RAHMA</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button Mobile */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl transition-all cursor-pointer"
              title="Ganti Tema"
            >
              {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* MOBILE SLIDE-OVER MENU */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <nav
              className="w-64 bg-white dark:bg-zinc-900 h-full flex flex-col border-r border-zinc-200 dark:border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-16 flex items-center gap-2.5 px-6 border-b border-zinc-200 dark:border-zinc-800">
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-transparent">
                  <img
                    src="/logo.webp"
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-extrabold text-zinc-800 dark:text-zinc-100 text-sm truncate">SMK AR-RAHMA</span>
              </div>
              <div className="flex-grow p-4 space-y-1 overflow-y-auto">
                {filteredMenuItems.map((item) => {
                  const isActive = pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      target={item.target}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <Icon className="w-5 h-5 text-zinc-400" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
              {profile && (
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                      {profile.nama.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs block truncate">{profile.nama}</span>
                      <span className="text-[9px] bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {profile.peran === "GURU"
                          ? [
                              profile.guru?.isBk ? "BK" : null,
                              profile.guru?.isPiket ? "Piket" : null,
                              profile.guru?.idKelasWali ? "Wali Kelas" : null,
                            ].filter(Boolean).join(" & ") || "GURU"
                          : profile.peran}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-zinc-200 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}

        {/* MAIN ROUTE SCREEN CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
