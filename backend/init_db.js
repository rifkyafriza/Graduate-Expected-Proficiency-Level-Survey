const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const surveysJsonPath = path.resolve(__dirname, '../webapp/src/data/surveys.json');
let initialData = [];
try {
    initialData = JSON.parse(fs.readFileSync(surveysJsonPath, 'utf8'));
} catch (e) {
    console.error("Could not read surveys.json", e);
}

db.serialize(() => {
    // Create Config Table
    db.run(`CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    // Create Responses Table
    db.run(`CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        package_id TEXT,
        respondent_data TEXT,
        answers TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed Config
    if (initialData.length > 0) {
        db.run(`INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)`, ['surveys', JSON.stringify(initialData)], (err) => {
            if (err) {
                console.error("Error seeding data:", err);
            } else {
                console.log("Database initialized and seeded with surveys.json");
            }
        });
    } else {
        console.log("Database initialized without initial data");
    }
});

db.close();
