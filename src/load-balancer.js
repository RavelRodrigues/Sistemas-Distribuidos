const http = require('http');
const RoundRobin = require('./algorithms/round-robin');

// Configuração do Load Balancer
const LOAD_BALANCER_PORT = 8000;
const HEALTH_CHECK_INTERVAL = 5000; // 5 segundos

// Lista de servidores backend
const BACKEND_SERVERS = [
  { url: 'http://localhost:3001', name: 'Server-1', healthy: true },
  { url: 'http://localhost:3002', name: 'Server-2', healthy: true },
  { url: 'http://localhost:3003', name: 'Server-3', healthy: true }
];

// Estatísticas do Load Balancer
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  requestsByServer: {
    'Server-1': 0,
    'Server-2': 0,
    'Server-3': 0
  },
  startTime: Date.now()
};

// Inicializar algoritmo Round Robin
const roundRobin = new RoundRobin(BACKEND_SERVERS.filter(s => s.healthy));

// Cores para logs
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

/**
 * Verifica a saúde de um servidor
 */
function checkServerHealth(server) {
  return new Promise((resolve) => {
    const url = new URL('/health', server.url);
    
    const req = http.get(url, { timeout: 3000 }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Monitora a saúde de todos os servidores periodicamente
 */
async function monitorServersHealth() {
  console.log(`${colors.cyan}[HEALTH CHECK] Verificando saúde dos servidores...${colors.reset}`);
  
  for (const server of BACKEND_SERVERS) {
    const wasHealthy = server.healthy;
    server.healthy = await checkServerHealth(server);
    
    // Log se o status mudou
    if (wasHealthy !== server.healthy) {
      if (server.healthy) {
        console.log(`${colors.green}[HEALTH CHECK] ${server.name} voltou a ficar saudável ✅${colors.reset}`);
      } else {
        console.log(`${colors.red}[HEALTH CHECK] ${server.name} está fora do ar ❌${colors.reset}`);
      }
    }
  }

  // Atualizar lista de servidores saudáveis no algoritmo
  const healthyServers = BACKEND_SERVERS.filter(s => s.healthy);
  roundRobin.updateServers(healthyServers);

  console.log(`${colors.cyan}[HEALTH CHECK] Servidores saudáveis: ${healthyServers.length}/${BACKEND_SERVERS.length}${colors.reset}`);
}

/**
 * Encaminha a requisição para um servidor backend
 */
function proxyRequest(clientReq, clientRes, targetServer) {
  const targetUrl = new URL(clientReq.url, targetServer.url);
  
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetUrl.pathname + targetUrl.search,
    method: clientReq.method,
    headers: clientReq.headers,
    timeout: 10000
  };

  console.log(`${colors.magenta}[PROXY]${colors.reset} ${clientReq.method} ${clientReq.url} → ${targetServer.name}`);

  const proxyReq = http.request(options, (proxyRes) => {
    // Copiar status code e headers
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    
    // Pipe da resposta
    proxyRes.pipe(clientRes);
    
    proxyRes.on('end', () => {
      stats.successfulRequests++;
      stats.requestsByServer[targetServer.name]++;
      console.log(`${colors.green}[SUCCESS]${colors.reset} ${clientReq.method} ${clientReq.url} - ${proxyRes.statusCode}`);
    });
  });

  // Tratamento de erros
  proxyReq.on('error', (err) => {
    stats.failedRequests++;
    console.error(`${colors.red}[ERROR]${colors.reset} Falha ao conectar em ${targetServer.name}:`, err.message);
    
    // Marcar servidor como não saudável
    targetServer.healthy = false;
    
    // Tentar outro servidor
    const nextServer = roundRobin.getNextServer();
    if (nextServer && nextServer !== targetServer) {
      console.log(`${colors.yellow}[RETRY]${colors.reset} Tentando ${nextServer.name}...`);
      proxyRequest(clientReq, clientRes, nextServer);
    } else {
      clientRes.writeHead(503, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({
        error: 'Service Unavailable',
        message: 'Nenhum servidor disponível no momento'
      }));
    }
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    stats.failedRequests++;
    console.error(`${colors.red}[TIMEOUT]${colors.reset} Timeout ao conectar em ${targetServer.name}`);
    
    clientRes.writeHead(504, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({
      error: 'Gateway Timeout',
      message: 'Servidor demorou muito para responder'
    }));
  });

  // Pipe do body da requisição
  clientReq.pipe(proxyReq);
}

/**
 * Cria o servidor do Load Balancer
 */
const loadBalancer = http.createServer((req, res) => {
  stats.totalRequests++;

  // Rota especial: estatísticas do load balancer
  if (req.url === '/lb-stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...stats,
      uptime: Math.floor((Date.now() - stats.startTime) / 1000),
      algorithm: roundRobin.getInfo(),
      servers: BACKEND_SERVERS.map(s => ({
        name: s.name,
        url: s.url,
        healthy: s.healthy,
        requests: stats.requestsByServer[s.name]
      }))
    }, null, 2));
    return;
  }

  // Rota especial: informações do load balancer
  if (req.url === '/lb-info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: ' ShopNow Load Balancer',
      algorithm: 'Round Robin',
      port: LOAD_BALANCER_PORT,
      servers: BACKEND_SERVERS.map(s => ({
        name: s.name,
        healthy: s.healthy
      })),
      stats: {
        totalRequests: stats.totalRequests,
        successRate: ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) + '%'
      }
    }, null, 2));
    return;
  }

  // Selecionar próximo servidor usando Round Robin
  const targetServer = roundRobin.getNextServer();

  if (!targetServer) {
    stats.failedRequests++;
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Service Unavailable',
      message: 'Nenhum servidor backend disponível'
    }));
    return;
  }

  // Encaminhar requisição
  proxyRequest(req, res, targetServer);
});

// Iniciar o Load Balancer
loadBalancer.listen(LOAD_BALANCER_PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║         ShopNow Load Balancer                 ║
╠══════════════════════════════════════════════════╣
║  Port: ${LOAD_BALANCER_PORT}                                       ║
║  Algorithm: Round Robin                          ║
║  Backend Servers: ${BACKEND_SERVERS.length}                              ║
║  Status: ONLINE                                ║
╠══════════════════════════════════════════════════╣
║  Endpoints:                                      ║
║    • http://localhost:${LOAD_BALANCER_PORT}/                    ║
║    • http://localhost:${LOAD_BALANCER_PORT}/lb-stats (estatísticas) ║
║    • http://localhost:${LOAD_BALANCER_PORT}/lb-info (informações)   ║
╚══════════════════════════════════════════════════╝
  `);

  // Iniciar monitoramento de saúde
  setInterval(monitorServersHealth, HEALTH_CHECK_INTERVAL);
  
  // Fazer primeira verificação imediata
  monitorServersHealth();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[LOAD BALANCER] Recebido SIGTERM, encerrando...');
  loadBalancer.close(() => {
    console.log('[LOAD BALANCER] Encerrado com sucesso');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[LOAD BALANCER] Recebido SIGINT, encerrando...');
  loadBalancer.close(() => {
    console.log('[LOAD BALANCER] Encerrado com sucesso');
    process.exit(0);
  });
});