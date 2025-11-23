const express = require('express');

// Porta passada como argumento ou porta padrão
const PORT = process.argv[2] || 3001;
const SERVER_ID = `Server-${PORT}`;

const app = express();

// Estatísticas do servidor
let stats = {
  requests: 0,
  errors: 0,
  startTime: Date.now()
};

// Middleware para logging
app.use((req, res, next) => {
  stats.requests++;
  console.log(`[${SERVER_ID}] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rota principal - Home do e-commerce
app.get('/', (req, res) => {
  res.json({
    message: '🛍️ Bem-vindo ao ShopNow!',
    server: SERVER_ID,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - stats.startTime) / 1000)
  });
});

// Rota de produtos
app.get('/products', (req, res) => {
  // Simula processamento de dados
  const products = [
    { id: 1, name: 'Notebook Dell', price: 3500.00 },
    { id: 2, name: 'Mouse Logitech', price: 150.00 },
    { id: 3, name: 'Teclado Mecânico', price: 450.00 },
    { id: 4, name: 'Monitor LG 27"', price: 1200.00 },
    { id: 5, name: 'Webcam HD', price: 350.00 }
  ];

  res.json({
    server: SERVER_ID,
    products: products,
    total: products.length
  });
});

// Rota de carrinho (simula operação mais pesada)
app.get('/cart', (req, res) => {
  // Simula processamento demorado
  setTimeout(() => {
    res.json({
      server: SERVER_ID,
      items: [],
      total: 0,
      message: 'Carrinho vazio'
    });
  }, Math.random() * 100); // Delay aleatório de 0-100ms
});

// Rota de checkout
app.post('/checkout', express.json(), (req, res) => {
  res.json({
    server: SERVER_ID,
    orderId: Math.random().toString(36).substr(2, 9),
    status: 'processing',
    message: 'Pedido recebido com sucesso!'
  });
});

// Health check - usado pelo load balancer
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: SERVER_ID,
    uptime: Math.floor((Date.now() - stats.startTime) / 1000),
    stats: stats
  });
});

// Rota de estatísticas
app.get('/stats', (req, res) => {
  res.json({
    server: SERVER_ID,
    stats: stats,
    uptime: Math.floor((Date.now() - stats.startTime) / 1000)
  });
});

// Rota para simular erro (para testes)
app.get('/error', (req, res) => {
  stats.errors++;
  res.status(500).json({
    server: SERVER_ID,
    error: 'Erro simulado para testes'
  });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  stats.errors++;
  console.error(`[${SERVER_ID}] Erro:`, err.message);
  res.status(500).json({
    server: SERVER_ID,
    error: 'Erro interno do servidor'
  });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     🛍️  ShopNow E-commerce Server     ║
╠════════════════════════════════════════╣
║  Server ID: ${SERVER_ID.padEnd(26)}║
║  Port: ${PORT.toString().padEnd(30)}║
║  Status: ONLINE ✅                    ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${SERVER_ID}] Recebido SIGTERM, encerrando graciosamente...`);
  process.exit(0);
});