"use client";

import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";

interface FlaggedStudent {
  id: number;
  nisn: string;
  nama: string;
  kelas: string;
  teleponOrangTua: string;
  sedangMagang: boolean;
  ewsReason: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const spPdfStyles: any = {
  page: {
    padding: 50,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.6,
    color: "#1f2937",
  },
  schoolLetterhead: {
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
    paddingBottom: 8,
    marginBottom: 18,
  },
  schoolTitle: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  schoolSubtitle: {
    fontSize: 8,
    textAlign: "center",
    color: "#4b5563",
    marginTop: 2,
  },
  letterMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  metaLeft: {
    flexDirection: "column",
  },
  metaRight: {
    textAlign: "right",
  },
  bold: {
    fontWeight: "bold",
  },
  recipient: {
    marginTop: 15,
    marginBottom: 15,
  },
  bodyText: {
    textAlign: "justify",
    marginBottom: 12,
  },
  scheduleGrid: {
    marginLeft: 25,
    marginVertical: 10,
  },
  scheduleRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  scheduleLabel: {
    width: 100,
    fontWeight: "bold",
  },
  scheduleVal: {
    flex: 1,
  },
  signatureBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
  },
  signatureCol: {
    width: 160,
    alignItems: "center",
  },
  sigGap: {
    height: 55,
  },
  sigName: {
    fontWeight: "bold",
    textDecoration: "underline",
  },
  sigPost: {
    fontSize: 8,
    color: "#4b5563",
    marginTop: 2,
  },
};

