import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Save } from 'lucide-react';
import surveysJsonData from '../data/surveys.json';

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
  const [respondentData, setRespondentData] = useState({ name: '', email: '', institution: '', graduationYear: '' });
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
        setRespondentData(parsed.respondentData || { name: '', email: '', institution: '', graduationYear: '' });
      } else {
        setAnswers(initialAnswers);
        setOpenAnswers({});
        setRespondentData({ name: '', email: '', institution: '', graduationYear: '' });
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

  const hasOpenQuestions = survey?.open_questions && survey.open_questions.length > 0;
  const totalSteps = 1 + groupedSections.length + (hasOpenQuestions ? 1 : 0);
  const isFinalStep = currentStep === totalSteps - 1;

  const handleNext = async () => {
    // Basic validation for Data Diri
    if (currentStep === 0) {
      if (!respondentData.name || !respondentData.email) {
        alert('Mohon isi Nama Lengkap dan Email terlebih dahulu.');
        return;
      }
      if (packageId === 'P2' && !respondentData.graduationYear) {
        alert('Mohon isi Tahun Kelulusan terlebih dahulu.');
        return;
      }
    }

    if (!isFinalStep) {
      setSearchParams({ step: (currentStep + 1).toString() });
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setSubmitting(true);
      try {
        const responseData = {
          package_id: packageId,
          respondent_data: respondentData,
          answers: { ...answers, open_questions: openAnswers }
        };

        // TODO: Replace with Supabase insert for production
        console.log('Survey response:', responseData);
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
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            Data Diri Responden
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            Mohon lengkapi data diri Anda sebelum memulai survei.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Nama Lengkap <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              value={respondentData.name}
              onChange={e => setRespondentData(prev => ({ ...prev, name: e.target.value }))}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}
              placeholder="Masukkan nama lengkap Anda"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Email <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="email"
              value={respondentData.email}
              onChange={e => setRespondentData(prev => ({ ...prev, email: e.target.value }))}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}
              placeholder="Masukkan alamat email aktif"
            />
          </div>
          {packageId === 'P2' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Tahun Kelulusan <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                value={respondentData.graduationYear}
                onChange={e => setRespondentData(prev => ({ ...prev, graduationYear: e.target.value }))}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}
                placeholder="Masukkan tahun kelulusan Anda"
              />
            </div>
          )}
          {(packageId === 'P1' || packageId === 'P2') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Instansi / Perusahaan</label>
              <input
                type="text"
                value={respondentData.institution}
                onChange={e => setRespondentData(prev => ({ ...prev, institution: e.target.value }))}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem', outline: 'none' }}
                placeholder="Masukkan nama instansi atau perusahaan"
              />
            </div>
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
              <div className="glass-panel" style={{ padding: '1rem' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
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
                      <div key={q.id} style={{ 
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
                        <div style={{ display: 'flex', width: '240px', justifyContent: 'space-between', paddingRight: '0.5rem' }}>
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
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderOpenQuestions = () => {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            Pertanyaan Terbuka
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            Mohon berikan masukan kualitatif Anda untuk penyusunan kurikulum.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {survey.open_questions && survey.open_questions.map((q: any) => (
            <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '1rem', fontWeight: 500, lineHeight: 1.4 }}>
                <span style={{ color: 'var(--accent)', marginRight: '0.5rem' }}>{q.id}.</span>
                {q.text}
              </label>
              <textarea
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
          : currentStep <= groupedSections.length
            ? renderGroupedSections()
            : renderOpenQuestions()}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <button
          className="btn btn-outline"
          onClick={handlePrev}
          style={{ visibility: currentStep === 0 ? 'hidden' : 'visible', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          disabled={submitting}
        >
          <ChevronLeft size={16} /> Sebelumnya
        </button>

        <button
          className="btn btn-primary"
          onClick={handleNext}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
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
