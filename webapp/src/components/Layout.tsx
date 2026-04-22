import React from 'react';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <header style={{
        padding: '1.5rem 2rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          background: 'var(--primary)',
          padding: '0.5rem',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <BookOpen size={24} color="white" />
        </div>
        <div>
          <Link to="/">
            <h1 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>Validasi Kurikulum TRR 2025</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Politeknik Negeri Batam</p>
          </Link>
        </div>
      </header>
      
      <main style={{
        flex: 1,
        padding: '2rem',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </main>
      
      <footer style={{
        padding: '2rem',
        textAlign: 'center',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        fontSize: '0.875rem'
      }}>
        <p>&copy; 2025 Program Studi Teknologi Rekayasa Robotika - Politeknik Negeri Batam. All rights reserved.</p>
      </footer>
    </>
  );
};

export default Layout;
