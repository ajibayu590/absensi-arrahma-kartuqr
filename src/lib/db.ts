import Dexie, { type Table } from "dexie";

export interface LocalSiswa {
  id: number;
  nisn: string;
  nama: string;
  idKelas: number;
  namaKelas: string;
}

export interface KehadiranTertunda {
  id?: number;
  idSiswa: number;
  namaSiswa: string;
  kelasSiswa: string;
  tanggal: string; // Format: YYYY-MM-DD
  status: "HADIR" | "TERLAMBAT" | "SAKIT" | "IZIN" | "ALPHA";
  waktuMasuk: string; // Format: ISO string
  catatan?: string;
  statusSync: "PENDING";
}

class AbsensiOfflineDatabase extends Dexie {
  siswa!: Table<LocalSiswa>;
  kehadiran_tertunda!: Table<KehadiranTertunda>;

  constructor() {
    super("AbsensiOfflineDatabase");
    this.version(1).stores({
      siswa: "id, nisn, nama, namaKelas",
      kehadiran_tertunda: "++id, idSiswa, tanggal, statusSync"
    });
  }
}

export const db = new AbsensiOfflineDatabase();
