import { EventEmitter } from "events";

export interface QueueEventPayload {
  type: "BARU" | "DIPANGGIL" | "DIPANGGIL_ULANG" | "DILAYANI" | "SELESAI" | "DILEWATI" | "DIBATALKAN";
  antreanId: number;
  bookingCode: string;
  nomorDisplay: string;
  layananId: number;
  petugasId?: number | null;
  timestamp: string;
  payload?: any;
}

class QueueEventBus extends EventEmitter {}

export const queueEventBus = new QueueEventBus();

// Tambah limit listener agar tidak warning saat banyak client browser terhubung ke SSE
queueEventBus.setMaxListeners(200);
