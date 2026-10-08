import { Elysia, t } from "elysia";
import { db } from "../db";
import { layanan } from "../db/schema";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

export const layananRoutes = new Elysia({ prefix: "/api/layanan" })
  .use(authMiddleware)

  /**
   * GET /api/layanan
   * Mengambil daftar layanan/loket yang tersedia.
   * Publik dapat melihat semua layanan aktif.
   */
  .get(
    "/",
    async ({ query }) => {
      const includeInactive = query.all === "true";

      const queryBuilder = db
        .select()
        .from(layanan)
        .orderBy(asc(layanan.id));

      const rows = await queryBuilder;
      const data = includeInactive ? rows : rows.filter((r) => r.isActive);

      return {
        success: true,
        data,
      };
    },
    {
      query: t.Optional(
        t.Object({
          all: t.Optional(t.String()),
        })
      ),
      detail: {
        summary: "Daftar Layanan",
        description: "Mendapatkan semua daftar layanan atau loket.",
        tags: ["Layanan"],
      },
    }
  )

  /**
   * GET /api/layanan/:id
   * Detail satu layanan berdasarkan ID.
   */
  .get(
    "/:id",
    async ({ params, error }) => {
      const id = Number(params.id);
      const [item] = await db.select().from(layanan).where(eq(layanan.id, id)).limit(1);

      if (!item) {
        return error(404, {
          success: false,
          message: "Layanan tidak ditemukan.",
        });
      }

      return {
        success: true,
        data: item,
      };
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      detail: {
        summary: "Detail Layanan",
        description: "Mendapatkan informasi detail layanan berdasarkan ID.",
        tags: ["Layanan"],
      },
    }
  )

  /**
   * POST /api/layanan
   * Membuat jenis layanan baru (Admin only).
   */
  .post(
    "/",
    async ({ body, requireAdmin, error }) => {
      await requireAdmin();

      const existing = await db
        .select()
        .from(layanan)
        .where(eq(layanan.kode, body.kode.toUpperCase()))
        .limit(1);

      if (existing.length > 0) {
        return error(400, {
          success: false,
          message: `Kode layanan "${body.kode}" sudah digunakan.`,
        });
      }

      const [insertResult] = await db.insert(layanan).values({
        kode: body.kode.toUpperCase(),
        nama: body.nama,
        deskripsi: body.deskripsi || null,
        prefixNomor: body.prefixNomor.toUpperCase(),
        isActive: body.isActive ?? true,
        nomorTerakhir: 0,
      });

      const [newRow] = await db
        .select()
        .from(layanan)
        .where(eq(layanan.id, insertResult.insertId))
        .limit(1);

      return {
        success: true,
        message: "Layanan baru berhasil dibuat.",
        data: newRow,
      };
    },
    {
      body: t.Object({
        kode: t.String({ minLength: 1, maxLength: 5 }),
        nama: t.String({ minLength: 2, maxLength: 100 }),
        deskripsi: t.Optional(t.String()),
        prefixNomor: t.String({ minLength: 1, maxLength: 5 }),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: {
        summary: "Tambah Layanan (Admin)",
        description: "Membuat loket/layanan baru. Memerlukan token admin.",
        tags: ["Layanan"],
      },
    }
  )

  /**
   * PATCH /api/layanan/:id
   * Mengubah status aktif / informasi layanan (Admin only).
   */
  .patch(
    "/:id",
    async ({ params, body, requireAdmin, error }) => {
      await requireAdmin();
      const id = Number(params.id);

      const [target] = await db.select().from(layanan).where(eq(layanan.id, id)).limit(1);
      if (!target) {
        return error(404, {
          success: false,
          message: "Layanan tidak ditemukan.",
        });
      }

      await db
        .update(layanan)
        .set({
          ...(body.nama ? { nama: body.nama } : {}),
          ...(body.deskripsi !== undefined ? { deskripsi: body.deskripsi } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        })
        .where(eq(layanan.id, id));

      const [updated] = await db.select().from(layanan).where(eq(layanan.id, id)).limit(1);

      return {
        success: true,
        message: "Layanan berhasil diperbarui.",
        data: updated,
      };
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      body: t.Object({
        nama: t.Optional(t.String()),
        deskripsi: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: {
        summary: "Perbarui Layanan (Admin)",
        description: "Mengubah status atau detail layanan. Memerlukan token admin.",
        tags: ["Layanan"],
      },
    }
  )

  /**
   * POST /api/layanan/:id/reset
   * Reset manual counter nomor urut antrean (Admin only).
   */
  .post(
    "/:id/reset",
    async ({ params, requireAdmin, error }) => {
      await requireAdmin();
      const id = Number(params.id);

      const [target] = await db.select().from(layanan).where(eq(layanan.id, id)).limit(1);
      if (!target) {
        return error(404, {
          success: false,
          message: "Layanan tidak ditemukan.",
        });
      }

      await db
        .update(layanan)
        .set({
          nomorTerakhir: 0,
        })
        .where(eq(layanan.id, id));

      return {
        success: true,
        message: `Counter antrean layanan "${target.nama}" berhasil di-reset ke 0.`,
      };
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      detail: {
        summary: "Reset Counter Antrean (Admin)",
        description: "Mereset counter nomor antrean layanan ke 0 secara manual.",
        tags: ["Layanan"],
      },
    }
  );
