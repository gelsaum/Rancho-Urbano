const config = require('../config');
const { sendMessage } = require('./evolutionService');

const TEXTS = {
    ...config.TEXTS,
    INFORMACOES: config.TEXTS.INFORMACOES(config.STORE_HOURS, config.STORE_ADDRESS, config.PAYMENT_METHODS)
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

    // Comando Global de Reset
    if (['cancelar', 'reiniciar', 'reset'].includes(msgType)) {
        Object.assign(userData, getDefaultUserData());
        userData.state = 'SAUDACAO';
        await sendMessage(remoteJid, TEXTS.ATENDIMENTO_REINICIADO + getSaudacao());
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
            case 'SOLICITAR_IDENTIDADE': await sendMessage(remoteJid, TEXTS.PEDIR_IDENTIDADE); break;
            case 'SOLICITAR_CIDADE': await sendMessage(remoteJid, TEXTS.PEDIR_CIDADE); break;
            case 'CONFIRMAR_DADOS_ENTREGA': await sendMessage(remoteJid, TEXTS.CONFIRMAR_DADOS_ENTREGA(userData.savedCi, userData.savedCity)); break;
            default: await sendMessage(remoteJid, getSaudacao()); break;
        }
        return userData;
    }

    // Processamento por estado
    switch (userData.state) {
        case null:
        case 'SAUDACAO':
            if (text === '1') {
                navigateTo(userData, 'CATEGORIAS');
                await sendMessage(remoteJid, TEXTS.CATEGORIAS);
            } else if (text === '2') {
                await sendMessage(remoteJid, TEXTS.INFORMACOES);
                // Não navegamos para frente, mantemos no estado SAUDACAO
            } else if (text === '3') {
                navigateTo(userData, 'AGUARDANDO_IMAGEM');
                await sendMessage(remoteJid, TEXTS.PEDIR_IMAGEM);
            } else if (text === '0') {
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
            if (['1', '2'].includes(text)) {
                userData.currentCategory = CATEGORIES_MAP[text];
                navigateTo(userData, 'TAMANHOS');
                await sendMessage(remoteJid, TEXTS.TAMANHOS);
            } else if (text === '3') {
                userData.currentCategory = CATEGORIES_MAP[text];
                navigateTo(userData, 'CALCADOS');
                await sendMessage(remoteJid, TEXTS.CALCADOS);
            } else if (['4', '5', '6', '7'].includes(text)) {
                userData.currentCategory = CATEGORIES_MAP[text];
                navigateTo(userData, 'DESCRICAO');
                await sendMessage(remoteJid, TEXTS.DESCRICAO);
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO);
            }
            break;

        case 'TAMANHOS':
            if (SIZES_MAP[msgType]) {
                userData.interests.push(`${userData.currentCategory} (Tamanho: ${SIZES_MAP[msgType]})`);
                navigateTo(userData, 'MAIS_ITENS');
                await sendMessage(remoteJid, TEXTS.MAIS_ITENS);
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO);
            }
            break;

        case 'CALCADOS':
            const calcadoNum = parseInt(text);
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
            if (text === '1') {
                navigateTo(userData, 'CATEGORIAS');
                userData.currentCategory = null;
                await sendMessage(remoteJid, TEXTS.CATEGORIAS);
            } else if (text === '2') {
                navigateTo(userData, 'TIPO_ENTREGA');
                await sendMessage(remoteJid, TEXTS.TIPO_ENTREGA);
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO);
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
            if (['1', '2'].includes(text)) {
                if (text === '1') {
                    if (userData.savedCi && userData.savedCity) {
                        navigateTo(userData, 'CONFIRMAR_DADOS_ENTREGA');
                        await sendMessage(remoteJid, TEXTS.CONFIRMAR_DADOS_ENTREGA(userData.savedCi, userData.savedCity));
                    } else {
                        navigateTo(userData, 'SOLICITAR_IDENTIDADE');
                        await sendMessage(remoteJid, TEXTS.PEDIR_IDENTIDADE);
                    }
                } else {
                    userData.deliveryMethod = 'Retirar na loja';
                    navigateTo(userData, 'ATENDIMENTO_HUMANO');
                    
                    const resumo = TEXTS.RESUMO_TRIAGEM(userData);
                    await sendMessage(remoteJid, resumo);
                }
            } else {
                await sendMessage(remoteJid, TEXTS.ERRO);
            }
            break;

        case 'CONFIRMAR_DADOS_ENTREGA':
            if (text === '1') {
                userData.deliveryMethod = `Entregar na cidade: ${userData.savedCity} (CI: ${userData.savedCi})`;
                navigateTo(userData, 'ATENDIMENTO_HUMANO');
                
                const resumo = TEXTS.RESUMO_TRIAGEM(userData);
                await sendMessage(remoteJid, resumo);
            } else if (text === '2') {
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
            userData.savedCity = text;
            userData.deliveryMethod = `Entregar na cidade: ${userData.savedCity} (CI: ${userData.savedCi})`;
            navigateTo(userData, 'ATENDIMENTO_HUMANO');
            
            const resumoEndereco = TEXTS.RESUMO_TRIAGEM(userData);
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
