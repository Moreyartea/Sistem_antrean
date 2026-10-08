import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket,
  Users,
  Clock,
  Sparkles,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Monitor,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Search,
  ExternalLink,
  GraduationCap,
  FileCheck,
  CreditCard,
  Layers,
  BellRing,
} from 'lucide-react';
import { fetchLayanan, ambilNomorAntrean, cekStatusTiket, batalkanTiket } from '../lib/api';

const LOCAL_STORAGE_KEY = 'kampus_antrean_active_ticket';

// Icon mapping per prefix or service code
function getLayananIcon(prefix) {
  switch (prefix?.toUpperCase()) {
    case 'A':
      return <FileCheck className="w-6 h-6" />;
    case 'B':
      return <GraduationCap className="w-6 h-6" />;
    case 'C':
      return <CreditCard className="w-6 h-6" />;
    default:
      return <Layers className="w-6 h-6" />;
  }
}

export default function AmbilAntreanPage() {
  const [daftarLayanan, setDaftarLayanan] = useState([]);
  const [selectedLayananId, setSelectedLayananId] = useState(null);
  const [namaPemilik, setNamaPemilik] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active Ticket state
  const [activeTicket, setActiveTicket] = useState(null);
  const [refreshingTicket, setRefreshingTicket] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Manual Check Modal/Drawer
  const [lookupCode, setLookupCode] = useState('');
  const [showLookupBox, setShowLookupBox] = useState(false);

  // Load initial services & existing ticket from localStorage
  useEffect(() => {
    async function init() {
      try {
        setInitialLoading(true);
        const layananList = await fetchLayanan();
        setDaftarLayanan(layananList);
        if (layananList.length > 0) {
          setSelectedLayananId(layananList[0].id);
        }

        // Check if there is an active ticket saved in localStorage
        const savedCode = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedCode) {
          try {
            const ticketData = await cekStatusTiket(savedCode);
            setActiveTicket(ticketData);
          } catch (e) {
            console.warn('Saved ticket not valid or expired:', e);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
        }
      } catch (err) {
        setErrorMsg(err.message || 'Gagal terhubung ke server backend');
      } finally {
        setInitialLoading(false);
      }
    }
    init();
  }, []);

  // Poll ticket status periodically if waiting or called
  useEffect(() => {
    if (!activeTicket || ['selesai', 'dibatalkan', 'dilewati'].includes(activeTicket.status)) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await cekStatusTiket(activeTicket.bookingCode);
        setActiveTicket(updated);
      } catch (err) {
        console.warn('Auto-refresh status ticket failed:', err);
      }
    }, 10000); // Poll every 10s

    return () => clearInterval(interval);
  }, [activeTicket]);

  // Handle Form Submit: Take queue ticket
  const handleAmbilAntrean = async (e) => {
    e.preventDefault();
    if (!selectedLayananId) {
      setErrorMsg('Pilih salah satu layanan loket terlebih dahulu.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const newTicket = await ambilNomorAntrean(selectedLayananId, namaPemilik);
      setActiveTicket(newTicket);
      localStorage.setItem(LOCAL_STORAGE_KEY, newTicket.bookingCode);
      setSuccessMsg(`Nomor antrean ${newTicket.nomorDisplay} berhasil diambil!`);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengambil nomor antrean. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh active ticket status manually
  const handleRefreshTicket = async () => {
    if (!activeTicket?.bookingCode) return;
    setRefreshingTicket(true);
    setErrorMsg('');
    try {
      const refreshed = await cekStatusTiket(activeTicket.bookingCode);
      setActiveTicket(refreshed);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memperbarui status tiket.');
    } finally {
      setRefreshingTicket(false);
    }
  };

  // Cancel ticket
  const handleBatalkanTicket = async () => {
    if (!activeTicket?.bookingCode) return;
    const confirmCancel = window.confirm(
      `Apakah Anda yakin ingin membatalkan nomor antrean ${activeTicket.nomorDisplay}? Tindakan ini tidak dapat diurungkan.`
    );
    if (!confirmCancel) return;

    setLoading(true);
    setErrorMsg('');
    try {
      await batalkanTiket(activeTicket.bookingCode);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setActiveTicket(null);
      setSuccessMsg(`Nomor antrean telah berhasil dibatalkan.`);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal membatalkan nomor antrean.');
    } finally {
      setLoading(false);
    }
  };

  // Dismiss ticket and take new one
  const handleResetTicketState = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setActiveTicket(null);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Lookup existing ticket by code
  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const found = await cekStatusTiket(lookupCode.trim());
      setActiveTicket(found);
      localStorage.setItem(LOCAL_STORAGE_KEY, found.bookingCode);
      setShowLookupBox(false);
      setLookupCode('');
    } catch (err) {
      setErrorMsg(err.message || 'Kode booking tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  };

  // Copy booking code to clipboard
  const handleCopyCode = () => {
    if (!activeTicket?.bookingCode) return;
    navigator.clipboard.writeText(activeTicket.bookingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'menunggu':
        return (
          <span className="neo-badge bg-[#ffe600] text-black border-black">
            <Clock className="w-3.5 h-3.5 mr-1" /> MENUNGGU DI ANTREAN
          </span>
        );
      case 'dipanggil':
        return (
          <span className="neo-badge bg-[#ccff00] text-black border-black animate-bounce font-black">
            <BellRing className="w-3.5 h-3.5 mr-1 animate-spin" /> SEDANG DIPANGGIL — SILAKAN KE LOKET
          </span>
        );
      case 'dilayani':
        return (
          <span className="neo-badge bg-[#00e5ff] text-black border-black font-black">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> SEDANG DILAYANI PETUGAS
          </span>
        );
      case 'selesai':
        return (
          <span className="neo-badge bg-[#10b981] text-black border-black font-black">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> PELAYANAN SELESAI
          </span>
        );
      case 'dibatalkan':
      case 'dilewati':
        return (
          <span className="neo-badge bg-[#ef4444] text-white border-black font-black">
            <AlertCircle className="w-3.5 h-3.5 mr-1" /> {status.toUpperCase()}
          </span>
        );
      default:
        return (
          <span className="neo-badge bg-zinc-700 text-white border-black">
            {status?.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-[#f4f4f5] flex flex-col font-sans selection:bg-[#ccff00] selection:text-black">
      {/* Top Brutalist Navigation Bar */}
      <header className="border-b-4 border-black bg-[#12141a] px-4 sm:px-8 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ccff00] border-2 border-black flex items-center justify-center neo-shadow-sm">
              <Building2 className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-brutal font-bold tracking-widest text-[#ccff00] uppercase">
                  PORTAL MAHASISWA
                </span>
                <span className="w-2 h-2 rounded-full bg-[#ccff00] animate-ping" />
              </div>
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                Sistem Antrean Layanan Kampus
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLookupBox(!showLookupBox)}
              className="neo-btn neo-btn-dark text-xs sm:text-sm py-2 px-3 flex items-center gap-1.5"
            >
              <Search className="w-4 h-4 text-[#ccff00]" />
              <span>Cari Tiket</span>
            </button>

            <Link
              to="/display"
              className="neo-btn neo-btn-lime text-xs sm:text-sm py-2 px-3 sm:px-4 flex items-center gap-1.5"
            >
              <Monitor className="w-4 h-4 text-black" />
              <span className="font-extrabold">Monitor TV Publik</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Lookup Existing Ticket Modal / Banner */}
      {showLookupBox && (
        <div className="bg-[#181c26] border-b-4 border-black px-4 py-4 animate-fadeIn">
          <div className="max-w-xl mx-auto">
            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Masukkan Kode Booking (Contoh: A-001-3W9F)"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#0e1017] border-2 border-[#363e52] px-4 py-2 text-sm font-mono-brutal text-white focus:border-[#ccff00] focus:outline-none uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !lookupCode.trim()}
                className="neo-btn neo-btn-cyan text-xs sm:text-sm py-2 px-4 whitespace-nowrap"
              >
                Cek Tiket Saya
              </button>
              <button
                type="button"
                onClick={() => setShowLookupBox(false)}
                className="neo-btn neo-btn-dark text-xs py-2 px-3"
              >
                Tutup
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Global Notifications */}
        {errorMsg && (
          <div className="neo-box border-2 border-red-500 bg-[#251014] text-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="block font-bold uppercase tracking-wider text-red-400">
                Peringatan:
              </strong>
              {errorMsg}
            </div>
            <button
              onClick={() => setErrorMsg('')}
              className="ml-auto text-red-400 hover:text-white font-mono-brutal font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className="neo-box border-2 border-[#ccff00] bg-[#14230b] text-[#d6ff73] p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#ccff00] shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="block font-bold uppercase tracking-wider text-[#ccff00]">
                Sukses:
              </strong>
              {successMsg}
            </div>
            <button
              onClick={() => setSuccessMsg('')}
              className="ml-auto text-[#ccff00] hover:text-white font-mono-brutal font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* VIEW 1: ACTIVE DIGITAL TICKET */}
        {activeTicket ? (
          <div className="flex flex-col gap-6 animate-fadeIn">
            {/* Header Ticket Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131722] border-3 border-black p-4 neo-shadow-sm">
              <div>
                <span className="text-xs font-mono-brutal font-bold text-[#ccff00] uppercase tracking-widest block">
                  TIKET ANTREAN AKTIF
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                  Status Antrean Anda
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshTicket}
                  disabled={refreshingTicket}
                  className="neo-btn neo-btn-dark text-xs py-2 px-3 flex items-center gap-1.5"
                  title="Segarkan status dari server"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-[#ccff00] ${refreshingTicket ? 'animate-spin' : ''}`}
                  />
                  <span>Perbarui</span>
                </button>
                <button
                  onClick={handleResetTicketState}
                  className="neo-btn neo-btn-dark text-xs py-2 px-3 flex items-center gap-1.5 text-zinc-400 hover:text-white"
                  title="Ambil tiket layanan lain"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Ambil Baru</span>
                </button>
              </div>
            </div>

            {/* Neo-Brutalist Digital Boarding Pass Ticket */}
            <div
              className={`neo-box ${
                activeTicket.status === 'dipanggil'
                  ? 'border-4 border-[#ccff00] animate-call-pulse bg-[#121820]'
                  : 'border-3 border-black bg-[#151924]'
              } relative overflow-hidden`}
            >
              {/* Ticket Top Cutout Decoration */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#ccff00]" />

              <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center justify-between">
                {/* Left Ticket Info */}
                <div className="flex-1 flex flex-col gap-4 text-left w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(activeTicket.status)}
                    <span className="text-xs font-mono-brutal text-zinc-400">
                      {new Date(activeTicket.createdAt || Date.now()).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-mono-brutal uppercase text-zinc-400 tracking-wider block">
                      Nomor Antrean Anda
                    </span>
                    <div className="text-6xl sm:text-7xl font-black font-mono-brutal text-[#ccff00] tracking-tighter drop-shadow-md">
                      {activeTicket.nomorDisplay}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t-2 border-[#2c3345]">
                    <div>
                      <span className="text-xs font-mono-brutal uppercase text-zinc-400 block">
                        Layanan Loket
                      </span>
                      <strong className="text-sm sm:text-base font-extrabold text-white">
                        {activeTicket.namaLayanan || 'Layanan Administrasi'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-xs font-mono-brutal uppercase text-zinc-400 block">
                        Pemilik Tiket
                      </span>
                      <strong className="text-sm sm:text-base font-extrabold text-white">
                        {activeTicket.namaPemilik || 'Mahasiswa (Anonim)'}
                      </strong>
                    </div>

                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 bg-[#0c0e14] border-2 border-[#2b3243] p-2.5">
                      <div>
                        <span className="text-[11px] font-mono-brutal uppercase text-zinc-400 block">
                          Kode Booking / Verifikasi
                        </span>
                        <span className="text-base font-mono-brutal font-bold text-[#00e5ff] tracking-wider">
                          {activeTicket.bookingCode}
                        </span>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="neo-btn neo-btn-dark text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#ccff00]" />
                            <span className="text-[#ccff00]">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: QR Code & Realtime Position Card */}
                <div className="flex flex-col items-center justify-center gap-4 bg-[#0d1017] border-3 border-black p-6 neo-shadow-sm w-full md:w-auto shrink-0">
                  <div className="bg-white p-3 border-2 border-black">
                    <QRCodeSVG
                      value={activeTicket.bookingCode || 'TICKET'}
                      size={140}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                  <span className="text-[10px] font-mono-brutal uppercase text-zinc-400 text-center tracking-widest">
                    Pindai di Meja Loket
                  </span>

                  {/* Sisa antrean di depan */}
                  {activeTicket.status === 'menunggu' && (
                    <div className="w-full bg-[#181c28] border-2 border-[#30384c] p-3 text-center">
                      <span className="text-[11px] font-mono-brutal uppercase text-zinc-400 block">
                        Antrean di Depan Anda
                      </span>
                      <div className="text-2xl font-black text-white font-mono-brutal">
                        {activeTicket.antreanDiDepan ?? 0}{' '}
                        <span className="text-xs font-normal text-zinc-400">Orang</span>
                      </div>
                      {activeTicket.sedangDipanggil && (
                        <span className="text-[11px] text-[#ccff00] font-mono-brutal block mt-1">
                          Dipanggil sekarang: <strong>{activeTicket.sedangDipanggil}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Notification Alert for Caller */}
              {activeTicket.status === 'dipanggil' && (
                <div className="bg-[#ccff00] text-black font-black uppercase px-6 py-3 border-t-3 border-black flex items-center justify-center gap-2 text-sm sm:text-base animate-pulse">
                  <BellRing className="w-5 h-5" />
                  <span>PERHATIAN: Nomor Anda sedang dipanggil! Segera menuju loket petugas.</span>
                </div>
              )}

              {/* Action Bar Footer */}
              <div className="bg-[#10131b] border-t-2 border-[#2b3243] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#ccff00]" /> Simpan atau screenshot halaman ini
                  sebagai bukti nomor antrean.
                </span>

                <div className="flex items-center gap-3">
                  {activeTicket.status === 'menunggu' && (
                    <button
                      onClick={handleBatalkanTicket}
                      disabled={loading}
                      className="neo-btn text-xs py-2 px-3 bg-red-950/80 hover:bg-red-900 border-2 border-red-500 text-red-200 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Batalkan Antrean</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: FORM AMBIL NOMOR ANTREAN MAHASISWA */
          <div className="flex flex-col gap-8 animate-fadeIn">
            {/* Hero Banner Section */}
            <section className="neo-box border-3 border-black bg-[#141722] p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-44 h-44 bg-[#ccff00]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 bg-[#ccff00] text-black font-mono-brutal font-bold text-xs uppercase px-2.5 py-1 border-2 border-black mb-3 neo-shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span>Layanan Otomatis & Terpadu</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
                    Ambil Nomor Antrean Mahasiswa
                  </h2>
                  <p className="text-sm text-zinc-300 mt-2 font-medium leading-relaxed">
                    Pilih jenis layanan administrasi kampus yang ingin Anda tuju. Sistem kami
                    menjamin nomor antrean yang anti-duplikat dan pembaruan antrean secara real-time.
                  </p>
                </div>

                <div className="bg-[#0e1017] border-2 border-[#2b3243] p-4 text-center shrink-0 w-full sm:w-auto">
                  <span className="text-[11px] font-mono-brutal uppercase text-zinc-400 block">
                    Status Loket Hari Ini
                  </span>
                  <div className="text-lg font-black text-[#ccff00] flex items-center justify-center gap-1.5 mt-1 font-mono-brutal">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ccff00] animate-pulse" />
                    <span>BUKA & AKTIF</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 mt-1 block font-mono-brutal">
                    08:00 — 16:00 WIB
                  </span>
                </div>
              </div>
            </section>

            {/* The Main Form */}
            <form onSubmit={handleAmbilAntrean} className="flex flex-col gap-6">
              {/* STEP 1: PILIH LAYANAN */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#ccff00] text-black text-xs font-mono-brutal font-bold flex items-center justify-center border-2 border-black">
                      1
                    </span>
                    Pilih Jenis Layanan / Loket
                  </label>
                  <span className="text-xs font-mono-brutal text-zinc-400">
                    {daftarLayanan.length} Layanan Tersedia
                  </span>
                </div>

                {initialLoading ? (
                  <div className="neo-box border-2 border-[#2c3345] p-8 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#ccff00]" />
                    <span className="font-mono-brutal text-sm">Memuat daftar loket kampus...</span>
                  </div>
                ) : daftarLayanan.length === 0 ? (
                  <div className="neo-box border-2 border-amber-500 bg-amber-950/20 p-6 text-amber-200">
                    Belum ada layanan yang aktif hari ini. Silakan hubungi petugas administrator.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {daftarLayanan.map((item) => {
                      const isSelected = selectedLayananId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedLayananId(item.id)}
                          className={`cursor-pointer p-5 transition-all text-left relative ${
                            isSelected
                              ? 'neo-box border-3 border-[#ccff00] bg-[#161d26] neo-shadow-lime'
                              : 'neo-card border-2 border-[#2a3040] bg-[#13161f] hover:border-[#3f4a62]'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-[#ccff00] text-black p-0.5 border border-black">
                              <Check className="w-4 h-4 font-black" />
                            </div>
                          )}

                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={`w-10 h-10 border-2 border-black flex items-center justify-center font-mono-brutal font-bold ${
                                isSelected ? 'bg-[#ccff00] text-black' : 'bg-[#222735] text-white'
                              }`}
                            >
                              {getLayananIcon(item.prefixNomor)}
                            </div>
                            <div>
                              <span className="text-[10px] font-mono-brutal uppercase text-zinc-400 tracking-wider">
                                Prefix Loket
                              </span>
                              <div className="text-sm font-black font-mono-brutal text-[#00e5ff]">
                                KODE {item.prefixNomor}
                              </div>
                            </div>
                          </div>

                          <h3 className="text-base font-extrabold text-white leading-snug mb-1">
                            {item.nama}
                          </h3>
                          <p className="text-xs text-zinc-400 line-clamp-2">
                            {item.deskripsi || 'Pelayanan administrasi terpadu bagi mahasiswa aktif.'}
                          </p>

                          <div className="mt-4 pt-3 border-t border-[#262c3b] flex items-center justify-between text-[11px] font-mono-brutal text-zinc-400">
                            <span>Status</span>
                            <span className="text-[#ccff00] font-bold">● Aktif Melayani</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 2: NAMA ATAU IDENTITAS MAHASISWA */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#ccff00] text-black text-xs font-mono-brutal font-bold flex items-center justify-center border-2 border-black">
                    2
                  </span>
                  Nama Mahasiswa / NIM (Opsional)
                </label>

                <div className="neo-box border-2 border-[#2c3345] bg-[#131620] p-4">
                  <input
                    type="text"
                    value={namaPemilik}
                    onChange={(e) => setNamaPemilik(e.target.value)}
                    placeholder="Contoh: Muhammad Fatih (22010101)"
                    maxLength={100}
                    className="w-full bg-[#0a0c12] border-2 border-[#333b4d] px-4 py-3 text-sm text-white placeholder-zinc-500 font-medium focus:border-[#ccff00] focus:outline-none transition-colors"
                  />
                  <span className="text-[11px] text-zinc-400 mt-2 block">
                    Nama akan ditampilkan pada ringkasan tiket untuk mempermudah pemanggilan oleh
                    petugas loket.
                  </span>
                </div>
              </div>

              {/* STEP 3: SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || initialLoading || !selectedLayananId}
                  className="w-full neo-btn neo-btn-lime py-4 px-6 text-base sm:text-lg flex items-center justify-center gap-3 neo-shadow-lime-lg"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-black" />
                      <span>MENERBITKAN NOMOR ANTREAN...</span>
                    </>
                  ) : (
                    <>
                      <Ticket className="w-5 h-5 text-black" />
                      <span>AMBIL NOMOR ANTREAN SEKARANG</span>
                      <ArrowRight className="w-5 h-5 text-black" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t-2 border-[#222736]">
          <div className="bg-[#10131c] border-2 border-[#252b3b] p-4 flex items-start gap-3">
            <div className="p-2 bg-[#1a202d] border border-black text-[#ccff00]">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-xs font-black uppercase text-white block">
                Penomoran Atomik
              </strong>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Nomor urut anti-duplikat menggunakan row-locking transaksi basis data.
              </p>
            </div>
          </div>

          <div className="bg-[#10131c] border-2 border-[#252b3b] p-4 flex items-start gap-3">
            <div className="p-2 bg-[#1a202d] border border-black text-[#00e5ff]">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-xs font-black uppercase text-white block">
                Live TV Monitor & Suara
              </strong>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Pantau nomor yang dipanggil secara langsung lewat layar TV atau speaker publik.
              </p>
            </div>
          </div>

          <div className="bg-[#10131c] border-2 border-[#252b3b] p-4 flex items-start gap-3">
            <div className="p-2 bg-[#1a202d] border border-black text-[#ff007f]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-xs font-black uppercase text-white block">
                Real-Time Tracking
              </strong>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Cek sisa orang di depan Anda tanpa perlu menunggu berdiri di lokasi loket.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-[#0d0f14] px-4 py-6 text-center text-xs text-zinc-500 font-mono-brutal">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Sistem Antrean Kampus © 2026 — Neo-Brutalist Edition</span>
          <div className="flex items-center gap-4 text-zinc-400">
            <Link to="/display" className="hover:text-[#ccff00] underline font-bold">
              Buka Layar TV Publik
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
