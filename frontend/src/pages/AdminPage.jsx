import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Volume2,
  CheckCircle,
  SkipForward,
  RotateCcw,
  Building2,
  LogOut,
  Key,
  Users,
  Clock,
  Sparkles,
  Radio,
  ArrowRight,
  Shield,
  Activity,
  Layers,
  AlertCircle,
  CheckCircle2,
  Monitor,
  BellRing,
  RefreshCw,
  UserCheck,
  FileText,
} from 'lucide-react';
import {
  loginPetugas,
  getPetugasMe,
  assignLoketPetugas,
  getAntreanLoket,
  panggilBerikutnya,
  panggilUlangAntrean,
  mulaiLayaniAntrean,
  selesaiAntrean,
  lewatiAntrean,
  fetchLayanan,
} from '../lib/api';
import { socket } from '../lib/socket';

const AUTH_TOKEN_KEY = 'kampus_petugas_token';

export default function AdminPage() {
  // Auth state
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Loket & Operational state
  const [daftarLayanan, setDaftarLayanan] = useState([]);
  const [selectedLayananId, setSelectedLayananId] = useState(null);
  const [sedangDiproses, setSedangDiproses] = useState(null);
  const [daftarMenunggu, setDaftarMenunggu] = useState([]);
  const [totalMenunggu, setTotalMenunggu] = useState(0);

  // UI state
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [catatanText, setCatatanText] = useState('');

  // 1. Fetch current profile if token exists
  const loadProfile = useCallback(async (authToken) => {
    try {
      setAuthLoading(true);
      const user = await getPetugasMe(authToken);
      setCurrentUser(user);
      if (user.layananId) {
        setSelectedLayananId(user.layananId);
      }
    } catch (err) {
      console.warn('Session expired or invalid:', err);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setToken('');
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // 2. Fetch list of services
  const loadLayananList = useCallback(async () => {
    try {
      const list = await fetchLayanan();
      setDaftarLayanan(list);
      if (!selectedLayananId && list.length > 0) {
        setSelectedLayananId(list[0].id);
      }
    } catch (err) {
      console.warn('Failed to load services:', err);
    }
  }, [selectedLayananId]);

  // 3. Fetch loket queue status
  const loadLoketQueue = useCallback(async (authToken) => {
    if (!authToken) return;
    try {
      const data = await getAntreanLoket(authToken);
      setSedangDiproses(data.sedangDiproses);
      setDaftarMenunggu(data.daftarMenunggu || []);
      setTotalMenunggu(data.totalMenunggu || 0);
    } catch (err) {
      console.warn('Failed to load loket queue:', err);
    }
  }, []);

  // Initialize
  useEffect(() => {
    loadLayananList();
    if (token) {
      loadProfile(token);
    }
  }, [token, loadProfile, loadLayananList]);

  // Load queue whenever token or user is ready
  useEffect(() => {
    if (token && currentUser) {
      loadLoketQueue(token);
    }
  }, [token, currentUser, loadLoketQueue]);

  // 4. Socket.io Real-Time Synchronization
  useEffect(() => {
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    const handleQueueUpdate = () => {
      if (token && currentUser) {
        loadLoketQueue(token);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('queue:updated', handleQueueUpdate);
    socket.on('antrean:baru', handleQueueUpdate);
    socket.on('antrean:dipanggil', handleQueueUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('queue:updated', handleQueueUpdate);
      socket.off('antrean:baru', handleQueueUpdate);
      socket.off('antrean:dipanggil', handleQueueUpdate);
    };
  }, [token, currentUser, loadLoketQueue]);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMsg('Masukkan email dan password petugas.');
      return;
    }

    setErrorMsg('');
    setAuthLoading(true);
    try {
      const result = await loginPetugas(loginEmail, loginPassword);
      setToken(result.token);
      localStorage.setItem(AUTH_TOKEN_KEY, result.token);
      setCurrentUser(result.user);
      if (result.user.layananId) {
        setSelectedLayananId(result.user.layananId);
      }
      setSuccessMsg(`Selamat datang, ${result.user.nama}!`);
    } catch (err) {
      setErrorMsg(err.message || 'Email atau password salah.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick Demo Login helper
  const handleQuickLogin = (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken('');
    setCurrentUser(null);
    setSedangDiproses(null);
    setDaftarMenunggu([]);
    setSuccessMsg('Anda telah keluar dari dashboard petugas.');
  };

  // Switch / Assign Loket
  const handleSelectLoket = async (layananId) => {
    if (!token) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      await assignLoketPetugas(layananId, token);
      setSelectedLayananId(layananId);
      await loadProfile(token);
      await loadLoketQueue(token);
      setSuccessMsg('Berhasil beralih loket pelayanan.');
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengubah loket.');
    } finally {
      setActionLoading(false);
    }
  };

  // ACTION: PANGGIL ANTREAN BERIKUTNYA
  const handlePanggilBerikutnya = async () => {
    if (!token) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const called = await panggilBerikutnya(token, selectedLayananId);
      setSuccessMsg(`Nomor antrean ${called.nomorDisplay} berhasil dipanggil!`);
      await loadLoketQueue(token);
    } catch (err) {
      setErrorMsg(err.message || 'Tidak ada antrean yang sedang menunggu.');
    } finally {
      setActionLoading(false);
    }
  };

  // ACTION: PANGGIL ULANG
  const handlePanggilUlang = async (antreanId) => {
    if (!token || !antreanId) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      await panggilUlangAntrean(token, antreanId);
      setSuccessMsg(`Panggilan ulang untuk nomor ${sedangDiproses?.nomorDisplay} telah dikirim ke TV Display.`);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memanggil ulang antrean.');
    } finally {
      setActionLoading(false);
    }
  };

  // ACTION: MULAI LAYANI
  const handleMulaiLayani = async (antreanId) => {
    if (!token || !antreanId) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      await mulaiLayaniAntrean(token, antreanId);
      setSuccessMsg(`Antrean ${sedangDiproses?.nomorDisplay} kini berstatus sedang dilayani.`);
      await loadLoketQueue(token);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengubah status antrean.');
    } finally {
      setActionLoading(false);
    }
  };

  // ACTION: SELESAIKAN
  const handleSelesaikan = async (antreanId) => {
    if (!token || !antreanId) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      await selesaiAntrean(token, antreanId, catatanText);
      setSuccessMsg(`Pelayanan untuk antrean ${sedangDiproses?.nomorDisplay} telah selesai.`);
      setCatatanText('');
      await loadLoketQueue(token);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyelesaikan antrean.');
    } finally {
      setActionLoading(false);
    }
  };

  // ACTION: LEWATI
  const handleLewati = async (antreanId) => {
    if (!token || !antreanId) return;
    const confirmSkip = window.confirm(
      `Apakah Anda yakin ingin melewati nomor ${sedangDiproses?.nomorDisplay}? Mahasiswa dianggap tidak hadir.`
    );
    if (!confirmSkip) return;

    setActionLoading(true);
    setErrorMsg('');
    try {
      await lewatiAntrean(token, antreanId, 'Mahasiswa tidak hadir saat dipanggil.');
      setSuccessMsg(`Antrean ${sedangDiproses?.nomorDisplay} telah dilewati.`);
      await loadLoketQueue(token);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal melewati antrean.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-[#f4f4f5] flex flex-col font-sans selection:bg-[#ccff00] selection:text-black">
      {/* Top Navigation Bar */}
      <header className="border-b-4 border-black bg-[#12141a] px-4 sm:px-8 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ccff00] border-2 border-black flex items-center justify-center neo-shadow-sm shrink-0">
              <Shield className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono-brutal font-bold text-[#ccff00] tracking-widest uppercase">
                  DASHBOARD PETUGAS & ADMIN
                </span>
                <span className="w-2 h-2 rounded-full bg-[#ccff00] animate-ping" />
              </div>
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                Konsol Operasional Loket Kampus
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Socket Status Badge */}
            <div
              className={`neo-badge border-2 border-black text-[10px] ${
                socketConnected
                  ? 'bg-[#153412] text-[#ccff00] border-[#ccff00]'
                  : 'bg-[#351010] text-[#f87171] border-[#ef4444]'
              }`}
            >
              <Radio className={`w-3 h-3 mr-1 ${socketConnected ? 'animate-pulse text-[#ccff00]' : ''}`} />
              <span>{socketConnected ? 'SOCKET.IO ONLINE' : 'OFFLINE'}</span>
            </div>

            <Link
              to="/display"
              target="_blank"
              className="neo-btn neo-btn-cyan text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold"
              title="Buka TV Publik di tab baru"
            >
              <Monitor className="w-3.5 h-3.5 text-black" />
              <span className="hidden sm:inline">Layar TV Publik</span>
            </Link>

            {currentUser && (
              <button
                onClick={handleLogout}
                className="neo-btn neo-btn-dark text-xs py-1.5 px-3 flex items-center gap-1.5 text-red-300 hover:text-white"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Global Alert Messages */}
        {errorMsg && (
          <div className="neo-box border-2 border-red-500 bg-[#251014] text-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="block font-bold uppercase tracking-wider text-red-400">Peringatan:</strong>
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
              <strong className="block font-bold uppercase tracking-wider text-[#ccff00]">Sukses:</strong>
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

        {/* VIEW 1: LOGIN FORM IF NOT AUTHENTICATED */}
        {!token || !currentUser ? (
          <div className="max-w-md w-full mx-auto my-auto flex flex-col gap-6 animate-fadeIn py-6">
            <div className="neo-box border-4 border-black bg-[#141722] p-6 sm:p-8 neo-shadow-lime-lg relative">
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#ccff00]" />

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#ccff00] border-2 border-black flex items-center justify-center mx-auto mb-3 neo-shadow-sm">
                  <Key className="w-6 h-6 text-black" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                  Login Petugas Loket
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Masuk dengan kredensial staf kampus untuk mengelola dan memanggil antrean.
                </p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-mono-brutal uppercase text-zinc-300 block mb-1.5 font-bold">
                    Email Staf
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="petugas1@kampus.ac.id"
                    required
                    className="w-full bg-[#0b0c10] border-2 border-[#2c3345] px-4 py-2.5 text-sm text-white focus:border-[#ccff00] focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono-brutal uppercase text-zinc-300 block mb-1.5 font-bold">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-[#0b0c10] border-2 border-[#2c3345] px-4 py-2.5 text-sm text-white focus:border-[#ccff00] focus:outline-none font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full neo-btn neo-btn-lime py-3 text-sm font-black flex items-center justify-center gap-2 mt-2 neo-shadow-sm"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>MEMVERIFIKASI...</span>
                    </>
                  ) : (
                    <>
                      <span>MASUK KE DASHBOARD</span>
                      <ArrowRight className="w-4 h-4 text-black" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Login Preset Buttons */}
              <div className="mt-6 pt-5 border-t-2 border-[#252b3b]">
                <span className="text-[10px] font-mono-brutal uppercase text-zinc-400 block text-center mb-2 font-bold">
                  Akun Demo Uji Coba Cepat:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('petugas1@kampus.ac.id', 'petugas123')}
                    className="neo-btn neo-btn-dark text-[11px] py-1.5 px-2 text-center"
                  >
                    Loket A (Budi)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('petugas2@kampus.ac.id', 'petugas223')}
                    className="neo-btn neo-btn-dark text-[11px] py-1.5 px-2 text-center"
                  >
                    Loket B (Siti)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@kampus.ac.id', 'admin123')}
                    className="neo-btn neo-btn-dark text-[11px] py-1.5 px-2 text-center col-span-2 text-[#00e5ff]"
                  >
                    Admin Utama (admin123)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: LOGGED-IN STAFF OPERATIONAL CONSOLE */
          <div className="flex flex-col gap-6 animate-fadeIn">
            {/* Top Bar: Petugas Identity & Loket Selector */}
            <div className="neo-box border-3 border-black bg-[#131622] p-5 neo-shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#202738] border-2 border-black flex items-center justify-center font-bold text-white shrink-0">
                  <UserCheck className="w-6 h-6 text-[#ccff00]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="neo-badge bg-[#ccff00] text-black border-black text-[10px] font-black">
                      {currentUser.role?.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono-brutal text-zinc-400">
                      ID: #{currentUser.id}
                    </span>
                  </div>
                  <h2 className="text-lg font-black uppercase text-white mt-0.5">
                    {currentUser.nama}
                  </h2>
                </div>
              </div>

              {/* Loket Selector Pills */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-mono-brutal text-zinc-400 uppercase font-bold shrink-0">
                  Loket Anda:
                </span>
                <div className="flex flex-wrap gap-2">
                  {daftarLayanan.map((lay) => {
                    const isCurrent = selectedLayananId === lay.id;
                    return (
                      <button
                        key={lay.id}
                        onClick={() => handleSelectLoket(lay.id)}
                        disabled={actionLoading}
                        className={`neo-btn text-xs py-1.5 px-3 ${
                          isCurrent
                            ? 'neo-btn-lime'
                            : 'neo-btn-dark text-zinc-300'
                        }`}
                      >
                        Loket {lay.prefixNomor} ({lay.nama.split(' ')[0]})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* THE BIG HERO BUTTON: PANGGIL ANTREAN BERIKUTNYA */}
            <section className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handlePanggilBerikutnya}
                disabled={actionLoading || totalMenunggu === 0}
                className={`w-full p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 neo-btn border-4 border-black transition-all ${
                  totalMenunggu > 0
                    ? 'neo-btn-lime neo-shadow-lime-lg animate-pulse'
                    : 'bg-[#181d28] text-zinc-500 border-[#2f384d] cursor-not-allowed opacity-75'
                }`}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-14 h-14 bg-black text-[#ccff00] border-3 border-black flex items-center justify-center shrink-0">
                    <Megaphone className="w-8 h-8 text-[#ccff00] animate-bounce" />
                  </div>
                  <div>
                    <span className="text-xs font-mono-brutal font-black uppercase tracking-widest text-black/80 block">
                      TINDAKAN UTAMA OPERATOR
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-black">
                      PANGGIL ANTREAN BERIKUTNYA
                    </h2>
                  </div>
                </div>

                <div className="bg-black text-[#ccff00] border-2 border-black px-5 py-3 font-mono-brutal text-center shrink-0 neo-shadow-sm">
                  <span className="text-[10px] uppercase block tracking-wider text-zinc-400">
                    Antrean Menunggu
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-[#ccff00]">
                    {totalMenunggu}{' '}
                    <span className="text-xs font-normal text-zinc-300">Orang</span>
                  </div>
                </div>
              </button>
              {totalMenunggu === 0 && (
                <span className="text-center text-xs font-mono-brutal text-zinc-500">
                  Tidak ada antrean yang sedang menunggu untuk loket ini.
                </span>
              )}
            </section>

            {/* TWO-COLUMN OPERATIONAL DASHBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN (7 Cols): TIKET SEDANG DIPANGGIL / DILAYANI */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="neo-box border-3 border-black bg-[#121622] p-6 neo-shadow-md flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#ccff00]" />
                        <h3 className="text-base font-black uppercase text-white tracking-tight">
                          Antrean Saat Ini di Meja Pelayanan
                        </h3>
                      </div>
                      <span className="text-xs font-mono-brutal text-zinc-400 uppercase">
                        STATUS MEJA
                      </span>
                    </div>

                    {sedangDiproses ? (
                      <div className="flex flex-col gap-4">
                        {/* Status Pill */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`neo-badge text-xs font-black ${
                              sedangDiproses.status === 'dipanggil'
                                ? 'bg-[#ccff00] text-black border-black animate-pulse'
                                : 'bg-[#00e5ff] text-black border-black'
                            }`}
                          >
                            {sedangDiproses.status === 'dipanggil'
                              ? '🔔 SEDANG DIPANGGIL KE LOKET'
                              : '⚡ SEDANG DILAYANI'}
                          </span>
                          <span className="text-xs font-mono-brutal text-zinc-400">
                            {sedangDiproses.calledAt
                              ? new Date(sedangDiproses.calledAt).toLocaleTimeString('id-ID') + ' WIB'
                              : '-'}
                          </span>
                        </div>

                        {/* Huge Number */}
                        <div className="bg-[#0b0d13] border-3 border-black p-6 text-center neo-shadow-sm">
                          <span className="text-xs font-mono-brutal uppercase text-zinc-400 block">
                            Nomor Antrean
                          </span>
                          <div className="text-6xl sm:text-7xl font-black font-mono-brutal text-[#ccff00] tracking-tight my-1">
                            {sedangDiproses.nomorDisplay}
                          </div>
                          <div className="text-sm font-bold text-white">
                            {sedangDiproses.namaPemilik || 'Mahasiswa (Tanpa Nama)'}
                          </div>
                          <span className="text-xs font-mono-brutal text-[#00e5ff] mt-0.5 block">
                            Kode: {sedangDiproses.bookingCode}
                          </span>
                        </div>

                        {/* Catatan Field */}
                        <div>
                          <label className="text-[11px] font-mono-brutal uppercase text-zinc-400 block mb-1">
                            Catatan Pelayanan (Opsional)
                          </label>
                          <input
                            type="text"
                            value={catatanText}
                            onChange={(e) => setCatatanText(e.target.value)}
                            placeholder="Contoh: Dokumen ijazah legalisir 3 rangkap selesai."
                            className="w-full bg-[#0a0c12] border-2 border-[#2b3347] px-3 py-2 text-xs text-white focus:border-[#ccff00] focus:outline-none"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t-2 border-[#262e42]">
                          <button
                            type="button"
                            onClick={() => handlePanggilUlang(sedangDiproses.id)}
                            disabled={actionLoading}
                            className="neo-btn neo-btn-cyan text-xs py-2 px-2 flex flex-col items-center justify-center gap-1"
                            title="Bunyikan kembali suara pemanggilan di TV Display"
                          >
                            <Volume2 className="w-4 h-4 text-black" />
                            <span>Panggil Ulang</span>
                          </button>

                          {sedangDiproses.status === 'dipanggil' && (
                            <button
                              type="button"
                              onClick={() => handleMulaiLayani(sedangDiproses.id)}
                              disabled={actionLoading}
                              className="neo-btn neo-btn-lime text-xs py-2 px-2 flex flex-col items-center justify-center gap-1"
                            >
                              <UserCheck className="w-4 h-4 text-black" />
                              <span>Mulai Layani</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSelesaikan(sedangDiproses.id)}
                            disabled={actionLoading}
                            className="neo-btn text-xs py-2 px-2 bg-[#10b981] hover:bg-[#059669] text-black border-2 border-black flex flex-col items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4 text-black" />
                            <span>Selesaikan</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLewati(sedangDiproses.id)}
                            disabled={actionLoading}
                            className="neo-btn text-xs py-2 px-2 bg-red-950 hover:bg-red-900 text-red-200 border-2 border-red-500 flex flex-col items-center justify-center gap-1"
                          >
                            <SkipForward className="w-4 h-4 text-red-400" />
                            <span>Lewati</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-zinc-500 font-mono-brutal text-sm flex flex-col items-center justify-center gap-2">
                        <Clock className="w-10 h-10 text-zinc-600 mb-1" />
                        <strong className="text-white text-base">Loket Sedang Kosong</strong>
                        <span>Klik tombol kuning di atas untuk memanggil mahasiswa berikutnya.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (5 Cols): DAFTAR ANTREAN MENUNGGU (Live Table) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="neo-box border-3 border-black bg-[#131622] p-5 neo-shadow-md flex-1 flex flex-col">
                  <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#00e5ff]" />
                      <h3 className="text-base font-black uppercase text-white tracking-tight">
                        Antrean Menunggu
                      </h3>
                    </div>
                    <span className="neo-badge bg-[#242b3b] text-zinc-300 text-[10px]">
                      {totalMenunggu} ORANG
                    </span>
                  </div>

                  {daftarMenunggu.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 font-mono-brutal text-xs">
                      <CheckCircle2 className="w-8 h-8 text-zinc-600 mb-2" />
                      <span>Semua antrean loket ini telah selesai atau belum ada antrean baru.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {daftarMenunggu.map((item, idx) => (
                        <div
                          key={item.id}
                          className="bg-[#0b0d13] border-2 border-[#2b3347] p-3 flex items-center justify-between hover:border-[#ccff00] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 bg-[#1f2638] border border-black text-xs font-mono-brutal font-bold text-zinc-300 flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="text-lg font-black font-mono-brutal text-[#ccff00]">
                                {item.nomorDisplay}
                              </div>
                              <span className="text-[11px] text-zinc-400 block truncate max-w-[150px]">
                                {item.namaPemilik || 'Mahasiswa (Anonim)'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-mono-brutal text-zinc-400 block">
                              {new Date(item.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              WIB
                            </span>
                            <span className="text-[9px] font-mono-brutal text-[#00e5ff] uppercase font-bold">
                              {item.bookingCode}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-[#0d0f14] px-4 py-4 text-center text-xs text-zinc-500 font-mono-brutal">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Admin Operator Kampus © 2026 — Socket.io Real-Time System</span>
          <div className="flex items-center gap-4 text-zinc-400">
            <Link to="/" className="hover:text-[#ccff00] underline">
              Portal Mahasiswa
            </Link>
            <Link to="/display" className="hover:text-[#ccff00] underline">
              Layar TV Publik
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
