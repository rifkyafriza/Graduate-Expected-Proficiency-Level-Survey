import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { CircularProgress } from '@mui/material';
import surveysJsonData from '../data/surveys.json';
import { supabase } from '../lib/supabase';

const bloomLevels = [
  { id: 'C1', name: 'Mengingat' },
  { id: 'C2', name: 'Memahami' },
  { id: 'C3', name: 'Menerapkan' },
  { id: 'C4', name: 'Menganalisis' },
  { id: 'C5', name: 'Mengevaluasi' },
  { id: 'C6', name: 'Mencipta' }
];

const gapScales = [
  { id: '-', label: '- (Lower)', color: '#ef4444' },
  { id: '0', label: '0 (Normal)', color: '#3b82f6' },
  { id: '+', label: '+ (Higher)', color: '#10b981' }
];

const Survey: React.FC = () => {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [surveysData] = useState<any[]>(surveysJsonData as any[]);
  const [loading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentStep = parseInt(searchParams.get('step') || '0', 10);

  // State to hold answers
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
  const [respondentData, setRespondentData] = useState({
    name: '',
    email: '',
    institution: '',
    graduationYear: '',
    position: '',
    industry_sector: '',
    ever_recruited: '',
    current_status: '',
    job_sector: '',
    waiting_time: '',
    nidn: '',
    expertise: '',
    courses: '',
    teaching_duration: ''
  });
  const [initializedPackage, setInitializedPackage] = useState<string | null>(null);

  // Ref for auto-scroll
  const topRef = useRef<HTMLDivElement>(null);

  const survey = surveysData.find(s => s.id === packageId);

  useEffect(() => {
    if (!loading && !survey) {
      navigate('/');
    } else if (survey && initializedPackage !== packageId) {
      // Pre-populate gap answers to '0'
      const initialAnswers: Record<string, any> = {};
      if (survey.sections) {
        survey.sections.forEach((sec: any) => {
          initialAnswers[sec.id] = { questions: {} };
          if (sec.questions) {
            sec.questions.forEach((q: any) => {
              initialAnswers[sec.id].questions[q.id] = '0';
            });
          }
        });
      }
      const saved = sessionStorage.getItem(`survey_draft_${packageId}`);
      let parsed = null;
      if (saved) {
        try { parsed = JSON.parse(saved); } catch (e) { }
      }

      if (parsed) {
        setAnswers(parsed.answers || initialAnswers);
        setOpenAnswers(parsed.openAnswers || {});
        setRespondentData(parsed.respondentData || {
          name: '', email: '', institution: '', graduationYear: '',
          position: '', industry_sector: '', ever_recruited: '',
          current_status: '', job_sector: '', waiting_time: '',
          nidn: '', expertise: '', courses: '', teaching_duration: ''
        });
      } else {
        setAnswers(initialAnswers);
        setOpenAnswers({});
        setRespondentData({
          name: '', email: '', institution: '', graduationYear: '',
          position: '', industry_sector: '', ever_recruited: '',
          current_status: '', job_sector: '', waiting_time: '',
          nidn: '', expertise: '', courses: '', teaching_duration: ''
        });
      }

      if (packageId) {
        setInitializedPackage(packageId);
      }
    }
  }, [loading, survey, navigate, packageId, initializedPackage]);

  useEffect(() => {
    if (initializedPackage === packageId) {
      sessionStorage.setItem(`survey_draft_${packageId}`, JSON.stringify({
        answers,
        openAnswers,
        respondentData
      }));
    }
  }, [answers, openAnswers, respondentData, packageId, initializedPackage]);

  useEffect(() => {
    const scrollTo = searchParams.get('scrollTo');
    if (scrollTo) {
      setTimeout(() => {
        const el = document.getElementById(scrollTo);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'box-shadow 0.3s';
          el.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.5)';
          setTimeout(() => {
            el.style.boxShadow = 'none';
          }, 2000);
          
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('scrollTo');
          setSearchParams(newParams, { replace: true });
        }
      }, 150);
    }
  }, [searchParams, setSearchParams]);

  const groupedSections = useMemo(() => {
    if (!survey || !survey.sections) return [];
    const groups: Record<string, any[]> = {};
    survey.sections.forEach((sec: any) => {
      const majorId = sec.id.split('.')[0];
      if (!groups[majorId]) groups[majorId] = [];
      groups[majorId].push(sec);
    });
    return Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map(key => ({
      id: key,
      sections: groups[key]
    }));
  }, [survey]);

  if (loading || !survey) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  const totalSteps = 1 + groupedSections.length;
  const isFinalStep = currentStep === totalSteps - 1;

  const handleNext = async () => {
    let missingStep = -1;
    let missingId = '';
    let alertMsg = '';

    const validateIdentitas = () => {
      if (!respondentData.name) return { id: 'identitas-name', msg: 'Mohon isi Nama Lengkap' };
      if (packageId !== 'P3' && !respondentData.email) return { id: 'identitas-email', msg: 'Mohon isi Email' };
      if (packageId === 'P1') {
        if (!respondentData.position) return { id: 'identitas-position', msg: 'Mohon isi Jabatan / Posisi' };
        if (!respondentData.institution) return { id: 'identitas-institution', msg: 'Mohon isi Nama Perusahaan' };
        if (!respondentData.industry_sector) return { id: 'identitas-industry_sector', msg: 'Mohon isi Bidang Industri' };
        if (!respondentData.ever_recruited) return { id: 'identitas-ever_recruited', msg: 'Mohon isi status Rekrut Alumni' };
      }
      if (packageId === 'P2') {
        if (!respondentData.graduationYear) return { id: 'identitas-graduationYear', msg: 'Mohon isi Tahun Kelulusan' };
        if (!respondentData.current_status) return { id: 'identitas-current_status', msg: 'Mohon isi Status Saat Ini' };
        if (!respondentData.job_sector) return { id: 'identitas-job_sector', msg: 'Mohon isi Bidang Pekerjaan' };
        if (!respondentData.institution) return { id: 'identitas-institution', msg: 'Mohon isi Perusahaan tempat bekerja saat ini' };
        if (!respondentData.position) return { id: 'identitas-position', msg: 'Mohon isi Jabatan / Posisi' };
        if (!respondentData.waiting_time) return { id: 'identitas-waiting_time', msg: 'Mohon isi Masa Tunggu Kerja' };
      }
      if (packageId === 'P3') {
        if (!respondentData.expertise) return { id: 'identitas-expertise', msg: 'Mohon isi Bidang Keahlian Utama' };
        if (!respondentData.courses) return { id: 'identitas-courses', msg: 'Mohon isi MK yang Diampu' };
        if (!respondentData.teaching_duration) return { id: 'identitas-teaching_duration', msg: 'Mohon isi Lama Mengajar' };
      }
      return null;
    };

    const validateGroup = (gIdx: number) => {
      const group = groupedSections[gIdx];
      for (const sec of group.sections) {
        if (!answers[sec.id]?.bloom) {
          return { id: `bloom-${sec.id}`, msg: `Mohon pilih Target Level (C1-C6) untuk bagian ${sec.id}` };
        }
        if (sec.open_questions) {
          for (const q of sec.open_questions) {
            if (!openAnswers[q.id]?.trim()) {
              return { id: `open-${q.id}`, msg: `Mohon jawab pertanyaan terbuka ${q.id}` };
            }
          }
        }
      }
      return null;
    };

    if (!isFinalStep) {
      if (currentStep === 0) {
        const err = validateIdentitas();
        if (err) { missingStep = 0; missingId = err.id; alertMsg = err.msg; }
      } else {
        const err = validateGroup(currentStep - 1);
        if (err) { missingStep = currentStep; missingId = err.id; alertMsg = err.msg; }
      }

      if (missingStep !== -1) {
        alert(alertMsg);
        document.getElementById(missingId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        const el = document.getElementById(missingId);
        if (el) {
          el.style.transition = 'box-shadow 0.3s';
          el.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.5)';
          setTimeout(() => { el.style.boxShadow = 'none'; }, 2000);
        }
        return;
      }
      setSearchParams({ step: (currentStep + 1).toString() });
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Final submit validation - check everything
      let err = validateIdentitas();
      if (err) { missingStep = 0; missingId = err.id; alertMsg = err.msg; }

      if (missingStep === -1) {
        for (let gIdx = 0; gIdx < groupedSections.length; gIdx++) {
          err = validateGroup(gIdx);
          if (err) { missingStep = gIdx + 1; missingId = err.id; alertMsg = err.msg; break; }
        }
      }

      if (missingStep !== -1) {
        alert(alertMsg);
        setSearchParams({ step: missingStep.toString(), scrollTo: missingId });
        return;
      }

      setSubmitting(true);
      try {
        const responseData = {
          package_id: packageId,
          respondent_data: respondentData,
          answers: { ...answers, open_questions: openAnswers }
        };

        const { error } = await supabase.from('responses').insert(responseData);
        if (error) throw error;

        sessionStorage.removeItem(`survey_draft_${packageId}`);
        navigate('/thank-you');
      } catch (err) {
        console.error("Submission failed", err);
        alert("Failed to submit survey. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setSearchParams({ step: (currentStep - 1).toString() });
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBloomChange = (sectionId: string, level: string) => {
    setAnswers(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], bloom: level }
    }));
  };

  const handleGapChange = (sectionId: string, questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        questions: {
          ...(prev[sectionId]?.questions || {}),
          [questionId]: value
        }
      }
    }));
  };

  const handleOpenAnswerChange = (questionId: string, value: string) => {
    setOpenAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const renderDataDiri = () => {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {survey.tujuan_survey && (
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem', borderLeft: '4px solid var(--primary)' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '1rem' }}>Tujuan Survei</h2>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.95rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {survey.tujuan_survey.map((tujuan: string, idx: number) => (
                <li key={idx}>{tujuan}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            IDENTITAS RESPONDEN
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            Mohon lengkapi identitas Anda sebelum memulai survei.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Nama Lengkap <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              id="identitas-name"
              type="text"
              value={respondentData.name}
              onChange={e => setRespondentData(prev => ({ ...prev, name: e.target.value }))}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}
              placeholder="Masukkan nama lengkap Anda"
            />
          </div>
          {packageId !== 'P3' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Email <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                id="identitas-email"
                type="email"
                value={respondentData.email}
                onChange={e => setRespondentData(prev => ({ ...prev, email: e.target.value }))}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}
                placeholder="Masukkan alamat email aktif"
              />
            </div>
          )}

          {/* P1: Pengguna Lulusan */}
          {packageId === 'P1' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Jabatan / Posisi <span style={{ color: '#ef4444' }}>*</span></label>
                <input id="identitas-position" type="text" value={respondentData.position} onChange={e => setRespondentData(prev => ({ ...prev, position: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }} placeholder="Masukkan jabatan/posisi Anda" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Nama Perusahaan <span style={{ color: '#ef4444' }}>*</span></label>
                <input id="identitas-institution" type="text" value={respondentData.institution} onChange={e => setRespondentData(prev => ({ ...prev, institution: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }} placeholder="Masukkan nama perusahaan" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Bidang Industri <span style={{ color: '#ef4444' }}>*</span></label>
                <select id="identitas-industry_sector" value={respondentData.industry_sector} onChange={e => setRespondentData(prev => ({ ...prev, industry_sector: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}>
                  <option value="" style={{ color: '#0f172a' }}>Pilih Bidang Industri</option>
                  <option value="Elektronik/Manufaktur" style={{ color: '#0f172a' }}>Elektronik/Manufaktur</option>
                  <option value="Otomotif" style={{ color: '#0f172a' }}>Otomotif</option>
                  <option value="Logistik/Warehousing" style={{ color: '#0f172a' }}>Logistik/Warehousing</option>
                  <option value="Oil & Gas" style={{ color: '#0f172a' }}>Oil & Gas</option>
                  <option value="Lainnya" style={{ color: '#0f172a' }}>Lainnya</option>
                </select>
                {respondentData.industry_sector === 'Lainnya' && (
                  <input type="text" value={respondentData.industry_sector === 'Lainnya' ? '' : respondentData.industry_sector} onChange={e => setRespondentData(prev => ({ ...prev, industry_sector: e.target.value }))} placeholder="Sebutkan bidang industri lainnya" style={{ marginTop: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Pernah Rekrut Alumni Robotika Polibatam <span style={{ color: '#ef4444' }}>*</span></label>
                <select id="identitas-ever_recruited" value={respondentData.ever_recruited} onChange={e => setRespondentData(prev => ({ ...prev, ever_recruited: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}>
                  <option value="" style={{ color: '#0f172a' }}>Pilih Jawaban</option>
                  <option value="Ya" style={{ color: '#0f172a' }}>Ya</option>
                  <option value="Belum — tapi familiar" style={{ color: '#0f172a' }}>Belum — tapi familiar</option>
                  <option value="Belum pernah" style={{ color: '#0f172a' }}>Belum pernah</option>
                </select>
              </div>
            </>
          )}

          {/* P2: Alumni */}
          {packageId === 'P2' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Tahun Kelulusan <span style={{ color: '#ef4444' }}>*</span></label>
                <input id="identitas-graduationYear" type="number" min="1900" max="2100" value={respondentData.graduationYear} onChange={e => setRespondentData(prev => ({ ...prev, graduationYear: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }} placeholder="Masukkan tahun kelulusan Anda" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Status Saat Ini <span style={{ color: '#ef4444' }}>*</span></label>
                <select id="identitas-current_status" value={respondentData.current_status} onChange={e => setRespondentData(prev => ({ ...prev, current_status: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}>
                  <option value="" style={{ color: '#0f172a' }}>Pilih Status</option>
                  <option value="Bekerja full-time" style={{ color: '#0f172a' }}>Bekerja full-time</option>
                  <option value="Wirausaha" style={{ color: '#0f172a' }}>Wirausaha</option>
                  <option value="Studi lanjut" style={{ color: '#0f172a' }}>Studi lanjut</option>
                  <option value="Sedang mencari kerja" style={{ color: '#0f172a' }}>Sedang mencari kerja</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Bidang Pekerjaan <span style={{ color: '#ef4444' }}>*</span></label>
                <select id="identitas-job_sector" value={respondentData.job_sector} onChange={e => setRespondentData(prev => ({ ...prev, job_sector: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}>
                  <option value="" style={{ color: '#0f172a' }}>Pilih Bidang Pekerjaan</option>
                  <option value="Robotika/Otomasi" style={{ color: '#0f172a' }}>Robotika/Otomasi</option>
                  <option value="Elektronik/Elektro" style={{ color: '#0f172a' }}>Elektronik/Elektro</option>
                  <option value="IT/Software" style={{ color: '#0f172a' }}>IT/Software</option>
                  <option value="Lainnya" style={{ color: '#0f172a' }}>Lainnya</option>
                </select>
                {respondentData.job_sector === 'Lainnya' && (
                  <input type="text" value={respondentData.job_sector === 'Lainnya' ? '' : respondentData.job_sector} onChange={e => setRespondentData(prev => ({ ...prev, job_sector: e.target.value }))} placeholder="Sebutkan bidang pekerjaan lainnya" style={{ marginTop: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Perusahaan tempat bekerja saat ini <span style={{ color: '#ef4444' }}>*</span></label>
                <input id="identitas-institution" type="text" value={respondentData.institution} onChange={e => setRespondentData(prev => ({ ...prev, institution: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }} placeholder="Masukkan nama perusahaan tempat bekerja saat ini" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Jabatan / Posisi Saat Ini <span style={{ color: '#ef4444' }}>*</span></label>
                <input id="identitas-position" type="text" value={respondentData.position} onChange={e => setRespondentData(prev => ({ ...prev, position: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }} placeholder="Masukkan jabatan/posisi Anda saat ini" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Masa Tunggu Kerja Setelah Lulus <span style={{ color: '#ef4444' }}>*</span></label>
                <select id="identitas-waiting_time" value={respondentData.waiting_time} onChange={e => setRespondentData(prev => ({ ...prev, waiting_time: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}>
                  <option value="" style={{ color: '#0f172a' }}>Pilih Masa Tunggu Kerja</option>
                  <option value="< 1 bln" style={{ color: '#0f172a' }}>&lt; 1 bln</option>
                  <option value="1–3 bln" style={{ color: '#0f172a' }}>1–3 bln</option>
                  <option value="3–6 bln" style={{ color: '#0f172a' }}>3–6 bln</option>
                  <option value="> 6 bln" style={{ color: '#0f172a' }}>&gt; 6 bln</option>
                  <option value="N/A" style={{ color: '#0f172a' }}>N/A</option>
                </select>
              </div>
            </>
          )}

          {/* P3: Dosen */}
          {packageId === 'P3' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Bidang Keahlian Utama <span style={{ color: '#ef4444' }}>*</span></label>
                <input id="identitas-expertise" type="text" value={respondentData.expertise} onChange={e => setRespondentData(prev => ({ ...prev, expertise: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }} placeholder="Masukkan bidang keahlian utama" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>MK yang Diampu <span style={{ color: '#ef4444' }}>*</span></label>
                <input id="identitas-courses" type="text" value={respondentData.courses} onChange={e => setRespondentData(prev => ({ ...prev, courses: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }} placeholder="Masukkan mata kuliah yang diampu" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Lama Mengajar di Prodi TRR <span style={{ color: '#ef4444' }}>*</span></label>
                <select id="identitas-teaching_duration" value={respondentData.teaching_duration} onChange={e => setRespondentData(prev => ({ ...prev, teaching_duration: e.target.value }))} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}>
                  <option value="" style={{ color: '#0f172a' }}>Pilih Lama Mengajar</option>
                  <option value="< 2 thn" style={{ color: '#0f172a' }}>&lt; 2 thn</option>
                  <option value="2–5 thn" style={{ color: '#0f172a' }}>2–5 thn</option>
                  <option value="5–10 thn" style={{ color: '#0f172a' }}>5–10 thn</option>
                  <option value="> 10 thn" style={{ color: '#0f172a' }}>&gt; 10 thn</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderGroupedSections = () => {
    const group = groupedSections[currentStep - 1]; // currentStep 0 is Data Diri
    if (!group) return null;

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {survey.bloom_taxonomy_explanation && (
          <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>Panduan Target Level (Taksonomi Bloom)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {survey.bloom_taxonomy_explanation.map((explanation: any, idx: number) => {
                const title = explanation.title || explanation.level;
                const description = explanation.description || '';
                return (
                  <div key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{explanation.level} - {title}</strong>{description ? `: ${description}` : ''}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {group.sections.map((section: any) => {
          const sectionAnswer = answers[section.id] || {};

          return (
            <div key={section.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  {section.id} - {section.title}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{section.description}</p>
              </div>

              {/* Bloom Selector */}
              <div id={`bloom-${section.id}`} className="glass-panel" style={{ padding: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>1. Target Level</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  Pada level mana penguasaan {section.title.toLowerCase()} yang Anda harapkan dari fresh graduate Prodi TRR?
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
                  {bloomLevels.map(level => {
                    const isSelected = sectionAnswer.bloom === level.id;
                    return (
                      <button
                        key={level.id}
                        onClick={() => handleBloomChange(section.id, level.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                          background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                          color: isSelected ? 'white' : 'var(--text-muted)',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.1rem' }}>{level.id}</div>
                        <div style={{ fontSize: '0.75rem' }}>{level.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Questions Gap Selector */}
              <div className="glass-panel" style={{ padding: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>2. Evaluasi Sub-kompetensi</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  Nilai kepentingan relatif tiap sub-kompetensi di bawah ini dengan skala - / 0 / +
                </p>
                
                {/* Header Row for scales */}
                <div className="scale-header-container" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
                  <div style={{ flex: 1 }}></div>
                  <div style={{ display: 'flex', width: '240px', justifyContent: 'space-between', paddingRight: '0.5rem' }}>
                    {gapScales.map(scale => (
                      <div key={scale.id} style={{ width: '80px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {scale.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {(section.questions || []).map((q: any, i: number) => {
                    const selectedValue = sectionAnswer.questions?.[q.id] || '0';
                    return (
                      <div key={q.id} className="competency-row" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '0.75rem 0.5rem', 
                        background: i % 2 === 0 ? 'rgba(30, 41, 59, 0.4)' : 'rgba(15, 23, 42, 0.2)',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: 1.4, paddingRight: '1rem' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 600, marginRight: '0.5rem' }}>{q.id}</span>
                          {q.text}
                        </div>
                        <div className="competency-scales" style={{ display: 'flex', width: '240px', justifyContent: 'space-between', paddingRight: '0.5rem' }}>
                          <div className="scale-mobile-labels">
                            {gapScales.map(scale => (<div key={scale.id} style={{ flex: 1, textAlign: 'center' }}>{scale.label}</div>))}
                          </div>
                          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                          {gapScales.map(scale => {
                            const isSelected = selectedValue === scale.id;
                            return (
                              <div key={scale.id} style={{ width: '80px', display: 'flex', justifyContent: 'center' }}>
                                <div 
                                  onClick={() => handleGapChange(section.id, q.id, scale.id)}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--text-muted)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    background: 'transparent'
                                  }}
                                >
                                  {isSelected && (
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Open Questions inline */}
              {section.open_questions && section.open_questions.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>Pertanyaan Terbuka</h3>
                  {section.open_questions.map((q: any) => (
                    <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ fontSize: '1rem', fontWeight: 500, lineHeight: 1.4 }}>
                        <span style={{ color: 'var(--accent)', marginRight: '0.5rem' }}>{q.id}.</span>
                        {q.text}
                      </label>
                      <textarea
                        id={`open-${q.id}`}
                        value={openAnswers[q.id] || ''}
                        onChange={(e) => handleOpenAnswerChange(q.id, e.target.value)}
                        placeholder="Ketik jawaban Anda di sini..."
                        style={{
                          width: '100%',
                          minHeight: '100px',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid var(--border-color)',
                          color: 'white',
                          fontFamily: 'inherit',
                          fontSize: '0.95rem',
                          resize: 'vertical',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Calculate progress
  const progressPercent = totalSteps > 1 ? Math.round((currentStep / (totalSteps - 1)) * 100) : 100;

  return (
    <div ref={topRef} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.05em' }}>
            PAKET {survey.id}
          </div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{survey.title}</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            Progres: {currentStep + 1} / {totalSteps}
          </div>
          <div style={{ width: '150px', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ minHeight: '50vh' }}>
        {currentStep === 0
          ? renderDataDiri()
          : renderGroupedSections()}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <button
          className="btn btn-outline"
          onClick={handlePrev}
          style={{ visibility: currentStep === 0 ? 'hidden' : 'visible', padding: '0.5rem 1rem', fontSize: '0.9rem', minWidth: '140px' }}
          disabled={submitting}
        >
          <ChevronLeft size={16} /> Sebelumnya
        </button>

        {/* Page Number Buttons */}
        <div className="pagination-container" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center', flex: 1, padding: '0 0.5rem' }}>
          {Array.from({ length: totalSteps }, (_, i) => {
            const isActive = i === currentStep;
            const label = (i + 1).toString();
            return (
              <button
                key={i}
                className="pagination-btn"
                onClick={() => {
                  setSearchParams({ step: i.toString() });
                  topRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                disabled={submitting}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: `2px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                title={i === 0 ? 'Identitas Responden' : `CDIO ${groupedSections[i - 1].id}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleNext}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', minWidth: '140px' }}
          disabled={submitting}
        >
          {isFinalStep ? (
            <>{submitting ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />} Kirim Survei</>
          ) : (
            <>Selanjutnya <ChevronRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
};

export default Survey;
