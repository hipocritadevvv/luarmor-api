const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'luarmor.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        discord_id TEXT,
        hwid TEXT,
        expira_em TEXT NOT NULL,
        usado INTEGER DEFAULT 0,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS whitelist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT UNIQUE NOT NULL,
        expira_em TEXT NOT NULL,
        hwid TEXT,
        added_by TEXT,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT,
        acao TEXT,
        detalhes TEXT,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('✅ Banco de dados criado/verificado!');
});

const dbFunctions = {
    salvarLog: (discord_id, acao, detalhes) => {
        db.run(`INSERT INTO logs (discord_id, acao, detalhes) VALUES (?, ?, ?)`, [discord_id, acao, detalhes]);
    },
    registrarHWID: (discord_id, hwid) => {
        db.run(`UPDATE whitelist SET hwid = ? WHERE discord_id = ?`, [hwid, discord_id]);
    },
    verificarHWID: (discord_id, hwid, callback) => {
        db.get(`SELECT * FROM whitelist WHERE discord_id = ? AND (hwid IS NULL OR hwid = ?) AND expira_em > datetime('now')`, [discord_id, hwid], callback);
    },
    resetarHWID: (discord_id) => {
        db.run(`UPDATE whitelist SET hwid = NULL WHERE discord_id = ?`, [discord_id]);
    },
    verificarKey: (codigo, callback) => {
        db.get(`SELECT * FROM keys WHERE codigo = ? AND usado = 0 AND expira_em > datetime('now')`, [codigo], callback);
    },
    usarKey: (codigo, discord_id, hwid, callback) => {
        db.run(`UPDATE keys SET usado = 1, discord_id = ?, hwid = ? WHERE codigo = ?`, [discord_id, hwid, codigo], callback);
    },
    addWhitelist: (discord_id, dias, added_by, callback) => {
        const expira_em = new Date();
        expira_em.setDate(expira_em.getDate() + dias);
        db.run(`INSERT OR REPLACE INTO whitelist (discord_id, expira_em, added_by) VALUES (?, ?, ?)`, [discord_id, expira_em.toISOString(), added_by], callback);
    },
    verificarWhitelist: (discord_id, callback) => {
        db.get(`SELECT * FROM whitelist WHERE discord_id = ? AND expira_em > datetime('now')`, [discord_id], callback);
    },
    gerarKey: (discord_id, dias, callback) => {
        const codigo = 'LUA-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const expira_em = new Date();
        expira_em.setDate(expira_em.getDate() + dias);
        db.run(`INSERT INTO keys (codigo, discord_id, expira_em) VALUES (?, ?, ?)`, [codigo, discord_id, expira_em.toISOString()], (err) => {
            callback(err, codigo, expira_em);
        });
    },
    getStats: (discord_id, callback) => {
        db.get(`SELECT * FROM whitelist WHERE discord_id = ?`, [discord_id], callback);
    }
};

module.exports = dbFunctions;