export default function SpPdfLetterDocument({
  student,
  level,
  mDate,
  mTime,
  mRoom,
}: {
  student: FlaggedStudent;
  level: string;
  mDate: string;
  mTime: string;
  mRoom: string;
}) {
  const formattedDateMeeting = mDate
    ? new Date(mDate).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "[Belum Ditentukan]";

  const formattedToday = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document title={`Surat_Panggilan_SP${level}_${student.nama}`}>
      <Page size="A4" style={spPdfStyles.page}>
        {/* Letterhead */}
        <View style={spPdfStyles.schoolLetterhead}>
          <Text style={spPdfStyles.schoolTitle}>YAYASAN AR-RAHMA MANDIRI INDONESIA</Text>
          <Text style={[spPdfStyles.schoolTitle, { fontSize: 14 }]}>SMK AR-RAHMA MANDIRI INDONESIA</Text>
          <Text style={spPdfStyles.schoolSubtitle}>
            Terakreditasi A • Bidang Keahlian: Teknologi Informasi, Bisnis Manajemen
          </Text>
          <Text style={spPdfStyles.schoolSubtitle}>
            Jl. Raya Carat Gempol Kab. Pasuruan • Telp: +62 817-587-857 • Email: info@smkami.sch.id
          </Text>
        </View>

        {/* Letter Meta */}
        <View style={spPdfStyles.letterMeta}>
          <View style={spPdfStyles.metaLeft}>
            <Text>Nomor: {`421.5/0${level}5/SMK-AR/VI/2026`}</Text>
            <Text>Lampiran: -</Text>
            <Text>Perihal: <Text style={spPdfStyles.bold}>{`Surat Panggilan Orang Tua (SP ${level})`}</Text></Text>
          </View>
          <View style={spPdfStyles.metaRight}>
            <Text>Pasuruan, {formattedToday}</Text>
          </View>
        </View>

        {/* Recipient */}
        <View style={spPdfStyles.recipient}>
          <Text>Kepada Yth.</Text>
          <Text style={spPdfStyles.bold}>Bapak/Ibu Orang Tua / Wali dari {student.nama}</Text>
          <Text>Kelas {student.kelas} - SMK Ar-Rahma Mandiri Indonesia</Text>
          <Text>Di Tempat</Text>
        </View>

        {/* Body */}
        <Text style={spPdfStyles.bodyText}>Assalamu&apos;alaikum Wr. Wb.</Text>
        <Text style={spPdfStyles.bodyText}>
          Dengan hormat, sehubungan dengan adanya hal penting yang perlu dikoordinasikan terkait perkembangan kedisiplinan dan absensi putra/putri Bapak/Ibu di sekolah, maka melalui surat ini kami mengharapkan kehadiran Bapak/Ibu Orang Tua/Wali dari:
        </Text>

        {/* Student details */}
        <View style={spPdfStyles.scheduleGrid}>
          <View style={spPdfStyles.scheduleRow}>
            <Text style={spPdfStyles.scheduleLabel}>Nama Siswa</Text>
            <Text style={spPdfStyles.scheduleVal}>: <Text style={spPdfStyles.bold}>{student.nama}</Text></Text>
          </View>
          <View style={spPdfStyles.scheduleGrid === undefined ? undefined : spPdfStyles.scheduleRow}>
            <Text style={spPdfStyles.scheduleLabel}>NISN</Text>
            <Text style={spPdfStyles.scheduleVal}>: {student.nisn}</Text>
          </View>
          <View style={spPdfStyles.scheduleRow}>
            <Text style={spPdfStyles.scheduleLabel}>Kelas</Text>
            <Text style={spPdfStyles.scheduleVal}>: {student.kelas}</Text>
          </View>
          <View style={spPdfStyles.scheduleRow}>
            <Text style={spPdfStyles.scheduleLabel}>Pelanggaran</Text>
            <Text style={spPdfStyles.scheduleVal}>: {student.ewsReason}</Text>
          </View>
        </View>

        <Text style={spPdfStyles.bodyText}>
          Untuk hadir di sekolah guna melakukan bimbingan konseling dan konfirmasi perkembangan putra/putri Bapak/Ibu, yang dijadwalkan pada:
        </Text>

        {/* Meeting Schedule */}
        <View style={spPdfStyles.scheduleGrid}>
          <View style={spPdfStyles.scheduleRow}>
            <Text style={spPdfStyles.scheduleLabel}>Hari, Tanggal</Text>
            <Text style={spPdfStyles.scheduleVal}>: {formattedDateMeeting}</Text>
          </View>
          <View style={spPdfStyles.scheduleRow}>
            <Text style={spPdfStyles.scheduleLabel}>Waktu</Text>
            <Text style={spPdfStyles.scheduleVal}>: {mTime}</Text>
          </View>
          <View style={spPdfStyles.scheduleRow}>
            <Text style={spPdfStyles.scheduleLabel}>Tempat</Text>
            <Text style={spPdfStyles.scheduleVal}>: {mRoom}</Text>
          </View>
          <View style={spPdfStyles.scheduleRow}>
            <Text style={spPdfStyles.scheduleLabel}>Menemui</Text>
            <Text style={spPdfStyles.scheduleVal}>: Tim Bimbingan Konseling (BK) / Wali Kelas</Text>
          </View>
        </View>

        <Text style={spPdfStyles.bodyText}>
          Mengingat pentingnya koordinasi ini demi masa depan pendidikan putra/putri Bapak/Ibu, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.
        </Text>

        <Text style={spPdfStyles.bodyText}>Wassalamu&apos;alaikum Wr. Wb.</Text>

        {/* Signatures */}
        <View style={spPdfStyles.signatureBlock}>
          <View style={spPdfStyles.signatureCol}>
            <Text>Mengetahui,</Text>
            <Text>Wali Kelas</Text>
            <View style={spPdfStyles.sigGap} />
            <Text style={spPdfStyles.sigName}>____________________</Text>
            <Text style={spPdfStyles.sigPost}>Wali Kelas {student.kelas}</Text>
          </View>

          <View style={spPdfStyles.signatureCol}>
            <Text>Hormat Kami,</Text>
            <Text>Koordinator BK</Text>
            <View style={spPdfStyles.sigGap} />
            <Text style={spPdfStyles.sigName}>Drs. H. Mulyadi, M.Pd.</Text>
            <Text style={spPdfStyles.sigPost}>NIP. 197609122005011002</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
