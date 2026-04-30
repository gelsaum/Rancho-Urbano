# Documentação de Lógica - Chatbot WhatsApp (E-commerce)

## 1. Visão Geral e Objetivo
Este documento descreve a lógica de funcionamento de um chatbot para WhatsApp focado em vendas e logística (estilo dropshipping/entrega por transportadora).

**Objetivo Principal**: Realizar a triagem inicial do pedido, coletando dados essenciais de envio (Cidade e CI) e a intenção de compra básica (Categoria/Tamanho), para então transferir para um atendente humano que fará o detalhamento final (modelo, cor, quantidade, pagamento).

---

## 2. Regras de Negócio (Importante)
- **Sem Atalho Humano no Início**: O cliente obrigatoriamente deve passar pelo fluxo de triagem do bot antes de ser direcionado ao humano.
- **Coleta de Documento**: A Cédula de Identidad (CI) é obrigatória para envio via transportadora.
- **Simplificação do Pedido**: O bot coleta apenas a Categoria e o Tamanho. Não perguntar quantidade, cor ou modelo.
- **Calçados (Input Livre)**: Para a categoria "Calçados", não usar menu de botões, mas sim texto livre, informando a grade disponível (36-48).

---

## 3. Fluxo de Navegação

### 3.1. Saudação Inicial
- **Gatilho**: Primeira mensagem do cliente ou comando "Oi", "Olá".
- **Resposta do Bot**:
  ```text
  Olá! Bem-vindo(a) à [Nome da Loja].
  
  Para agilizar seu atendimento, selecione uma opção:
  
  1️⃣ - Fazer um Pedido
  2️⃣ - Informações e Horários
  
  Ao finalizar, você será atendido por um humano.
  ```

### 3.2. Ramificação Principal

#### Opção 1: Fazer um Pedido
Ao selecionar esta opção, o bot apresenta o menu de categorias.
- **Resposta do Bot**:
  ```text
  Ótimo! Qual categoria de produto você deseja?
  
  1️⃣ - Camisas/Camisetas
  2️⃣ - Calças/Shorts
  3️⃣ - Calçados
  4️⃣ - Acessórios
  5️⃣ - Bebidas
  6️⃣ - Ervas (Tereré/Chimarrão)
  7️⃣ - Outro
  ```

#### Opção 2: Informações/Horários
- **Resposta do Bot**:
  ```text
  Aqui estão nossas informações:
  
  🕒 Horário de Atendimento:
  [Inserir horários, ex: Seg-Sex 08:00 - 18:00]
  
  📍 Localização:
  [Inserir endereço ou link do Google Maps]
  
  💳 Formas de Pagamento:
  [Inserir métodos: Pix, Transferência, etc.]
  
  Para fazer um pedido, digite 1.
  ```
> *(Caso o cliente queira pedir após ler as infos, ele deve digitar 1 ou voltar ao menu inicial).*

---

## 4. Lógica de Detalhamento do Pedido
Após o cliente escolher a categoria, o bot deve processar da seguinte forma:

### 4.1. Se escolher: 1 (Camisas) ou 2 (Calças/Shorts)
- **Ação**: Apresentar menu de tamanhos fixo.
- **Resposta do Bot**:
  ```text
  Selecione o tamanho desejado:
  
  1️⃣ - P
  2️⃣ - M
  3️⃣ - G
  4️⃣ - GG
  5️⃣ - G1
  ```
- **Registro**: Salvar `[Categoria] + [Tamanho]`.

### 4.2. Se escolher: 3 (Calçados)
- **Ação**: Solicitar input de texto livre (não usar lista de botões).
- **Resposta do Bot**:
  ```text
  Entendido.
  
  Por favor, digite o número do calçado que você usa:
  (Tamanhos disponíveis variam entre 36 a 48)
  ```
- **Registro**: Salvar `[Calçados] + [Número digitado]`.

### 4.3. Se escolher: 4, 5, 6 ou 7 (Acessórios, Bebidas, Ervas, Outro)
- **Ação**: Solicitar descrição breve.
- **Resposta do Bot**:
  ```text
  Por favor, digite o nome do produto que procura:
  ```
- **Registro**: Salvar `[Categoria] + [Texto digitado]`.

---

## 5. Pós-Seleção (Loop de Itens)
Após registrar o primeiro item, o bot deve perguntar se há mais interesses.

- **Resposta do Bot**:
  ```text
  Item registrado! ✅
  
  Deseja adicionar outra categoria ao pedido?
  1️⃣ - Sim, adicionar outro item
  2️⃣ - Não, finalizar pedido
  ```
- **Se 1**: Voltar ao Menu de Categorias (Seção 3.2 - Opção 1).
- **Se 2**: Ir para Coleta de Dados de Envio.

---

## 6. Coleta de Dados para Envio (Triagem Obrigatória)
Esta etapa é crítica para a logística.

### Passo 1: Cidade
- **Resposta do Bot**:
  ```text
  Para prosseguir com o envio, precisamos dos dados para a transportadora.
  
  📍 Para qual cidade será o envio?
  ```
- *(Aguardar input de texto)*

### Passo 2: Cédula de Identidad (CI)
- **Resposta do Bot**:
  ```text
  🪪 Digite o número da sua Cédula de Identidad (CI):
  ```
- *(Aguardar input de texto)*

---

## 7. Finalização e Transferência
Após coletar cidade e CI, o bot apresenta o resumo e encerra.

- **Resposta do Bot**:
  ```text
  ✅ Triagem concluída!
  
  📋 Resumo:
  🛒 Interesse: [Listar categorias/tamanhos coletados]
  📍 Cidade: [Cidade coletada]
  🪪 CI: [Número coletado]
  
  Aguarde um momento. Você será atendido por um humano para confirmar o modelo, estoque, valor do frete e forma de pagamento.
  ```
- **Ação Técnica**: Enviar mensagem para fila de atendimento humano ou notificar equipe.

---

## 8. Tratamento de Erros (Fallback)
Caso o cliente digite algo fora do esperado:

- **Resposta do Bot**: 
  ```text
  Não entendi sua opção. Por favor, digite o número correspondente à sua escolha (ex: 1, 2, 3...).
  ```
