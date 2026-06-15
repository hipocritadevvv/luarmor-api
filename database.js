const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function criarTabelas() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS keys (
            id SERIAL PRIMARY KEY,
            codigo TEXT UNIQUE NOT NULL,
            discord_id TEXT,
            hwid TEXT,
            expira_em TIMESTAMP NOT NULL,
            usado INTEGER DEFAULT 0,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS whitelist (
            id SERIAL PRIMARY KEY,
            discord_id TEXT UNIQUE NOT NULL,
            expira_em TIMESTAMP NOT NULL,
            hwid TEXT,
            added_by TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY,
            discord_id TEXT,
            acao TEXT,
            detalhes TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log('✅ Banco de dados criado/verificado!');
}

const dbFunctions = {
    salvarLog: async (discord_id, acao, detalhes) => {
        await pool.query(`INSERT INTO logs (discord_id, acao, detalhes) VALUES ($1, $2, $3)`, [discord_id, acao, detalhes]);
    },
    registrarHWID: async (discord_id, hwid) => {
        await pool.query(`UPDATE whitelist SET hwid = $1 WHERE discord_id = $2`, [hwid, discord_id]);
    },
    verificarHWID: async (discord_id, hwid) => {
        const res = await pool.query(`SELECT * FROM whitelist WHERE discord_id = $1 AND (hwid IS NULL OR hwid = $2) AND expira_em > NOW()`, [discord_id, hwid]);
        return res.rows[0];
    },
    resetarHWID: async (discord_id) => {
        await pool.query(`UPDATE whitelist SET hwid = NULL WHERE discord_id = $1`, [discord_id]);
    },
    verificarKey: async (codigo) => {
        const res = await pool.query(`SELECT * FROM keys WHERE codigo = $1 AND usado = 0 AND expira_em > NOW()`, [codigo]);
        return res.rows[0];
    },
    usarKey: async (codigo, discord_id, hwid) => {
        await pool.query(`UPDATE keys SET usado = 1, discord_id = $1, hwid = $2 WHERE codigo = $3`, [discord_id, hwid, codigo]);
    },
    addWhitelist: async (discord_id, dias, added_by) => {
        const expira_em = new Date();
        expira_em.setDate(expira_em.getDate() + dias);
        await pool.query(`INSERT INTO whitelist (discord_id, expira_em, added_by) VALUES ($1, $2, $3) ON CONFLICT(discord_id) DO UPDATE SET expira_em = $2, added_by = $3`, [discord_id, expira_em.toISOString(), added_by]);
    },
    verificarWhitelist: async (discord_id) => {
        const res = await pool.query(`SELECT * FROM whitelist WHERE discord_id = $1 AND expira_em > NOW()`, [discord_id]);
        return res.rows[0];
    },
    gerarKey: async (discord_id, dias) => {
        const codigo = 'LUA-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const expira_em = new Date();
        expira_em.setDate(expira_em.getDate() + dias);
        await pool.query(`INSERT INTO keys (codigo, discord_id, expira_em) VALUES ($1, $2, $3)`, [codigo, discord_id, expira_em.toISOString()]);
        return { codigo, expira_em };
    },
    getStats: async (discord_id) => {
        const res = await pool.query(`SELECT * FROM whitelist WHERE discord_id = $1`, [discord_id]);
        return res.rows[0];
    },
    getAllWhitelist: async () => {
        const res = await pool.query(`SELECT * FROM whitelist ORDER BY criado_em DESC`);
        return res.rows;
    },
    getAllKeys: async () => {
        const res = await pool.query(`SELECT * FROM keys ORDER BY criado_em DESC`);
        return res.rows;
    },
    getAllLogs: async () => {
        const res = await pool.query(`SELECT * FROM logs ORDER BY criado_em DESC LIMIT 100`);
        return res.rows;
    }
};

module.exports = { ...dbFunctions, criarTabelas };
