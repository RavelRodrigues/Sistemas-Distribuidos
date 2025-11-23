const http = require('http');

// Configuração dos servidores
const SERVERS = [
  { port: 3001, name: 'Server-1' },
  { port: 3002, name: 'Server-2' },
  { port: 3003, name: 'Server-3' }
];

// Cores para o terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Função para fazer requisição HTTP
function makeRequest(port, path = '/') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

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
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Função para testar um servidor
async function testServer(serverConfig) {
  const { port, name } = serverConfig;
  
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}Testando ${name} (porta ${port})${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  try {
    // Teste 1: Rota principal
    console.log(`\n  Testando rota: GET /`);
    const homeResponse = await makeRequest(port, '/');
    console.log(`  ${colors.green}✓${colors.reset} Status: ${homeResponse.status}`);
    console.log(`  ${colors.green}✓${colors.reset} Server ID: ${homeResponse.data.server}`);

    // Teste 2: Rota de produtos
    console.log(`\n  Testando rota: GET /products`);
    const productsResponse = await makeRequest(port, '/products');
    console.log(`  ${colors.green}✓${colors.reset} Status: ${productsResponse.status}`);
    console.log(`  ${colors.green}✓${colors.reset} Produtos: ${productsResponse.data.total} itens`);

    // Teste 3: Health check
    console.log(`\n  Testando rota: GET /health`);
    const healthResponse = await makeRequest(port, '/health');
    console.log(`  ${colors.green}✓${colors.reset} Status: ${healthResponse.data.status}`);
    console.log(`  ${colors.green}✓${colors.reset} Uptime: ${healthResponse.data.uptime}s`);
    console.log(`  ${colors.green}✓${colors.reset} Requisições: ${healthResponse.data.stats.requests}`);

    console.log(`\n  ${colors.green} ${name} - TODOS OS TESTES PASSARAM!${colors.reset}`);
    return true;

  } catch (error) {
    console.log(`\n  ${colors.red} ${name} - ERRO: ${error.message}${colors.reset}`);
    return false;
  }
}

// Função para fazer teste de carga simples
async function loadTest(serverConfig, numRequests = 20) {
  const { port, name } = serverConfig;
  
  console.log(`\n${colors.yellow} Teste de Carga: ${name} (${numRequests} requisições)${colors.reset}`);
  
  const startTime = Date.now();
  const promises = [];

  for (let i = 0; i < numRequests; i++) {
    promises.push(makeRequest(port, '/'));
  }

  try {
    await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    const rps = (numRequests / (duration / 1000)).toFixed(2);

    console.log(`  ${colors.green}✓${colors.reset} Tempo total: ${duration}ms`);
    console.log(`  ${colors.green}✓${colors.reset} Requisições/segundo: ${rps}`);
    console.log(`  ${colors.green}✓${colors.reset} Média por requisição: ${(duration / numRequests).toFixed(2)}ms`);
    
    return true;
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Erro no teste de carga: ${error.message}`);
    return false;
  }
}

// Função principal
async function main() {
  console.log('\n' + '='.repeat(50));
  console.log(' TESTE DE MÚLTIPLAS INSTÂNCIAS - SHOPNOW');
  console.log('='.repeat(50));

  let allPassed = true;

  // Testar cada servidor
  for (const server of SERVERS) {
    const passed = await testServer(server);
    if (!passed) allPassed = false;
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Teste de carga em todos os servidores
  console.log(`\n\n${colors.yellow}${'='.repeat(50)}`);
  console.log(' INICIANDO TESTES DE CARGA');
  console.log('='.repeat(50) + colors.reset);

  for (const server of SERVERS) {
    await loadTest(server, 50);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Resumo final
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log(`${colors.green} TODOS OS SERVIDORES ESTÃO FUNCIONANDO!${colors.reset}`);
  } else {
    console.log(`${colors.red} ALGUNS SERVIDORES APRESENTARAM PROBLEMAS${colors.reset}`);
  }
  console.log('='.repeat(50) + '\n');
}

// Executar
main().catch(console.error);