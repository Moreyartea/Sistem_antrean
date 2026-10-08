CREATE TABLE `antrean` (
	`id` int AUTO_INCREMENT NOT NULL,
	`booking_code` varchar(20) NOT NULL,
	`layanan_id` int NOT NULL,
	`petugas_id` int,
	`nomor_urut` int NOT NULL,
	`nomor_display` varchar(10) NOT NULL,
	`status` enum('menunggu','dipanggil','dilayani','selesai','dilewati','dibatalkan') NOT NULL DEFAULT 'menunggu',
	`nama_pemilik` varchar(100),
	`catatan` text,
	`tanggal_antrean` date NOT NULL,
	`called_at` timestamp NULL,
	`served_at` timestamp NULL,
	`completed_at` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `antrean_id` PRIMARY KEY(`id`),
	CONSTRAINT `antrean_booking_code_unique` UNIQUE(`booking_code`),
	CONSTRAINT `antrean_booking_code_idx` UNIQUE(`booking_code`)
);
--> statement-breakpoint
CREATE TABLE `layanan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode` varchar(5) NOT NULL,
	`nama` varchar(100) NOT NULL,
	`deskripsi` text,
	`prefix_nomor` varchar(5) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`nomor_terakhir` int NOT NULL DEFAULT 0,
	`tanggal_reset` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `layanan_id` PRIMARY KEY(`id`),
	CONSTRAINT `layanan_kode_unique` UNIQUE(`kode`),
	CONSTRAINT `layanan_kode_idx` UNIQUE(`kode`)
);
--> statement-breakpoint
CREATE TABLE `petugas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` varchar(100) NOT NULL,
	`email` varchar(150) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('petugas','admin') NOT NULL DEFAULT 'petugas',
	`layanan_id` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `petugas_id` PRIMARY KEY(`id`),
	CONSTRAINT `petugas_email_unique` UNIQUE(`email`),
	CONSTRAINT `petugas_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `antrean_layanan_status_idx` ON `antrean` (`layanan_id`,`status`);--> statement-breakpoint
CREATE INDEX `antrean_tanggal_idx` ON `antrean` (`tanggal_antrean`);--> statement-breakpoint
CREATE INDEX `antrean_petugas_id_idx` ON `antrean` (`petugas_id`);--> statement-breakpoint
CREATE INDEX `petugas_layanan_id_idx` ON `petugas` (`layanan_id`);