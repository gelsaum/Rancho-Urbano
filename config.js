module.exports = {
    // Informações da Loja
    STORE_NAME: "Rancho Urbano",
    STORE_HOURS: "Seg-Sex 08:00 - 18:00",
    STORE_ADDRESS: "Rua Exemplo, 123 - Centro",
    PAYMENT_METHODS: "Pix, Transferência e Cartão",

    // Mensagens do Bot
    TEXTS: {
        SAUDACAO: (storeName, greeting) => `Olá! ${greeting}, bem-vindo(a) ao *${storeName}*.\n\nPara agilizar seu atendimento, selecione uma opção:\n\n1️⃣ 🛒 Fazer um Pedido\n2️⃣ ℹ️ Informações e Horários\n3️⃣ 📱 Viu algo no Instagram/TikTok?\n\n⏳ Ao finalizar, você será atendido por um humano.`,
        
        PEDIR_IMAGEM: `📸 *Legal!* Por favor, envie aqui a foto ou o print do produto que você gostou.\n\n◀️ Ou digite 0 para Voltar`,
        
        INFORMACOES: () => `📍 *Localização & Envios*\nEstamos localizados em San Alberto, Alto Paraná (Sobre la ruta).\n📦 ATENÇÃO: Fazemos envios para todo o Paraguai!\n\n⏰ *Horário de Atendimento*\n• Segunda a Sexta: 08:00 às 18:00\n• Sábado: 08:00 às 16:00\n\n💳 *Formas de Pagamento*\nAceitamos Transferência Bancária, PIX e Tarjetas de Crédito.\n\nDados para Pagamento:\n\nPIX (E-mail): angelicalongarette@icloud.com\n\nBanco Continental (Alias): 0984419151\n\nTitular: Angelica Longarette\n\n📱 Siga nosso Instagram: @rancho_urbano2\n\n1️⃣ 🛒 Fazer um pedido\n◀️ 0️⃣ Voltar`,
        
        CATEGORIAS: `🛒 *ESCOLHA A CATEGORIA:*\n\n1️⃣ 👕 Camisas/Camisetas\n2️⃣ 👖 Calças/Shorts\n3️⃣ 👟 Calçados\n4️⃣ 🎀 Acessórios\n5️⃣ 🍸 Bebidas\n6️⃣ 🌿 Ervas (Tereré/Chimarrão)\n7️⃣ 🎁 Outro\n\n◀️ 0️⃣ Voltar`,
        
        TAMANHOS: `📏 *SELECIONE O TAMANHO DESEJADO:*\n\n1️⃣ P\n2️⃣ M\n3️⃣ G\n4️⃣ GG\n5️⃣ G1\n\n◀️ 0️⃣ Voltar`,
        
        CALCADOS: `👟 *Entendido.*\n\nPor favor, digite o número do calçado que você usa:\n_(Tamanhos disponíveis variam entre 36 a 48)_\n\n◀️ Ou digite 0 para Voltar`,
        
        DESCRICAO: `✍️ *Por favor, digite o nome do produto que procura:*\n\n◀️ Ou digite 0 para Voltar`,
        
        MAIS_ITENS: `✅ *Item registrado!*\n\nDeseja adicionar outra categoria ao pedido?\n\n1️⃣ ➕ Sim, adicionar outro item\n2️⃣ 🛍️ Não, ir para o carrinho`,
        
        CONFIRMAR_CARRINHO: (items) => `🛒 *SEU CARRINHO ATUAL:*\n\n${items.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nO que deseja fazer?\n1️⃣ ✅ Confirmar e ir para entrega\n2️⃣ 🗑️ Remover um item`,
        
        REMOVER_ITEM: `🗑️ *Qual o número do item que deseja remover?*\n_(Digite o número correspondente na lista)_\n\n◀️ Ou digite 0 para Voltar`,
        TIPO_ENTREGA: `🚚 *Como você prefere receber seu pedido?*\n\n1️⃣ 🛵 Entregar no meu endereço\n2️⃣ 🏪 Retirar na loja\n\n◀️ 0️⃣ Voltar`,
        
        PEDIR_IDENTIDADE: `📄 *Certo! Para realizarmos a entrega, precisamos de alguns dados.*\n\nPor favor, digite o número da sua Identidade (CI):\n\n◀️ Ou digite 0 para Voltar`,
        
        PEDIR_CIDADE: `📍 *Perfeito! Agora, por favor, digite o nome da sua Cidade para entrega:*\n\n◀️ Ou digite 0 para Voltar`,

        CONFIRMAR_DADOS_ENTREGA: (ci, cidade) => `Encontrei os seus dados salvos para entrega:\n\n📄 *Identidade (CI):* ${ci}\n📍 *Cidade:* ${cidade}\n\nDeseja utilizar estes dados para a entrega?\n\n1️⃣ ✅ Sim, utilizar estes dados\n2️⃣ ✏️ Não, informar novos dados\n\n◀️ 0️⃣ Voltar`,

        ERRO: `❌ Não entendi sua opção. Por favor, digite o número correspondente à sua escolha (ex: 1, 2, 3...).`,
        
        ERRO_CALCADO: `❌ Por favor, digite um número de calçado válido entre 36 e 48.`,

        ATENDIMENTO_REINICIADO: `🔄 *Atendimento reiniciado!*\n\n`,
        
        ATENDIMENTO_ENCERRADO: `🤖 *Atendimento finalizado pelo humano.*\nO assistente virtual do Rancho Urbano voltou a assumir o seu atendimento! Digite qualquer coisa se precisar de nós novamente.`,

        MENSAGEM_FORA_HORARIO: `\n\n🌙 *Nosso horário de atendimento encerrou.*\nMas não se preocupe! Seu pedido/solicitação já está na nossa fila e responderemos assim que retornarmos no próximo dia útil.`,

        ERRO_IMAGEM: `Por favor, nos envie a foto (imagem) do produto para podermos ajudar.`,

        IMAGEM_RECEBIDA: `✅ Imagem recebida com sucesso!\n\n`,

        RESUMO_TRIAGEM: (userData) => {
            let resumo = `✅ *TRIAGEM CONCLUÍDA!*\n\n`;

            if (userData.deliveryMethod === 'Retirar na loja') {
                resumo += `📍 *RETIRADA*\n   Na Loja Física\n`;
            } else {
                resumo += `📍 *ENTREGA*\n   ${userData.savedCity || 'Endereço não informado'}\n   🆔 CI: ${userData.savedCi || 'Não informada'}\n`;
            }

            resumo += `\n━━━━━━━━━━━━━━━━━━━━━━━\n\n🛒 *ITENS SELECIONADOS:*\n\n`;

            const ICONS = {
                'Camisas/Camisetas': '👕',
                'Calças/Shorts': '👖',
                'Calçados': '👟',
                'Acessórios': '🎀',
                'Bebidas': '🍸',
                'Ervas (Tereré/Chimarrão)': '🌿',
                'Outro': '🎁'
            };

            userData.interests.forEach(item => {
                let categoryName = item.split(' (')[0];
                let icon = ICONS[categoryName] || '🛍️';
                
                let itemText = item;
                // Transforma "Categoria (Tamanho: M)" em "Categoria → Tam: M"
                itemText = itemText.replace(' (Tamanho: ', ' → Tam: ')
                                   .replace(' (Número: ', ' → Nº: ')
                                   .replace(' (', ' → ')
                                   .replace(')', '');
                
                resumo += `${icon} ${itemText}\n`;
            });

            resumo += `\n━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            resumo += `⏳ *PRÓXIMO PASSO*\nAguarde! Um atendente humano estará entrando em contato para confirmar os detalhes.`;

            return resumo;
        },

        RESUMO_IMAGEM: `✅ Imagem recebida com sucesso!\n\n📋 Resumo:\n🛒 Interesse: Imagem do produto\n\nAguarde um momento. Nossa equipe irá analisar a foto e falar com você em breve para confirmar valores e tamanhos disponíveis.`
    }
};
