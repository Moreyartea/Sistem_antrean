# Product Requirement & System Architecture — Campus Queue Management System

## 1. System Overview & Core Objectives
Sistem Antrean Layanan Kampus adalah platform web fullstack bertipe *event-driven* yang memodernisasi antrean fisik administrasi kampus. Sistem memastikan penanganan nomor antrean yang *atomic* (anti-duplikat/race condition), pembaruan *real-time* multi-client, dan keterandalan di jaringan seluler.

## 2. User Roles & Permission Matrix
| Role | Authentication | Primary Capabilities |
|---|---|---|
| **Mahasiswa (Public)** | Anonymous / Kode Booking | Ambil nomor, cek status real-time, simpan tiket digital (QR Code/Local State), batalkan antrean. |
| **Petugas Loket** | JWT (via `/petugas/login`) | Panggil nomor berikutnya, panggil ulang (dengan audio TTS), tandai selesai, lewati, atau alihkan loket. |
| **Admin System** | JWT (role: admin) | Kelola jenis layanan/loket, kontrol status aktif loket, lihat analytics/laporan real-time, reset manual. |

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
│  ┌───────────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│  │  Mahasiswa App    │ │ Tampilan Publik │ │  Dashboard  │ │
│  │  (Mobile-First)   │ │  (Digital TV)   │ │  Petugas    │ │
│  └─────────┬─────────┘ └────────┬────────┘ └──────┬──────┘ │
└────────────┼────────────────────┼─────────────────┼────────┘
             │     fetch() / SSE (Server-Sent Events)│
┌────────────▼───────────────────────────────────────▼───────┐
│                   BACKEND LAYER (Bun + ElysiaJS)           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  JWT Auth Middleware + Route Handlers                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Drizzle ORM (Transaction-based Atomic Operations)   │  │
│  └──────────────────────┬───────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│                  DATABASE LAYER (MySQL)                     │
│  - Tables: layanan, petugas, antrean                       │
│  - Timezone: Asia/Jakarta (UTC+7)                          │
│  - Atomic row-locking via Drizzle transactions             │
└────────────────────────────────────────────────────────────┘
```

## 4. Key Architectural Decisions
1. **Timezone Standardization:** Seluruh penanggalan menggunakan `TIMESTAMP` dan MySQL connection di-set ke `timezone: '+07:00'` (Asia/Jakarta) untuk menjamin reset harian nomor urut tepat pukul 00:00 WIB.
2. **Resilient Realtime with Fallback Polling:** Client menggunakan strategi *Hybrid Subscription*: mendengarkan SSE (Server-Sent Events) dari Elysia backend, diselingi *polling fallback* setiap 30 detik jika koneksi SSE terputus.
3. **Atomic Generation & Locking:** Mencegah race condition dengan Drizzle `db.transaction()` yang mengunci baris `layanan` saat increment `nomor_terakhir`, sebelum membuat record `antrean` baru.
4. **Stateless Auth:** Petugas login menghasilkan JWT yang disimpan di `localStorage`. Setiap request ke protected route menyertakan `Authorization: Bearer <token>` header.