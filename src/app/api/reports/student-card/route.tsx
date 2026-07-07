import React from "react";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import { Document, Page, Text, View, StyleSheet, renderToStream } from "@react-pdf/renderer";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import { id as localeID } from "date-fns/locale";

// Definisikan style A4 PDF formal menggunakan react-pdf Stylesheet
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    color: "#1f2937",
    fontSize: 9,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#16a34a", // Emerald 600 (Warna SMK Ar Rahma)
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  schoolName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#16a34a",
  },
  schoolSubtitle: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
    color: "#111827",
    textTransform: "uppercase"
  },
  metaGrid: {
    flexDirection: "row",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f9fafb"
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
    fontWeight: "bold"
  },
  metaVal: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 2
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8
  },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 8,
    alignItems: "center"
  },
  summaryNum: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937"
  },
  summaryLabel: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 2,
    textTransform: "uppercase"
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 25
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderBottomWidth: 1,
    borderBottomColor: "#bbf7d0",
    alignItems: "center",
    height: 22,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
    height: 18,
  },
  colNo: { width: "8%", textAlign: "center", fontWeight: "bold" },
  colHari: { width: "20%", paddingLeft: 6 },
  colTanggal: { width: "22%", paddingLeft: 6 },
  colWaktu: { width: "15%", textAlign: "center" },
  colStatus: { width: "15%", textAlign: "center", fontWeight: "bold" },
  colCatatan: { width: "20%", paddingLeft: 6 },
  headerText: {
    color: "#166534",
    fontSize: 8,
    fontWeight: "bold"
  },
  cellText: {
    fontSize: 8,
    color: "#374151"
  },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    paddingHorizontal: 20
  },
  signatureCol: {
    alignItems: "center",
    width: 150
  },
  signatureSpace: {
    height: 45
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#9ca3af"
  }
});

interface StudentCardProps {
  studentName: string;
  nisn: string;
  kelas: string;
  waliKelas: string;
  bulanNama: string;
  tahun: number;
  logs: any[];
  stats: {
    hadir: number;
    terlambat: number;
    sakit: number;
    izin: number;
    alpha: number;
    persentase: number;
  };
}

