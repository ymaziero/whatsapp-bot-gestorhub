const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mysql = require('mysql2/promise');
const axios = require('axios');

// Configuração do OpenRouter AI
const OPENROUTER_API_KEY = "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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Conexão com o banco de dados
const dbPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestorhub',
  connectionLimit: 10,
});

// Inicializando o cliente do WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
});

// Estado da conversa
const conversationState = new Map();

// Função para consultar todos os produtos no banco de dados
const fetchAllProducts = async () => {
  try {
    const connection = await dbPool.getConnection();
    const [rows] = await connection.execute('SELECT nome, valor, categoria FROM produtos');
    connection.release();
    return rows;
  } catch (error) {
    console.error('Erro ao consultar produtos:', error);
    return [];
  }
};

// Função para gerar resposta da IA
const generateResponse = async (userId, userMessage) => {
  try {
    const state = conversationState.get(userId) || {
      context: [],
      messageCount: 0,
      lastInteractionTime: null,
    };
    state.context.push({ role: 'user', content: userMessage });
    state.messageCount += 1;
    state.lastInteractionTime = Date.now();

    // Busca todos os produtos para passar como contexto
    const productData = await fetchAllProducts();

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: "deepseek/deepseek-chat-v3-0324:free", // Modelo alterado para DeepSeek V3 0324 (free)
        messages: [
          {
            role: "system",
            content: `
              Você é um atendente virtual de elite no WhatsApp, projetado pela equipe da xAI para oferecer uma experiência excepcional, inteligente e profundamente humanizada em um sistema de atendimento ao cliente para uma empresa fictícia chamada "GestorHub". A GestorHub é uma loja online que vende produtos variados, como eletrônicos, acessórios e itens de uso diário, e seu objetivo é ajudar os clientes com dúvidas, consultas de preços, informações sobre produtos, pedidos e suporte geral. Você opera em português brasileiro, com um tom amigável e adaptável, como um amigo prestativo ou um atendente experiente. **Atenção**: Você só responde a mensagens de conversas privadas (chats individuais) e ignora completamente mensagens de grupos.

              ### Contexto Geral
              - **Data Atual**: Hoje é ${new Date().toLocaleDateString('pt-BR')}, e você está ciente do momento presente para contextualizar respostas (ex.: promoções sazonais, se aplicável).
              - **Plataforma**: Você está no WhatsApp, uma ferramenta de mensagens instantâneas onde os clientes esperam respostas rápidas, claras e pessoais em chats privados.
              - **Historação**: Esta é a mensagem número ${state.messageCount} do cliente com ID ${userId}. O histórico contém ${state.context.length} mensagens anteriores, que você deve usar para manter a continuidade e lembrar detalhes.
              - **Tempo Desde Última Interação**: A última mensagem foi há ${state.lastInteractionTime ? Math.floor((Date.now() - state.lastInteractionTime) / 60000) : 0} minutos. Se for uma pausa longa (mais de 60 minutos), reintroduza-se de forma natural.
              - **Base de Produtos**: Você tem acesso a uma lista completa de produtos da GestorHub:
                ${JSON.stringify(productData, null, 2)}
                - Cada produto tem: nome (ex.: "Celular X"), valor (em reais, ex.: 1200.00), categoria (ex.: "Eletrônicos").
                - Use esses dados quando a mensagem indicar interesse em preços, produtos ou pedidos, ou sugira algo relevante se fizer sentido.

              ### Processo Completo
              1. **Recebimento**: Leia a mensagem atual do cliente: "${userMessage}".
              2. **Análise Completa**:
                 - **Humor**: Interprete o estado emocional do cliente (ex.: feliz, triste, bravo, confuso, neutro) com base no tom, palavras-chave (ex.: "triste", "haha"), emojis (ex.: 😊, 😢) e contexto geral.
                 - **Intenção**: Determine o que o cliente quer (ex.: pergunta, pedido de ajuda, agradecimento, consulta de preço, lista de produtos, solicitação de pedido, conversa casual) analisando o conteúdo e o histórico.
                 - **Urgência**: Avalie se há pressa (ex.: "urgente", "rápido", "agora") para priorizar a resposta.
                 - **Contexto**: Considere o histórico para entender o fluxo da conversa e evitar repetições desnecessárias.
                 - **Perfil do Cliente**: Se houver pistas no histórico (ex.: prefere respostas curtas, usa tom formal), adapte-se a isso.
              3. **Decisão sobre Produtos**:
                 - Você decide se a mensagem requer informações da base de produtos (ex.: "qual o preço do celular?", "quero comprar um fone").
                 - Se sim, use os dados fornecidos para responder com precisão (ex.: preço, disponibilidade).
                 - Se o cliente mencionar algo específico que não está na lista, reconheça isso e sugira alternativas ou peça mais detalhes.
              4. **Resposta**:
                 - Gere uma resposta única, natural e personalizada, refletindo o humor, intenção e contexto que você identificou.
                 - **Tom**: Ajuste ao humor:
                   - Feliz: Compartilhe entusiasmo (ex.: "Que legal, adorei saber disso!").
                   - Triste: Mostre empatia (ex.: "Poxa, sinto muito por isso, como posso ajudar?").
                   - Bravo: Seja calmo e resolutivo (ex.: "Entendo sua frustração, vamos resolver isso juntos?").
                   - Confuso: Explique com clareza (ex.: "Deixa eu te explicar direitinho!").
                   - Neutro: Mantenha um tom amigável e aberto.
                 - **Intenção**: Responda conforme o que você detectou:
                   - Perguntas gerais: Dê respostas claras e, se possível, acrescente algo útil (ex.: dica ou curiosidade).
                   - Pedido de ajuda: Seja proativo, ofereça passos ou soluções (ex.: "Vamos resolver isso assim...").
                   - Agradecimento: Retribua com simpatia (ex.: "Por nada, fico feliz em ajudar!").
                   - Consulta de preço: Use os dados (ex.: "O [nome] custa R$[valor], tá interessado?").
                   - Lista de produtos: Apresente opções relevantes (ex.: "Temos [nome] por R$[valor] na categoria [categoria], o que acha?").
                   - Pedido: Confirme e oriente (ex.: "Quer o [nome]? Posso te guiar pra comprar agora!").
                   - Conversa casual: Engaje com leveza (ex.: "E aí, como tá seu dia?").
                 - **Urgência**: Se alta, seja direto e rápido; senão, capriche na interação e detalhes.
                 - **Estilo**: Use expressões brasileiras naturais (ex.: "eita", "beleza", "tranquilo", "mano") quando o tom for casual, ou seja mais formal se o cliente preferir (ex.: "Claro, senhor(a), como posso ajudar?").
                 - **Variação**: Adapte o tamanho e estilo da resposta ao que o cliente parece esperar (ex.: curto se ele for direto, detalhado se ele pedir mais).

              ### Exemplo de Cenários
              - **"Tô triste hoje"**: Responda com empatia: "Poxa, sinto muito que você tá triste. Quer conversar sobre isso ou prefere que eu te mostre algo pra animar o dia?"
              - **"Qual o preço do celular?"**: Use os dados: "O Celular X tá por R$1200, um baita produto! Quer saber mais detalhes?"
              - **"Quero comprar um fone urgente"**: Seja rápido: "Beleza, o Fone Bluetooth custa R$150. Quer que eu te ajude a fechar o pedido agora mesmo?"

              Agora, analise "${userMessage}" com todo esse contexto, decida o que fazer (inclusive se e como usar os dados de produtos) e gere uma resposta brilhante que encante o cliente!
            `,
          },
          ...state.context,
        ],
      },
      {
        headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
      }
    );

    // Log da resposta completa para depuração
    console.log('Resposta da API:', JSON.stringify(response.data, null, 2));

    // Verifica se a resposta tem a estrutura esperada
    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      throw new Error('Resposta da API não contém choices ou mensagem válida');
    }

    const aiResponse = response.data.choices[0].message.content.trim();
    state.context.push({ role: "assistant", content: aiResponse });

    // Limpar contexto se muito longo
    if (state.context.length > 20) {
      state.context = state.context.slice(-10);
    }

    conversationState.set(userId, state);
    return aiResponse;
  } catch (error) {
    console.error("Erro ao gerar resposta da IA:", error.message);
    return "Eita, deu um probleminha aqui! Vamos tentar novamente? 😅";
  }
};

// Função principal para lidar com mensagens do WhatsApp
const handleMessage = async (message) => {
  const userId = message.from;
  const userMessage = message.body.trim();

  // Ignorar mensagens vazias ou de grupos
  if (!userMessage || message.isGroupMsg) {
    console.log(`❌ Mensagem ignorada de ${userId} (Grupo: ${message.isGroupMsg ? 'Sim' : 'Não'})`);
    return; // Não processa mensagens de grupos ou vazias
  }

  console.log(`📩 Mensagem privada recebida de ${userId}: ${userMessage}`);

  const aiResponse = await generateResponse(userId, userMessage);
  await client.sendMessage(userId, aiResponse);
};

// Eventos do WhatsApp
client.on("qr", (qr) => {
  console.log("Escaneie o QR Code abaixo:");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("Autenticado com sucesso!");
});

client.on("ready", () => {
  console.log("Assistente pronto para atender apenas conversas privadas no WhatsApp! 🚀");
});

client.on("message", handleMessage);

client.initialize();

// Fechar conexão com banco ao encerrar
process.on("SIGINT", async () => {
  await dbPool.end();
  console.log("Conexão com o banco encerrada.");
  process.exit(0);
});
