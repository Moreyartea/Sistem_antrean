import { db, pool } from "./index";
import { layanan, petugas } from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Menjalankan database seed...");

  // 1. Seed Layanan
  const defaultLayanan = [
    {
      kode: "A",
      nama: "Legalisir Ijazah & Transkrip",
      deskripsi: "Pelayanan legalisasi dokumen akademik, transkrip, dan ijazah",
      prefixNomor: "A",
      isActive: true,
      nomorTerakhir: 0,
    },
    {
      kode: "B",
      nama: "Konsultasi KRS & Akademik",
      deskripsi: "Pelayanan pengurusan KRS, perubahan kelas, dan bimbingan akademik",
      prefixNomor: "B",
      isActive: true,
      nomorTerakhir: 0,
    },
    {
      kode: "C",
      nama: "Administrasi & Keuangan UKT",
      deskripsi: "Pelayanan validasi pembayaran UKT, beasiswa, dan dispensasi",
      prefixNomor: "C",
      isActive: true,
      nomorTerakhir: 0,
    },
  ];

  for (const item of defaultLayanan) {
    const existing = await db
      .select()
      .from(layanan)
      .where(eq(layanan.kode, item.kode))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(layanan).values(item);
      console.log(`  ✓ Layanan "${item.nama}" berhasil ditambahkan.`);
    } else {
      console.log(`  - Layanan "${item.nama}" sudah ada, dilewati.`);
    }
  }

  // Ambil list layanan untuk menghubungkan petugas
  const listLayanan = await db.select().from(layanan);
  const layananA = listLayanan.find((l) => l.kode === "A");
  const layananB = listLayanan.find((l) => l.kode === "B");

  // 2. Seed Petugas & Admin
  const adminPassword = await Bun.password.hash("admin123");
  const petugasPassword = await Bun.password.hash("petugas123");

  const defaultPetugas = [
    {
      nama: "Administrator Utama",
      email: "admin@kampus.ac.id",
      passwordHash: adminPassword,
      role: "admin" as const,
      layananId: null,
      isActive: true,
    },
    {
      nama: "Petugas Loket A (Budi Santoso)",
      email: "petugas1@kampus.ac.id",
      passwordHash: petugasPassword,
      role: "petugas" as const,
      layananId: layananA ? layananA.id : null,
      isActive: true,
    },
    {
      nama: "Petugas Loket B (Siti Aminah)",
      email: "petugas2@kampus.ac.id",
      passwordHash: petugasPassword,
      role: "petugas" as const,
      layananId: layananB ? layananB.id : null,
      isActive: true,
    },
  ];

  for (const p of defaultPetugas) {
    const existing = await db
      .select()
      .from(petugas)
      .where(eq(petugas.email, p.email))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(petugas).values(p);
      console.log(`  ✓ Petugas "${p.nama}" (${p.email}) berhasil ditambahkan.`);
    } else {
      console.log(`  - Petugas "${p.nama}" sudah ada, dilewati.`);
    }
  }

  console.log("✅ Seed database selesai!");
}

seed()
  .catch((err) => {
    console.error("❌ Gagal menjalankan seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
