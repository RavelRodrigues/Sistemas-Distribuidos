const { spawn } = require('child_process');
const path = require('path');

// Configuração dos servidores
const SERVERS = [
  { port: 3001, name: 'Server-1', color: '\x1b[36m' }, // Ciano
  { port: 3002, name: 'Server-2', color: '\x1b[33m' }, // Amarelo
  { port: 3003, name: 'Server-3', color: '\x1b[35m' }, // Magenta
];

const RESET_COLOR = '\x1b[0m';

// Array para armazenar os processos dos servidores
const serverProcesses = [];

// Função para iniciar um servidor individual
function startServer(serverConfig) {
  const { port, name, color } = serverConfig;
  
  console.log(`${color}[CLUSTER] Iniciando ${name} na porta ${port}...${RESET_COLOR}`);
  
  // Spawn do processo Node.js para o servidor
  const serverProcess = spawn('node', [
    path.join(__dirname, 'server.js'),
    port.toString()
  ], {
    stdio: 'inherit', // Herda stdout/stderr do processo pai
    shell: true
  });

  // Evento quando o servidor é iniciado
  serverProcess.on('spawn', () => {
    console.log(`${color}[CLUSTER] ${name} iniciado com sucesso! ✅${RESET_COLOR}`);
  });

  // Evento de erro
  serverProcess.on('error', (err) => {
    console.error(`${color}[CLUSTER] Erro ao iniciar ${name}:${RESET_COLOR}`, err.message);
  });

  // Evento quando o servidor é encerrado
  serverProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.log(`${color}[CLUSTER] ${name} encerrado com código ${code}${RESET_COLOR}`);
    } else if (signal) {
      console.log(`${color}[CLUSTER] ${name} encerrado por sinal ${signal}${RESET_COLOR}`);
    }
  });

  // Adicionar ao array de processos
  serverProcesses.push({
    process: serverProcess,
    config: serverConfig
  });

  return serverProcess;
}

// Função para encerrar todos os servidores
function stopAllServers() {
  console.log('\n[CLUSTER] Encerrando todos os servidores...');
  
  serverProcesses.forEach(({ process, config }) => {
    console.log(`${config.color}[CLUSTER] Encerrando ${config.name}...${RESET_COLOR}`);
    process.kill('SIGTERM');
  });

  // Aguardar um pouco antes de forçar o encerramento
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

// Função para exibir status dos servidores
function displayStatus() {
  console.log('\n' + '='.repeat(60));
  console.log(' SHOPNOW - CLUSTER DE SERVIDORES');
  console.log('='.repeat(60));
  
  SERVERS.forEach(server => {
    console.log(`${server.color}  • ${server.name.padEnd(12)} → http://localhost:${server.port}${RESET_COLOR}`);
  });
  
  console.log('='.repeat(60));
  console.log(' Pressione CTRL+C para encerrar todos os servidores');
  console.log('='.repeat(60) + '\n');
}

// Função principal
function main() {
  console.log('\n Iniciando Cluster Manager do ShopNow...\n');

  // Iniciar todos os servidores
  SERVERS.forEach(serverConfig => {
    startServer(serverConfig);
  });

  // Aguardar um pouco para garantir que todos iniciaram
  setTimeout(() => {
    displayStatus();
  }, 1500);

  // Capturar sinais de encerramento
  process.on('SIGINT', stopAllServers);
  process.on('SIGTERM', stopAllServers);
}

// Executar
main();