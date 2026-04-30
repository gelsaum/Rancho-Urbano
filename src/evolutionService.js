const axios = require('axios');
const axiosRetry = require('axios-retry').default;

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = process.env.INSTANCE_NAME;

// Configurar o cliente axios com retry (3 tentativas em caso de erro de rede ou 5xx)
const apiClient = axios.create({
    baseURL: EVOLUTION_API_URL,
    headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
    }
});

axiosRetry(apiClient, { 
    retries: 3, 
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
    }
});

async function sendMessage(number, text) {
    try {
        const payload = {
            number: number,
            text: text
        };

        await apiClient.post(
            `/message/sendText/${INSTANCE_NAME}`,
            payload
        );
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error.response ? error.response.data : error.message);
    }
}

async function fetchProfile(number) {
    let finalProfile = null;
    
    // Tenta primeiro via fetchProfile
    try {
        const payload = { number: number };
        const response = await apiClient.post(
            `/chat/fetchProfile/${INSTANCE_NAME}`,
            payload
        );
        if (response.data && (response.data.name || response.data.pushName)) {
            finalProfile = response.data;
        }
    } catch (error) {
        console.error('Erro no fetchProfile:', error.message);
    }

    // Se não encontrou o nome, tenta via findContacts (que puxa os contatos salvos no celular da loja)
    if (!finalProfile || (!finalProfile.name && !finalProfile.pushName)) {
        try {
            const response = await apiClient.post(
                `/chat/findContacts/${INSTANCE_NAME}`,
                { where: { id: `${number}@s.whatsapp.net` } }
            );
            
            if (response.data && response.data.length > 0) {
                const contact = response.data[0];
                finalProfile = {
                    name: contact.name || contact.pushName || contact.verifiedName,
                    pushName: contact.pushName
                };
            }
        } catch (error) {
            console.error('Erro no findContacts:', error.message);
        }
    }

    return finalProfile;
}

module.exports = {
    sendMessage,
    fetchProfile
};
