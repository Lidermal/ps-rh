// Configuração do Supabase
const supabaseUrl = 'https://mbrjuasxhlaeuuitjlar.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icmp1YXN4aGxhZXV1aXRqbGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Mjc5MTksImV4cCI6MjA5NjUwMzkxOX0.dJETIxd6Gv95Gte248aTNdEAv87YvTR4QrC22hdZWiU';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let roteiro = [];
let perguntaAtual = 0;
let respostas = {};

const chatWindow = document.getElementById('chat-window');
const inputResposta = document.getElementById('resposta');
const btnEnviar = document.getElementById('btn-enviar');

const TEMPO_LIMITE_SEGUNDOS = 60 * 60;
let tempoRestante = TEMPO_LIMITE_SEGUNDOS;
let timerInterval;

// 1. Inicializar o Chat com Boas-vindas
async function inicializarChat() {
    // Bloqueia o input para o usuário não digitar antes de iniciar
    inputResposta.disabled = true;
    btnEnviar.disabled = true;

    try {
        const response = await fetch('roteiro.json');
        const data = await response.json();
        roteiro = data.perguntas;
        
        // Mensagem de boas-vindas aprimorada
        const msgBoasVindas = "Olá! Sou o _JhonCortes_AI, Diretor de RH. Seja bem-vindo ao Processo Seletivo RH | 2026 | FEB.\n\n⚠️ Atenção: Esta prova tem duração máxima de 60 minutos e permite apenas uma tentativa por candidato.\n\nQuando estiver pronto, clique no botão abaixo para começar.";
        renderizarMensagemAI(msgBoasVindas);
        
        // Renderiza o botão de iniciar
        renderizarBotaoIniciar();
        
    } catch (error) {
        console.error("Erro ao carregar o roteiro:", error);
        renderizarMensagemAI("Erro ao carregar o sistema. Verifique o arquivo roteiro.json.");
    }
}

// 2. Renderizar o botão de Iniciar Prova
function renderizarBotaoIniciar() {
    const btnContainer = document.createElement('div');
    btnContainer.style.textAlign = 'center';
    btnContainer.style.margin = '20px 0';
    btnContainer.id = 'container-btn-iniciar';

    const btn = document.createElement('button');
    btn.innerText = "Iniciar Prova - Processo Seletivo RH | 2026 | FEB";
    btn.style.backgroundColor = '#2c52a0'; // Cor padrão do seu layout (bg-sidebar)
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.padding = '12px 20px';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.style.fontSize = '14px';
    btn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    btn.style.transition = '0.3s';

    btn.onmouseover = () => btn.style.backgroundColor = '#1e345d';
    btn.onmouseout = () => btn.style.backgroundColor = '#2c52a0';

    btn.onclick = () => {
        // Remove o botão da tela
        btnContainer.remove();
        
        // Desbloqueia o input
        inputResposta.disabled = false;
        btnEnviar.disabled = false;
        inputResposta.focus();

        // Renderiza a primeira pergunta do roteiro
        renderizarMensagemAI(roteiro[perguntaAtual].texto);
        
        // Inicia o tempo e as travas de segurança
        iniciarCronometro();
    };

    btnContainer.appendChild(btn);
    chatWindow.appendChild(btnContainer);
    rolarParaFinal();
}

// 3. Processar a entrada do usuário
async function processarResposta() {
    const textoUsuario = inputResposta.value.trim();
    if (textoUsuario === "") return;

    inputResposta.disabled = true;

    renderizarMensagemUsuario(textoUsuario);
    inputResposta.value = ""; 
    btnEnviar.classList.remove('active');

    const chave = roteiro[perguntaAtual].chave;
    respostas[chave] = textoUsuario;

    if (perguntaAtual === 0) {
        const usuarioValido = await verificarUsuario(textoUsuario);
        if (!usuarioValido) {
            renderizarMensagemAI("⚠️ Acesso negado: Este Nick já realizou a prova anteriormente.");
            return;
        }
    }

    if (perguntaAtual < roteiro.length - 1) {
        perguntaAtual++;
        
        setTimeout(() => {
            renderizarMensagemAI(roteiro[perguntaAtual].texto);
            inputResposta.disabled = false;
            inputResposta.focus();
        }, 600);
    } else {
        renderizarMensagemAI("Recebemos todas as suas respostas. Finalizando a prova e enviando dados...");
        await salvarNoSupabase("Prova finalizada com sucesso!");
    }
}

// 4. Funções Visuais para criar as bolhas do chat
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

// 5. Validação no Banco de Dados
async function verificarUsuario(nick) {
    const { data, error } = await supabase
        .from('entrevistas')
        .select('nick_patente')
        .eq('nick_patente', nick);

    if (error) {
        console.error("Erro ao verificar usuário no Supabase:", error);
        return false;
    }
    
    return data.length === 0; 
}

// 6. Salvar as respostas finais no Supabase
async function salvarNoSupabase(msgAlert) {
    clearInterval(timerInterval);
    inputResposta.disabled = true;

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
    
    location.reload();
}

// 7. Controle de Tempo
function iniciarCronometro() {
    setTimeout(() => {
        alert("O tempo de 60 minutos esgotou! Enviando suas respostas atuais ao RH...");
        salvarNoSupabase("Prova enviada por limite de tempo!");
    }, TEMPO_LIMITE_SEGUNDOS * 1000);

    timerInterval = setInterval(() => {
        let minutos = Math.floor(tempoRestante / 60);
        let segundos = tempoRestante % 60;

        const minFormatado = minutos < 10 ? '0' + minutos : minutos;
        const segFormatado = segundos < 10 ? '0' + segundos : segundos;
        const textoTimer = `${minFormatado}:${segFormatado}`;

        const timerMobile = document.getElementById('timer-mobile');
        const timerDesktop = document.getElementById('timer-desktop');
        
        if (timerMobile) timerMobile.innerText = textoTimer;
        if (timerDesktop) timerDesktop.innerText = `Tempo restante: ${textoTimer}`;

        if (tempoRestante > 0) tempoRestante--;
    }, 1000);
}

// Inicializa a aplicação
inicializarChat();
