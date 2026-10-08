/**
 * API client helper for Campus Queue System
 */

const API_BASE = '/api';

export async function fetchLayanan() {
  const res = await fetch(`${API_BASE}/layanan`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal memuat daftar layanan');
  }
  return data.data;
}

export async function ambilNomorAntrean(layananId, namaPemilik) {
  const res = await fetch(`${API_BASE}/antrean/ambil`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      layananId: Number(layananId),
      namaPemilik: namaPemilik ? namaPemilik.trim() : undefined,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal mengambil nomor antrean');
  }
  return data.data;
}

export async function cekStatusTiket(bookingCode) {
  const res = await fetch(`${API_BASE}/antrean/${encodeURIComponent(bookingCode.trim())}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Tiket antrean tidak ditemukan');
  }
  return data.data;
}

export async function batalkanTiket(bookingCode) {
  const res = await fetch(`${API_BASE}/antrean/${encodeURIComponent(bookingCode.trim())}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal membatalkan tiket');
  }
  return data;
}

export async function fetchDisplaySnapshot() {
  const res = await fetch(`${API_BASE}/display`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal memuat snapshot display');
  }
  return data.data;
}

export function getSSEUrl() {
  return `${API_BASE}/display/sse`;
}
