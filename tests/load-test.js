const http = require('http');

const LOAD_BALANCER_URL = 'http://localhost:8000';

const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

/**
 * Faz uma requisição HTTP
 */
function makeRequest(path = '/') {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const url = new URL(path, LOAD_BALANCER_URL);
    
    const req = http.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({ 
          success: res.statusCode === 200, 
          statusCode: res.statusCode,
          duration: duration,
          server: null
        });
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({ 
        success: false, 
        statusCode: 0,
        duration: duration,
        error: err.message 
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      resolve({ 
        success: false, 
        statusCode: 0,
        duration: duration,
        error: 'Timeout' 
      });
    });
  });
}

/**
 * Executa teste de carga
 */
async function runLoadTest(config) {
  const { numRequests, concurrency, path, testName } = config;
  
  console.log(`\n${colors.cyan}${'='.repeat(70)}`);
  console.log(` ${testName}`);
  console.log('='.repeat(70) + colors.reset);
  console.log(`Requisições totais: ${numRequests}`);
  console.log(`Concorrência: ${concurrency}`);
  console.log(`Rota: ${path}`);
  console.log(`Iniciando teste...\n`);

  const results = {
    total: numRequests,
    successful: 0,
    failed: 0,
    durations: [],
    errors: {}
  };

  const startTime = Date.now();
  const batches = Math.ceil(numRequests / concurrency);

  // Processar em lotes para controlar a concorrência
  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(concurrency, numRequests - (batch * concurrency));
    const promises = [];

    for (let i = 0; i < batchSize; i++) {
      promises.push(makeRequest(path));
    }

    const batchResults = await Promise.all(promises);
    
    // Processar resultados do lote
    batchResults.forEach(result => {
      if (result.success) {
        results.successful++;
        results.durations.push(result.duration);
      } else {
        results.failed++;
        const errorKey = result.error || `Status ${result.statusCode}`;
        results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
      }
    });

    // Mostrar progresso
    const completed = (batch + 1) * concurrency;
    const progress = Math.min(100, (completed / numRequests * 100).toFixed(1));
    process.stdout.write(`\r  Progresso: ${progress}% (${Math.min(completed, numRequests)}/${numRequests})`);
  }

  const totalTime = Date.now() - startTime;
  console.log('\n');

  // Calcular estatísticas
  results.durations.sort((a, b) => a - b);
  const min = results.durations[0] || 0;
  const max = results.durations[results.durations.length - 1] || 0;
  const avg = results.durations.length > 0 
    ? results.durations.reduce((a, b) => a + b, 0) / results.durations.length 
    : 0;
  const median = results.durations[Math.floor(results.durations.length / 2)] || 0;
  const p95 = results.durations[Math.floor(results.durations.length * 0.95)] || 0;
  const p99 = results.durations[Math.floor(results.durations.length * 0.99)] || 0;
  const rps = (results.successful / (totalTime / 1000)).toFixed(2);

  // Exibir resultados
  console.log(`${colors.green}━━━ RESULTADOS ━━━${colors.reset}`);
  console.log(`  Total de requisições: ${results.total}`);
  console.log(`  ${colors.green}Sucesso: ${results.successful}${colors.reset}`);
  console.log(`  ${colors.red}Falhas: ${results.failed}${colors.reset}`);
  console.log(`  Taxa de sucesso: ${((results.successful / results.total) * 100).toFixed(2)}%`);
  console.log(`  Tempo total: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`  Requisições/segundo: ${colors.yellow}${rps}${colors.reset}`);

  console.log(`\n${colors.cyan}━━━ LATÊNCIA ━━━${colors.reset}`);
  console.log(`  Mínima: ${min}ms`);
  console.log(`  Média: ${avg.toFixed(2)}ms`);
  console.log(`  Mediana: ${median}ms`);
  console.log(`  Máxima: ${max}ms`);
  console.log(`  P95: ${p95}ms`);
  console.log(`  P99: ${p99}ms`);

  if (results.failed > 0) {
    console.log(`\n${colors.red}━━━ ERROS ━━━${colors.reset}`);
    Object.entries(results.errors).forEach(([error, count]) => {
      console.log(`  • ${error}: ${count}`);
    });
  }

  return results;
}

/**
 * Obtém estatísticas do load balancer
 */
async function getLoadBalancerStats() {
  try {
    const response = await makeRequest('/lb-stats');
    return response;
  } catch (err) {
    return null;
  }
}

/**
 * Cenários de teste
 */
const scenarios = [
  {
    testName: 'TESTE 1: Carga Leve (Dia Normal)',
    numRequests: 100,
    concurrency: 10,
    path: '/'
  },
  {
    testName: 'TESTE 2: Carga Média (Horário de Pico)',
    numRequests: 500,
    concurrency: 50,
    path: '/products'
  },
  {
    testName: 'TESTE 3: Carga Alta (Black Friday)',
    numRequests: 1000,
    concurrency: 100,
    path: '/'
  },
  {
    testName: 'TESTE 4: Carga Extrema (Pico da Black Friday)',
    numRequests: 2000,
    concurrency: 200,
    path: '/products'
  }
];

/**
 * Função principal
 */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log(' TESTE DE CARGA - SHOPNOW LOAD BALANCER');
  console.log('='.repeat(70));

  // Verificar se o load balancer está acessível
  try {
    await makeRequest('/lb-info');
    console.log(`${colors.green}✓ Load Balancer está rodando!${colors.reset}`);
  } catch (err) {
    console.log(`${colors.red}✗ Load Balancer não está acessível!${colors.reset}`);
    console.log(`${colors.yellow}💡 Execute:${colors.reset}`);
    console.log(`   Terminal 1: npm run start:cluster`);
    console.log(`   Terminal 2: npm run start:balancer`);
    console.log(`   Terminal 3: npm run test:load:node\n`);
    process.exit(1);
  }

  // Executar todos os cenários
  const allResults = [];
  
  for (const scenario of scenarios) {
    const result = await runLoadTest(scenario);
    allResults.push({ ...scenario, ...result });
    
    // Pequena pausa entre cenários
    console.log(`\n${colors.yellow} Aguardando 3 segundos antes do próximo teste...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Resumo final
  console.log(`\n${colors.magenta}${'='.repeat(70)}`);
  console.log(' RESUMO GERAL DOS TESTES');
  console.log('='.repeat(70) + colors.reset + '\n');

  allResults.forEach((result, index) => {
    const rps = (result.successful / (result.durations.reduce((a, b) => a + b, 0) / 1000)).toFixed(2);
    const successRate = ((result.successful / result.total) * 100).toFixed(2);
    
    console.log(`${index + 1}. ${result.testName}`);
    console.log(`   Requisições: ${result.total} | Sucesso: ${successRate}% | RPS: ${rps}`);
  });

  // Estatísticas finais do load balancer
  console.log(`\n${colors.cyan}━━━ ESTATÍSTICAS DO LOAD BALANCER ━━━${colors.reset}`);
  
  try {
    const statsResult = await getLoadBalancerStats();
    if (statsResult && statsResult.success) {
      console.log(`\nDistribuição por servidor:`);
      // Nota: precisaríamos parsear a resposta JSON aqui
      console.log(`Acesse: http://localhost:8000/lb-stats para ver detalhes completos`);
    }
  } catch (err) {
    console.log(`${colors.yellow}Não foi possível obter estatísticas detalhadas${colors.reset}`);
  }

  console.log(`\n${colors.magenta}${'='.repeat(70)}`);
  console.log(`${colors.green} TODOS OS TESTES CONCLUÍDOS!${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(70)}${colors.reset}\n`);
}

// Executar
main().catch(console.error);