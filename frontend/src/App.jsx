import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AmbilAntreanPage from './pages/AmbilAntreanPage';
import DisplayPage from './pages/DisplayPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Halaman Utama: Form Ambil Antrean Mahasiswa */}
        <Route path="/" element={<AmbilAntreanPage />} />

        {/* Halaman Tampilan TV Publik / Digital Signage Monitor */}
        <Route path="/display" element={<DisplayPage />} />

        {/* Halaman Dashboard Petugas & Operator Loket */}
        <Route path="/admin" element={<AdminPage />} />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
