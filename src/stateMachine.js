const config = require('../config');
const { sendMessage } = require('./evolutionService');

const TEXTS = {
    ...config.TEXTS,
    INFORMACOES: config.TEXTS.INFORMACOES()
};

function getSaudacao() {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour >= 0 && hour < 12) {
        greeting = 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
        greeting = 'Boa tarde';
    } else {
        greeting = 'Boa noite';
    }
    return config.TEXTS.SAUDACAO(config.STORE_NAME, greeting);
}

function parseOption(text) {
    const raw = text.toLowerCase().trim();
    
    // Dicionário de números por extenso ou posição
    const wordsMap = {
        'primeiro': '1', 'primeira': '1', 'um': '1', 'uma': '1', '1º': '1', '1ª': '1',
        'segundo': '2', 'segunda': '2', 'dois': '2', 'duas': '2', '2º': '2', '2ª': '2',
        'terceiro': '3', 'terceira': '3', 'tres': '3', 'três': '3', '3º': '3', '3ª': '3',
        'quarto': '4', 'quarta': '4', 'quatro': '4', '4º': '4', '4ª': '4',
        'quinto': '5', 'quinta': '5', 'cinco': '5', '5º': '5', '5ª': '5',
        'sexto': '6', 'sexta': '6', 'seis': '6', '6º': '6', '6ª': '6',
        'setimo': '7', 'setima': '7', 'sétimo': '7', 'sétima': '7', 'sete': '7', '7º': '7', '7ª': '7'
    };

    // Tenta achar um número por extenso na frase
    for (const [word, num] of Object.entries(wordsMap)) {
        if (raw.includes(word)) return num;
    }

    // Se não achou palavra, tenta achar o primeiro número na frase
    const match = raw.match(/(\d+)/);
    if (match) return match[1];
    
    return raw;
}

function isBusinessHours() {
    const d = new Date();
    // Horário de Brasília/Paraguai
    const day = d.getDay();
    const hour = d.getHours();
    
    // Seg a Sex (1 a 5)
    if (day >= 1 && day <= 5) {
        return hour >= 8 && hour < 18;
    }
    // Sábado (6)
    if (day === 6) {
        return hour >= 8 && hour < 16;
    }
    // Domingo (0)
    return false;
}

const CATEGORIES_MAP = {
    '1': 'Camisas/Camisetas',
    '2': 'Calças/Shorts',
    '3': 'Calçados',
    '4': 'Acessórios',
    '5': 'Bebidas',
    '6': 'Ervas',
    '7': 'Outro'
};

const SIZES_MAP = {
    '1': 'P', 'p': 'P',
    '2': 'M', 'm': 'M',
    '3': 'G', 'g': 'G',
    '4': 'GG', 'gg': 'GG',
    '5': 'G1', 'g1': 'G1'
};

/**
 * Retorna os dados padrão do usuário
 */
function getDefaultUserData() {
    return { 
        state: null, 
        interests: [], 
        currentCategory: null, 
        deliveryMethod: null,
        history: [] 
    };
}

/**
 * Navega para um estado, salvando o estado atual no histórico (se não for null ou SAUDACAO)
 */
function navigateTo(userData, nextState) {
    if (userData.state && userData.state !== 'SAUDACAO' && userData.state !== null) {
        if (!Array.isArray(userData.history)) {
            userData.history = [];
        }
        userData.history.push(userData.state);
    }
    userData.state = nextState;
}

/**
 * Volta para o estado anterior usando o histórico
 */
function goBack(userData) {
    if (userData.history && userData.history.length > 0) {
        userData.state = userData.history.pop();
    } else {
        userData.state = 'SAUDACAO';
    }
}

/**
 * Máquina de estados. Processa a mensagem baseada no estado atual.
 */
