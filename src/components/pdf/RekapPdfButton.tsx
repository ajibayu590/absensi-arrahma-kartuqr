"use client";

import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import RekapAbsensiPdfDocument from "./RekapAbsensiPdf";
import { FileText, Loader2 } from "lucide-react";

interface RekapPdfButtonProps {
  kelasNama: string;
  bulanNama: string;
  tahun: number;
  siswaList: any[];
}

export default function RekapPdfButton({
  kelasNama,
  bulanNama,
  tahun,
  siswaList,
}: RekapPdfButtonProps) {
  return (
    <PDFDownloadLink
      document={
        <RekapAbsensiPdfDocument
          kelasNama={kelasNama}
          bulanNama={bulanNama}
          tahun={tahun}
          siswaList={siswaList}
        />
      }
      fileName={`Laporan_Absensi_Kelas_${kelasNama}_Bulan_${bulanNama}_Tahun_${tahun}.pdf`}
      className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer grow md:grow-0 justify-center"
    >
      {({ loading }) => (
        <>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          <span>{loading ? "Membuat PDF..." : "Unduh PDF A4"}</span>
        </>
      )}
    </PDFDownloadLink>
  );
}
