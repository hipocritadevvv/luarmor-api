require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = 'LuarmorSecureKey2025@#';

function auth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ erro: 'Não autorizado' });
    }
    next();
}

app.post('/api/validar', auth, (req, res) => {
    const { key, hwid } = req.body;
    if (!key) return res.status(400).json({ erro: 'Key não fornecida' });
    
    const keyData = db.verificarKey(key);
    
    if (!keyData) return res.status(401).json({ valido: false, erro: 'Key inválida' });
    
    if (keyData.usado === 1) {
        const whitelist = db.verificarWhitelist(keyData.discord_id);
        if (!whitelist) return res.status(401).json({ valido: false, erro: 'Acesso expirado' });
        if (whitelist.hwid && whitelist.hwid !== hwid) {
            return res.status(401).json({ valido: false, erro: 'HWID não autorizado' });
        }
        return res.json({ valido: true, expira_em: whitelist.expira_em });
    }
    
    res.json({ valido: true, mensagem: 'Key válida! Resgate no Discord.' });
});

app.post('/api/registrar-hwid', auth, (req, res) => {
    const { discord_id, hwid } = req.body;
    if (!discord_id || !hwid) return res.status(400).json({ erro: 'Dados incompletos' });
    db.registrarHWID(discord_id, hwid);
    res.json({ sucesso: true });
});

app.get('/api/status/:discord_id', (req, res) => {
    const whitelist = db.verificarWhitelist(req.params.discord_id);
    if (!whitelist) return res.json({ ativo: false });
    res.json({ ativo: true, expira_em: whitelist.expira_em, hwid: whitelist.hwid || 'Não registrado' });
});

app.get('/api/loader', (req, res) => {
    const { key } = req.query;
    if (!key) return res.status(400).send('Key não fornecida');
    
    const keyData = db.verificarKey(key);
    if (!keyData) return res.status(401).send('Key inválida');
    
    const script = `print("✅ Script carregado!")`;
    res.send(script);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
