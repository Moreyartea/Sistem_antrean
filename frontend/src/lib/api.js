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

// ─────────────────────────────────────────────
// PETUGAS / ADMIN API
// ─────────────────────────────────────────────

export async function loginPetugas(email, password) {
  const res = await fetch(`${API_BASE}/petugas/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal melakukan login petugas');
  }
  return data.data; // { token, user }
}

export async function getPetugasMe(token) {
  const res = await fetch(`${API_BASE}/petugas/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Sesi petugas tidak valid');
  }
  return data.data;
}

export async function assignLoketPetugas(layananId, token) {
  const res = await fetch(`${API_BASE}/petugas/assign-loket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ layananId: Number(layananId) }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal memilih loket');
  }
  return data.data;
}

export async function getAntreanLoket(token) {
  const res = await fetch(`${API_BASE}/petugas/antrean-loket`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal memuat antrean loket');
  }
  return data.data;
}

export async function panggilBerikutnya(token, layananId) {
  const res = await fetch(`${API_BASE}/petugas/panggil`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(layananId ? { layananId: Number(layananId) } : {}),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal memanggil antrean berikutnya');
  }
  return data.data;
}

export async function panggilUlangAntrean(token, antreanId) {
  const res = await fetch(`${API_BASE}/petugas/panggil-ulang`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ antreanId: Number(antreanId) }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal memanggil ulang antrean');
  }
  return data;
}

export async function mulaiLayaniAntrean(token, antreanId) {
  const res = await fetch(`${API_BASE}/petugas/layani`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ antreanId: Number(antreanId) }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal memulai pelayanan');
  }
  return data;
}

export async function selesaiAntrean(token, antreanId, catatan) {
  const res = await fetch(`${API_BASE}/petugas/selesai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ antreanId: Number(antreanId), catatan }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal menyelesaikan antrean');
  }
  return data;
}

export async function lewatiAntrean(token, antreanId, catatan) {
  const res = await fetch(`${API_BASE}/petugas/lewati`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ antreanId: Number(antreanId), catatan }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal melewati antrean');
  }
  return data;
}

export async function fetchAntreanAktif(layananId) {
  const query = layananId ? `?layananId=${layananId}` : '';
  const res = await fetch(`${API_BASE}/antrean/aktif${query}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal memuat antrean aktif');
  }
  return data.data;
}
