const http = require('http');
const { exec } = require('child_process');

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

/**
 * Mata um processo rodando em uma porta específica
 */
function killProcessOnPort(port) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows: Encontrar PID e matar
      exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
        if (error || !stdout) {
          console.log(`${colors.yellow}⚠️  Nenhum processo encontrado na porta ${port}${colors.reset}`);
          resolve();
          return;
        }
        
        // Extrair o PID da última coluna
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && !isNaN(pid)) {
            pids.add(pid);
          }
        });
        
        if (pids.size === 0) {
          console.log(`${colors.yellow}  Nenhum PID válido encontrado${colors.reset}`);
          resolve();
          return;
        }
        
        console.log(`${colors.cyan} Encontrados ${pids.size} processo(s): ${Array.from(pids).join(', ')}${colors.reset}`);
        
        // Matar todos os PIDs encontrados
        let killed = 0;
        const totalPids = pids.size;
        
        pids.forEach(pid => {
          exec(`taskkill /F /PID ${pid}`, (err, stdout, stderr) => {
            killed++;
            if (err) {
              console.log(`${colors.red} Erro ao matar PID ${pid}${colors.reset}`);
            } else {
              console.log(`${colors.green} Processo ${pid} encerrado${colors.reset}`);
            }
            
            if (killed === totalPids) {
              // Aguardar um pouco para garantir que morreu
              setTimeout(() => resolve(), 2000);
            }
          });
        });
      });
    } else {
      // Unix: usar lsof e kill
      exec(`lsof -ti:${port}`, (error, stdout, stderr) => {
        if (error || !stdout) {
          console.log(`${colors.yellow}  Nenhum processo encontrado na porta ${port}${colors.reset}`);
          resolve();
          return;
        }
        
        const pids = stdout.trim().split('\n').filter(p => p);
        console.log(`${colors.cyan} Encontrados ${pids.length} processo(s): ${pids.join(', ')}${colors.reset}`);
        
        let killed = 0;
        
        pids.forEach(pid => {
          exec(`kill -9 ${pid}`, (err) => {
            killed++;
            if (err) {
              console.log(`${colors.red} Erro ao matar PID ${pid}${colors.reset}`);
            } else {
              console.log(`${colors.green} Processo ${pid} encerrado${colors.reset}`);
            }
            
            if (killed === pids.length) {
              setTimeout(() => resolve(), 2000);
            }
          });
        });
      });
    }
  });
}

/**
 * Inicia um servidor em uma porta específica
 */
function startServer(port) {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    
    const serverProcess = spawn('node', ['src/server.js', port.toString()], {
      stdio: 'ignore',
      detached: true,
      shell: true
    });

    serverProcess.unref();
    
    console.log(`${colors.cyan} Processo iniciado (PID: ${serverProcess.pid})${colors.reset}`);
    
    // Aguardar um pouco para o servidor iniciar
    setTimeout(() => {
      resolve(serverProcess);
    }, 3000);
  });
}

/**
 * Aguarda um tempo
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Testa a recuperação após falha
 */
