require('dotenv').config();
const express = require('express');
const basicAuth = require('express-basic-auth');

// Módulos refatorados
const { getUserState, saveUserState, getAllUsers, deleteInactiveUsers, closeDatabase } = require('./src/database');
const { processMessage, getDefaultUserData } = require('./src/stateMachine');
const { sendMessage, fetchProfile } = require('./src/evolutionService');
const { TEXTS } = require('./config');

const app = express();
app.use(express.json());

// Log de requisições
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// --- Autenticação do Painel ---
if (!process.env.DASHBOARD_USER || !process.env.DASHBOARD_PASS) {
    console.warn("⚠️ AVISO: DASHBOARD_USER e DASHBOARD_PASS não definidos no .env!");
} else {
    // Protege todas as rotas GET (painel estático e API), exceto rotas de webhook
    app.use((req, res, next) => {
        if (req.path.startsWith('/webhook')) {
            return next();
        }
        return basicAuth({
            users: { [process.env.DASHBOARD_USER]: process.env.DASHBOARD_PASS },
            challenge: true,
            realm: 'PainelRanchoUrbano'
        })(req, res, next);
    });
}

// Arquivos estáticos (agora protegidos pela regra acima)
app.use(express.static('public'));

// --- Rotas da API (Protegidas) ---
app.get('/api/leads', async (req, res) => {
    try {
        const allUsers = await getAllUsers();
        const leads = allUsers.filter(u => u.data && u.data.state === 'ATENDIMENTO_HUMANO');
        res.json(leads);
    } catch (err) {
        console.error('Erro ao buscar leads:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/leads/:jid/release', async (req, res) => {
    try {
        const { jid } = req.params;
        let userData = await getUserState(jid);
        if (userData && userData.state === 'ATENDIMENTO_HUMANO') {
            Object.assign(userData, getDefaultUserData()); // Reseta completamente os dados e o histórico
            await saveUserState(jid, userData);
            
            // Avisar ao cliente que o bot voltou a funcionar
            try {
                await sendMessage(jid, TEXTS.ATENDIMENTO_ENCERRADO);
            } catch (msgErr) {
                console.error(`Erro ao enviar mensagem de encerramento para ${jid}:`, msgErr);
            }

            res.json({ success: true, message: 'Usuário liberado com sucesso.' });
        } else {
            res.status(404).json({ error: 'Usuário não encontrado ou não está em atendimento humano.' });
        }
    } catch (err) {
        console.error('Erro ao liberar lead:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/api/leads/:jid/profile', async (req, res) => {
    try {
        const { jid } = req.params;
        const number = jid.split('@')[0];
        const profile = await fetchProfile(number);
        
        if (profile) {
            let userData = await getUserState(jid);
            if (userData) {
                // profile API pode retornar name ou pushName dependendo da instancia
                const newName = profile.name || profile.pushName || profile.contactName;
                if (newName) {
                    userData.pushName = newName;
                    await saveUserState(jid, userData);
                }
            }
            res.json({ success: true, profile, name: profile.name || profile.pushName || profile.contactName });
        } else {
            res.status(404).json({ error: 'Perfil não encontrado.' });
        }
    } catch (err) {
        console.error('Erro ao sincronizar perfil:', err);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// Retorna todos os contatos conhecidos pelo banco de dados
app.get('/api/contacts', async (req, res) => {
    try {
        const allUsers = await getAllUsers();
        res.json(allUsers);
    } catch (err) {
        console.error('Erro ao buscar contatos:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Alternar status de "ignorar" para um contato
app.post('/api/contacts/:jid/toggle-ignore', async (req, res) => {
    try {
        const { jid } = req.params;
        const { ignored } = req.body;
        
        let userData = await getUserState(jid);
        if (!userData) {
            userData = getDefaultUserData();
        }
        
        userData.ignored = !!ignored;
        
        // Se ativado novamente, reseta o histórico para evitar que o bot fique num estado inválido
        if (!userData.ignored) {
            Object.assign(userData, getDefaultUserData());
        }
        
        await saveUserState(jid, userData);
        
        res.json({ success: true, ignored: userData.ignored });
    } catch (err) {
        console.error('Erro ao alterar status de ignore:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

const processedMessages = new Set();

// --- Webhook da Evolution API ---
app.post(['/webhook', '/webhook/:event'], async (req, res) => {
    try {
        // Proteção de Segurança (Header validation)
        if (WEBHOOK_SECRET) {
            const incomingSecret = req.headers['webhook-secret'];
            if (incomingSecret !== WEBHOOK_SECRET) {
                console.warn('⚠️ Tentativa de acesso negada no webhook. Token incorreto.');
                return res.status(401).send('Unauthorized');
            }
        }

        const body = req.body;
        require('fs').writeFileSync('hook_debug.json', JSON.stringify(body, null, 2));

        if (!body) return res.status(200).send();

        if (body.event === 'messages.upsert' && body.data && body.data.message) {
            const msgData = body.data;
            const remoteJid = msgData.key.remoteJid;
            const fromMe = msgData.key.fromMe;

            if (remoteJid.includes('@g.us') || remoteJid.includes('status@broadcast')) {
                return res.status(200).send();
            }

            // Evitar duplicidade de webhooks (Idempotência)
            const messageId = msgData.key.id;
            if (messageId && processedMessages.has(messageId)) {
                return res.status(200).send();
            }
            if (messageId) {
                processedMessages.add(messageId);
                // Limpar o cache para não vazar memória (mantém os últimos 1000)
                if (processedMessages.size > 1000) {
                    const first = processedMessages.values().next().value;
                    processedMessages.delete(first);
                }
            }

            // Ignorar mensagens antigas (sync de histórico do Baileys)
            const messageTimestamp = msgData.messageTimestamp;
            const now = Math.floor(Date.now() / 1000);
            if (messageTimestamp && now - messageTimestamp > 60) {
                console.log(`[DEBUG] Ignorando mensagem antiga de ${now - messageTimestamp}s atrás (Sync de Histórico).`);
                return res.status(200).send();
            }

            const messageObj = msgData.message || {};
            let text = '';
            
            if (messageObj.conversation) {
                text = messageObj.conversation.trim();
            } else if (messageObj.extendedTextMessage && messageObj.extendedTextMessage.text) {
                text = messageObj.extendedTextMessage.text.trim();
            } else if (messageObj.imageMessage) {
                text = '[IMAGEM_ENVIADA]';
            }

            // Se a mensagem for do próprio admin
            if (fromMe) {
                if (text === '/botignorar') {
                    res.status(200).send('OK');
                    let userData = await getUserState(remoteJid);
                    if (!userData) userData = getDefaultUserData();
                    userData.ignored = true;
                    await saveUserState(remoteJid, userData);
                    console.log(`[DEBUG] Admin desativou o bot para ${remoteJid}`);
                    return;
                } else if (text === '/botretornar' || text === '/botativar') {
                    res.status(200).send('OK');
                    let userData = await getUserState(remoteJid);
                    if (!userData) userData = getDefaultUserData();
                    userData.ignored = false;
                    Object.assign(userData, getDefaultUserData()); // Reseta o histórico também
                    await saveUserState(remoteJid, userData);
                    console.log(`[DEBUG] Admin ativou o bot para ${remoteJid}`);
                    return;
                } else {
                    return res.status(200).send();
                }
            }

            // Se for mensagem de mídia sem texto ou não processável
            if (!text && !messageObj.imageMessage) {
                return res.status(200).send();
            }

            console.log(`[DEBUG] Mensagem recebida de ${remoteJid}: "${text}" (fromMe: ${fromMe})`);

            // Liberar a porta do webhook imediatamente
            res.status(200).send('OK');

            // Processar a mensagem em background (Assíncrono)
            (async () => {
                try {
                    // Buscar estado do banco de dados
                    let userData = await getUserState(remoteJid);
                    if (!userData) {
                        userData = getDefaultUserData();
                    }

                    // Salvar o nome do contato se estiver disponível no payload da mensagem
                    if (msgData.pushName && userData.pushName !== msgData.pushName) {
                        userData.pushName = msgData.pushName;
                    }

                    // Se o usuário estiver marcado para ser ignorado pelo bot
                    if (userData.ignored) {
                        return;
                    }

                    // Processar a mensagem via Máquina de Estados
                    userData = await processMessage(remoteJid, text, userData);

                    // Salvar o estado atualizado
                    await saveUserState(remoteJid, userData);
                } catch (bgErr) {
                    console.error('[ERRO_BACKGROUND]', bgErr);
                }
            })();
            
            return; // Encerrar a execução da rota principal, o background continua
        }

        if (!res.headersSent) {
            res.status(200).send('OK');
        }
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

// --- Cron Job para Limpeza de Inativos ---
setInterval(async () => {
    try {
        const deleted = await deleteInactiveUsers(24);
        if (deleted > 0) {
            console.log(`[CRON] ${deleted} leads inativos (24h+) foram liberados automaticamente.`);
        }
    } catch (err) {
        console.error('[CRON] Erro ao limpar inativos:', err);
    }
}, 60 * 60 * 1000); // Roda a cada 1 hora

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🛡️  Painel protegido rodando em: http://localhost:${PORT}`);
    console.log(`🔗 Webhook apontando para: http://SEU_IP:${PORT}/webhook`);
    console.log(`⏱️  Limpeza de inativos configurada para rodar a cada hora.`);
});

// Fechamento gracioso
process.on('SIGINT', async () => {
    try {
        await closeDatabase();
        console.log('Banco de dados SQLite fechado.');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
});
