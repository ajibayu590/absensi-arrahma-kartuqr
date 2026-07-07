"use client";

import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";

interface SiswaPdfData {
  no: number;
  nisn: string;
  nama: string;
  hadir: number;
  terlambat: number;
  sakit: number;
  izin: number;
  alpha: number;
  persentase: number;
}

// Define PDF design styles using react-pdf StyleSheet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfStyles: any = {
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#10b981",
    paddingBottom: 10,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#047857",
  },
  schoolSubtitle: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 12,
    color: "#111827",
  },
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    fontSize: 9,
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  metaCol: {
    flexDirection: "column",
  },
  metaLabel: {
    color: "#6b7280",
  },
  metaVal: {
    fontWeight: "bold",
    marginTop: 2,
  },
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
    minHeight: 24,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#ecfdf5",
    borderBottomWidth: 2,
    borderBottomColor: "#a7f3d0",
    alignItems: "center",
    minHeight: 28,
  },
  colNo: { width: "7%", textAlign: "center", fontSize: 8 },
  colNisn: { width: "15%", fontSize: 8, paddingLeft: 4 },
  colNama: { width: "38%", fontSize: 8, paddingLeft: 4 },
  colStat: { width: "8%", textAlign: "center", fontSize: 8, fontWeight: "bold" },
  colPct: { width: "12%", textAlign: "center", fontSize: 8, fontWeight: "bold" },
  headerText: {
    color: "#065f46",
    fontWeight: "bold",
  },
  cellText: {
    color: "#374151",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#9ca3af",
  },
};

interface RekapAbsensiPdfDocumentProps {
  kelasNama: string;
  bulanNama: string;
  tahun: number;
  siswaList: SiswaPdfData[];
}

export default function RekapAbsensiPdfDocument({
  kelasNama,
  bulanNama,
  tahun,
  siswaList,
}: RekapAbsensiPdfDocumentProps) {
  return (
    <Document title={`Rekap_Absensi_Kelas_${kelasNama}`}>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.schoolName}>SMK AR-RAHMA MANDIRI INDONESIA</Text>
          <Text style={pdfStyles.schoolSubtitle}>
            Jl. Raya Carat Gempol Kab. Pasuruan • Telp: +62 817-587-857 • Email: info@smkami.sch.id
          </Text>
        </View>

        {/* Title */}
        <Text style={pdfStyles.title}>
          REKAPITULASI KEHADIRAN SISWA BULANAN
        </Text>

        {/* Metadata */}
        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCol}>
            <Text style={pdfStyles.metaLabel}>Kelas</Text>
            <Text style={pdfStyles.metaVal}>{kelasNama}</Text>
          </View>
          <View style={pdfStyles.metaCol}>
            <Text style={pdfStyles.metaLabel}>Periode Bulan</Text>
            <Text style={pdfStyles.metaVal}>{`${bulanNama} ${tahun}`}</Text>
          </View>
          <View style={pdfStyles.metaCol}>
            <Text style={pdfStyles.metaLabel}>Tanggal Cetak</Text>
            <Text style={pdfStyles.metaVal}>
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={pdfStyles.table}>
          {/* Header Row */}
          <View style={pdfStyles.tableHeaderRow}>
            <Text style={[pdfStyles.colNo, pdfStyles.headerText]}>No</Text>
            <Text style={[pdfStyles.colNisn, pdfStyles.headerText]}>NISN</Text>
            <Text style={[pdfStyles.colNama, pdfStyles.headerText]}>Nama Siswa</Text>
            <Text style={[pdfStyles.colStat, pdfStyles.headerText]}>H</Text>
            <Text style={[pdfStyles.colStat, pdfStyles.headerText]}>T</Text>
            <Text style={[pdfStyles.colStat, pdfStyles.headerText]}>S</Text>
            <Text style={[pdfStyles.colStat, pdfStyles.headerText]}>I</Text>
            <Text style={[pdfStyles.colStat, pdfStyles.headerText]}>A</Text>
            <Text style={[pdfStyles.colPct, pdfStyles.headerText]}>% Hadir</Text>
          </View>

          {/* Student Rows */}
          {siswaList.map((s) => (
            <View key={s.nisn} style={pdfStyles.tableRow}>
              <Text style={[pdfStyles.colNo, pdfStyles.cellText]}>{s.no}</Text>
              <Text style={[pdfStyles.colNisn, pdfStyles.cellText]}>{s.nisn}</Text>
              <Text style={[pdfStyles.colNama, pdfStyles.cellText]}>{s.nama}</Text>
              <Text style={[pdfStyles.colStat, pdfStyles.cellText]}>{s.hadir}</Text>
              <Text style={[pdfStyles.colStat, pdfStyles.cellText]}>{s.terlambat}</Text>
              <Text style={[pdfStyles.colStat, pdfStyles.cellText]}>{s.sakit}</Text>
              <Text style={[pdfStyles.colStat, pdfStyles.cellText]}>{s.izin}</Text>
              <Text style={[pdfStyles.colStat, pdfStyles.cellText]}>{s.alpha}</Text>
              <Text style={[pdfStyles.colPct, pdfStyles.cellText]}>{s.persentase}%</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text>Laporan Presensi Bulanan Otomatis SMK Ar-Rahma Mandiri Indonesia</Text>
          <Text>Hal 1 dari 1</Text>
        </View>
      </Page>
    </Document>
  );
}
