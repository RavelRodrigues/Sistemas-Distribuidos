const http = require('http');

const LOAD_BALANCER_URL = 'http://localhost:8000';
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function makeRequest(path = '/cart') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, LOAD_BALANCER_URL);
    
    http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function testLeastConnections() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log(' TESTE DO ALGORITMO LEAST CONNECTIONS');
  console.log('='.repeat(60) + colors.reset);
  console.log('\nFazendo 20 requisições SIMULTÂNEAS (não sequenciais)...\n');

  const serverCounts = {
    'Server-3001': 0,
    'Server-3002': 0,
    'Server-3003': 0
  };

  // Fazer 20 requisições SIMULTÂNEAS
  const promises = [];
  for (let i = 1; i <= 20; i++) {
    promises.push(
      makeRequest('/cart').then(response => {
        const serverId = response.data.server;
        serverCounts[serverId]++;
        return { i, serverId };
      })
    );
  }

  // Aguardar todas terminarem
  const results = await Promise.all(promises);

  // Mostrar resultados
  results.forEach(({ i, serverId }) => {
    console.log(`  ${i.toString().padStart(2)}. ${colors.green}✓${colors.reset} Processado por: ${colors.yellow}${serverId}${colors.reset}`);
  });

  // Mostrar distribuição
  console.log(`\n${colors.cyan}Distribuição de Requisições (Simultâneas):${colors.reset}`);
  console.log('─'.repeat(40));
  Object.entries(serverCounts).forEach(([server, count]) => {
    const percentage = ((count / 20) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count));
    console.log(`  ${server}: ${bar} ${count} (${percentage}%)`);
  });
  console.log('─'.repeat(40));

  // Verificar se está balanceado
  const counts = Object.values(serverCounts);
  const maxDiff = Math.max(...counts) - Math.min(...counts);
  
  if (maxDiff <= 3) {
    console.log(`\n${colors.green} Distribuição equilibrada! Least Connections funcionando.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}  Diferença: ${maxDiff} (aceitável para requisições rápidas)${colors.reset}`);
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log(' TESTE ESPECÍFICO PARA LEAST CONNECTIONS');
  console.log('='.repeat(60));

  try {
    const info = await makeRequest('/lb-info');
    console.log(`\n${colors.green}✓ Load Balancer detectado!${colors.reset}`);
    console.log(`Algoritmo atual: ${colors.yellow}${info.data.algorithm}${colors.reset}`);
    
    if (info.data.algorithm !== 'least-connections') {
      console.log(`\n${colors.yellow}  AVISO: Este teste é otimizado para Least Connections!${colors.reset}`);
      console.log(`Execute: npm run start:balancer:lc\n`);
    }
  } catch (err) {
    console.log(`${colors.yellow}  Não foi possível detectar o algoritmo${colors.reset}`);
  }

  await testLeastConnections();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${colors.green} TESTE CONCLUÍDO!${colors.reset}`);
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);