async function testFailureRecovery() {
  console.log(`\n${colors.cyan}${'='.repeat(70)}`);
  console.log(' SIMULAÇÃO DE FALHAS E RECUPERAÇÃO');
  console.log('='.repeat(70) + colors.reset);

  console.log(`\n${colors.yellow} CENÁRIO DE TESTE:${colors.reset}`);
  console.log('  1. Fazer requisições normais');
  console.log('  2. Derrubar o Server-2 (porta 3002)');
  console.log('  3. Verificar se requisições continuam funcionando');
  console.log('  4. Reativar o Server-2');
  console.log('  5. Verificar se volta ao pool de servidores\n');

  // Fase 1: Requisições normais
  console.log(`${colors.cyan}━━━ FASE 1: Requisições Normais ━━━${colors.reset}`);
  console.log('Fazendo 6 requisições para verificar distribuição...\n');

  const serverHits = { 'Server-3001': 0, 'Server-3002': 0, 'Server-3003': 0 };

  for (let i = 1; i <= 6; i++) {
    try {
      const response = await makeRequest('/');
      const serverId = response.data.server;
      serverHits[serverId]++;
      console.log(`  ${i}. ${colors.green}✓${colors.reset} Processado por: ${colors.blue}${serverId}${colors.reset}`);
      await sleep(200);
    } catch (err) {
      console.log(`  ${i}. ${colors.red}✗${colors.reset} Erro: ${err.message}`);
    }
  }

  console.log('\n  Distribuição inicial:');
  Object.entries(serverHits).forEach(([server, hits]) => {
    console.log(`    ${server}: ${hits} requisições`);
  });

  // Fase 2: Derrubar servidor
  console.log(`\n${colors.red}━━━ FASE 2: Simulando Falha do Server-2 ━━━${colors.reset}`);
  console.log(`${colors.red} Derrubando o Server-2 (porta 3002)...${colors.reset}\n`);

  try {
    await killProcessOnPort(3002);
    console.log(`\n${colors.red} Server-2 foi derrubado com sucesso!${colors.reset}`);
  } catch (err) {
    console.log(`${colors.yellow}  Aviso: ${err.message}${colors.reset}`);
  }

  // Aguardar health check detectar
  console.log(`\n${colors.yellow} Aguardando 12 segundos para o health check detectar a falha...${colors.reset}`);
  await sleep(12000);

  // Fase 3: Requisições após falha
  console.log(`\n${colors.cyan}━━━ FASE 3: Requisições Após Falha ━━━${colors.reset}`);
  console.log('Fazendo 8 requisições (devem ir apenas para Server-1 e Server-3)...\n');

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
    const isServerDown = server === 'Server-3002';
    const symbol = isServerDown ? 'X' : '✓';
    const color = isServerDown ? colors.red : colors.green;
    console.log(`    ${color}${symbol}${colors.reset} ${server}: ${hits} requisições`);
  });

  if (afterFailureHits['Server-3002'] === 0) {
    console.log(`\n  ${colors.green} Load Balancer detectou a falha corretamente!${colors.reset}`);
  } else {
    console.log(`\n  ${colors.red} Server-2 ainda recebeu ${afterFailureHits['Server-3002']} requisição(ões)${colors.reset}`);
    console.log(`  ${colors.yellow} Pode ser que o processo não tenha sido totalmente encerrado${colors.reset}`);
  }

  // Fase 4: Reativar servidor
  console.log(`\n${colors.green}━━━ FASE 4: Reativando Server-2 ━━━${colors.reset}`);
  console.log(`${colors.green} Reiniciando o Server-2 (porta 3002)...${colors.reset}\n`);

  await startServer(3002);
  console.log(`\n${colors.green} Server-2 reiniciado!${colors.reset}`);

  // Aguardar health check detectar recuperação
  console.log(`\n${colors.yellow} Aguardando 12 segundos para o health check detectar a recuperação...${colors.reset}`);
  await sleep(12000);

  // Fase 5: Requisições após recuperação
  console.log(`\n${colors.cyan}━━━ FASE 5: Requisições Após Recuperação ━━━${colors.reset}`);
  console.log('Fazendo 9 requisições (devem ir para todos os 3 servidores)...\n');

  const afterRecoveryHits = { 'Server-3001': 0, 'Server-3002': 0, 'Server-3003': 0 };

  for (let i = 1; i <= 9; i++) {
    try {
      const response = await makeRequest('/');
      const serverId = response.data.server;
      afterRecoveryHits[serverId]++;
      console.log(`  ${i}. ${colors.green}✓${colors.reset} Processado por: ${colors.blue}${serverId}${colors.reset}`);
      await sleep(300);
    } catch (err) {
      console.log(`  ${i}. ${colors.red}✗${colors.reset} Erro: ${err.message}`);
    }
  }

  console.log('\n  Distribuição após recuperação:');
  Object.entries(afterRecoveryHits).forEach(([server, hits]) => {
    console.log(`    ${colors.green}✓${colors.reset} ${server}: ${hits} requisições`);
  });

  if (afterRecoveryHits['Server-3002'] > 0) {
    console.log(`\n  ${colors.green} Server-2 voltou ao pool de servidores!${colors.reset}`);
  } else {
    console.log(`\n  ${colors.yellow}  Server-2 ainda não voltou ao pool${colors.reset}`);
  }

  // Ver estatísticas finais
  console.log(`\n${colors.cyan}━━━ ESTATÍSTICAS FINAIS ━━━${colors.reset}`);
  try {
    const statsResponse = await makeRequest('/lb-stats');
    const stats = statsResponse.data;
    
    console.log(`\n  Total de Requisições: ${stats.totalRequests}`);
    console.log(`  Requisições com Sucesso: ${colors.green}${stats.successfulRequests}${colors.reset}`);
    console.log(`  Requisições com Falha: ${colors.red}${stats.failedRequests}${colors.reset}`);
    
    const successRate = stats.totalRequests > 0 
      ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)
      : '0.00';
    console.log(`  Taxa de Sucesso: ${successRate}%`);
    
    console.log(`\n  Status dos Servidores:`);
    stats.servers.forEach(server => {
      const status = server.healthy ? `${colors.green}✓ Online${colors.reset}` : `${colors.red}✗ Offline${colors.reset}`;
      console.log(`    • ${server.name}: ${status} (${server.requests} requisições)`);
    });
  } catch (err) {
    console.log(`${colors.red}  Erro ao obter estatísticas${colors.reset}`);
  }

  console.log(`\n${colors.cyan}${'='.repeat(70)}`);
  console.log(`${colors.green} SIMULAÇÃO DE FALHAS CONCLUÍDA!${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
}

/**
 * Função principal
 */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log(' TESTE DE SIMULAÇÃO DE FALHAS - SHOPNOW LOAD BALANCER');
  console.log('='.repeat(70));

  // Verificar se o load balancer está rodando
  try {
    await makeRequest('/lb-info');
  } catch (err) {
    console.log(`\n${colors.red} Load Balancer não está acessível!${colors.reset}`);
    console.log(`${colors.yellow} Execute em terminais separados:${colors.reset}`);
    console.log(`   Terminal 1: npm run start:cluster`);
    console.log(`   Terminal 2: npm run start:balancer`);
    console.log(`   Terminal 3: npm run simulate:failure\n`);
    process.exit(1);
  }

  await testFailureRecovery();
}

// Executar
main().catch(console.error);