# Implementation Roadmap & Production Guidelines

## Phase 1: Backend Foundation (Day 1-2)
- [x] Initialize `/backend` with Bun (`bun init`).
- [x] Install: `elysia`, `drizzle-orm`, `mysql2`, `drizzle-kit`, `@elysiajs/cors`, `@elysiajs/jwt`, `@elysiajs/swagger`.
- [x] Define schema in `backend/src/db/schema.ts` (tabel: `layanan`, `petugas`, `antrean`).
- [x] Setup local MySQL database `sistem_antrean` & create `.env` with `DATABASE_URL`.
- [x] Run `bunx drizzle-kit generate` & `bunx drizzle-kit migrate` to apply schema.
- [x] Seed dummy data for `layanan` (Legalisir, KRS, Keuangan).
- [x] Seed test `petugas` record with hashed password (admin & loket attendants).

## Phase 2: Core API Routes & JWT Auth (Day 3-5)
- [x] **`POST /api/antrean/ambil`**: Atomic queue ticket creation (Drizzle transaction + row lock `FOR UPDATE`).
- [x] **`GET /api/antrean/:bookingCode`**: Public status check for student ticket with ahead-of-queue counter.
- [x] **`DELETE /api/antrean/:bookingCode`**: Student cancels own ticket.
- [x] **`POST /api/petugas/login`**: Auth endpoint with Bun native password verification, returns signed JWT.
- [x] **`GET /api/petugas/me`**: Attendant profile & assigned loket.
- [x] **`POST /api/petugas/panggil`**: Call next number (JWT protected).
- [x] **`POST /api/petugas/panggil-ulang`**: Re-call current number (JWT protected).
- [x] **`POST /api/petugas/layani`**: Mark ticket as in-service (JWT protected).
- [x] **`POST /api/petugas/selesai`**: Mark ticket as done (JWT protected).
- [x] **`POST /api/petugas/lewati`**: Skip number (JWT protected).
- [x] **`GET /api/display`**: Public endpoint for TV display board data snapshot.
- [x] **`GET /api/display/sse`**: SSE stream for real-time display updates.

## Phase 3: Core Frontend Development (Day 6-9)
- [ ] **Setup Stack:** React + Vite + Tailwind CSS + Lucide Icons. Remove Supabase dependencies.
- [ ] **Mahasiswa Page (`/` & `/tiket/:bookingCode`):**
  - Form pilih layanan.
  - Call `POST /api/antrean/ambil`.
  - Simpan state di `localStorage` & tampilkan Tiket QR Code (`qrcode.react`).
- [ ] **Public Display Page (`/display`):**
  - Tampilan TV Fullscreen dengan nomor sedang dipanggil per loket.
  - Connect ke SSE endpoint `/api/display/sse`.
  - Integrasi Web Speech API (TTS) untuk pemanggilan suara otomatis.
  - Fallback polling ke `GET /api/display` setiap 30 detik.
- [ ] **Dashboard Petugas (`/petugas`):**
  - Login form → simpan JWT di `localStorage`.
  - Action buttons: "Panggil Berikutnya", "Panggil Ulang", "Selesai", "Lewati".

## Phase 4: Production Hardening & Testing (Day 10)
- [ ] **Race Condition Testing:** Jalankan concurrent requests ke `POST /antrean/ambil` (e.g., 10 request simultan via k6 atau `Promise.all`). Pastikan tidak ada `nomor_urut` duplikat.
- [ ] **SSE Disconnection Test:** Putus koneksi lalu sambungkan kembali. Pastikan UI re-sync otomatis.
- [ ] **JWT Expiry Test:** Pastikan expired token diblokir dengan HTTP 401.

## Phase 5: CI/CD Deployment (Day 11)
1. Push repo ke GitHub.
2. Deploy backend ke Railway / Render (support Bun).
3. Deploy frontend ke Vercel / Netlify.
4. Configure environment variables di hosting platform.
5. Production Smoke Testing.