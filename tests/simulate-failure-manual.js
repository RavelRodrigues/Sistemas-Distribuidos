const http = require('http');

const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function makeRequest(path = '/') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:8000');
    
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
    }).on('error', reject).on('timeout', () => {
      reject(new Error('Timeout'));
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`\n${colors.cyan}${'='.repeat(70)}`);
  console.log(' TESTE DE SIMULAÇÃO DE FALHAS (MANUAL)');
  console.log('='.repeat(70) + colors.reset);

  console.log(`\n${colors.yellow} INSTRUÇÕES:${colors.reset}`);
  console.log('  1. Aguarde as requisições iniciais');
  console.log('  2. Quando solicitado, PARE manualmente o Server-2 (CTRL+C no terminal do cluster)');
  console.log('  3. Aguarde 10 segundos');
  console.log('  4. Quando solicitado, REINICIE o cluster');

  // Fase 1
  console.log(`\n${colors.cyan}━━━ FASE 1: Requisições Normais ━━━${colors.reset}`);
  console.log('Fazendo 6 requisições...\n');

  const initialHits = { 'Server-3001': 0, 'Server-3002': 0, 'Server-3003': 0 };

  for (let i = 1; i <= 6; i++) {
    try {
      const response = await makeRequest('/');
      const serverId = response.data.server;
      initialHits[serverId]++;
      console.log(`  ${i}. ${colors.green}✓${colors.reset} Processado por: ${colors.blue}${serverId}${colors.reset}`);
      await sleep(300);
    } catch (err) {
      console.log(`  ${i}. ${colors.red}✗${colors.reset} Erro: ${err.message}`);
    }
  }

  console.log('\n  Distribuição inicial:');
  Object.entries(initialHits).forEach(([server, hits]) => {
    console.log(`    ${server}: ${hits} requisições`);
  });

  // Instrução para derrubar
  console.log(`\n${colors.red}${'='.repeat(70)}`);
  console.log(`${colors.red}  AÇÃO NECESSÁRIA!${colors.reset}`);
  console.log(`${colors.yellow}Por favor, vá até o Terminal 1 (onde está rodando o cluster)`);
  console.log(`e pressione CTRL+C para parar APENAS o Server-2${colors.reset}`);
  console.log(`\nDepois, aguarde 10 segundos e pressione ENTER aqui...`);
  console.log(`${colors.red}${'='.repeat(70)}${colors.reset}`);

  // Aguardar input
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  console.log(`\n${colors.yellow} Aguardando 10 segundos para o health check detectar...${colors.reset}`);
  await sleep(10000);

  // Fase 2
  console.log(`\n${colors.cyan}━━━ FASE 2: Requisições Após Falha ━━━${colors.reset}`);
  console.log('Fazendo 8 requisições...\n');

  const afterFailureHits = { 'Server-3001': 0, 'Server-3002': 0, 'Server-3003': 0 };

  for (let i = 1; i <= 8; i++) {
    try {
      const response = await makeRequest('/');
      const serverId = response.data.server;
      afterFailureHits[serverId]++;
      console.log(`  ${i}. ${colors.green}✓${colors.reset} Processado por: ${colors.blue}${serverId}${colors.reset}`);
      await sleep(300);
    } catch (err) {
      console.log(`  ${i}. ${colors.red}✗${colors.reset} Erro: ${err.message}`);
    }
  }

  console.log('\n  Distribuição após falha:');
  Object.entries(afterFailureHits).forEach(([server, hits]) => {
    const isDown = server === 'Server-3002';
    const symbol = isDown ? 'X' : '✓';
    const color = isDown ? colors.red : colors.green;
    console.log(`    ${color}${symbol}${colors.reset} ${server}: ${hits} requisições`);
  });

  if (afterFailureHits['Server-3002'] === 0) {
    console.log(`\n  ${colors.green} Perfeito! Nenhuma requisição foi para o Server-2!${colors.reset}`);
  } else {
    console.log(`\n  ${colors.yellow}  Server-2 ainda recebeu ${afterFailureHits['Server-3002']} requisição(ões)${colors.reset}`);
  }

  console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.green} TESTE CONCLUÍDO!${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
}

main().catch(console.error);