// Configuração do Supabase (substitua pelas suas chaves lá no painel do Supabase)
const supabase = supabase.createClient('https://mbrjuasxhlaeuuitjlar.supabase.co/rest/v1/', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icmp1YXN4aGxhZXV1aXRqbGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Mjc5MTksImV4cCI6MjA5NjUwMzkxOX0.dJETIxd6Gv95Gte248aTNdEAv87YvTR4QrC22hdZWiU');

let roteiro = [];
let perguntaAtual = 0;
let respostas = {};

// 1. Carregar o roteiro do GitHub
async function carregarRoteiro() {
    const response = await fetch('roteiro.json');
    const data = await response.json();
    roteiro = data.perguntas;
    exibirPergunta();
}

// 2. Exibir a pergunta na tela
function exibirPergunta() {
    document.getElementById('chat-box').innerText = roteiro[perguntaAtual].texto;
}

// 3. Ao enviar a resposta
async function enviarResposta(textoUsuario) {
    const chave = roteiro[perguntaAtual].chave;
    respostas[chave] = textoUsuario;

    // Se for a última, salva tudo no Supabase
    if (perguntaAtual === roteiro.length - 1) {
        await salvarNoSupabase();
    } else {
        perguntaAtual++;
        exibirPergunta();
    }
}

// Verifica se o usuário já respondeu
async function verificarUsuario(nick) {
    const { data } = await supabase
        .from('entrevistas')
        .select('nick_patente')
        .eq('nick_patente', nick);
    
    if (data.length > 0) {
        alert("Você já realizou esta prova anteriormente.");
        return false;
    }
    return true;
}

// Lógica de tempo (60 minutos)
const TEMPO_LIMITE = 60 * 60 * 1000; // 60 minutos em milissegundos
let tempoInicio = Date.now();

function iniciarCronometro() {
    setTimeout(() => {
        alert("O tempo acabou! Enviando suas respostas atuais...");
        salvarNoSupabase(); // Envia o que foi respondido até o momento
    }, TEMPO_LIMITE);
}

// 4. Salvar no Supabase
async function salvarNoSupabase() {
    const { data, error } = await supabase
        .from('entrevistas')
        .insert([respostas]);
    
    alert("Prova realizada com sucesso!");
}

carregarRoteiro();
