import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Radio,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  Monitor,
  Building2,
  Users,
  CheckCircle2,
  BellRing,
  RotateCcw,
  Layers,
  ArrowUpRight,
  Flame,
} from 'lucide-react';
import { fetchDisplaySnapshot, getSSEUrl } from '../lib/api';
import { soundEngine } from '../lib/audio';

export default function DisplayPage() {
  const [loketList, setLoketList] = useState([]);
  const [panggilanTerbaru, setPanggilanTerbaru] = useState([]);
  const [highlightCall, setHighlightCall] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'live' | 'polling' | 'connecting' | 'error'
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  const eventSourceRef = useRef(null);
  const highlightTimeoutRef = useRef(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync snapshot from backend
  const loadSnapshot = useCallback(async () => {
    try {
      const data = await fetchDisplaySnapshot();
      setLoketList(data.loket || []);
      setPanggilanTerbaru(data.panggilanTerbaru || []);

      // If there's an ongoing call, highlight the most recent one
      if (data.panggilanTerbaru && data.panggilanTerbaru.length > 0) {
        setHighlightCall((prev) => prev || data.panggilanTerbaru[0]);
      }
    } catch (err) {
      console.error('Failed to load display snapshot:', err);
    }
  }, []);

  // SSE Setup & Fallback Polling
  useEffect(() => {
    // Initial fetch
    loadSnapshot();

    // 30s Fallback Polling
    const pollingInterval = setInterval(() => {
      loadSnapshot();
    }, 30000);

    // Setup EventSource (SSE)
    let sse;
    try {
      sse = new EventSource(getSSEUrl());
      eventSourceRef.current = sse;

      sse.onopen = () => {
        setConnectionStatus('live');
      };

      // Listen for connected message
      sse.addEventListener('connected', () => {
        setConnectionStatus('live');
      });

      // Listen for queue updates
      sse.addEventListener('queue_update', (event) => {
        try {
          const update = JSON.parse(event.data);
          loadSnapshot();

          // If a ticket is called or recalled, trigger highlight and voice announcement
          if (update.type === 'DIPANGGIL' || update.type === 'DIPANGGIL_ULANG') {
            const ticketInfo = {
              nomorDisplay: update.nomorDisplay,
              layananId: update.layananId,
              namaLayanan: update.payload?.namaLayanan || 'Loket Pelayanan',
              calledAt: update.timestamp,
            };

            setHighlightCall(ticketInfo);

            // Audio announcement
            soundEngine.speakCall(ticketInfo.nomorDisplay, ticketInfo.namaLayanan);

            // Clear any previous timeout
            if (highlightTimeoutRef.current) {
              clearTimeout(highlightTimeoutRef.current);
            }
          }
        } catch (e) {
          console.warn('Error parsing SSE event:', e);
        }
      });

      sse.onerror = () => {
        setConnectionStatus('polling');
      };
    } catch (err) {
      console.warn('SSE initialization failed:', err);
      setConnectionStatus('polling');
    }

    return () => {
      if (sse) sse.close();
      clearInterval(pollingInterval);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, [loadSnapshot]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
    setAudioUnlocked(true);
  };

  const handleTestAudio = () => {
    setAudioUnlocked(true);
    soundEngine.getAudioContext(); // unlock audio context
    soundEngine.speakCall(
      highlightCall?.nomorDisplay || 'A001',
      highlightCall?.namaLayanan || 'Layanan Akademik'
    );
  };

  // Find currently called ticket for a specific loket
  const getLoketCurrentTicket = (loketItem) => {
    return loketItem.sedangDipanggil || loketItem.sedangDilayani || null;
  };

  return (
    <div className="min-h-screen bg-[#090a0d] text-white flex flex-col font-sans selection:bg-[#ccff00] selection:text-black overflow-x-hidden">
      {/* Audio Unlock Alert Banner if browser restricts autoplay */}
      {!audioUnlocked && (
        <div className="bg-[#ccff00] text-black px-4 py-2 border-b-4 border-black flex items-center justify-between text-xs sm:text-sm font-black font-mono-brutal">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 shrink-0" />
            <span>
              AKTIFKAN SUARA: Klik tombol "Aktifkan Audio" agar pengumuman suara panggilan otomatis
              dapat terdengar di layar monitor TV.
            </span>
          </div>
          <button
            onClick={handleTestAudio}
            className="neo-btn bg-black text-[#ccff00] border-2 border-black px-3 py-1 text-xs shrink-0 hover:bg-zinc-800"
          >
            Aktifkan & Uji Suara
          </button>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <header className="bg-[#10131b] border-b-4 border-black px-4 sm:px-8 py-3 sticky top-0 z-40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Campus Identity */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#ccff00] border-3 border-black flex items-center justify-center neo-shadow-sm shrink-0">
              <Building2 className="w-7 h-7 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono-brutal font-bold text-[#ccff00] tracking-widest uppercase">
                  MONITOR DIGITAL TV PUBLIK
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#ccff00] animate-ping" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-tight">
                Sistem Antrean Layanan Terpadu Kampus
              </h1>
            </div>
          </div>

          {/* Right Status & Controls */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Live Real-time Date & Clock */}
            <div className="bg-[#0b0c10] border-2 border-[#2b3142] px-4 py-1.5 flex items-center gap-4 font-mono-brutal">
              <div className="flex items-center gap-2 text-zinc-300 text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span className="hidden sm:inline">
                  {currentTime.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-[#ccff00] tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#ccff00]" />
                <span>{currentTime.toLocaleTimeString('id-ID')} WIB</span>
              </div>
            </div>

            {/* Connection Status Indicator */}
            <div
              className={`neo-badge border-2 border-black ${
                connectionStatus === 'live'
                  ? 'bg-[#153412] text-[#86efac] border-[#22c55e]'
                  : 'bg-[#3b2d10] text-[#fde047] border-[#eab308]'
              }`}
            >
              <Radio
                className={`w-3.5 h-3.5 mr-1.5 ${
                  connectionStatus === 'live' ? 'animate-pulse text-[#22c55e]' : 'text-[#eab308]'
                }`}
              />
              <span className="text-[11px] font-mono-brutal font-bold uppercase">
                {connectionStatus === 'live' ? 'REALTIME LIVE' : 'POLLING 30s'}
              </span>
            </div>

            {/* Audio Toggle & Test */}
            <button
              onClick={handleToggleMute}
              className={`neo-btn text-xs py-2 px-3 flex items-center gap-1.5 ${
                isMuted ? 'neo-btn-dark text-red-400' : 'neo-btn-dark text-[#ccff00]'
              }`}
              title={isMuted ? 'Audio dinonaktifkan' : 'Audio aktif'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isMuted ? 'Bisu' : 'Audio On'}</span>
            </button>

            {/* Test Audio Button */}
            <button
              onClick={handleTestAudio}
              className="neo-btn neo-btn-cyan text-xs py-2 px-3 flex items-center gap-1 font-bold"
              title="Putar suara panggilan pengujian"
            >
              <BellRing className="w-4 h-4 text-black" />
              <span className="hidden sm:inline">Uji Panggilan</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="neo-btn neo-btn-lime text-xs py-2 px-3 flex items-center gap-1.5"
              title="Layar Penuh TV"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-black" />
              ) : (
                <Maximize2 className="w-4 h-4 text-black" />
              )}
              <span className="hidden md:inline font-black">
                {isFullscreen ? 'Keluar TV' : 'Layar Penuh'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN SCREEN BODY */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-[1720px] w-full mx-auto">
        {/* TOP ROW: HERO CALLOUT BILLBOARD & SIDEBAR RIWAYAT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* HERO BANNER: SEDANG DIPANGGIL SAAT INI (Large Screen Billboard) */}
          <section className="lg:col-span-8 flex flex-col">
            <div className="neo-box border-4 border-[#ccff00] bg-[#121622] p-6 sm:p-8 flex-1 flex flex-col justify-between neo-shadow-lime-lg relative overflow-hidden animate-call-pulse">
              {/* Background Cyber Accent Glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#ccff00]/15 rounded-full blur-3xl pointer-events-none" />

              {/* Call Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b-3 border-black pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-[#ccff00] text-black font-black text-xs sm:text-sm font-mono-brutal px-3 py-1.5 border-2 border-black flex items-center gap-1.5 neo-shadow-sm uppercase">
                    <BellRing className="w-4 h-4 animate-bounce text-black" />
                    <span>PANGGILAN AKTIF SAAT INI</span>
                  </div>
                  <span className="text-xs font-mono-brutal text-zinc-300">
                    Menuju Meja Pelayanan
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ccff00] animate-ping" />
                  <span className="text-xs font-mono-brutal text-[#ccff00] font-bold uppercase tracking-wider">
                    PRIORITAS UTAMA
                  </span>
                </div>
              </div>

              {/* Large Ticket Billboard */}
              <div className="py-8 sm:py-12 flex flex-col items-center justify-center text-center relative z-10">
                <span className="text-xs sm:text-sm font-mono-brutal uppercase text-zinc-400 tracking-widest block mb-2">
                  NOMOR ANTREAN MAHASISWA
                </span>

                <div className="text-7xl sm:text-9xl md:text-[10rem] font-black font-mono-brutal text-[#ccff00] tracking-tight leading-none drop-shadow-[0_10px_0_rgba(0,0,0,1)] selection:bg-white selection:text-black">
                  {highlightCall?.nomorDisplay || '---'}
                </div>

                <div className="mt-6 flex flex-col items-center gap-2">
                  <span className="text-xs font-mono-brutal uppercase text-zinc-400">
                    SILAKAN SEGERA MENUJU KE
                  </span>
                  <div className="text-xl sm:text-3xl md:text-4xl font-black uppercase text-white tracking-tight bg-[#0b0d13] border-3 border-black px-6 py-2.5 neo-shadow-sm">
                    {highlightCall?.namaLayanan || 'Menunggu Panggilan Petugas...'}
                  </div>
                </div>
              </div>

              {/* Call Footer Bar */}
              <div className="pt-4 border-t-3 border-black flex flex-wrap items-center justify-between gap-3 text-xs font-mono-brutal text-zinc-400 relative z-10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#ccff00]" />
                  <span>Harap tunjukkan kartu identitas mahasiswa (KTM) kepada petugas loket.</span>
                </div>
                <div className="text-[#00e5ff] font-bold">
                  {highlightCall?.calledAt
                    ? `Dipanggil: ${new Date(highlightCall.calledAt).toLocaleTimeString('id-ID')} WIB`
                    : 'Siap Melayani'}
                </div>
              </div>
            </div>
          </section>

          {/* SIDEBAR: 5 PANGGILAN TERAKHIR */}
          <aside className="lg:col-span-4 flex flex-col">
            <div className="neo-box border-3 border-black bg-[#131621] p-5 flex-1 flex flex-col neo-shadow-md">
              <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#00e5ff] text-black border border-black font-bold">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-black uppercase text-white tracking-tight">
                    Riwayat Panggilan
                  </h2>
                </div>
                <span className="text-[11px] font-mono-brutal text-[#00e5ff] font-bold">
                  5 TERAKHIR
                </span>
              </div>

              {panggilanTerbaru.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 font-mono-brutal text-xs">
                  <Clock className="w-8 h-8 mb-2 text-zinc-600" />
                  <span>Belum ada riwayat pemanggilan hari ini.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto pr-1">
                  {panggilanTerbaru.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-[#0b0d13] border-2 border-[#282f40] p-3 flex items-center justify-between hover:border-[#ccff00] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-[#1f2533] border border-black text-xs font-mono-brutal font-bold text-zinc-400 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xl font-black font-mono-brutal text-[#ccff00] leading-none">
                            {item.nomorDisplay}
                          </div>
                          <span className="text-[11px] text-zinc-400 font-medium">
                            {loketList.find((l) => l.layanan.id === item.layananId)?.layanan.nama ||
                              'Loket Pelayanan'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-mono-brutal text-zinc-400 block">
                          {item.calledAt
                            ? new Date(item.calledAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              }) + ' WIB'
                            : '-'}
                        </span>
                        <span className="neo-badge bg-[#1e2433] text-zinc-300 text-[9px] py-0 px-1.5 border-black mt-0.5">
                          {item.status?.toUpperCase() || 'DIPANGGIL'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* SECTION 2: GRID SEMUA LOKET PELAYANAN */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-3 border-black pb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#00e5ff] text-black border-2 border-black flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                Status Antrean Semua Loket
              </h2>
            </div>
            <span className="text-xs font-mono-brutal text-zinc-400">
              {loketList.length} Loket Aktif Melayani
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loketList.map((loketItem) => {
              const currentTicket = getLoketCurrentTicket(loketItem);
              const isCalling = !!loketItem.sedangDipanggil;
              const isServing = !!loketItem.sedangDilayani;

              return (
                <div
                  key={loketItem.layanan.id}
                  className={`neo-box p-5 flex flex-col justify-between ${
                    isCalling
                      ? 'border-3 border-[#ccff00] bg-[#151a24] neo-shadow-lime'
                      : isServing
                      ? 'border-3 border-[#00e5ff] bg-[#131722] neo-shadow-cyan'
                      : 'border-2 border-[#2b3347] bg-[#11141c] neo-shadow-sm'
                  }`}
                >
                  {/* Card Header: Loket Title & Code */}
                  <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="neo-badge bg-[#ccff00] text-black border-black text-[10px] font-black">
                          LOKET {loketItem.layanan.prefixNomor}
                        </span>
                        <span className="text-[11px] font-mono-brutal text-zinc-400 uppercase">
                          KODE: {loketItem.layanan.kode}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white uppercase mt-1 leading-snug">
                        {loketItem.layanan.nama}
                      </h3>
                    </div>

                    <div className="shrink-0">
                      {isCalling ? (
                        <span className="neo-badge bg-[#ccff00] text-black border-black font-black text-[10px] animate-pulse">
                          DIPANGGIL
                        </span>
                      ) : isServing ? (
                        <span className="neo-badge bg-[#00e5ff] text-black border-black font-black text-[10px]">
                          DILAYANI
                        </span>
                      ) : (
                        <span className="neo-badge bg-[#242b3b] text-zinc-300 border-black text-[10px]">
                          SIAP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Number Display in Box */}
                  <div className="my-5 bg-[#090b10] border-2 border-[#232938] p-4 text-center">
                    <span className="text-[10px] font-mono-brutal uppercase text-zinc-400 tracking-wider block">
                      Nomor Sedang Diproses
                    </span>
                    <div
                      className={`text-5xl sm:text-6xl font-black font-mono-brutal tracking-tight mt-1 ${
                        currentTicket
                          ? isCalling
                            ? 'text-[#ccff00]'
                            : 'text-[#00e5ff]'
                          : 'text-zinc-600'
                      }`}
                    >
                      {currentTicket?.nomorDisplay || '---'}
                    </div>
                  </div>

                  {/* Card Footer: Counters for Waiting & Done */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-black font-mono-brutal">
                    <div className="bg-[#181d28] border border-black p-2 text-center">
                      <span className="text-[10px] uppercase text-zinc-400 block">Menunggu</span>
                      <strong className="text-lg font-black text-white">
                        {loketItem.jumlahMenunggu}{' '}
                        <span className="text-[10px] font-normal text-zinc-400">org</span>
                      </strong>
                    </div>

                    <div className="bg-[#181d28] border border-black p-2 text-center">
                      <span className="text-[10px] uppercase text-zinc-400 block">Selesai</span>
                      <strong className="text-lg font-black text-[#10b981]">
                        {loketItem.jumlahSelesai}{' '}
                        <span className="text-[10px] font-normal text-zinc-400">org</span>
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* BOTTOM TICKER / MARQUEE ANNOUNCEMENT BAR */}
      <footer className="border-t-4 border-black bg-[#ccff00] text-black overflow-hidden py-2 font-mono-brutal font-black text-xs sm:text-sm uppercase tracking-wider relative z-30 shadow-lg">
        <div className="flex items-center">
          <div className="bg-black text-[#ccff00] px-4 py-1 border-r-2 border-black shrink-0 flex items-center gap-2 z-10">
            <Flame className="w-4 h-4 animate-bounce text-[#ccff00]" />
            <span>INFO KAMPUS</span>
          </div>

          <div className="overflow-hidden flex-1 relative whitespace-nowrap">
            <div className="animate-marquee inline-block font-bold">
              <span className="mx-6">
                SELAMAT DATANG DI LAYANAN ADMINISTRASI TERPADU MAHASISWA
              </span>
              <span className="mx-6">●</span>
              <span className="mx-6">
                HARAP MENYIAPKAN KARTU TANDA MAHASISWA (KTM) DAN DOKUMEN PERSYARATAN
              </span>
              <span className="mx-6">●</span>
              <span className="mx-6">
                AMBIL NOMOR ANTREAN ONLINE SECARA MANDIRI MELALUI PORTAL MAHASISWA (SCAN QR PADA BROSUR
                ATAU KUNJUNGI PORTAL)
              </span>
              <span className="mx-6">●</span>
              <span className="mx-6">
                DENGARKAN NAMA DAN NOMOR ANTREAN DENGAN SAKSAMA KETIKA PEMANGGILAN DIMULAI
              </span>
              <span className="mx-6">●</span>
              <span className="mx-6">
                JAM OPERASIONAL PELAYANAN LOKET: SENIN - JUMAT 08:00 - 16:00 WIB
              </span>
            </div>
          </div>

          <div className="bg-black text-white px-3 py-1 border-l-2 border-black shrink-0 hidden sm:flex items-center gap-1 z-10">
            <Link to="/" className="text-[#ccff00] hover:underline flex items-center gap-1 text-xs">
              <span>Ke Form Mahasiswa</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
