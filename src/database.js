const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do DB deve ser absoluto ou relativo à raiz do projeto
const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Inicializa o banco de dados com WAL (Write-Ahead Logging) para alta concorrência
db.serialize(() => {
    db.run("PRAGMA journal_mode=WAL;");
    db.run(`
        CREATE TABLE IF NOT EXISTS user_states (
            jid TEXT PRIMARY KEY, 
            data TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

async function getUserState(jid) {
    return new Promise((resolve, reject) => {
        db.get("SELECT data FROM user_states WHERE jid = ?", [jid], (err, row) => {
            if (err) return reject(err);
            resolve(row ? JSON.parse(row.data) : null);
        });
    });
}

async function saveUserState(jid, data) {
    return new Promise((resolve, reject) => {
        const jsonData = JSON.stringify(data);
        db.run(
            "INSERT INTO user_states (jid, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(jid) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP", 
            [jid, jsonData], 
            (err) => {
                if (err) return reject(err);
                resolve();
            }
        );
    });
}

async function getAllUsers() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM user_states", [], (err, rows) => {
            if (err) return reject(err);
            const users = rows.map(row => ({
                jid: row.jid,
                data: JSON.parse(row.data),
                updated_at: row.updated_at
            }));
            resolve(users);
        });
    });
}

async function deleteInactiveUsers(hours = 24) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT jid, data FROM user_states 
            WHERE updated_at <= datetime('now', '-${hours} hours')
        `;
        db.all(query, [], (err, rows) => {
            if (err) return reject(err);
            
            let count = 0;
            // Iterate and only reset those in ATENDIMENTO_HUMANO
            rows.forEach(row => {
                const data = JSON.parse(row.data);
                if (data.state === 'ATENDIMENTO_HUMANO') {
                    data.state = null;
                    data.interests = [];
                    data.deliveryMethod = null;
                    data.currentCategory = null;
                    
                    db.run(
                        "UPDATE user_states SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE jid = ?",
                        [JSON.stringify(data), row.jid]
                    );
                    count++;
                }
            });
            resolve(count);
        });
    });
}

function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

module.exports = {
    getUserState,
    saveUserState,
    getAllUsers,
    deleteInactiveUsers,
    closeDatabase
};
