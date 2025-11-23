# ShopNow Load Balancer

## 🛍️ Sobre o Projeto

Sistema de balanceamento de carga para o e-commerce ShopNow, desenvolvido para suportar milhares de acessos simultâneos durante eventos como Black Friday.

## 🎯 Objetivos

- ✅ Criar múltiplas instâncias do servidor web
- ✅ Implementar balanceador de carga
- ✅ Suportar múltiplos algoritmos de balanceamento
- ✅ Simular falhas e recuperação de servidores
- ✅ Testes de carga com Apache Benchmark

## 🏗️ Arquitetura
```
Cliente → Load Balancer → [Servidor 1, Servidor 2, Servidor 3]
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 14+
- Apache Benchmark (opcional, para testes)

### Instalação
```bash
# Instalar dependências
npm install

# Iniciar servidores
npm run start:servers

# Iniciar load balancer
npm run start:balancer

# Executar testes de carga
npm run test:load
```

## 📊 Algoritmos Implementados

1. **Round Robin**: Distribui requisições sequencialmente
2. **Least Connections**: Direciona para servidor com menos conexões ativas

## 🧪 Testes
```bash
# Teste básico
curl http://localhost:8000

# Teste de carga com Apache Benchmark
ab -n 10000 -c 100 http://localhost:8000/

# Simulação de falha de servidor
npm run simulate:failure
```

## 📈 Métricas Monitoradas

- Requisições por servidor
- Conexões ativas
- Taxa de sucesso/falha
- Tempo de resposta

## 🔧 Estrutura do Projeto
```
shopnow-load-balancer/
├── src/
│   ├── server.js           # Servidor web individual
│   ├── load-balancer.js    # Balanceador de carga
│   ├── algorithms/         # Algoritmos de balanceamento
│   └── utils/              # Utilitários
├── tests/
│   └── load-test.sh        # Scripts de teste
├── package.json
└── README.md
```

## 👨‍💻 Autor

Ravel Rodrigues Pereira - Desenvolvido para o desafio da cadeira de Sistemas Distribuidos