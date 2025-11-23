const http = require('http');

const LOAD_BALANCER_URL = 'http://localhost:8000';
const NUM_REQUESTS = 15; // Número de requisições para testar

const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

/**
 * Faz uma requisição HTTP
 */
function makeRequest(path = '/') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, LOAD_BALANCER_URL);
    
    http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    }).on('error', reject);
  });
}

/**
 * Testa a distribuição Round Robin
 */
async function testRoundRobin() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log(' TESTE DO ALGORITMO ROUND ROBIN');
  console.log('='.repeat(60) + colors.reset);
  console.log(`\nFazendo ${NUM_REQUESTS} requisições para verificar distribuição...\n`);

  const serverCounts = {
    'Server-3001': 0,
    'Server-3002': 0,
    'Server-3003': 0
  };

  for (let i = 1; i <= NUM_REQUESTS; i++) {
    try {
      const response = await makeRequest('/');
      const serverId = response.data.server;
      serverCounts[serverId]++;
      
      console.log(`  ${i.toString().padStart(2)}. ${colors.green}✓${colors.reset} Requisição processada por: ${colors.yellow}${serverId}${colors.reset}`);
      
      // Pequeno delay entre requisições
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.log(`  ${i.toString().padStart(2)}. ${colors.red}✗${colors.reset} Erro: ${err.message}`);
    }
  }

  // Mostrar distribuição
  console.log(`\n${colors.cyan}Distribuição de Requisições:${colors.reset}`);
  console.log('─'.repeat(40));
  Object.entries(serverCounts).forEach(([server, count]) => {
    const percentage = ((count / NUM_REQUESTS) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count));
    console.log(`  ${server}: ${bar} ${count} (${percentage}%)`);
  });
  console.log('─'.repeat(40));

  // Verificar se está balanceado
  const counts = Object.values(serverCounts);
  const maxDiff = Math.max(...counts) - Math.min(...counts);
  
  if (maxDiff <= 2) {
    console.log(`\n${colors.green} Distribuição equilibrada! Round Robin funcionando corretamente.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}  Distribuição pode estar desequilibrada (diff: ${maxDiff})${colors.reset}`);
  }
}

/**
 * Testa as estatísticas do Load Balancer
 */
async function testStatistics() {
  console.log(`\n\n${colors.cyan}${'='.repeat(60)}`);
  console.log(' ESTATÍSTICAS DO LOAD BALANCER');
  console.log('='.repeat(60) + colors.reset + '\n');

  try {
    const response = await makeRequest('/lb-stats');
    const stats = response.data;

    console.log(`  Total de Requisições: ${colors.yellow}${stats.totalRequests}${colors.reset}`);
    console.log(`  Requisições com Sucesso: ${colors.green}${stats.successfulRequests}${colors.reset}`);
    console.log(`  Requisições com Falha: ${colors.red}${stats.failedRequests}${colors.reset}`);
    console.log(`  Taxa de Sucesso: ${colors.green}${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)}%${colors.reset}`);
    console.log(`  Uptime: ${stats.uptime}s`);
    console.log(`  Algoritmo: ${stats.algorithm.algorithm}`);

    console.log(`\n  ${colors.cyan}Servidores Backend:${colors.reset}`);
    stats.servers.forEach(server => {
      const status = server.healthy ? `${colors.green}✓ Saudável${colors.reset}` : `${colors.red}✗ Indisponível${colors.reset}`;
      console.log(`    • ${server.name}: ${status} (${server.requests} requisições)`);
    });

  } catch (err) {
    console.log(`${colors.red}✗ Erro ao obter estatísticas: ${err.message}${colors.reset}`);
  }
}

/**
 * Testa diferentes rotas
 */
async function testRoutes() {
  console.log(`\n\n${colors.cyan}${'='.repeat(60)}`);
  console.log('  TESTE DE ROTAS');
  console.log('='.repeat(60) + colors.reset + '\n');

  const routes = [
    { path: '/', name: 'Home' },
    { path: '/products', name: 'Produtos' },
    { path: '/health', name: 'Health Check' },
    { path: '/cart', name: 'Carrinho' }
  ];

  for (const route of routes) {
    try {
      const response = await makeRequest(route.path);
      console.log(`  ${colors.green}✓${colors.reset} ${route.name.padEnd(15)} → Status ${response.status} (${response.data.server})`);
    } catch (err) {
      console.log(`  ${colors.red}✗${colors.reset} ${route.name.padEnd(15)} → Erro: ${err.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log(' TESTE DO LOAD BALANCER - SHOPNOW');
  console.log('='.repeat(60));

  try {
    // Testar se o load balancer está rodando
    await makeRequest('/lb-info');
    console.log(`${colors.green}✓ Load Balancer está rodando!${colors.reset}`);
  } catch (err) {
    console.log(`${colors.red} Load Balancer não está acessível!${colors.reset}`);
    console.log(`${colors.yellow} Execute: npm run start:cluster && npm run start:balancer${colors.reset}\n`);
    process.exit(1);
  }

  // Executar testes
  await testRoundRobin();
  await testRoutes();
  await testStatistics();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${colors.green} TODOS OS TESTES CONCLUÍDOS!${colors.reset}`);
  console.log('='.repeat(60) + '\n');
}

// Executar
main().catch(console.error);