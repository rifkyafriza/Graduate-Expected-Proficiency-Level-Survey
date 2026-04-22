import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, Briefcase } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const packages = [
    { id: 'P1', title: 'Pengguna Lulusan', icon: <Briefcase size={32} />, desc: 'Untuk HRD, Supervisor, atau Manajer industri.', color: 'var(--primary)' },
    { id: 'P2', title: 'Alumni', icon: <GraduationCap size={32} />, desc: 'Untuk lulusan Sarjana Terapan TRR.', color: 'var(--accent)' },
    { id: 'P3', title: 'Dosen', icon: <Users size={32} />, desc: 'Untuk tenaga pengajar program studi.', color: '#8b5cf6' }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem', paddingTop: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '800px' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Selamat Datang di Survei Validasi Kurikulum
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.6 }}>
          Survei ini merupakan bagian dari proses Revisi Kurikulum 5-Tahunan Program Studi Sarjana Terapan Teknologi Rekayasa Robotika Politeknik Negeri Batam.
          Pilih profil Anda untuk mulai mengisi survei.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%' }}>
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            className="glass-panel"
            onClick={() => navigate(`/survey/${pkg.id}`)}
            style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '1rem',
              textAlign: 'left',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = `0 10px 25px -5px ${pkg.color}33`;
              e.currentTarget.style.borderColor = pkg.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <div style={{ background: `${pkg.color}22`, color: pkg.color, padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
              {pkg.icon}
            </div>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>{pkg.title}</h3>
            <p style={{ color: 'var(--text-muted)' }}>{pkg.desc}</p>
            <div style={{ marginTop: 'auto', paddingTop: '1rem', color: pkg.color, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Mulai Survei &rarr;
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Home;
