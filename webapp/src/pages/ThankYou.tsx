import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const ThankYou: React.FC = () => {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '1.5rem' }}>
      <div style={{ color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2rem', borderRadius: '50%', marginBottom: '1rem' }}>
        <CheckCircle size={64} />
      </div>
      <h2 style={{ fontSize: '2.5rem', color: 'var(--text-main)' }}>Terima Kasih!</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', lineHeight: 1.6 }}>
        Masukan Anda telah berhasil dikirimkan dan akan sangat berguna dalam penyusunan Kurikulum 2025 Prodi Teknologi Rekayasa Robotika Polibatam.
      </p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: '2rem' }}>
        Kembali ke Beranda
      </Link>
    </div>
  );
};

export default ThankYou;
