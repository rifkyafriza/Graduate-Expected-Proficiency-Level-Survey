const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const surveysJsonPath = path.resolve(__dirname, '../webapp/src/data/surveys.json');
const surveysData = JSON.parse(fs.readFileSync(surveysJsonPath, 'utf8'));

const packages = surveysData.map(s => s.id);

const bloomLevels = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
const gapScales = ['-', '0', '+'];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const names = ["Andi", "Budi", "Citra", "Dewi", "Eko", "Fajar", "Gita", "Hadi", "Intan", "Joko"];
const institutions = ["PT. Maju Jaya", "Universitas Indonesia", "Politeknik Negeri Batam", "PT. Inovasi Robotika", "CV. Teknologi Masa Depan"];

let inserted = 0;

db.serialize(() => {
    for (let i = 0; i < 50; i++) {
        const pkg = getRandomItem(surveysData);
        const package_id = pkg.id;
        
        const respondent_data = {
            name: getRandomItem(names) + " " + Math.floor(Math.random() * 1000),
            email: `dummy_user_${i}@example.com`,
            institution: getRandomItem(institutions)
        };
        
        const answers = {};
        if (pkg.sections) {
            pkg.sections.forEach(sec => {
                answers[sec.id] = {
                    bloom: getRandomItem(bloomLevels),
                    questions: {}
                };
                if (sec.questions) {
                    sec.questions.forEach(q => {
                        answers[sec.id].questions[q.id] = getRandomItem(gapScales);
                    });
                }
            });
        }
        
        const openAnswers = {};
        if (pkg.open_questions) {
            pkg.open_questions.forEach(q => {
                openAnswers[q.id] = `This is a dummy answer for ${q.id} generated automatically. We think it's very important to consider the practical aspects.`;
            });
        }
        answers.open_questions = openAnswers;

        // Generate random date within the last 30 days
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        const created_at = date.toISOString().replace('T', ' ').substring(0, 19);

        db.run(
            'INSERT INTO responses (package_id, respondent_data, answers, created_at) VALUES (?, ?, ?, ?)',
            [package_id, JSON.stringify(respondent_data), JSON.stringify(answers), created_at],
            function(err) {
                if (err) {
                    console.error("Error inserting:", err);
                } else {
                    inserted++;
                    if (inserted === 50) {
                        console.log("Successfully inserted 50 dummy responses.");
                        db.close();
                    }
                }
            }
        );
    }
});
