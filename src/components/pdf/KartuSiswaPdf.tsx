"use client";

import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";

interface SiswaCardData {
  nisn: string;
  nama: string;
  kelas: string;
  qrDataUrl: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles: any = {
  page: {
    padding: 20,
    fontFamily: "Helvetica",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignContent: "flex-start",
  },
  card: {
    width: "85.6mm",
    height: "54mm",
    border: "1.5pt solid #10b981",
    borderRadius: 8,
    padding: 8,
    margin: 4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  qrContainer: {
    width: "38mm",
    height: "38mm",
    marginRight: 8,
    flexShrink: 0,
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  schoolName: {
    fontSize: 6,
    fontWeight: "bold",
    color: "#047857",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  studentName: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 2,
  },
  label: {
    fontSize: 6,
    color: "#6b7280",
    marginTop: 2,
  },
  value: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#374151",
  },
  footer: {
    fontSize: 5,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
};

interface KartuSiswaPdfProps {
  siswaList: SiswaCardData[];
}

export default function KartuSiswaPdfDocument({ siswaList }: KartuSiswaPdfProps) {
  const cardsPerPage = 8;
  const pages: SiswaCardData[][] = [];
  for (let i = 0; i < siswaList.length; i += cardsPerPage) {
    pages.push(siswaList.slice(i, i + cardsPerPage));
  }

  return (
    <Document title="Kartu_Absensi_Siswa">
      {pages.map((pageCards, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {pageCards.map((siswa, idx) => (
            <View key={idx} style={styles.card}>
              <View style={styles.qrContainer}>
                <Image src={siswa.qrDataUrl} style={styles.qrImage} />
              </View>
              <View style={styles.infoContainer}>
                <Text style={styles.schoolName}>SMK AR-RAHMA MANDIRI INDONESIA</Text>
                <Text style={styles.studentName}>{siswa.nama}</Text>
                <Text style={styles.label}>NISN</Text>
                <Text style={styles.value}>{siswa.nisn}</Text>
                <Text style={styles.label}>Kelas</Text>
                <Text style={styles.value}>{siswa.kelas}</Text>
                <Text style={styles.footer}>Kartu Absensi QR - Jangan Dipindahtangankan</Text>
              </View>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
