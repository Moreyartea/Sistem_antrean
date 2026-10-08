import { Elysia } from "elysia";
import { db } from "../db";
import { antrean, layanan, petugas } from "../db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { getJakartaDate } from "../utils/date";
import { queueEventBus, QueueEventPayload } from "../utils/eventBus";

export const displayRoutes = new Elysia({ prefix: "/api/display" })

  /**
   * GET /api/display
   * Mengambil snapshot data lengkap untuk layar monitor TV Publik.
   */
  .get(
    "/",
    async () => {
      const todayDate = getJakartaDate();

      // 1. Ambil semua layanan yang aktif
      const daftarLayanan = await db
        .select()
        .from(layanan)
        .where(eq(layanan.isActive, true))
        .orderBy(asc(layanan.id));

      // 2. Ambil semua tiket hari ini
      const semuaTiketHariIni = await db
        .select({
          id: antrean.id,
          bookingCode: antrean.bookingCode,
          nomorDisplay: antrean.nomorDisplay,
          nomorUrut: antrean.nomorUrut,
          status: antrean.status,
          layananId: antrean.layananId,
          petugasId: antrean.petugasId,
          calledAt: antrean.calledAt,
          servedAt: antrean.servedAt,
          completedAt: antrean.completedAt,
        })
        .from(antrean)
        .where(eq(antrean.tanggalAntrean, todayDate));

      // 3. Susun rangkuman per loket
      const loketSummary = daftarLayanan.map((lay) => {
        const tiketLayanan = semuaTiketHariIni.filter((t) => t.layananId === lay.id);

        const sedangDipanggil =
          tiketLayanan
            .filter((t) => t.status === "dipanggil")
            .sort((a, b) => {
              const timeA = a.calledAt ? new Date(a.calledAt).getTime() : 0;
              const timeB = b.calledAt ? new Date(b.calledAt).getTime() : 0;
              return timeB - timeA;
            })[0] || null;

        const sedangDilayani =
          tiketLayanan
            .filter((t) => t.status === "dilayani")
            .sort((a, b) => {
              const timeA = a.servedAt ? new Date(a.servedAt).getTime() : 0;
              const timeB = b.servedAt ? new Date(b.servedAt).getTime() : 0;
              return timeB - timeA;
            })[0] || null;

        const jumlahMenunggu = tiketLayanan.filter((t) => t.status === "menunggu").length;
        const jumlahSelesai = tiketLayanan.filter((t) => t.status === "selesai").length;

        return {
          layanan: {
            id: lay.id,
            kode: lay.kode,
            nama: lay.nama,
            prefixNomor: lay.prefixNomor,
          },
          sedangDipanggil,
          sedangDilayani,
          jumlahMenunggu,
          jumlahSelesai,
        };
      });

      // 4. Riwayat 5 panggilan terakhir (untuk display running text / alert)
      const panggilanTerbaru = semuaTiketHariIni
        .filter((t) => t.calledAt !== null)
        .sort((a, b) => {
          const timeA = a.calledAt ? new Date(a.calledAt).getTime() : 0;
          const timeB = b.calledAt ? new Date(b.calledAt).getTime() : 0;
          return timeB - timeA;
        })
        .slice(0, 5);

      return {
        success: true,
        tanggal: todayDate,
        data: {
          loket: loketSummary,
          panggilanTerbaru,
        },
      };
    },
    {
      detail: {
        summary: "Data Layar Monitor TV Publik",
        description: "Mendapatkan status panggilan aktif dan antrean untuk seluruh loket.",
        tags: ["Display"],
      },
    }
  )

  /**
   * GET /api/display/sse
   * Server-Sent Events (SSE) stream untuk real-time update tampilan publik & dashboard.
   */
  .get(
    "/sse",
    () => {
      let listener: ((event: QueueEventPayload) => void) | null = null;
      let heartbeatInterval: any = null;

      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          // Kirim pesan koneksi pertama
          const initialMessage = `event: connected\ndata: ${JSON.stringify({
            message: "Connected to Campus Queue SSE stream",
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(initialMessage));

          // Daftarkan listener pada event bus
          listener = (eventData: QueueEventPayload) => {
            try {
              const msg = `event: queue_update\ndata: ${JSON.stringify(eventData)}\n\n`;
              controller.enqueue(encoder.encode(msg));
            } catch {
              // Jika stream sudah ditutup oleh client
            }
          };

          queueEventBus.on("queue:updated", listener);

          // Heartbeat setiap 15 detik agar koneksi tetap hidup melalui proxy/firewall
          heartbeatInterval = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(": ping\n\n"));
            } catch {
              clearInterval(heartbeatInterval);
            }
          }, 15000);
        },

        cancel() {
          if (listener) {
            queueEventBus.off("queue:updated", listener);
          }
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    },
    {
      detail: {
        summary: "Real-time SSE Stream",
        description: "Membuka stream Server-Sent Events untuk update antrean real-time.",
        tags: ["Display"],
      },
    }
  );
