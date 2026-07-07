import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const geofencingSetting = await prisma.pengaturan.findUnique({
      where: { kunci: "gps_geofencing_aktif" },
    });

    const geofencingAktif = geofencingSetting ? geofencingSetting.nilai !== "false" : true; // Default to true if setting not found

    return NextResponse.json({ geofencingAktif });
  } catch (error) {
    console.error("Error fetching geofencing setting:", error);
    return NextResponse.json(
      { error: "Failed to fetch geofencing setting." },
      { status: 500 }
    );
  }
}
