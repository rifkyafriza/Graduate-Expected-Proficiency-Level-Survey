import { useEffect, useState } from 'react';
import { 
  Box, Container, Typography, Card, CardContent, CardHeader, 
  Tabs, Tab, Button, CircularProgress, Alert, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, IconButton, Divider
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
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResponseData[]>([]);
  const [error, setError] = useState('');
  
  const [surveysConfig, setSurveysConfig] = useState<any[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleExportCSV = () => {
    if (results.length === 0) return;
    
    // Simplistic CSV export
    const headers = ['ID', 'Package', 'Created At', 'Raw Answers'];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + results.map(r => `${r.id},${r.package_id},${r.created_at},"${JSON.stringify(r.answers).replace(/"/g, '""')}"`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "survey_results.csv");
    document.body.appendChild(link);
    link.click();
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
      link.download = `survey_backup_${new Date().toISOString().slice(0,10)}.json`;
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
    const pkgMap: Record<string, string> = {
      'P1': 'Industri',
      'P2': 'Alumni',
      'P3': 'Dosen'
    };
    
    const bloomMap: Record<string, number> = {
      'C1': 0, 'C2': 1, 'C3': 2, 'C4': 3, 'C5': 4, 'C6': 5
    };

    const sectionStats: Record<string, any> = {};

    results.forEach(r => {
      const group = pkgMap[r.package_id];
      if (!group || !r.answers) return;

      Object.keys(r.answers).forEach(secId => {
        if (secId !== 'open_questions') {
          const bloomStr = r.answers[secId]?.bloom;
          const bloomVal = bloomStr ? bloomMap[bloomStr] : null;
          
          if (bloomVal !== null && bloomVal !== undefined) {
            let sectionTotalScore = bloomVal; // Base bloom score
            let sectionComponentCount = 1;

            const qs = r.answers[secId]?.questions;
            if (qs) {
              Object.values(qs).forEach((val: any) => {
                let qScore = bloomVal;
                if (val === '-') qScore -= 1;
                else if (val === '+') qScore += 1;
                
                // Enforce min 0, max 5
                qScore = Math.max(0, Math.min(5, qScore));
                
                sectionTotalScore += qScore;
                sectionComponentCount += 1;
              });
            }

            const averageScore = sectionTotalScore / sectionComponentCount;

            if (!sectionStats[secId]) {
              sectionStats[secId] = { name: secId, IndustriSum: 0, IndustriCount: 0, AlumniSum: 0, AlumniCount: 0, DosenSum: 0, DosenCount: 0 };
            }
            sectionStats[secId][`${group}Sum`] += averageScore;
            sectionStats[secId][`${group}Count`] += 1;
          }
        }
      });
    });

    return Object.values(sectionStats).map((stat: any) => ({
      name: stat.name,
      Industri: stat.IndustriCount > 0 ? Number((stat.IndustriSum / stat.IndustriCount).toFixed(2)) : 0,
      Alumni: stat.AlumniCount > 0 ? Number((stat.AlumniSum / stat.AlumniCount).toFixed(2)) : 0,
      Dosen: stat.DosenCount > 0 ? Number((stat.DosenSum / stat.DosenCount).toFixed(2)) : 0,
    })).sort((a, b) => {
      const [a1, a2] = a.name.split('.').map(Number);
      const [b1, b2] = b.name.split('.').map(Number);
      if (a1 !== b1) return a1 - b1;
      return (a2 || 0) - (b2 || 0);
    });
  };

  const getBloomData = () => {
    const counts: Record<string, number> = {};
    results.forEach(r => {
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
    results.forEach(r => {
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
      .sort((a,b) => parseInt(a) - parseInt(b))
      .map(major => ({
        name: `Section ${major}`,
        Kurang: sectionCounts[major]['-'],
        Sesuai: sectionCounts[major]['0'],
        Lebih: sectionCounts[major]['+'],
      }));
  };

  const expectedProficiencyData = getExpectedProficiencyData();
  const bloomData = getBloomData();
  const gapDataByMajorSection = getGapDataByMajorSection();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
        Admin Dashboard
      </Typography>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} textColor="primary" indicatorColor="primary">
          <Tab label="Results & Visualizations" />
          <Tab label="Question Editor" />
        </Tabs>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* TAB 0: Results */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'white' }}>Survey Submissions ({results.length})</Typography>
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
            <Card sx={{ background: 'rgba(30, 41, 59, 0.7)', color: 'white', borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              <CardHeader title="Expected Proficiency Level by Section" />
              <CardContent sx={{ height: 400 }}>
                {expectedProficiencyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expectedProficiencyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 5]} stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Industri" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Alumni" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
              <Card sx={{ background: 'rgba(30, 41, 59, 0.7)', color: 'white' }}>
                <CardHeader title="Target Level Bloom Distribution" />
                <CardContent sx={{ height: 300 }}>
                  {bloomData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bloomData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorBloom" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" allowDecimals={false} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
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
              <Card sx={{ background: 'rgba(30, 41, 59, 0.7)', color: 'white', borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                <CardHeader title="Gap Evaluation by Section" />
                <CardContent sx={{ height: 300 }}>
                  {gapDataByMajorSection.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gapDataByMajorSection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" allowDecimals={false} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="Kurang" stackId="a" fill={GAP_COLORS['-']} radius={[0, 0, 4, 4]} />
                        <Bar dataKey="Sesuai" stackId="a" fill={GAP_COLORS['0']} />
                        <Bar dataKey="Lebih" stackId="a" fill={GAP_COLORS['+']} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="textSecondary" align="center" sx={{ mt: 10 }}>No data available</Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ background: 'rgba(30, 41, 59, 0.7)', color: 'white' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#94a3b8' }}>ID</TableCell>
                  <TableCell sx={{ color: '#94a3b8' }}>Respondent</TableCell>
                  <TableCell sx={{ color: '#94a3b8' }}>Institution</TableCell>
                  <TableCell sx={{ color: '#94a3b8' }}>Date</TableCell>
                  <TableCell sx={{ color: '#94a3b8' }}>Raw Answers Preview</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ color: 'white' }}>{row.id}</TableCell>
                    <TableCell sx={{ color: 'white' }}>
                      <Typography variant="body2">{row.respondent_data?.nama || 'Unknown'}</Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>{row.respondent_data?.email || ''}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>{row.respondent_data?.instansi || '-'}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8' }}>
                      {JSON.stringify(row.answers)}
                    </TableCell>
                  </TableRow>
                ))}
                {results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ color: '#94a3b8', py: 4 }}>No responses yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 1: Editor */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'white' }}>Survey Configuration</Typography>
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
            <Card key={pIdx} sx={{ mb: 4, background: 'rgba(30, 41, 59, 0.7)', color: 'white' }}>
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
                  sx={{ mb: 3, input: { color: 'white' }, label: { color: '#94a3b8' } }}
                  variant="outlined"
                />

                <Typography variant="h6" gutterBottom>Sections</Typography>
                {pkg.sections.map((sec: any, sIdx: number) => (
                  <Paper key={sIdx} sx={{ p: 2, mb: 2, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155' }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField 
                        label="Section ID" 
                        value={sec.id}
                        onChange={(e) => handleSectionChange(pIdx, sIdx, 'id', e.target.value)}
                        sx={{ width: '150px', input: { color: 'white' }, label: { color: '#94a3b8' } }}
                      />
                      <TextField 
                        fullWidth 
                        label="Section Title" 
                        value={sec.title}
                        onChange={(e) => handleSectionChange(pIdx, sIdx, 'title', e.target.value)}
                        sx={{ input: { color: 'white' }, label: { color: '#94a3b8' } }}
                      />
                    </Box>
                    <TextField 
                      fullWidth 
                      label="Description" 
                      value={sec.description}
                      onChange={(e) => handleSectionChange(pIdx, sIdx, 'description', e.target.value)}
                      multiline rows={2}
                      sx={{ mb: 2, textarea: { color: 'white' }, label: { color: '#94a3b8' } }}
                    />

                    <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>Questions in Section</Typography>
                    {sec.questions.map((q: any, qIdx: number) => (
                      <Box key={qIdx} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
                        <TextField 
                          value={q.id}
                          size="small"
                          onChange={(e) => {
                            const newSec = { ...sec };
                            newSec.questions[qIdx].id = e.target.value;
                            handleSectionChange(pIdx, sIdx, 'questions', newSec.questions);
                          }}
                          sx={{ width: '100px', input: { color: 'white' } }}
                        />
                        <TextField 
                          fullWidth 
                          value={q.text}
                          size="small"
                          onChange={(e) => {
                            const newSec = { ...sec };
                            newSec.questions[qIdx].text = e.target.value;
                            handleSectionChange(pIdx, sIdx, 'questions', newSec.questions);
                          }}
                          sx={{ input: { color: 'white' } }}
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
                    <Button size="small" startIcon={<Plus size={16} />} sx={{ mt: 1 }} onClick={() => {
                      const newSec = { ...sec };
                      newSec.questions.push({ id: `${sec.id}.${newSec.questions.length + 1}`, text: "New Question" });
                      handleSectionChange(pIdx, sIdx, 'questions', newSec.questions);
                    }}>
                      Add Question
                    </Button>
                  </Paper>
                ))}
                <Button variant="outlined" startIcon={<Plus size={16} />} sx={{ mb: 3 }}>Add Section</Button>

                <Divider sx={{ my: 3, borderColor: '#334155' }} />

                <Typography variant="h6" gutterBottom>Open Questions</Typography>
                {pkg.open_questions && pkg.open_questions.map((oq: any, oIdx: number) => (
                  <Box key={oIdx} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
                    <TextField 
                      value={oq.id}
                      size="small"
                      onChange={(e) => {
                        const newOq = [...pkg.open_questions];
                        newOq[oIdx].id = e.target.value;
                        handleConfigChange(pIdx, 'open_questions', newOq);
                      }}
                      sx={{ width: '100px', input: { color: 'white' } }}
                    />
                    <TextField 
                      fullWidth 
                      value={oq.text}
                      size="small"
                      onChange={(e) => {
                        const newOq = [...pkg.open_questions];
                        newOq[oIdx].text = e.target.value;
                        handleConfigChange(pIdx, 'open_questions', newOq);
                      }}
                      sx={{ input: { color: 'white' } }}
                    />
                    <IconButton color="error" size="small" onClick={() => {
                      const newOq = [...pkg.open_questions];
                      newOq.splice(oIdx, 1);
                      handleConfigChange(pIdx, 'open_questions', newOq);
                    }}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<Plus size={16} />} sx={{ mt: 1 }} onClick={() => {
                  const newOq = [...(pkg.open_questions || [])];
                  newOq.push({ id: `${newOq.length + 1}`, text: "New Open Question" });
                  handleConfigChange(pIdx, 'open_questions', newOq);
                }}>
                  Add Open Question
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button variant="contained" color="secondary" startIcon={<Plus size={20} />}>Add New Package</Button>
        </Box>
      )}
    </Container>
  );
}
