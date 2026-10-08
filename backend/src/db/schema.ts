import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  mysqlEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────
// TABEL: layanan
// Menyimpan jenis layanan/loket yang tersedia
// ─────────────────────────────────────────────
export const layanan = mysqlTable(
  "layanan",
  {
    id: int("id").primaryKey().autoincrement(),

    /** Kode unik pendek untuk loket, e.g. "A", "B", "KRS" */
    kode: varchar("kode", { length: 5 }).notNull().unique(),

    /** Nama lengkap layanan, e.g. "Legalisir Ijazah" */
    nama: varchar("nama", { length: 100 }).notNull(),

    /** Deskripsi opsional layanan */
    deskripsi: text("deskripsi"),

    /** Prefix yang dicetak di nomor antrean, e.g. "A" → "A042" */
    prefixNomor: varchar("prefix_nomor", { length: 5 }).notNull(),

    /** Apakah loket sedang aktif menerima antrean */
    isActive: boolean("is_active").notNull().default(true),

    /**
     * Counter atomik untuk nomor urut hari ini.
     * Di-reset ke 0 setiap hari oleh logika backend
     * (cek tanggal terakhir reset vs. tanggal sekarang).
     */
    nomorTerakhir: int("nomor_terakhir").notNull().default(0),

    /** Tanggal terakhir kali nomor_terakhir di-reset (untuk logika reset harian) */
    tanggalReset: date("tanggal_reset"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [uniqueIndex("layanan_kode_idx").on(t.kode)]
);

// ─────────────────────────────────────────────
// TABEL: petugas
// Staf loket yang bisa login dan mengelola antrean
// ─────────────────────────────────────────────
export const petugas = mysqlTable(
  "petugas",
  {
    id: int("id").primaryKey().autoincrement(),

    /** Nama lengkap petugas */
    nama: varchar("nama", { length: 100 }).notNull(),

    /** Email digunakan sebagai username login */
    email: varchar("email", { length: 150 }).notNull().unique(),

    /** Bcrypt hash dari password */
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),

    /** Level akses: petugas loket biasa atau admin sistem */
    role: mysqlEnum("role", ["petugas", "admin"]).notNull().default("petugas"),

    /**
     * FK ke layanan: loket mana yang sedang dijaga petugas ini.
     * Null berarti petugas belum ditugaskan ke loket.
     */
    layananId: int("layanan_id"),

    /** Akun aktif atau sudah dinonaktifkan */
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex("petugas_email_idx").on(t.email),
    index("petugas_layanan_id_idx").on(t.layananId),
  ]
);

// ─────────────────────────────────────────────
// TABEL: antrean
// Record setiap tiket antrean yang diambil mahasiswa
// ─────────────────────────────────────────────
export const antrean = mysqlTable(
  "antrean",
  {
    id: int("id").primaryKey().autoincrement(),

    /**
     * Kode unik yang diberikan ke mahasiswa sebagai bukti tiket.
     * Format: "{prefix}-{nomor_urut_3digit}-{random4char}"
     * Contoh: "A-042-XK91"
     */
    bookingCode: varchar("booking_code", { length: 20 }).notNull().unique(),

    /** FK ke layanan: jenis layanan yang dipilih mahasiswa */
    layananId: int("layanan_id").notNull(),

    /**
     * FK ke petugas: siapa yang memanggil/melayani tiket ini.
     * Null = belum dipanggil.
     */
    petugasId: int("petugas_id"),

    /** Nomor urut dalam hari ini, e.g. 42 */
    nomorUrut: int("nomor_urut").notNull(),

    /**
     * String yang ditampilkan di layar/tiket, e.g. "A042".
     * Dihasilkan dari: prefixNomor + nomorUrut.toString().padStart(3, '0')
     */
    nomorDisplay: varchar("nomor_display", { length: 10 }).notNull(),

    /**
     * Status siklus hidup antrean:
     * - menunggu   : Tiket baru diambil, belum dipanggil
     * - dipanggil  : Sedang dipanggil petugas (tampil di display TV)
     * - dilayani   : Mahasiswa sudah di depan loket, sedang diproses
     * - selesai    : Transaksi selesai
     * - dilewati   : Petugas skip (mahasiswa tidak hadir saat dipanggil)
     * - dibatalkan : Mahasiswa membatalkan sendiri sebelum dipanggil
     */
    status: mysqlEnum("status", [
      "menunggu",
      "dipanggil",
      "dilayani",
      "selesai",
      "dilewati",
      "dibatalkan",
    ])
      .notNull()
      .default("menunggu"),

    /** Nama mahasiswa (opsional, boleh kosong) */
    namaPemilik: varchar("nama_pemilik", { length: 100 }),

    /** Catatan tambahan dari petugas (misalnya alasan dilewati) */
    catatan: text("catatan"),

    /**
     * Tanggal antrean diambil (DATE saja, tanpa waktu).
     * Digunakan untuk:
     * 1. Reset harian nomor_urut (cek apakah tanggal_antrean != hari ini)
     * 2. Filter laporan per hari
     */
    tanggalAntrean: date("tanggal_antrean").notNull(),

    /** Timestamp saat petugas pertama kali memanggil nomor ini */
    calledAt: timestamp("called_at"),

    /** Timestamp saat mahasiswa konfirmasi hadir / mulai dilayani */
    servedAt: timestamp("served_at"),

    /** Timestamp saat petugas menandai selesai */
    completedAt: timestamp("completed_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex("antrean_booking_code_idx").on(t.bookingCode),
    index("antrean_layanan_status_idx").on(t.layananId, t.status),
    index("antrean_tanggal_idx").on(t.tanggalAntrean),
    index("antrean_petugas_id_idx").on(t.petugasId),
  ]
);

// ─────────────────────────────────────────────
// RELASI (untuk Drizzle query API / joins)
// ─────────────────────────────────────────────

/** layanan → bisa punya banyak antrean & banyak petugas */
export const layananRelations = relations(layanan, ({ many }) => ({
  antrean: many(antrean),
  petugas: many(petugas),
}));

/** petugas → ditugaskan ke satu layanan; bisa punya banyak riwayat antrean */
export const petugasRelations = relations(petugas, ({ one, many }) => ({
  layanan: one(layanan, {
    fields: [petugas.layananId],
    references: [layanan.id],
  }),
  antrean: many(antrean),
}));

/** antrean → milik satu layanan, ditangani oleh satu petugas (opsional) */
export const antreanRelations = relations(antrean, ({ one }) => ({
  layanan: one(layanan, {
    fields: [antrean.layananId],
    references: [layanan.id],
  }),
  petugas: one(petugas, {
    fields: [antrean.petugasId],
    references: [petugas.id],
  }),
}));

// ─────────────────────────────────────────────
// TYPE EXPORTS (untuk digunakan di route handlers)
// ─────────────────────────────────────────────
export type Layanan = typeof layanan.$inferSelect;
export type NewLayanan = typeof layanan.$inferInsert;

export type Petugas = typeof petugas.$inferSelect;
export type NewPetugas = typeof petugas.$inferInsert;

export type Antrean = typeof antrean.$inferSelect;
export type NewAntrean = typeof antrean.$inferInsert;

export type AntreanStatus =
  | "menunggu"
  | "dipanggil"
  | "dilayani"
  | "selesai"
  | "dilewati"
  | "dibatalkan";
