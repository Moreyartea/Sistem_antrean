# Sistem Manajemen Antrean Kampus 🚀

Proyek ini adalah implementasi Sistem Antrean *Real-time* yang dikembangkan sebagai pemenuhan tugas mata kuliah **Pemrograman Web**. Dibangun menggunakan arsitektur *Monorepo* dengan pemisahan *frontend* dan *backend* yang tegas, serta mengusung konsep desain UI *Neo-Brutalism*.

## 👨‍💻 Identitas Pengembang
- **Nama Kelompok:** Tim Hore
- **Anggota Kelompok:** 
    - Fatih Taqiyyuddin (4253250057)
    - Keegan Gibran Jehian (4253250029)
    - Siti Zulayka Maulida Amali (4253250001)

## 🛠️ Stack Teknologi
- **Frontend:** React (Vite), Tailwind CSS v4, Lucide React
- **Backend:** Bun, ElysiaJS, Socket.io
- **Database & ORM:** MySQL (XAMPP), Drizzle ORM
- **Keamanan:** Autentikasi JWT (JSON Web Token)

## ✨ Fitur Utama
1. **Pengambilan Antrean (Mahasiswa):** Mengandalkan *Database Transaction* (Atomic) untuk mencegah duplikasi nomor urut (*race condition*).
2. **Dashboard Petugas (Admin):** Autentikasi aman untuk memanggil nomor antrean berikutnya.
3. **Live Display (TV Publik):** Sinkronisasi layar *real-time* memanfaatkan WebSockets (Socket.io) tanpa perlu *refresh* halaman.

## 🚀 Cara Menjalankan Proyek Lokal
1. Pastikan modul MySQL di XAMPP dalam keadaan hidup.
2. Konfigurasi `DATABASE_URL` di dalam file `/backend/.env`.
3. Buka terminal di folder `/backend` dan jalankan migrasi:
   `bun run db:generate` lalu `bun run db:migrate`
4. Buat kredensial admin awal dengan menjalankan: `bun run seed.ts`
5. Nyalakan server backend: `bun run dev` (di dalam folder `/backend`)
6. Nyalakan server frontend: `bun run dev` (di dalam folder `/frontend`)