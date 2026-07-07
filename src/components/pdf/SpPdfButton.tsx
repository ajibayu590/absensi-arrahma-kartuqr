"use client";

import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import SpPdfLetterDocument from "./SpPdfLetter";
import { FileText, Loader2 } from "lucide-react";

interface SpPdfButtonProps {
  student: any;
  level: "1" | "2" | "3";
  mDate: string;
  mTime: string;
  mRoom: string;
}

export default function SpPdfButton({
  student,
  level,
  mDate,
  mTime,
  mRoom,
}: SpPdfButtonProps) {
  return (
    <PDFDownloadLink
      document={
        <SpPdfLetterDocument
          student={student}
          level={level}
          mDate={mDate}
          mTime={mTime}
          mRoom={mRoom}
        />
      }
      fileName={`SP${level}_${student.nama}.pdf`}
      className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/10"
    >
      {({ loading }) => (
        <>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          <span>{loading ? "Menyusun PDF..." : `Unduh SP ${level}`}</span>
        </>
      )}
    </PDFDownloadLink>
  );
}
