import { Elysia, t } from "elysia";
import { db } from "../db";
import { antrean, layanan, petugas } from "../db/schema";
import { eq, and, sql, asc, desc } from "drizzle-orm";
import { authMiddleware, jwtPlugin } from "../middleware/auth";
import { getJakartaDate } from "../utils/date";
import { queueEventBus } from "../utils/eventBus";

export const petugasRoutes = new Elysia({ prefix: "/api/petugas" })
  .use(jwtPlugin)
  .use(authMiddleware)

  /**
   * POST /api/petugas/login
   * Login petugas loket atau administrator kampus.
   */
  .post(
    "/login",
    async ({ body, jwt, error }) => {
      const { email, password } = body;

      const [staff] = await db
        .select()
        .from(petugas)
        .where(eq(petugas.email, email.toLowerCase().trim()))
        .limit(1);

      if (!staff) {
        return error(401, {
          success: false,
          message: "Email atau password salah.",
        });
      }

      if (!staff.isActive) {
        return error(403, {
          success: false,
          message: "Akun Anda telah dinonaktifkan. Hubungi administrator.",
        });
      }

      const isValidPassword = await Bun.password.verify(password, staff.passwordHash);
      if (!isValidPassword) {
        return error(401, {
          success: false,
          message: "Email atau password salah.",
        });
      }

      // Buat token JWT yang valid 7 hari
      const token = await jwt.sign({
        id: staff.id,
        email: staff.email,
        role: staff.role,
        nama: staff.nama,
      });

      // Ambil data layanan jika petugas sudah ditugaskan ke loket
      let assignedLayanan = null;
      if (staff.layananId) {
        const [l] = await db
          .select()
          .from(layanan)
          .where(eq(layanan.id, staff.layananId))
          .limit(1);
        assignedLayanan = l || null;
      }

      return {
        success: true,
        message: "Login berhasil.",
        data: {
          token,
          user: {
            id: staff.id,
            nama: staff.nama,
            email: staff.email,
            role: staff.role,
            layananId: staff.layananId,
            layanan: assignedLayanan,
          },
        },
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
      detail: {
        summary: "Login Petugas / Admin",
        description: "Autentikasi akun petugas dan admin, menghasilkan JWT token.",
        tags: ["Petugas"],
      },
    }
  )

  /**
   * GET /api/petugas/me
   * Mengambil informasi sesi profil petugas yang sedang login.
   */
  .get(
    "/me",
    async ({ requireAuth, error }) => {
      const user = await requireAuth();

      const [staff] = await db
        .select({
          id: petugas.id,
          nama: petugas.nama,
          email: petugas.email,
          role: petugas.role,
          layananId: petugas.layananId,
          isActive: petugas.isActive,
        })
        .from(petugas)
        .where(eq(petugas.id, user.id))
        .limit(1);

      if (!staff) {
        return error(404, { success: false, message: "Pengguna tidak ditemukan." });
      }

      let assignedLayanan = null;
      if (staff.layananId) {
        const [l] = await db
          .select()
          .from(layanan)
          .where(eq(layanan.id, staff.layananId))
          .limit(1);
        assignedLayanan = l || null;
      }

      return {
        success: true,
        data: {
          ...staff,
          layanan: assignedLayanan,
        },
      };
    },
    {
      detail: {
        summary: "Profil Petugas Saat Ini",
        description: "Mendapatkan profil petugas aktif dari JWT token.",
        tags: ["Petugas"],
      },
    }
  )

  /**
   * POST /api/petugas/assign-loket
   * Petugas memilih loket layanan yang akan dijaga.
   */
  .post(
    "/assign-loket",
    async ({ body, requireAuth, error }) => {
      const user = await requireAuth();
      const layananId = body.layananId;

      const [selectedLayanan] = await db
        .select()
        .from(layanan)
        .where(eq(layanan.id, layananId))
        .limit(1);

      if (!selectedLayanan) {
        return error(404, { success: false, message: "Layanan tidak ditemukan." });
      }

      await db
        .update(petugas)
        .set({ layananId })
        .where(eq(petugas.id, user.id));

      return {
        success: true,
        message: `Berhasil ditugaskan ke loket: ${selectedLayanan.nama}`,
        data: selectedLayanan,
      };
    },
    {
      body: t.Object({
        layananId: t.Numeric(),
      }),
      detail: {
        summary: "Pilih Loket Layanan",
        description: "Menugaskan petugas aktif ke layanan/loket tertentu.",
        tags: ["Petugas"],
      },
    }
  )

  /**
   * GET /api/petugas/antrean-loket
   * Mengambil antrean yang sedang aktif dan daftar antrean menunggu untuk loket petugas saat ini.
   */
  .get(
    "/antrean-loket",
    async ({ requireAuth, error }) => {
      const user = await requireAuth();
      const todayDate = getJakartaDate();

      const [staff] = await db
        .select()
        .from(petugas)
        .where(eq(petugas.id, user.id))
        .limit(1);

      if (!staff || !staff.layananId) {
        return error(400, {
          success: false,
          message: "Petugas belum memilih loket layanan. Silakan pilih loket terlebih dahulu.",
        });
      }

      // Tiket yang sedang dipanggil atau dilayani di loket ini
      const [sedangDiproses] = await db
        .select()
        .from(antrean)
        .where(
          and(
            eq(antrean.layananId, staff.layananId),
            eq(antrean.tanggalAntrean, todayDate),
            sql`${antrean.status} IN ('dipanggil', 'dilayani')`
          )
        )
        .orderBy(desc(antrean.calledAt))
        .limit(1);

      // Daftar antrean yang masih menunggu di loket ini
      const daftarMenunggu = await db
        .select()
        .from(antrean)
        .where(
          and(
            eq(antrean.layananId, staff.layananId),
            eq(antrean.tanggalAntrean, todayDate),
            eq(antrean.status, "menunggu")
          )
        )
        .orderBy(asc(antrean.nomorUrut));

      return {
        success: true,
        data: {
          layananId: staff.layananId,
          sedangDiproses: sedangDiproses || null,
          daftarMenunggu,
          totalMenunggu: daftarMenunggu.length,
        },
      };
    },
    {
      detail: {
        summary: "Antrean Loket Petugas",
        description: "Melihat tiket yang sedang dilayani dan tiket menunggu di loket petugas.",
        tags: ["Petugas"],
      },
    }
  )

  /**
   * POST /api/petugas/panggil
   * Memanggil nomor antrean berikutnya yang berstatus 'menunggu'.
   */
  .post(
    "/panggil",
    async ({ body, requireAuth, error }) => {
      const user = await requireAuth();
      const todayDate = getJakartaDate();

      // Cek petugas dan loketnya
      const [staff] = await db
        .select()
        .from(petugas)
        .where(eq(petugas.id, user.id))
        .limit(1);

      const targetLayananId = body?.layananId || staff?.layananId;

      if (!targetLayananId) {
        return error(400, {
          success: false,
          message: "Layanan ID tidak ditentukan dan petugas belum memilih loket.",
        });
      }

      // Ambil antrean menunggu terdepan (nomor urut terkecil)
      const [nextTicket] = await db
        .select()
        .from(antrean)
        .where(
          and(
            eq(antrean.layananId, targetLayananId),
            eq(antrean.tanggalAntrean, todayDate),
            eq(antrean.status, "menunggu")
          )
        )
        .orderBy(asc(antrean.nomorUrut))
        .limit(1);

      if (!nextTicket) {
        return error(404, {
          success: false,
          message: "Tidak ada antrean yang sedang menunggu untuk layanan ini.",
        });
      }

      const now = new Date();

      await db
        .update(antrean)
        .set({
          status: "dipanggil",
          petugasId: user.id,
          calledAt: now,
        })
        .where(eq(antrean.id, nextTicket.id));

      const [updatedTicket] = await db
        .select()
        .from(antrean)
        .where(eq(antrean.id, nextTicket.id))
        .limit(1);

      // Ambil nama layanan untuk detail broadcast TTS
      const [layananDetail] = await db
        .select()
        .from(layanan)
        .where(eq(layanan.id, targetLayananId))
        .limit(1);

      queueEventBus.emit("queue:updated", {
        type: "DIPANGGIL",
        antreanId: nextTicket.id,
        bookingCode: nextTicket.bookingCode,
        nomorDisplay: nextTicket.nomorDisplay,
        layananId: targetLayananId,
        petugasId: user.id,
        timestamp: now.toISOString(),
        payload: {
          ...updatedTicket,
          namaLayanan: layananDetail?.nama,
          prefixNomor: layananDetail?.prefixNomor,
        },
      });

      return {
        success: true,
        message: `Nomor antrean ${nextTicket.nomorDisplay} berhasil dipanggil.`,
        data: updatedTicket,
      };
    },
    {
      body: t.Optional(
        t.Object({
          layananId: t.Optional(t.Numeric()),
        })
      ),
      detail: {
        summary: "Panggil Nomor Berikutnya",
        description: "Memanggil nomor antrean terdepan yang berstatus menunggu.",
        tags: ["Petugas"],
      },
    }
  )

  /**
   * POST /api/petugas/panggil-ulang
   * Panggil ulang nomor antrean yang sedang dipanggil (memicu suara Text-to-Speech display TV lagi).
   */
  .post(
    "/panggil-ulang",
    async ({ body, requireAuth, error }) => {
      const user = await requireAuth();
      const antreanId = body.antreanId;

      const [ticket] = await db
        .select()
        .from(antrean)
        .where(eq(antrean.id, antreanId))
        .limit(1);

      if (!ticket) {
        return error(404, { success: false, message: "Antrean tidak ditemukan." });
      }

      const now = new Date();

      await db
        .update(antrean)
        .set({
          calledAt: now,
          petugasId: user.id,
        })
        .where(eq(antrean.id, antreanId));

      const [layananDetail] = await db
        .select()
        .from(layanan)
        .where(eq(layanan.id, ticket.layananId))
        .limit(1);

      queueEventBus.emit("queue:updated", {
        type: "DIPANGGIL_ULANG",
        antreanId: ticket.id,
        bookingCode: ticket.bookingCode,
        nomorDisplay: ticket.nomorDisplay,
        layananId: ticket.layananId,
        petugasId: user.id,
        timestamp: now.toISOString(),
        payload: {
          ...ticket,
          calledAt: now,
          namaLayanan: layananDetail?.nama,
        },
      });

      return {
        success: true,
        message: `Nomor antrean ${ticket.nomorDisplay} dipanggil ulang.`,
      };
    },
    {
      body: t.Object({
        antreanId: t.Numeric(),
      }),
      detail: {
        summary: "Panggil Ulang Antrean",
        description: "Memicu notifikasi dan panggilan suara ulang untuk antrean saat ini.",
        tags: ["Petugas"],
      },
    }
  )

  /**
   * POST /api/petugas/layani
   * Menandai bahwa mahasiswa telah hadir dan proses pelayanan dimulai (status: 'dilayani').
   */
  .post(
    "/layani",
    async ({ body, requireAuth, error }) => {
      const user = await requireAuth();
      const antreanId = body.antreanId;

      const [ticket] = await db
        .select()
        .from(antrean)
        .where(eq(antrean.id, antreanId))
        .limit(1);

      if (!ticket) {
        return error(404, { success: false, message: "Antrean tidak ditemukan." });
      }

      const now = new Date();

      await db
        .update(antrean)
        .set({
          status: "dilayani",
          servedAt: now,
          petugasId: user.id,
        })
        .where(eq(antrean.id, antreanId));

      queueEventBus.emit("queue:updated", {
        type: "DILAYANI",
        antreanId: ticket.id,
        bookingCode: ticket.bookingCode,
        nomorDisplay: ticket.nomorDisplay,
        layananId: ticket.layananId,
        petugasId: user.id,
        timestamp: now.toISOString(),
      });

      return {
        success: true,
        message: `Antrean ${ticket.nomorDisplay} sedang dalam proses pelayanan.`,
      };
    },
    {
      body: t.Object({
        antreanId: t.Numeric(),
      }),
      detail: {
        summary: "Mulai Layani Antrean",
        description: "Mengubah status antrean menjadi 'dilayani'.",
        tags: ["Petugas"],
      },
    }
  )

  /**
   * POST /api/petugas/selesai
   * Menandai transaksi pelayanan selesai (status: 'selesai').
   */
  .post(
    "/selesai",
    async ({ body, requireAuth, error }) => {
      const user = await requireAuth();
      const antreanId = body.antreanId;

      const [ticket] = await db
        .select()
        .from(antrean)
        .where(eq(antrean.id, antreanId))
        .limit(1);

      if (!ticket) {
        return error(404, { success: false, message: "Antrean tidak ditemukan." });
      }

      const now = new Date();

      await db
        .update(antrean)
        .set({
          status: "selesai",
          completedAt: now,
          catatan: body.catatan || ticket.catatan,
        })
        .where(eq(antrean.id, antreanId));

      queueEventBus.emit("queue:updated", {
        type: "SELESAI",
        antreanId: ticket.id,
        bookingCode: ticket.bookingCode,
        nomorDisplay: ticket.nomorDisplay,
        layananId: ticket.layananId,
        petugasId: user.id,
        timestamp: now.toISOString(),
      });

      return {
        success: true,
        message: `Pelayanan untuk antrean ${ticket.nomorDisplay} telah selesai.`,
      };
    },
    {
      body: t.Object({
        antreanId: t.Numeric(),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        summary: "Selesaikan Pelayanan",
        description: "Menandai antrean telah selesai dilayani.",
        tags: ["Petugas"],
      },
    }
  )

  /**
   * POST /api/petugas/lewati
   * Melewati antrean karena mahasiswa tidak hadir setelah dipanggil (status: 'dilewati').
   */
  .post(
    "/lewati",
    async ({ body, requireAuth, error }) => {
      const user = await requireAuth();
      const antreanId = body.antreanId;

      const [ticket] = await db
        .select()
        .from(antrean)
        .where(eq(antrean.id, antreanId))
        .limit(1);

      if (!ticket) {
        return error(404, { success: false, message: "Antrean tidak ditemukan." });
      }

      await db
        .update(antrean)
        .set({
          status: "dilewati",
          catatan: body.catatan || "Mahasiswa tidak hadir saat dipanggil.",
        })
        .where(eq(antrean.id, antreanId));

      queueEventBus.emit("queue:updated", {
        type: "DILEWATI",
        antreanId: ticket.id,
        bookingCode: ticket.bookingCode,
        nomorDisplay: ticket.nomorDisplay,
        layananId: ticket.layananId,
        petugasId: user.id,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Antrean ${ticket.nomorDisplay} telah dilewati.`,
      };
    },
    {
      body: t.Object({
        antreanId: t.Numeric(),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        summary: "Lewati Antrean",
        description: "Melewati nomor antrean yang tidak hadir saat pemanggilan.",
        tags: ["Petugas"],
      },
    }
  );
