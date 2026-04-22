const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const dbPath = path.resolve(__dirname, 'database.sqlite');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Open DB
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database " + err.message);
    }
});

// Get Survey Config
app.get('/api/surveys', (req, res) => {
    db.get('SELECT value FROM config WHERE key = ?', ['surveys'], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row && row.value) {
            res.json(JSON.parse(row.value));
        } else {
            res.json([]);
        }
    });
});

// Update Survey Config
app.put('/api/surveys', (req, res) => {
    const newData = req.body;
    db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', ['surveys', JSON.stringify(newData)], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Surveys updated successfully' });
    });
});

// Submit Response
app.post('/api/responses', (req, res) => {
    const { package_id, respondent_data, answers } = req.body;
    db.run(
        'INSERT INTO responses (package_id, respondent_data, answers) VALUES (?, ?, ?)',
        [package_id, JSON.stringify(respondent_data || {}), JSON.stringify(answers || {})],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Response submitted successfully', id: this.lastID });
        }
    );
});

// Get Results (for Admin)
app.get('/api/admin/results', (req, res) => {
    db.all('SELECT * FROM responses ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const results = rows.map(r => ({
            id: r.id,
            package_id: r.package_id,
            respondent_data: JSON.parse(r.respondent_data),
            answers: JSON.parse(r.answers),
            created_at: r.created_at
        }));
        res.json(results);
    });
});

// Trigger Local Backup
app.post('/api/admin/backup', (req, res) => {
    db.all('SELECT * FROM responses ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const results = rows.map(r => ({
            id: r.id,
            package_id: r.package_id,
            respondent_data: JSON.parse(r.respondent_data),
            answers: JSON.parse(r.answers),
            created_at: r.created_at
        }));
        
        const fs = require('fs');
        const backupDir = path.resolve(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const jsonPath = path.join(backupDir, `backup_${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
        
        // Simple CSV
        const headers = ['ID', 'Package', 'Created At', 'Respondent', 'Answers'];
        const csvContent = headers.join(",") + "\n"
            + results.map(r => `${r.id},${r.package_id},${r.created_at},"${JSON.stringify(r.respondent_data).replace(/"/g, '""')}","${JSON.stringify(r.answers).replace(/"/g, '""')}"`).join("\n");
        const csvPath = path.join(backupDir, `backup_${timestamp}.csv`);
        fs.writeFileSync(csvPath, csvContent);

        res.json({ message: 'Backup created successfully on the server', files: [jsonPath, csvPath] });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