async function processMessage(remoteJid, text, userData) {
    let msgType = text.toLowerCase();

    // --- COMANDOS GLOBAIS DE PRIORIDADE ---

    // 1. Comando Global de Reset (Funciona em qualquer estado)
    if (['cancelar', 'reiniciar', 'reset'].includes(msgType)) {
        Object.assign(userData, getDefaultUserData());
        userData.state = 'SAUDACAO';
        await sendMessage(remoteJid, TEXTS.ATENDIMENTO_REINICIADO + getSaudacao());
        return userData;
    }

    // 2. Bloqueio Global de Áudios (a não ser que esteja com humano)
    if (text === '[AUDIO_ENVIADO]' && userData.state !== 'ATENDIMENTO_HUMANO') {
        await sendMessage(remoteJid, 'Desculpe, ainda não consigo ouvir áudios 🙉\nPor favor, escreva sua mensagem ou escolha uma das opções!');
        return userData;
    }

    // Reset se o usuário disser oi de novo e já tiver passado do estado nulo ou quiser recomeçar
    if (['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'].includes(msgType) && userData.state !== 'ATENDIMENTO_HUMANO') {
        Object.assign(userData, getDefaultUserData());
        userData.state = 'SAUDACAO';
        await sendMessage(remoteJid, getSaudacao());
        return userData;
    }

    // Navegação global de voltar (0) para qualquer menu
    if (text === '0' && userData.state !== 'SAUDACAO' && userData.state !== null && userData.state !== 'ATENDIMENTO_HUMANO') {
        goBack(userData);
        // Agora precisamos enviar a mensagem correspondente ao estado que voltamos
        // Para simplificar, rodaremos o processMessage novamente com um input vazio ou re-enviaremos o texto
        // A abordagem mais limpa é apenas reenviar o texto do estado atual
        switch (userData.state) {
            case 'SAUDACAO': await sendMessage(remoteJid, getSaudacao()); break;
            case 'CATEGORIAS': await sendMessage(remoteJid, TEXTS.CATEGORIAS); break;
            case 'MAIS_ITENS': await sendMessage(remoteJid, TEXTS.MAIS_ITENS); break;
            case 'TAMANHOS': await sendMessage(remoteJid, TEXTS.TAMANHOS); break;
            case 'CALCADOS': await sendMessage(remoteJid, TEXTS.CALCADOS); break;
            case 'DESCRICAO': await sendMessage(remoteJid, TEXTS.DESCRICAO); break;
            case 'TIPO_ENTREGA': await sendMessage(remoteJid, TEXTS.TIPO_ENTREGA); break;
            case 'AGUARDANDO_IMAGEM': await sendMessage(remoteJid, TEXTS.PEDIR_IMAGEM); break;
            case 'CONFIRMAR_CARRINHO': await sendMessage(remoteJid, TEXTS.CONFIRMAR_CARRINHO(userData.interests)); break;
            case 'REMOVER_ITEM': await sendMessage(remoteJid, TEXTS.REMOVER_ITEM); break;
            case 'SOLICITAR_IDENTIDADE': await sendMessage(remoteJid, TEXTS.PEDIR_IDENTIDADE); break;
            case 'SOLICITAR_CIDADE': await sendMessage(remoteJid, TEXTS.PEDIR_CIDADE); break;
            case 'CONFIRMAR_DADOS_ENTREGA': await sendMessage(remoteJid, TEXTS.CONFIRMAR_DADOS_ENTREGA(userData.savedCi, userData.savedCity)); break;
            default: await sendMessage(remoteJid, getSaudacao()); break;
        }
        return userData;
    }

    // Extrair opção formatada (1, 2, 3...)
    const option = parseOption(text);

    console.log(`[DEBUG_BOT] JID: ${remoteJid} | Estado: ${userData.state} | Texto: "${text}" | Opção Extraída: "${option}"`);

    // Processamento por estado
    switch (userData.state) {
        case null:
        case 'SAUDACAO':
            if (option === '1') {
                navigateTo(userData, 'CATEGORIAS');
                await sendMessage(remoteJid, TEXTS.CATEGORIAS);
            } else if (option === '2') {
                await sendMessage(remoteJid, TEXTS.INFORMACOES);
                // Não navegamos para frente, mantemos no estado SAUDACAO
            } else if (option === '3') {
                navigateTo(userData, 'AGUARDANDO_IMAGEM');
                await sendMessage(remoteJid, TEXTS.PEDIR_IMAGEM);
            } else if (option === '0') {
                await sendMessage(remoteJid, getSaudacao());
            } else {
                if (userData.state === null) {
                    userData.state = 'SAUDACAO';
                    await sendMessage(remoteJid, getSaudacao());
                } else {
                    await sendMessage(remoteJid, TEXTS.ERRO);
                }
            }
            break;

        case 'CATEGORIAS':
            if (['1', '2'].includes(option)) {
                userData.currentCategory = CATEGORIES_MAP[option];
                navigateTo(userData, 'TAMANHOS');
                await sendMessage(remoteJid, TEXTS.TAMANHOS);
            } else if (option === '3') {
                userData.currentCategory = CATEGORIES_MAP[option];
                navigateTo(userData, 'CALCADOS');
                await sendMessage(remoteJid, TEXTS.CALCADOS);
            } else if (['4', '5', '6', '7'].includes(option)) {
                userData.currentCategory = CATEGORIES_MAP[option];
                navigateTo(userData, 'DESCRICAO');
                await sendMessage(remoteJid, TEXTS.DESCRICAO);
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO);
            }
            break;

        case 'TAMANHOS':
            if (SIZES_MAP[option]) {
                userData.interests.push(`${userData.currentCategory} (Tamanho: ${SIZES_MAP[option]})`);
                navigateTo(userData, 'MAIS_ITENS');
                await sendMessage(remoteJid, TEXTS.MAIS_ITENS);
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO);
            }
            break;

        case 'CALCADOS':
            const calcadoNum = parseInt(option);
            if (!isNaN(calcadoNum) && calcadoNum >= 36 && calcadoNum <= 48) {
                userData.interests.push(`${userData.currentCategory} (Número: ${calcadoNum})`);
                navigateTo(userData, 'MAIS_ITENS');
                await sendMessage(remoteJid, TEXTS.MAIS_ITENS);
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO_CALCADO);
            }
            break;

        case 'DESCRICAO':
            // Qualquer input de texto livre
            userData.interests.push(`${userData.currentCategory} (${text})`);
            navigateTo(userData, 'MAIS_ITENS');
            await sendMessage(remoteJid, TEXTS.MAIS_ITENS);
            break;

        case 'MAIS_ITENS':
            if (option === '1') {
                navigateTo(userData, 'CATEGORIAS');
                userData.currentCategory = null;
                await sendMessage(remoteJid, TEXTS.CATEGORIAS);
            } else if (option === '2') {
                navigateTo(userData, 'CONFIRMAR_CARRINHO');
                await sendMessage(remoteJid, TEXTS.CONFIRMAR_CARRINHO(userData.interests));
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO);
            }
            break;

        case 'CONFIRMAR_CARRINHO':
            if (option === '1') {
                navigateTo(userData, 'TIPO_ENTREGA');
                await sendMessage(remoteJid, TEXTS.TIPO_ENTREGA);
            } else if (option === '2') {
                if (userData.interests.length === 0) {
                    await sendMessage(remoteJid, 'Seu carrinho já está vazio.');
                } else {
                    navigateTo(userData, 'REMOVER_ITEM');
                    await sendMessage(remoteJid, TEXTS.REMOVER_ITEM);
                }
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO);
            }
            break;

        case 'REMOVER_ITEM':
            const itemNum = parseInt(option);
            if (!isNaN(itemNum) && itemNum > 0 && itemNum <= userData.interests.length) {
                userData.interests.splice(itemNum - 1, 1);
                goBack(userData); // Volta para CONFIRMAR_CARRINHO
                await sendMessage(remoteJid, `✅ Item removido.\n\n` + TEXTS.CONFIRMAR_CARRINHO(userData.interests));
            } else {
                await sendMessage(remoteJid, `❌ Por favor, digite um número válido entre 1 e ${userData.interests.length}.`);
            }
            break;

        case 'AGUARDANDO_IMAGEM':
            if (text === '[IMAGEM_ENVIADA]') {
                userData.interests.push('Imagem do Instagram/TikTok');
                navigateTo(userData, 'TIPO_ENTREGA');
                await sendMessage(remoteJid, TEXTS.IMAGEM_RECEBIDA + TEXTS.TIPO_ENTREGA);
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO_IMAGEM);
            }
            break;

        case 'TIPO_ENTREGA':
            if (['1', '2'].includes(option)) {
                if (option === '1') {
                    if (userData.savedCi && userData.savedCity) {
                        navigateTo(userData, 'CONFIRMAR_DADOS_ENTREGA');
                        await sendMessage(remoteJid, TEXTS.CONFIRMAR_DADOS_ENTREGA(userData.savedCi, userData.savedCity));
                    } else {
                        navigateTo(userData, 'SOLICITAR_IDENTIDADE');
                        await sendMessage(remoteJid, TEXTS.PEDIR_IDENTIDADE);
                    }
                } else {
                    userData.deliveryMethod = 'Retirar na loja';
                    userData.triageCompletedAt = new Date().toISOString();
                    navigateTo(userData, 'ATENDIMENTO_HUMANO');
                    
                    let resumo = TEXTS.RESUMO_TRIAGEM(userData);
                    if (!isBusinessHours()) resumo += TEXTS.MENSAGEM_FORA_HORARIO;
                    await sendMessage(remoteJid, resumo);
                }
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO);
            }
            break;

        case 'CONFIRMAR_DADOS_ENTREGA':
            if (option === '1') {
                userData.deliveryMethod = `Entregar na cidade: ${userData.savedCity} (CI: ${userData.savedCi})`;
                userData.triageCompletedAt = new Date().toISOString();
                navigateTo(userData, 'ATENDIMENTO_HUMANO');
                
                let resumo = TEXTS.RESUMO_TRIAGEM(userData);
                if (!isBusinessHours()) resumo += TEXTS.MENSAGEM_FORA_HORARIO;
                await sendMessage(remoteJid, resumo);
            } else if (option === '2') {
                navigateTo(userData, 'SOLICITAR_IDENTIDADE');
                await sendMessage(remoteJid, TEXTS.PEDIR_IDENTIDADE);
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO);
            }
            break;

        case 'SOLICITAR_IDENTIDADE':
            userData.savedCi = text;
            navigateTo(userData, 'SOLICITAR_CIDADE');
            await sendMessage(remoteJid, TEXTS.PEDIR_CIDADE);
            break;

        case 'SOLICITAR_CIDADE':
            userData.savedCity = text; // Mantenha text puro para texto livre
            userData.deliveryMethod = `Entregar na cidade: ${userData.savedCity} (CI: ${userData.savedCi})`;
            userData.triageCompletedAt = new Date().toISOString();
            navigateTo(userData, 'ATENDIMENTO_HUMANO');
            
            let resumoEndereco = TEXTS.RESUMO_TRIAGEM(userData);
            if (!isBusinessHours()) resumoEndereco += TEXTS.MENSAGEM_FORA_HORARIO;
            await sendMessage(remoteJid, resumoEndereco);
            break;

        case 'ATENDIMENTO_HUMANO':
            // O bot ignora as mensagens
            break;
            
        default:
            userData.state = null;
            break;
    }

    return userData;
}

module.exports = {
    processMessage,
    getDefaultUserData
};
