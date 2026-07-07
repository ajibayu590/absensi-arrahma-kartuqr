"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

interface JadwalPiketPdfData {
  no: number;
  hari: string;
  nama: string;
  nip: string | null;
  telepon: string | null;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
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
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 15,
    color: "#111827",
    textDecoration: "underline",
  },
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#ecfdf5",
    borderBottomWidth: 2,
    borderBottomColor: "#a7f3d0",
    alignItems: "center",
    minHeight: 30,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
    minHeight: 28,
  },
  colNo: { width: "10%", textAlign: "center", fontSize: 9 },
  colHari: { width: "15%", fontSize: 9, paddingLeft: 5 },
  colNama: { width: "35%", fontSize: 9, paddingLeft: 5 },
  colNip: { width: "20%", fontSize: 9, paddingLeft: 5 },
  colTelepon: { width: "20%", fontSize: 9, paddingLeft: 5 },
  headerText: {
    color: "#065f46",
    fontWeight: "bold",
    fontSize: 10,
  },
  cellText: {
    color: "#374151",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#9ca3af",
  },
});

interface JadwalPiketPdfDocumentProps {
  data: JadwalPiketPdfData[];
}

export default function JadwalPiketPdfDocument({ data }: JadwalPiketPdfDocumentProps) {
  return (
    <Document title="Jadwal_Piket_Guru_SMK_Ar_Rahma_Mandiri_Indonesia">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>SMK AR-RAHMA MANDIRI INDONESIA</Text>
          <Text style={styles.schoolSubtitle}>
            Jl. Raya Carat Gempol Kab. Pasuruan • Telp: +62 817-587-857 • Email: info@smkami.sch.id
          </Text>
        </View>

        <Text style={styles.title}>JADWAL PIKET GURU</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colNo, styles.headerText]}>No</Text>
            <Text style={[styles.colHari, styles.headerText]}>Hari</Text>
            <Text style={[styles.colNama, styles.headerText]}>Nama Guru</Text>
            <Text style={[styles.colNip, styles.headerText]}>NIP</Text>
            <Text style={[styles.colTelepon, styles.headerText]}>WhatsApp</Text>
          </View>

          {data.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.colNo, styles.cellText]}>{item.no}</Text>
              <Text style={[styles.colHari, styles.cellText]}>{item.hari}</Text>
              <Text style={[styles.colNama, styles.cellText]}>{item.nama}</Text>
              <Text style={[styles.colNip, styles.cellText]}>{item.nip || "-"}</Text>
              <Text style={[styles.colTelepon, styles.cellText]}>{item.telepon || "-"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>Dicetak pada: {new Date().toLocaleDateString("id-ID")}</Text>
          <Text>Halaman 1</Text>
        </View>
      </Page>
    </Document>
  );
}
