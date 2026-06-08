// Configuração do Supabase (Ajustado para a URL base correta exigida pela biblioteca JS)
const supabaseUrl = 'https://mbrjuasxhlaeuuitjlar.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icmp1YXN4aGxhZXV1aXRqbGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Mjc5MTksImV4cCI6MjA5NjUwMzkxOX0.dJETIxd6Gv95Gte248aTNdEAv87YvTR4QrC22hdZWiU';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let roteiro = [];
let perguntaAtual = 0;
let respostas = {};

// Elementos da interface (baseado no novo HTML)
const chatWindow = document.getElementById('chat-window');
const inputResposta = document.getElementById('resposta');

// Configuração do Cronômetro (60 minutos = 3600 segundos)
const TEMPO_LIMITE_SEGUNDOS = 60 * 60;
let tempoRestante = TEMPO_LIMITE_SEGUNDOS;
let timerInterval;

// 1. Carregar o roteiro do arquivo JSON
async function carregarRoteiro() {
    try {
        const response = await fetch('roteiro.json');
        const data = await response.json();
        roteiro = data.perguntas;
        
        // Renderiza a primeira pergunta do AI
        renderizarMensagemAI(roteiro[perguntaAtual].texto);
        
        // Inicia temporizador visual e a trava de segurança
        iniciarCronometro();
    } catch (error) {
        console.error("Erro ao carregar o roteiro:", error);
        renderizarMensagemAI("Erro ao carregar o sistema. Verifique o arquivo roteiro.json.");
    }
}

// 2. Processar a entrada do usuário
async function processarResposta() {
    const textoUsuario = inputResposta.value.trim();
    if (textoUsuario === "") return; // Ignora envios em branco

    // Desativa o input temporariamente para evitar envio duplo
    inputResposta.disabled = true;

    // Renderiza a bolha de mensagem do usuário na tela
    renderizarMensagemUsuario(textoUsuario);
    inputResposta.value = ""; 
    document.getElementById('btn-enviar').classList.remove('active'); // Tira a cor do botão

    // Salva a resposta no objeto de memória
    const chave = roteiro[perguntaAtual].chave;
    respostas[chave] = textoUsuario;

    // Se for a primeira pergunta (Nick e Patente), faz a validação no Supabase
    if (perguntaAtual === 0) {
        const usuarioValido = await verificarUsuario(textoUsuario);
        if (!usuarioValido) {
            renderizarMensagemAI("⚠️ Acesso negado: Este Nick já realizou a prova anteriormente.");
            return; // Interrompe o fluxo e mantém o input bloqueado
        }
    }

    // Verifica se existem mais perguntas
    if (perguntaAtual < roteiro.length - 1) {
        perguntaAtual++;
        
        // Adiciona um pequeno delay (600ms) para dar um efeito natural de "digitando"
        setTimeout(() => {
            renderizarMensagemAI(roteiro[perguntaAtual].texto);
            inputResposta.disabled = false;
            inputResposta.focus();
        }, 600);
    } else {
        // Fim do questionário
        renderizarMensagemAI("Recebemos todas as suas respostas. Finalizando a prova e enviando dados...");
        await salvarNoSupabase("Prova finalizada com sucesso!");
    }
}

// 3. Funções Visuais para criar as bolhas do chat
function renderizarMensagemAI(texto) {
    const aiBubble = document.createElement('div');
    aiBubble.classList.add('message-bubble', 'ai-bubble');
    aiBubble.innerText = texto;
    chatWindow.appendChild(aiBubble);
    rolarParaFinal();
}

function renderizarMensagemUsuario(texto) {
    const userBubble = document.createElement('div');
    userBubble.classList.add('message-bubble', 'user-bubble');
    userBubble.innerText = texto;
    chatWindow.appendChild(userBubble);
    rolarParaFinal();
}

function rolarParaFinal() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 4. Validação no Banco de Dados (Bloqueio de tentativa dupla)
async function verificarUsuario(nick) {
    const { data, error } = await supabase
        .from('entrevistas')
        .select('nick_patente')
        .eq('nick_patente', nick);

    if (error) {
        console.error("Erro ao verificar usuário no Supabase:", error);
        return false;
    }
    
    // Retorna true APENAS se o nick não existir no banco
    return data.length === 0; 
}

// 5. Salvar as respostas finais no Supabase
async function salvarNoSupabase(msgAlert) {
    clearInterval(timerInterval); // Para a contagem do relógio
    inputResposta.disabled = true;

    // Adiciona uma marcação de tempo extra de finalização
    respostas['finalizado_em'] = new Date().toISOString(); 

    const { data, error } = await supabase
        .from('entrevistas')
        .insert([respostas]);
    
    if (error) {
        console.error("Erro ao salvar no banco:", error);
        alert("Ocorreu um erro técnico ao salvar sua prova.");
    } else {
        alert(msgAlert || "Dados enviados com sucesso!");
    }
    
    // Recarrega a página para reiniciar a sessão e evitar edições
    location.reload();
}

// 6. Controle de Tempo (Timer visual e encerramento forçado)
function iniciarCronometro() {
    // Trava de segurança: Envia automaticamente após 60 minutos exatos
    setTimeout(() => {
        alert("O tempo de 60 minutos esgotou! Enviando suas respostas atuais ao RH...");
        salvarNoSupabase("Prova enviada por limite de tempo!");
    }, TEMPO_LIMITE_SEGUNDOS * 1000);

    // Atualização visual dos relógios na tela a cada 1 segundo
    timerInterval = setInterval(() => {
        let minutos = Math.floor(tempoRestante / 60);
        let segundos = tempoRestante % 60;

        const minFormatado = minutos < 10 ? '0' + minutos : minutos;
        const segFormatado = segundos < 10 ? '0' + segundos : segundos;
        const textoTimer = `${minFormatado}:${segFormatado}`;

        // Altera o HTML dos relógios mobile e desktop
        const timerMobile = document.getElementById('timer-mobile');
        const timerDesktop = document.getElementById('timer-desktop');
        
        if (timerMobile) timerMobile.innerText = textoTimer;
        if (timerDesktop) timerDesktop.innerText = `Tempo restante: ${textoTimer}`;

        if (tempoRestante > 0) tempoRestante--;
    }, 1000);
}

// Inicializa a aplicação ao abrir a página
carregarRoteiro();