const StudentCardDocument = ({
  studentName,
  nisn,
  kelas,
  waliKelas,
  bulanNama,
  tahun,
  logs,
  stats
}: StudentCardProps) => (
  <Document title={`Rapor_Absensi_${studentName}_${bulanNama}_${tahun}`}>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.schoolName}>SMK AR-RAHMA MANDIRI INDONESIA</Text>
          <Text style={styles.schoolSubtitle}>
            Jl. Raya Carat Gempol Kab. Pasuruan • Telp: +62 817-587-857 • Email: info@smkami.sch.id
          </Text>
        </View>
        <Text style={{ fontSize: 10, color: "#16a34a", fontWeight: "bold" }}>KARTU PRESENSI SISWA</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>RAPOR KEHADIRAN BULANAN SISWA</Text>

      {/* Meta Grid */}
      <View style={styles.metaGrid}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Nama Siswa</Text>
          <Text style={styles.metaVal}>{studentName}</Text>
          <Text style={[styles.metaLabel, { marginTop: 6 }]}>NISN</Text>
          <Text style={styles.metaVal}>{nisn}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Kelas</Text>
          <Text style={styles.metaVal}>Kelas {kelas}</Text>
          <Text style={[styles.metaLabel, { marginTop: 6 }]}>Wali Kelas</Text>
          <Text style={styles.metaVal}>{waliKelas}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Periode</Text>
          <Text style={styles.metaVal}>{`${bulanNama} ${tahun}`}</Text>
          <Text style={[styles.metaLabel, { marginTop: 6 }]}>Tanggal Cetak</Text>
          <Text style={styles.metaVal}>
            {new Date().toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </Text>
        </View>
      </View>

      {/* Summary Grid */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryBox, { borderLeftWidth: 4, borderLeftColor: "#16a34a" }]}>
          <Text style={styles.summaryNum}>{stats.hadir}</Text>
          <Text style={styles.summaryLabel}>Hadir</Text>
        </View>
        <View style={[styles.summaryBox, { borderLeftWidth: 4, borderLeftColor: "#f59e0b" }]}>
          <Text style={styles.summaryNum}>{stats.terlambat}</Text>
          <Text style={styles.summaryLabel}>Telat</Text>
        </View>
        <View style={[styles.summaryBox, { borderLeftWidth: 4, borderLeftColor: "#3b82f6" }]}>
          <Text style={styles.summaryNum}>{stats.sakit}</Text>
          <Text style={styles.summaryLabel}>Sakit</Text>
        </View>
        <View style={[styles.summaryBox, { borderLeftWidth: 4, borderLeftColor: "#0ea5e9" }]}>
          <Text style={styles.summaryNum}>{stats.izin}</Text>
          <Text style={styles.summaryLabel}>Izin</Text>
        </View>
        <View style={[styles.summaryBox, { borderLeftWidth: 4, borderLeftColor: "#ef4444" }]}>
          <Text style={styles.summaryNum}>{stats.alpha}</Text>
          <Text style={styles.summaryLabel}>Alpha</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
          <Text style={[styles.summaryNum, { color: "#15803d" }]}>{stats.persentase}%</Text>
          <Text style={[styles.summaryLabel, { color: "#166534" }]}>Persentase</Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colNo, styles.headerText]}>No</Text>
          <Text style={[styles.colHari, styles.headerText]}>Hari</Text>
          <Text style={[styles.colTanggal, styles.headerText]}>Tanggal</Text>
          <Text style={[styles.colWaktu, styles.headerText]}>Jam Masuk</Text>
          <Text style={[styles.colStatus, styles.headerText]}>Status</Text>
          <Text style={[styles.colCatatan, styles.headerText]}>Keterangan</Text>
        </View>

        {logs.map((log, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.colNo, styles.cellText]}>{index + 1}</Text>
            <Text style={[styles.colHari, styles.cellText]}>{log.hariNama}</Text>
            <Text style={[styles.colTanggal, styles.cellText]}>{log.tanggalFormatted}</Text>
            <Text style={[styles.colWaktu, styles.cellText]}>{log.waktu || "-"}</Text>
            <Text style={[styles.colStatus, styles.cellText, { color: log.statusColor }]}>{log.status}</Text>
            <Text style={[styles.colCatatan, styles.cellText]}>{log.catatan || ""}</Text>
          </View>
        ))}
      </View>

      {/* Signatures */}
      <View style={styles.signatureSection}>
        <View style={styles.signatureCol}>
          <Text>Orang Tua / Wali Siswa,</Text>
          <View style={styles.signatureSpace} />
          <Text style={{ borderBottomWidth: 1, borderBottomColor: "#1f2937", width: 120, textAlign: "center" }} />
        </View>
        <View style={styles.signatureCol}>
          <Text>Wali Kelas,</Text>
          <View style={styles.signatureSpace} />
          <Text style={{ fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#1f2937", width: 140, textAlign: "center" }}>
            {waliKelas}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Rapor Kehadiran Bulanan SMK Ar-Rahma Mandiri Indonesia</Text>
        <Text>Halaman 1 dari 1</Text>
      </View>
    </Page>
  </Document>
);

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json({ error: "Akses ditolak. Silakan login kembali." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const idSiswaParam = searchParams.get("siswaId");
    const bulanParam = searchParams.get("bulan");
    const tahunParam = searchParams.get("tahun");

    if (!idSiswaParam) {
      return NextResponse.json({ error: "Parameter siswaId wajib diisi." }, { status: 400 });
    }

    const idSiswa = parseInt(idSiswaParam, 10);
    const now = new Date();
    const targetBulan = bulanParam ? parseInt(bulanParam, 10) : now.getMonth() + 1;
    const targetTahun = tahunParam ? parseInt(tahunParam, 10) : now.getFullYear();

    if (isNaN(idSiswa) || isNaN(targetBulan) || targetBulan < 1 || targetBulan > 12 || isNaN(targetTahun)) {
      return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
    }

    // Ambil data Siswa, Kelas, dan Wali Kelasnya
    const student = await prisma.siswa.findUnique({
      where: { id: idSiswa },
      include: {
        kelas: {
          include: {
            guru: {
              include: {
                pengguna: {
                  select: { nama: true }
                }
              }
            }
          }
        },
        pengguna: {
          select: { id: true, aktif: true }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    }

    // Validasi Hak Akses RBAC
    if (payload.peran === "SISWA" && student.pengguna.id !== payload.userId) {
      return NextResponse.json({ error: "Akses ditolak. Anda tidak boleh melihat rapor siswa lain." }, { status: 403 });
    }

    if (payload.peran === "GURU") {
      // Dapatkan info guru login
      const currentGuru = await prisma.guru.findUnique({
        where: { idPengguna: payload.userId },
        include: { kelasWali: true }
      });
      // Jika Wali Kelas, pastikan siswa bimbingannya sendiri
      if (currentGuru?.kelasWali && student.idKelas !== currentGuru.kelasWali.id) {
        return NextResponse.json({ error: "Akses ditolak. Wali kelas hanya bisa mengunduh rapor kelasnya sendiri." }, { status: 403 });
      }
    }

    // Hitung tanggal awal dan akhir bulan (UTC)
    const startDate = new Date(Date.UTC(targetTahun, targetBulan - 1, 1));
    const endDate = new Date(Date.UTC(targetTahun, targetBulan, 0, 23, 59, 59, 999));

    // Ambil Kehadiran Siswa
    const kehadiranList = await prisma.kehadiran.findMany({
      where: {
        idSiswa: student.id,
        tanggal: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Ambil Hari Libur pada periode tersebut
    const liburList = await prisma.hariLibur.findMany({
      where: {
        tanggal: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const monthsMap = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const bulanNama = monthsMap[targetBulan - 1];

    // Generate list seluruh tanggal di bulan tersebut
    const daysInPeriod = eachDayOfInterval({ start: startDate, end: endDate });

    let hadirCount = 0;
    let telatCount = 0;
    let sakitCount = 0;
    let izinCount = 0;
    let alphaCount = 0;
    let schoolDays = 0;

    const formattedLogs = daysInPeriod.map((day) => {
      const dayOfWeek = day.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = day.toISOString().split("T")[0];
      
      const holiday = liburList.find(l => l.tanggal.toISOString().split("T")[0] === dateStr);
      const att = kehadiranList.find(k => k.tanggal.toISOString().split("T")[0] === dateStr);

      let status = "-";
      let statusColor = "#374151";
      let waktu = "";
      let catatan = "";

      if (isWeekend) {
        status = "LIBUR";
        statusColor = "#9ca3af";
        catatan = "Libur Pekanan";
      } else if (holiday) {
        status = "LIBUR";
        statusColor = "#9ca3af";
        catatan = holiday.nama;
      } else {
        schoolDays++;
        if (att) {
          status = att.status;
          catatan = att.catatan || "";
          if (att.waktuMasuk) {
            const h = String(att.waktuMasuk.getUTCHours() + 7).padStart(2, "0");
            const m = String(att.waktuMasuk.getUTCMinutes()).padStart(2, "0");
            waktu = `${h}:${m}`;
          }

          if (att.status === "HADIR") {
            hadirCount++;
            statusColor = "#16a34a";
          } else if (att.status === "TERLAMBAT") {
            telatCount++;
            statusColor = "#d97706";
          } else if (att.status === "SAKIT") {
            sakitCount++;
            statusColor = "#2563eb";
          } else if (att.status === "IZIN") {
            izinCount++;
            statusColor = "#0284c7";
          } else if (att.status === "ALPHA") {
            alphaCount++;
            statusColor = "#dc2626";
          }
        } else {
          // Jika tidak ada absensi dan hari ini/kemarin adalah sekolah
          const nowStr = now.toISOString().split("T")[0];
          if (dateStr <= nowStr) {
            status = "ALPHA";
            alphaCount++;
            statusColor = "#dc2626";
            catatan = "Tanpa Keterangan";
          }
        }
      }

      const hariNama = day.toLocaleDateString("id-ID", { weekday: "long" });
      const tanggalFormatted = day.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

      return {
        hariNama,
        tanggalFormatted,
        waktu,
        status,
        statusColor,
        catatan
      };
    });

    const totalPresent = hadirCount + telatCount;
    const persentase = schoolDays > 0 ? Math.round((totalPresent / schoolDays) * 100) : 100;

    const stats = {
      hadir: hadirCount,
      terlambat: telatCount,
      sakit: sakitCount,
      izin: izinCount,
      alpha: alphaCount,
      persentase
    };

    const waliKelasNama = student.kelas.guru?.pengguna.nama || "Belum Ditentukan";

    // Buat pdf stream menggunakan renderToStream
    const doc = React.createElement(StudentCardDocument, {
      studentName: student.nama,
      nisn: student.nisn,
      kelas: student.kelas.nama,
      waliKelas: waliKelasNama,
      bulanNama,
      tahun: targetTahun,
      logs: formattedLogs,
      stats
    });

    const stream = await renderToStream(doc as any);
    
    // Konversi NodeJS readable stream menjadi Web Response stream
    // @ts-ignore
    const responseStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      }
    });

    return new NextResponse(responseStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Rapor_Absensi_${student.nama.replace(/\s+/g, "_")}_${bulanNama}_${targetTahun}.pdf`
      }
    });
  } catch (error: any) {
    console.error("Kesalahan API student-card GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat memproses file PDF." }, { status: 500 });
  }
}
