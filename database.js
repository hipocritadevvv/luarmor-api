const Database = require('better-sqlite3');
const path = require('path');

// Render usa /tmp para arquivos temporários
const dbPath = process.env.RENDER ? '/tmp/luarmor.db' : path.resolve(__dirname, 'luarmor.db');
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        discord_id TEXT,
        hwid TEXT,
        expira_em TEXT NOT NULL,
        usado INTEGER DEFAULT 0,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS whitelist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT UNIQUE NOT NULL,
        expira_em TEXT NOT NULL,
        hwid TEXT,
        added_by TEXT,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT,
        acao TEXT,
        detalhes TEXT,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

console.log('✅ Banco de dados criado/verificado!');

const dbFunctions = {
    salvarLog: (discord_id, acao, detalhes) => {
        const stmt = db.prepare(`INSERT INTO logs (discord_id, acao, detalhes) VALUES (?, ?, ?)`);
        stmt.run(discord_id, acao, detalhes);
    },
    registrarHWID: (discord_id, hwid) => {
        const stmt = db.prepare(`UPDATE whitelist SET hwid = ? WHERE discord_id = ?`);
        stmt.run(hwid, discord_id);
    },
    verificarHWID: (discord_id, hwid) => {
        const stmt = db.prepare(`SELECT * FROM whitelist WHERE discord_id = ? AND (hwid IS NULL OR hwid = ?) AND expira_em > datetime('now')`);
        return stmt.get(discord_id, hwid);
    },
    resetarHWID: (discord_id) => {
        const stmt = db.prepare(`UPDATE whitelist SET hwid = NULL WHERE discord_id = ?`);
        stmt.run(discord_id);
    },
    verificarKey: (codigo) => {
        const stmt = db.prepare(`SELECT * FROM keys WHERE codigo = ? AND usado = 0 AND expira_em > datetime('now')`);
        return stmt.get(codigo);
    },
    usarKey: (codigo, discord_id, hwid) => {
        const stmt = db.prepare(`UPDATE keys SET usado = 1, discord_id = ?, hwid = ? WHERE codigo = ?`);
        stmt.run(discord_id, hwid, codigo);
    },
    addWhitelist: (discord_id, dias, added_by) => {
        const expira_em = new Date();
        expira_em.setDate(expira_em.getDate() + dias);
        const stmt = db.prepare(`INSERT OR REPLACE INTO whitelist (discord_id, expira_em, added_by) VALUES (?, ?, ?)`);
        stmt.run(discord_id, expira_em.toISOString(), added_by);
    },
    verificarWhitelist: (discord_id) => {
        const stmt = db.prepare(`SELECT * FROM whitelist WHERE discord_id = ? AND expira_em > datetime('now')`);
        return stmt.get(discord_id);
    },
    gerarKey: (discord_id, dias) => {
        const codigo = 'LUA-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const expira_em = new Date();
        expira_em.setDate(expira_em.getDate() + dias);
        const stmt = db.prepare(`INSERT INTO keys (codigo, discord_id, expira_em) VALUES (?, ?, ?)`);
        stmt.run(codigo, discord_id, expira_em.toISOString());
        return { codigo, expira_em };
    },
    getStats: (discord_id) => {
        const stmt = db.prepare(`SELECT * FROM whitelist WHERE discord_id = ?`);
        return stmt.get(discord_id);
    }
};

module.exports = dbFunctions;