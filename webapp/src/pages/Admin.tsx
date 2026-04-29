import { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Card, CardContent, CardHeader,
  Tabs, Tab, Button, CircularProgress, Alert, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, IconButton
} from '@mui/material';
import { Download, Save, Trash2, Plus, CheckCircle2, Server } from 'lucide-react';
import surveysJsonData from '../data/surveys.json';
import { supabase } from '../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend
} from 'recharts';

interface ResponseData {
  id: number;
  package_id: string;
  respondent_data: any;
  answers: any;
  created_at: string;
}

const GAP_COLORS = { '-': '#ef4444', '0': '#3b82f6', '+': '#10b981' };

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResponseData[]>([]);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [alumniCutoff, setAlumniCutoff] = useState<number>(3);

  const [surveysConfig, setSurveysConfig] = useState<any[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

  const handleLogin = () => {
    if (loginUser === 'admin' && loginPass === 'robotika') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Username atau password salah.');
    }
  };

  const fetchData = async () => {
    try {
      // Load surveys from local JSON data
      setSurveysConfig(surveysJsonData as any[]);

      // Load results from Supabase
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResponse = async (id: number) => {
    if (!confirm(`Hapus responden ID ${id}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const { error } = await supabase.from('responses').delete().eq('id', id);
      if (error) throw error;
      setResults(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  // Helper to classify respondent into detailed category
  const getDetailedCategory = (r: ResponseData): string => {
    if (r.package_id === 'P1') return 'Industri';
    if (r.package_id === 'P3') return 'Dosen';
    if (r.package_id === 'P2') {
      const gradYear = parseInt(r.respondent_data?.graduationYear);
      const currentYear = new Date().getFullYear();
      if (!isNaN(gradYear) && (currentYear - gradYear) >= alumniCutoff) {
        return 'Alumni Senior';
      }
      return 'Alumni Junior';
    }
    return r.package_id;
  };

  // Filtered results based on category filter
  const filteredResults = filterCategory === 'ALL'
    ? results
    : filterCategory === 'P2'
      ? results.filter(r => r.package_id === 'P2')
      : filterCategory === 'P2_JUNIOR'
        ? results.filter(r => getDetailedCategory(r) === 'Alumni Junior')
        : filterCategory === 'P2_SENIOR'
          ? results.filter(r => getDetailedCategory(r) === 'Alumni Senior')
          : results.filter(r => r.package_id === filterCategory);

  // Count stats
  const countIndustri = results.filter(r => r.package_id === 'P1').length;
  const countAlumni = results.filter(r => r.package_id === 'P2').length;
  const countAlumniJunior = results.filter(r => getDetailedCategory(r) === 'Alumni Junior').length;
  const countAlumniSenior = results.filter(r => getDetailedCategory(r) === 'Alumni Senior').length;
  const countDosen = results.filter(r => r.package_id === 'P3').length;

  const handleExportCSV = () => {
    if (filteredResults.length === 0) return;

    const escapeCSV = (val: any) => {
      const str = String(val ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
      return `"${str}"`;
    };

    // Build dynamic column headers from survey config
    // Collect all unique section IDs, question IDs, and open question IDs across all packages
    const allSectionIds: string[] = [];
    const allQuestionIds: Map<string, string[]> = new Map(); // sectionId -> questionIds
    const allOpenQuestionIds: string[] = [];

    (surveysJsonData as any[]).forEach((pkg: any) => {
      if (pkg.sections) {
        pkg.sections.forEach((sec: any) => {
          if (!allSectionIds.includes(sec.id)) {
            allSectionIds.push(sec.id);
            const qIds = (sec.questions || []).map((q: any) => q.id);
            allQuestionIds.set(sec.id, qIds);
          } else {
            // Merge question IDs if section appears in multiple packages
            const existing = allQuestionIds.get(sec.id) || [];
            (sec.questions || []).forEach((q: any) => {
              if (!existing.includes(q.id)) existing.push(q.id);
            });
            allQuestionIds.set(sec.id, existing);
          }
          if (sec.open_questions) {
            sec.open_questions.forEach((oq: any) => {
              if (!allOpenQuestionIds.includes(oq.id)) {
                allOpenQuestionIds.push(oq.id);
              }
            });
          }
        });
      }
    });

    // Sort section IDs numerically
    allSectionIds.sort((a, b) => {
      const [a1, a2] = a.split('.').map(Number);
      const [b1, b2] = b.split('.').map(Number);
      if (a1 !== b1) return a1 - b1;
      return (a2 || 0) - (b2 || 0);
    });

    // Build flat headers
    const baseHeaders = [
      'ID', 'Kategori', 'Nama Lengkap', 'Email', 'Tahun Lulus / Angkatan',
      'Instansi / Perusahaan', 'Jabatan / Posisi', 'Bidang Industri (P1)', 'Pernah Rekrut (P1)',
      'Status Saat Ini (P2)', 'Bidang Pekerjaan (P2)', 'Masa Tunggu Kerja (P2)',
      'Bidang Keahlian Utama (P3)', 'MK yang Diampu (P3)', 'Lama Mengajar (P3)',
      'Tanggal Pengisian'
    ];
    const dynamicHeaders: string[] = [];

    allSectionIds.forEach(secId => {
      dynamicHeaders.push(`${secId} Bloom`);
      const qIds = allQuestionIds.get(secId) || [];
      qIds.forEach(qId => {
        dynamicHeaders.push(`${qId} Gap`);
      });
    });

    allOpenQuestionIds.forEach(oqId => {
      dynamicHeaders.push(`OQ ${oqId}`);
    });

    const headers = [...baseHeaders, ...dynamicHeaders];

    // Build rows
    const rows = filteredResults.map(r => {
      const base = [
        r.id,
        escapeCSV(r.package_id === 'P1' ? 'Industri' : r.package_id === 'P2' ? 'Alumni' : r.package_id === 'P3' ? 'Dosen' : r.package_id),
        escapeCSV(r.respondent_data?.name || r.respondent_data?.nama || ''),
        escapeCSV(r.respondent_data?.email || ''),
        escapeCSV(r.respondent_data?.graduationYear || ''),
        escapeCSV(r.respondent_data?.institution || r.respondent_data?.instansi || ''),
        escapeCSV(r.respondent_data?.position || ''),
        escapeCSV(r.respondent_data?.industry_sector || ''),
        escapeCSV(r.respondent_data?.ever_recruited || ''),
        escapeCSV(r.respondent_data?.current_status || ''),
        escapeCSV(r.respondent_data?.job_sector || ''),
        escapeCSV(r.respondent_data?.waiting_time || ''),
        escapeCSV(r.respondent_data?.expertise || ''),
        escapeCSV(r.respondent_data?.courses || ''),
        escapeCSV(r.respondent_data?.teaching_duration || ''),
        escapeCSV(r.created_at)
      ];

      const dynamicValues: string[] = [];

      allSectionIds.forEach(secId => {
        const secAnswer = r.answers?.[secId];
        dynamicValues.push(escapeCSV(secAnswer?.bloom || ''));
        const qIds = allQuestionIds.get(secId) || [];
        qIds.forEach(qId => {
          dynamicValues.push(escapeCSV(secAnswer?.questions?.[qId] || ''));
        });
      });

      const openQs = r.answers?.open_questions || {};
      allOpenQuestionIds.forEach(oqId => {
        dynamicValues.push(escapeCSV(openQs[oqId] || ''));
      });

      return [...base, ...dynamicValues].join(',');
    });

    const csvContent = [headers.map(h => escapeCSV(h)).join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey_results_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleServerBackup = async () => {
    try {
      // Export all responses as JSON backup download
      const { data, error } = await supabase.from('responses').select('*');
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `survey_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupStatus('Backup downloaded successfully!');
    } catch (err: any) {
      setBackupStatus(`Backup failed: ${err.message}`);
    }
    setTimeout(() => setBackupStatus(null), 5000);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      // Save config to Supabase config table
      const { error } = await supabase
        .from('config')
        .upsert({ key: 'surveys', value: surveysConfig }, { onConflict: 'key' });

      if (error) throw error;
      alert('Survey configuration saved successfully!');
    } catch (err: any) {
      alert(`Error saving config: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleConfigChange = (index: number, field: string, value: any) => {
    const updated = [...surveysConfig];
    updated[index][field] = value;
    setSurveysConfig(updated);
  };

  const handleSectionChange = (pkgIdx: number, secIdx: number, field: string, value: any) => {
    const updated = [...surveysConfig];
    updated[pkgIdx].sections[secIdx][field] = value;
    setSurveysConfig(updated);
  };

  // Visualization Data Prep
  const getExpectedProficiencyData = () => {
    const bloomMap: Record<string, number> = {
      'C1': 1, 'C2': 2, 'C3': 3, 'C4': 4, 'C5': 5, 'C6': 6
    };

    const groups = ['Industri', 'Alumni Junior', 'Alumni Senior', 'Dosen'];
    const sectionStats: Record<string, any> = {};

    filteredResults.forEach(r => {
      const group = getDetailedCategory(r);
      if (!group || !r.answers) return;

      Object.keys(r.answers).forEach(secId => {
        if (secId !== 'open_questions') {
          const bloomStr = r.answers[secId]?.bloom;
          const bloomVal = bloomStr ? bloomMap[bloomStr] : null;

          if (bloomVal !== null && bloomVal !== undefined) {
            let sectionTotalScore = bloomVal;
            let sectionComponentCount = 1;

            const qs = r.answers[secId]?.questions;
            if (qs) {
              Object.values(qs).forEach((val: any) => {
                let qScore = bloomVal;
                if (val === '-') qScore -= 1;
                else if (val === '+') qScore += 1;
                qScore = Math.max(1, Math.min(6, qScore));
                sectionTotalScore += qScore;
                sectionComponentCount += 1;
              });
            }

            const averageScore = sectionTotalScore / sectionComponentCount;
            const safeKey = group.replace(' ', '_');

            if (!sectionStats[secId]) {
              const init: any = { name: secId };
              groups.forEach(g => { const k = g.replace(' ', '_'); init[`${k}Sum`] = 0; init[`${k}Count`] = 0; });
              sectionStats[secId] = init;
            }
            sectionStats[secId][`${safeKey}Sum`] += averageScore;
            sectionStats[secId][`${safeKey}Count`] += 1;
          }
        }
      });
    });

    return Object.values(sectionStats).map((stat: any) => {
      const row: any = { name: stat.name };
      groups.forEach(g => {
        const k = g.replace(' ', '_');
        row[g] = stat[`${k}Count`] > 0 ? Number((stat[`${k}Sum`] / stat[`${k}Count`]).toFixed(2)) : 0;
      });
      return row;
    }).sort((a, b) => {
      const [a1, a2] = a.name.split('.').map(Number);
      const [b1, b2] = b.name.split('.').map(Number);
      if (a1 !== b1) return a1 - b1;
      return (a2 || 0) - (b2 || 0);
    });
  };

  const getBloomData = () => {
    const counts: Record<string, number> = {};
    filteredResults.forEach(r => {
      if (!r.answers) return;
      Object.keys(r.answers).forEach(secId => {
        if (secId !== 'open_questions') {
          const bloom = r.answers[secId]?.bloom;
          if (bloom) counts[bloom] = (counts[bloom] || 0) + 1;
        }
      });
    });
    return Object.keys(counts).map(k => ({ name: k, count: counts[k] })).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getGapDataByMajorSection = () => {
    const sectionCounts: Record<string, { '-': number, '0': number, '+': number }> = {};
    filteredResults.forEach(r => {
      if (!r.answers) return;
      Object.keys(r.answers).forEach(secId => {
        if (secId !== 'open_questions') {
          const majorSection = secId.split('.')[0]; // e.g. "1" from "1.1"
          if (!sectionCounts[majorSection]) {
            sectionCounts[majorSection] = { '-': 0, '0': 0, '+': 0 };
          }
          const qs = r.answers[secId]?.questions;
          if (qs) {
            Object.values(qs).forEach((val: any) => {
              const v = val as '-' | '0' | '+';
              if (sectionCounts[majorSection][v] !== undefined) {
                sectionCounts[majorSection][v]++;
              }
            });
          }
        }
      });
    });

    return Object.keys(sectionCounts)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(major => ({
        name: `CDIO ${major}`,
        Kurang: sectionCounts[major]['-'],
        Normal: sectionCounts[major]['0'],
        Lebih: sectionCounts[major]['+'],
      }));
  };

  const getPackageLabel = (r: ResponseData) => {
    return getDetailedCategory(r);
  };

  const expectedProficiencyData = getExpectedProficiencyData();
  const bloomData = getBloomData();
  const gapDataByMajorSection = getGapDataByMajorSection();

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card className="admin-card" sx={{ p: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', mb: 3 }}>
              🔒 Admin Login
            </Typography>
            {loginError && <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>}
            <TextField
              fullWidth label="Username" value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              className="admin-input" sx={{ mb: 2 }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <TextField
              fullWidth label="Password" type="password" value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              className="admin-input" sx={{ mb: 3 }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <Button fullWidth variant="contained" onClick={handleLogin} size="large">
              Login
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'var(--text-main)', fontWeight: 'bold' }}>
        Admin Dashboard
      </Typography>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} textColor="primary" indicatorColor="primary">
          <Tab label="Results & Visualizations" />
          <Tab label="Result & Visualization (Dummy)" />
          <Tab label="Question Editor" />
        </Tabs>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* TAB 0: Results */}
      {tab === 0 && (
        <Box>
          {/* Respondent Count Stats */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {[
              { label: 'Total', count: results.length, color: '#8b5cf6', icon: '📊' },
              { label: 'Industri', count: countIndustri, color: '#ef4444', icon: '🏭' },
              { label: `Alumni (${countAlumni})`, count: countAlumni, color: '#3b82f6', icon: '🎓', sub: `Jr: ${countAlumniJunior} | Sr: ${countAlumniSenior}` },
              { label: 'Dosen', count: countDosen, color: '#f59e0b', icon: '👨‍🏫' },
            ].map(stat => (
              <Card key={stat.label} sx={{
                flex: '1 1 140px',
                background: 'var(--bg-card)',
                border: `1px solid ${stat.color}33`,
                borderRadius: 2,
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                minWidth: '140px'
              }}>
                <Box sx={{ fontSize: '1.75rem' }}>{stat.icon}</Box>
                <Box>
                  <Typography variant="h5" sx={{ color: stat.color, fontWeight: 'bold', lineHeight: 1 }}>{stat.count}</Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{stat.label}</Typography>
                  {(stat as any).sub && (
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem', mt: 0.25 }}>{(stat as any).sub}</Typography>
                  )}
                </Box>
              </Card>
            ))}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ color: 'var(--text-main)' }}>Survey Submissions ({filteredResults.length})</Typography>
              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="admin-select"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="P1">Industri</option>
                <option value="P2">Alumni (Semua)</option>
                <option value="P2_JUNIOR">Alumni Junior</option>
                <option value="P2_SENIOR">Alumni Senior</option>
                <option value="P3">Dosen</option>
              </select>
              {/* Alumni Cutoff Selector */}
              <select
                value={alumniCutoff}
                onChange={e => setAlumniCutoff(Number(e.target.value))}
                className="admin-select"
              >
                <option value={3}>Cutoff: 3 Tahun</option>
                <option value={5}>Cutoff: 5 Tahun</option>
              </select>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {backupStatus && (
                <Typography variant="body2" sx={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle2 size={16} /> {backupStatus}
                </Typography>
              )}
              <Button variant="outlined" color="secondary" startIcon={<Server size={20} />} onClick={handleServerBackup}>
                Server Backup
              </Button>
              <Button variant="contained" color="primary" startIcon={<Download size={20} />} onClick={handleExportCSV}>
                Export to CSV
              </Button>
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Card className="admin-card">
              <CardHeader title="Expected Proficiency Level by CDIO" />
              <CardContent sx={{ height: 400 }}>
                {expectedProficiencyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expectedProficiencyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 6]} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Industri" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Alumni Junior" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Alumni Senior" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Dosen" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography color="textSecondary" align="center" sx={{ mt: 10 }}>No data available</Typography>
                )}
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, mb: 4 }}>
            <Box>
              <Card className="admin-card">
                <CardHeader title="Target Level Bloom Distribution" />
                <CardContent sx={{ height: 300 }}>
                  {bloomData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bloomData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorBloom" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" allowDecimals={false} tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        />
                        <Bar dataKey="count" fill="url(#colorBloom)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="textSecondary" align="center" sx={{ mt: 10 }}>No data available</Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card className="admin-card">
                <CardHeader title="Gap Evaluation by CDIO" />
                <CardContent sx={{ height: 300 }}>
                  {gapDataByMajorSection.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gapDataByMajorSection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" allowDecimals={false} tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="Kurang" stackId="a" fill={GAP_COLORS['-']} radius={[0, 0, 4, 4]} name="Tidak Penting" />
                        <Bar dataKey="Normal" stackId="a" fill={GAP_COLORS['0']} name="Normal" />
                        <Bar dataKey="Lebih" stackId="a" fill={GAP_COLORS['+']} radius={[4, 4, 0, 0]} name="Penting" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="textSecondary" align="center" sx={{ mt: 10 }}>No data available</Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>

          <TableContainer component={Paper} className="admin-table-container">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Respondent</TableCell>
                  <TableCell>Kategori</TableCell>
                  <TableCell>Thn Lulus</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredResults.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.respondent_data?.name || row.respondent_data?.nama || 'Unknown'}</Typography>
                      <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{row.respondent_data?.email || ''}</Typography>
                    </TableCell>
                    <TableCell>{getPackageLabel(row)}</TableCell>
                    <TableCell>{row.package_id === 'P2' ? (row.respondent_data?.graduationYear || '-') : '-'}</TableCell>
                    <TableCell>
                      {new Date(row.created_at).toLocaleString()}
                      {row.answers?.open_questions && Object.keys(row.answers.open_questions).length > 0 && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid var(--border-color)' }}>
                          <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                            Open Answers:
                          </Typography>
                          {Object.entries(row.answers.open_questions).map(([key, value]) => (
                            <Typography key={key} variant="caption" sx={{ display: 'block', color: 'var(--text-muted)', fontStyle: 'italic', mb: 0.5 }}>
                              • {String(value)}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton color="error" size="small" onClick={() => handleDeleteResponse(row.id)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>No responses yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 1: Dummy Data Visualization */}
      {tab === 1 && (() => {
        // Generate 50 dummy responses
        const pkgs = ['P1', 'P2', 'P3'];
        const blooms = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
        const gaps = ['-', '0', '+'];
        const sectionIds = ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '2.5', '3.1', '3.2', '3.3', '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '5.1', '5.3'];
        const questionCounts: Record<string, number> = { '1.1': 2, '1.2': 4, '1.3': 7, '1.4': 2, '2.1': 4, '2.2': 3, '2.3': 4, '2.4': 6, '2.5': 4, '3.1': 4, '3.2': 5, '3.3': 2, '4.1': 4, '4.2': 4, '4.3': 4, '4.4': 4, '4.5': 4, '4.6': 4, '5.1': 4, '5.3': 3 };
        const seededRandom = (i: number, j: number) => ((i * 13 + j * 7 + 3) % 100) / 100;

        const dummyResults: ResponseData[] = Array.from({ length: 50 }, (_, i) => {
          const pkg = pkgs[i % 3];
          const answers: any = {};
          sectionIds.forEach((sid, si) => {
            const bloom = blooms[Math.floor(seededRandom(i, si) * 6)];
            const questions: Record<string, string> = {};
            const qCount = questionCounts[sid] || 3;
            for (let qi = 0; qi < qCount; qi++) {
              questions[`${sid}.${qi + 1}`] = gaps[Math.floor(seededRandom(i + qi, si) * 3)];
            }
            answers[sid] = { bloom, questions };
          });
          return {
            id: i + 1,
            package_id: pkg,
            respondent_data: { name: `Dummy User ${i + 1}`, email: `dummy${i + 1}@test.com` },
            answers,
            created_at: new Date(2025, 0, 1 + i).toISOString()
          };
        });

        // Reuse visualization logic with dummy data
        const pkgMap: Record<string, string> = { P1: 'Industri', P2: 'Alumni', P3: 'Dosen' };
        const bloomMap: Record<string, number> = { C1: 1, C2: 2, C3: 3, C4: 4, C5: 5, C6: 6 };

        const dummySectionStats: Record<string, any> = {};
        dummyResults.forEach(r => {
          const group = pkgMap[r.package_id];
          Object.keys(r.answers).forEach(secId => {
            const bloomStr = r.answers[secId]?.bloom;
            const bloomVal = bloomStr ? bloomMap[bloomStr] : null;
            if (bloomVal !== null && bloomVal !== undefined) {
              let total = bloomVal, count = 1;
              const qs = r.answers[secId]?.questions;
              if (qs) Object.values(qs).forEach((v: any) => { let s = bloomVal; if (v === '-') s -= 1; else if (v === '+') s += 1; s = Math.max(1, Math.min(6, s)); total += s; count++; });
              const avg = total / count;
              if (!dummySectionStats[secId]) dummySectionStats[secId] = { name: secId, IndustriSum: 0, IndustriCount: 0, AlumniSum: 0, AlumniCount: 0, DosenSum: 0, DosenCount: 0 };
              dummySectionStats[secId][`${group}Sum`] += avg;
              dummySectionStats[secId][`${group}Count`] += 1;
            }
          });
        });
        const dummyProfData = Object.values(dummySectionStats).map((s: any) => ({
          name: s.name,
          Industri: s.IndustriCount > 0 ? Number((s.IndustriSum / s.IndustriCount).toFixed(2)) : 0,
          Alumni: s.AlumniCount > 0 ? Number((s.AlumniSum / s.AlumniCount).toFixed(2)) : 0,
          Dosen: s.DosenCount > 0 ? Number((s.DosenSum / s.DosenCount).toFixed(2)) : 0,
        })).sort((a, b) => { const [a1, a2] = a.name.split('.').map(Number); const [b1, b2] = b.name.split('.').map(Number); return a1 !== b1 ? a1 - b1 : (a2 || 0) - (b2 || 0); });

        const dummyBloomCounts: Record<string, number> = {};
        dummyResults.forEach(r => { Object.keys(r.answers).forEach(sid => { const b = r.answers[sid]?.bloom; if (b) dummyBloomCounts[b] = (dummyBloomCounts[b] || 0) + 1; }); });
        const dummyBloomData = Object.keys(dummyBloomCounts).sort().map(k => ({ name: k, count: dummyBloomCounts[k] }));

        const dummyGapCounts: Record<string, { '-': number, '0': number, '+': number }> = {};
        dummyResults.forEach(r => { Object.keys(r.answers).forEach(sid => { const m = sid.split('.')[0]; if (!dummyGapCounts[m]) dummyGapCounts[m] = { '-': 0, '0': 0, '+': 0 }; const qs = r.answers[sid]?.questions; if (qs) Object.values(qs).forEach((v: any) => { if (dummyGapCounts[m][v as keyof typeof dummyGapCounts[typeof m]] !== undefined) dummyGapCounts[m][v as '-' | '0' | '+']++; }); }); });
        const dummyGapData = Object.keys(dummyGapCounts).sort((a, b) => parseInt(a) - parseInt(b)).map(m => ({ name: `CDIO ${m}`, Kurang: dummyGapCounts[m]['-'], Sesuai: dummyGapCounts[m]['0'], Lebih: dummyGapCounts[m]['+'] }));

        return (
          <Box>
            <Typography variant="h6" sx={{ color: 'var(--text-main)', mb: 2 }}>Dummy Data Visualization (50 responses)</Typography>
            <Box sx={{ mb: 4 }}>
              <Card className="admin-card">
                <CardHeader title="Expected Proficiency Level by CDIO (Dummy)" />
                <CardContent sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dummyProfData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 6]} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Industri" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Alumni" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Dosen" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
              <Card sx={{ background: 'rgba(30, 41, 59, 0.7)', color: 'white' }}>
                <CardHeader title="Bloom Distribution (Dummy)" />
                <CardContent sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dummyBloomData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" allowDecimals={false} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card sx={{ background: 'rgba(30, 41, 59, 0.7)', color: 'white' }}>
                <CardHeader title="Gap Evaluation by CDIO (Dummy)" />
                <CardContent sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dummyGapData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" allowDecimals={false} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Kurang" stackId="a" fill={GAP_COLORS['-']} radius={[0, 0, 4, 4]} name="Tidak Penting" />
                      <Bar dataKey="Normal" stackId="a" fill={GAP_COLORS['0']} name="Normal" />
                      <Bar dataKey="Lebih" stackId="a" fill={GAP_COLORS['+']} radius={[4, 4, 0, 0]} name="Penting" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Box>
          </Box>
        );
      })()}

      {/* TAB 2: Editor */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'var(--text-main)' }}>Survey Configuration</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={savingConfig ? <CircularProgress size={20} color="inherit" /> : <Save size={20} />}
              onClick={handleSaveConfig}
              disabled={savingConfig}
            >
              Save Changes
            </Button>
          </Box>

          {surveysConfig.map((pkg, pIdx) => (
            <Card key={pIdx} sx={{ mb: 4 }} className="admin-card">
              <CardHeader
                title={`Package: ${pkg.id}`}
                action={<IconButton color="error"><Trash2 size={20} /></IconButton>}
              />
              <CardContent>
                <TextField
                  fullWidth
                  label="Package Title"
                  value={pkg.title}
                  onChange={(e) => handleConfigChange(pIdx, 'title', e.target.value)}
                  className="admin-input" sx={{ mb: 3 }}
                  variant="outlined"
                />

                <Typography variant="h6" gutterBottom>CDIOs</Typography>
                {pkg.sections.map((sec: any, sIdx: number) => (
                  <Paper key={sIdx} className="admin-section-paper" sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField
                        label="CDIO ID"
                        value={sec.id}
                        onChange={(e) => handleSectionChange(pIdx, sIdx, 'id', e.target.value)}
                        className="admin-input" sx={{ width: '150px' }}
                      />
                      <TextField
                        fullWidth
                        label="CDIO Title"
                        value={sec.title}
                        onChange={(e) => handleSectionChange(pIdx, sIdx, 'title', e.target.value)}
                        className="admin-input"
                      />
                    </Box>
                    <TextField
                      fullWidth
                      label="Description"
                      value={sec.description}
                      onChange={(e) => handleSectionChange(pIdx, sIdx, 'description', e.target.value)}
                      multiline rows={2}
                      className="admin-input" sx={{ mb: 2 }}
                    />

                    <Typography variant="subtitle2" sx={{ color: 'var(--text-muted)', mb: 1 }}>Questions in CDIO</Typography>
                    {sec.questions.map((q: any, qIdx: number) => (
                      <Box key={qIdx} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
                        <TextField
                          value={q.id}
                          size="small"
                          className="admin-input"
                          onChange={(e) => {
                            const newSec = { ...sec };
                            newSec.questions[qIdx].id = e.target.value;
                            handleSectionChange(pIdx, sIdx, 'questions', newSec.questions);
                          }}
                          sx={{ width: '100px' }}
                        />
                        <TextField
                          fullWidth
                          value={q.text}
                          size="small"
                          className="admin-input"
                          onChange={(e) => {
                            const newSec = { ...sec };
                            newSec.questions[qIdx].text = e.target.value;
                            handleSectionChange(pIdx, sIdx, 'questions', newSec.questions);
                          }}
                        />
                        <IconButton color="error" size="small" onClick={() => {
                          const newSec = { ...sec };
                          newSec.questions.splice(qIdx, 1);
                          handleSectionChange(pIdx, sIdx, 'questions', newSec.questions);
                        }}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Box>
                    ))}
                    <Typography variant="subtitle2" sx={{ color: 'var(--text-muted)', mb: 1, mt: 2 }}>Open Questions in CDIO</Typography>
                    {(sec.open_questions || []).map((oq: any, oIdx: number) => (
                      <Box key={`oq-${oIdx}`} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
                        <TextField
                          value={oq.id}
                          size="small"
                          className="admin-input"
                          onChange={(e) => {
                            const newSec = { ...sec };
                            newSec.open_questions[oIdx].id = e.target.value;
                            handleSectionChange(pIdx, sIdx, 'open_questions', newSec.open_questions);
                          }}
                          sx={{ width: '100px' }}
                        />
                        <TextField
                          fullWidth
                          value={oq.text}
                          size="small"
                          onChange={(e) => {
                            const newSec = { ...sec };
                            newSec.open_questions[oIdx].text = e.target.value;
                            handleSectionChange(pIdx, sIdx, 'open_questions', newSec.open_questions);
                          }}
                          className="admin-input"
                        />
                        <IconButton color="error" size="small" onClick={() => {
                          const newSec = { ...sec };
                          newSec.open_questions.splice(oIdx, 1);
                          handleSectionChange(pIdx, sIdx, 'open_questions', newSec.open_questions);
                        }}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Box>
                    ))}
                    <Button size="small" startIcon={<Plus size={16} />} sx={{ mt: 1 }} onClick={() => {
                      const newSec = { ...sec };
                      if (!newSec.open_questions) newSec.open_questions = [];
                      newSec.open_questions.push({ id: `OQ.${sec.id}.${newSec.open_questions.length + 1}`, text: "New Open Question" });
                      handleSectionChange(pIdx, sIdx, 'open_questions', newSec.open_questions);
                    }}>
                      Add Open Question
                    </Button>
                  </Paper>
                ))}
                <Button variant="outlined" startIcon={<Plus size={16} />} sx={{ mb: 3 }}>Add CDIO</Button>
              </CardContent>
            </Card>
          ))}
          <Button variant="contained" color="secondary" startIcon={<Plus size={20} />}>Add New Package</Button>
        </Box>
      )}
    </Container>
  );
}
