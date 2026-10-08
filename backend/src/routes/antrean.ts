import { Elysia, t } from "elysia";
import { db } from "../db";
import { antrean, layanan, petugas } from "../db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { getJakartaDate } from "../utils/date";
import { queueEventBus } from "../utils/eventBus";

function generateRandomSuffix(length: number = 4): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Tanpa karakter membingungkan (O/0, I/1)
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const antreanRoutes = new Elysia({ prefix: "/api/antrean" })

  /**
   * POST /api/antrean/ambil
   * Pengambilan nomor antrean baru oleh mahasiswa secara ATOMIK.
   * Menggunakan Drizzle transaction + FOR UPDATE lock pada tabel layanan.
   */
  .post(
    "/ambil",
    async ({ body, error }) => {
      const todayDate = getJakartaDate();
      const layananId = body.layananId;

      try {
        const result = await db.transaction(async (tx) => {
          // 1. Kunci baris layanan yang dipilih dengan FOR UPDATE
          const [selectedLayanan] = await tx
            .select()
            .from(layanan)
            .where(eq(layanan.id, layananId))
            .for("update");

          if (!selectedLayanan) {
            throw new Error("Layanan tidak ditemukan.");
          }

          if (!selectedLayanan.isActive) {
            throw new Error(`Layanan "${selectedLayanan.nama}" saat ini sedang tidak aktif.`);
          }

          // 2. Evaluasi reset harian nomor urut
          let nextNomorUrut = 1;
          const tanggalResetStr = selectedLayanan.tanggalReset
            ? String(selectedLayanan.tanggalReset)
            : null;

          if (tanggalResetStr === todayDate) {
            // Masih di hari yang sama: increment
            nextNomorUrut = selectedLayanan.nomorTerakhir + 1;
          } else {
            // Sudah berganti hari: reset kembali ke 1
            nextNomorUrut = 1;
          }

          // 3. Update counter dan tanggal reset pada tabel layanan
          await tx
            .update(layanan)
            .set({
              nomorTerakhir: nextNomorUrut,
              tanggalReset: todayDate,
            })
            .where(eq(layanan.id, layananId));

          // 4. Format nomor display dan booking code
          const prefix = selectedLayanan.prefixNomor;
          const paddedNumber = String(nextNomorUrut).padStart(3, "0");
          const nomorDisplay = `${prefix}${paddedNumber}`; // Contoh: "A042"
          const suffix = generateRandomSuffix(4);
          const bookingCode = `${prefix}-${paddedNumber}-${suffix}`; // Contoh: "A-042-XK91"

          // 5. Masukkan ke tabel antrean
          const [insertRes] = await tx.insert(antrean).values({
            bookingCode,
            layananId: selectedLayanan.id,
            nomorUrut: nextNomorUrut,
            nomorDisplay,
            status: "menunggu",
            namaPemilik: body.namaPemilik?.trim() || null,
            tanggalAntrean: todayDate,
          });

          // 6. Hitung estimasi orang di depan dalam antrean layanan ini
          const [aheadCount] = await tx
            .select({ count: sql<number>`count(*)` })
            .from(antrean)
            .where(
              and(
                eq(antrean.layananId, layananId),
                eq(antrean.tanggalAntrean, todayDate),
                eq(antrean.status, "menunggu"),
                sql`${antrean.nomorUrut} < ${nextNomorUrut}`
              )
            );

          return {
            id: insertRes.insertId,
            bookingCode,
            nomorDisplay,
            nomorUrut: nextNomorUrut,
            status: "menunggu",
            namaLayanan: selectedLayanan.nama,
            prefixNomor: selectedLayanan.prefixNomor,
            namaPemilik: body.namaPemilik || null,
            tanggalAntrean: todayDate,
            antreanDiDepan: aheadCount?.count || 0,
            createdAt: new Date().toISOString(),
          };
        });

        // Broadcast event ke SSE listeners
        queueEventBus.emit("queue:updated", {
          type: "BARU",
          antreanId: result.id,
          bookingCode: result.bookingCode,
          nomorDisplay: result.nomorDisplay,
          layananId: body.layananId,
          timestamp: new Date().toISOString(),
          payload: result,
        });

        return {
          success: true,
          message: `Nomor antrean ${result.nomorDisplay} berhasil diambil.`,
          data: result,
        };
      } catch (err: any) {
        return error(400, {
          success: false,
          message: err.message || "Gagal mengambil antrean.",
        });
      }
    },
    {
      body: t.Object({
        layananId: t.Numeric(),
        namaPemilik: t.Optional(t.String()),
      }),
      detail: {
        summary: "Ambil Nomor Antrean (Atomic)",
        description: "Mengambil nomor antrean baru untuk mahasiswa secara atomik dan anti-duplikat.",
        tags: ["Antrean"],
      },
    }
  )

  /**
   * GET /api/antrean/aktif
   * Mengambil daftar antrean aktif hari ini (menunggu / dipanggil / dilayani).
   */
  .get(
    "/aktif",
    async ({ query }) => {
      const todayDate = getJakartaDate();
      const layananId = query.layananId ? Number(query.layananId) : undefined;

      const conditions = [
        eq(antrean.tanggalAntrean, todayDate),
        sql`${antrean.status} IN ('menunggu', 'dipanggil', 'dilayani')`,
      ];

      if (layananId) {
        conditions.push(eq(antrean.layananId, layananId));
      }

      const rows = await db
        .select({
          id: antrean.id,
          bookingCode: antrean.bookingCode,
          nomorDisplay: antrean.nomorDisplay,
          nomorUrut: antrean.nomorUrut,
          status: antrean.status,
          namaPemilik: antrean.namaPemilik,
          layananId: antrean.layananId,
          namaLayanan: layanan.nama,
          prefixNomor: layanan.prefixNomor,
          calledAt: antrean.calledAt,
          createdAt: antrean.createdAt,
        })
        .from(antrean)
        .innerJoin(layanan, eq(antrean.layananId, layanan.id))
        .where(and(...conditions))
        .orderBy(asc(antrean.nomorUrut));

      return {
        success: true,
        data: rows,
      };
    },
    {
      query: t.Optional(
        t.Object({
          layananId: t.Optional(t.String()),
        })
      ),
      detail: {
        summary: "Daftar Antrean Aktif Hari Ini",
        description: "Mendapatkan antrean dengan status menunggu, dipanggil, dan dilayani untuk hari ini.",
        tags: ["Antrean"],
      },
    }
  )

  /**
   * GET /api/antrean/:bookingCode
   * Mahasiswa mengecek status tiket antreannya secara real-time.
   */
  .get(
    "/:bookingCode",
    async ({ params, error }) => {
      const [ticket] = await db
        .select({
          id: antrean.id,
          bookingCode: antrean.bookingCode,
          nomorDisplay: antrean.nomorDisplay,
          nomorUrut: antrean.nomorUrut,
          status: antrean.status,
          namaPemilik: antrean.namaPemilik,
          catatan: antrean.catatan,
          tanggalAntrean: antrean.tanggalAntrean,
          calledAt: antrean.calledAt,
          servedAt: antrean.servedAt,
          completedAt: antrean.completedAt,
          createdAt: antrean.createdAt,
          layananId: antrean.layananId,
          namaLayanan: layanan.nama,
          kodeLayanan: layanan.kode,
          prefixNomor: layanan.prefixNomor,
        })
        .from(antrean)
        .innerJoin(layanan, eq(antrean.layananId, layanan.id))
        .where(eq(antrean.bookingCode, params.bookingCode.toUpperCase()))
        .limit(1);

      if (!ticket) {
        return error(404, {
          success: false,
          message: "Tiket antrean tidak ditemukan.",
        });
      }

      // Hitung sisa antrean di depan jika status masih "menunggu"
      let antreanDiDepan = 0;
      if (ticket.status === "menunggu") {
        const [ahead] = await db
          .select({ count: sql<number>`count(*)` })
          .from(antrean)
          .where(
            and(
              eq(antrean.layananId, ticket.layananId),
              eq(antrean.tanggalAntrean, ticket.tanggalAntrean),
              eq(antrean.status, "menunggu"),
              sql`${antrean.nomorUrut} < ${ticket.nomorUrut}`
            )
          );
        antreanDiDepan = ahead?.count || 0;
      }

      // Nomor yang saat ini sedang dipanggil untuk layanan yang sama
      const [currentlyCalled] = await db
        .select({
          nomorDisplay: antrean.nomorDisplay,
          calledAt: antrean.calledAt,
        })
        .from(antrean)
        .where(
          and(
            eq(antrean.layananId, ticket.layananId),
            eq(antrean.tanggalAntrean, ticket.tanggalAntrean),
            eq(antrean.status, "dipanggil")
          )
        )
        .orderBy(desc(antrean.calledAt))
        .limit(1);

      return {
        success: true,
        data: {
          ...ticket,
          antreanDiDepan,
          sedangDipanggil: currentlyCalled?.nomorDisplay || null,
        },
      };
    },
    {
      params: t.Object({
        bookingCode: t.String(),
      }),
      detail: {
        summary: "Cek Status Tiket",
        description: "Melihat status tiket antrean berdasarkan kode booking mahasiswa.",
        tags: ["Antrean"],
      },
    }
  )

  /**
   * DELETE /api/antrean/:bookingCode
   * Mahasiswa membatalkan nomor antrean sendiri (hanya bisa jika status 'menunggu').
   */
  .delete(
    "/:bookingCode",
    async ({ params, error }) => {
      const bookingCode = params.bookingCode.toUpperCase();

      const [target] = await db
        .select()
        .from(antrean)
        .where(eq(antrean.bookingCode, bookingCode))
        .limit(1);

      if (!target) {
        return error(404, {
          success: false,
          message: "Tiket tidak ditemukan.",
        });
      }

      if (target.status !== "menunggu") {
        return error(400, {
          success: false,
          message: `Tiket tidak dapat dibatalkan karena statusnya sudah "${target.status}".`,
        });
      }

      await db
        .update(antrean)
        .set({
          status: "dibatalkan",
          catatan: "Dibatalkan oleh mahasiswa.",
        })
        .where(eq(antrean.id, target.id));

      // Broadcast event update
      queueEventBus.emit("queue:updated", {
        type: "DIBATALKAN",
        antreanId: target.id,
        bookingCode: target.bookingCode,
        nomorDisplay: target.nomorDisplay,
        layananId: target.layananId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Tiket antrean ${target.nomorDisplay} berhasil dibatalkan.`,
      };
    },
    {
      params: t.Object({
        bookingCode: t.String(),
      }),
      detail: {
        summary: "Batalkan Tiket",
        description: "Membatalkan tiket antrean yang belum dipanggil.",
        tags: ["Antrean"],
      },
    }
  );
