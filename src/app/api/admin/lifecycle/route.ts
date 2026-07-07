import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan mengelola siklus tahun ajaran." },
        { status: 403 }
      );
    }

    const { action, sourceClassId, targetClassId, classId } = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Parameter action wajib dikirimkan." }, { status: 400 });
    }

    if (action === "promote") {
      if (!sourceClassId || !targetClassId) {
        return NextResponse.json(
          { error: "sourceClassId dan targetClassId wajib dikirimkan untuk proses kenaikan kelas." },
          { status: 400 }
        );
      }

      const idSource = parseInt(sourceClassId, 10);
      const idTarget = parseInt(targetClassId, 10);

      if (idSource === idTarget) {
        return NextResponse.json({ error: "Kelas asal dan kelas tujuan tidak boleh sama." }, { status: 400 });
      }

      // Verifikasi kedua kelas ada di database
      const [classSource, classTarget] = await Promise.all([
        prisma.kelas.findUnique({ where: { id: idSource } }),
        prisma.kelas.findUnique({ where: { id: idTarget } })
      ]);

      if (!classSource || !classTarget) {
        return NextResponse.json({ error: "Kelas asal atau kelas tujuan tidak ditemukan." }, { status: 404 });
      }

      // Update seluruh siswa di kelas asal ke kelas tujuan
      const updateResult = await prisma.siswa.updateMany({
        where: {
          idKelas: idSource,
          pengguna: {
            aktif: true
          }
        },
        data: {
          idKelas: idTarget
        }
      });

      // Log audit admin
      await prisma.logAuditAdmin.create({
        data: {
          idPengguna: payload.userId,
          tindakan: "KENAIKAN_KELAS_MASSAL",
          target: `KELAS_${idSource}_TO_${idTarget}`,
          detail: JSON.stringify({
            sourceClass: classSource.nama,
            targetClass: classTarget.nama,
            jumlahSiswaDipindahkan: updateResult.count
          })
        }
      });

      return NextResponse.json({
        success: true,
        message: `Kenaikan kelas berhasil. Sebanyak ${updateResult.count} siswa dipindahkan dari kelas ${classSource.nama} ke kelas ${classTarget.nama}.`
      });
    }

    if (action === "graduate") {
      if (!classId) {
        return NextResponse.json({ error: "classId wajib dikirimkan untuk proses kelulusan." }, { status: 400 });
      }

      const idClass = parseInt(classId, 10);
      const targetClass = await prisma.kelas.findUnique({
        where: { id: idClass },
        include: {
          siswa: true
        }
      });

      if (!targetClass) {
        return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
      }

      const siswaIds = targetClass.siswa.map(s => s.id);
      const penggunaIds = targetClass.siswa.map(s => s.idPengguna);

      if (siswaIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: `Tidak ada siswa di kelas ${targetClass.nama} untuk diluluskan.`,
          count: 0
        });
      }

      // Nonaktifkan seluruh akun pengguna yang berkaitan dengan siswa di kelas tersebut (dianggap alumni)
      const updateResult = await prisma.pengguna.updateMany({
        where: {
          id: { in: penggunaIds }
        },
        data: {
          aktif: false
        }
      });

      // Log audit admin
      await prisma.logAuditAdmin.create({
        data: {
          idPengguna: payload.userId,
          tindakan: "KELULUSAN_ALUMNI_MASSAL",
          target: `KELAS_${idClass}`,
          detail: JSON.stringify({
            class: targetClass.nama,
            jumlahAlumniLulus: updateResult.count
          })
        }
      });

      return NextResponse.json({
        success: true,
        message: `Kelulusan alumni berhasil. Sebanyak ${updateResult.count} siswa di kelas ${targetClass.nama} telah dinonaktifkan status loginnya dan masuk menjadi alumni.`
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (error: any) {
    console.error("Kesalahan API lifecycle POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
