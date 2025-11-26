#  Guia de Testes - ShopNow Load Balancer

##  Tipos de Testes Disponíveis

### 1. Teste de Instâncias
Verifica se todos os servidores backend estão funcionando corretamente.
```bash
npm run test:instances
```

**O que testa:**
-  Conectividade com cada servidor
-  Rotas principais (/, /products, /health)
-  Tempo de resposta
-  Health check

---

### 2. Teste do Load Balancer
Testa a distribuição de requisições do load balancer.
```bash
npm run test:balancer
```

**O que testa:**
-  Distribuição Round Robin
-  Múltiplas rotas
-  Estatísticas do load balancer

---

### 3. Teste do Least Connections
Testa especificamente o algoritmo Least Connections com requisições simultâneas.
```bash
npm run test:leastconn
```

**O que testa:**
-  Distribuição com requisições simultâneas
-  Balanceamento de carga dinâmico

---

### 4. Simulação de Falhas
Simula falha e recuperação de servidores.
```bash
npm run simulate:failure
```

**O que testa:**
-  Detecção de servidor offline
-  Redirecionamento automático
-  Recuperação de servidor
-  Reinserção no pool

---

### 5. Teste de Carga (Node.js)
Teste de carga completo sem dependências externas.
```bash
npm run test:load:node
```

**Cenários testados:**
1.  Carga Leve: 100 req, 10 simultâneas
2.  Carga Média: 500 req, 50 simultâneas  
3.  Black Friday: 1000 req, 100 simultâneas
4.  Pico Extremo: 2000 req, 200 simultâneas

---

### 6. Teste de Carga (Apache Benchmark)
Teste com ferramenta profissional (requer instalação).
```bash
npm run test:load:ab
```

---

##  Fluxo Completo de Testes

### Teste Básico (5 minutos)
```bash
# Terminal 1
npm run start:cluster

# Terminal 2
npm run start:balancer

# Terminal 3
npm run test:instances
npm run test:balancer
```

### Teste Completo (15 minutos)
```bash
# Terminal 1
npm run start:cluster

# Terminal 2
npm run start:balancer

# Terminal 3
npm run test:instances
npm run test:balancer
npm run test:leastconn
npm run simulate:failure
npm run test:load:node
```

---

##  Interpretando Resultados

### Métricas Importantes

**Requisições por Segundo (RPS)**
-  Excelente: > 500 RPS
-  Bom: 200-500 RPS
-  Atenção: < 200 RPS

**Latência (P95)**
-  Excelente: < 50ms
-  Bom: 50-200ms
-  Atenção: > 200ms

**Taxa de Sucesso**
-  Ideal: 100%
-  Aceitável: 95-99%
-  Problema: < 95%

---

##  Troubleshooting

### Problema: "Load Balancer não está acessível"
```bash
# Verificar se está rodando
curl http://localhost:8000/lb-info

# Se não estiver, iniciar
npm run start:cluster
npm run start:balancer
```

### Problema: "Requisições muito lentas"
- Verifique se há servidores offline
- Reduza a concorrência nos testes
- Verifique recursos do sistema (CPU/RAM)

### Problema: "Distribuição desequilibrada"
- Normal para Least Connections com requisições rápidas
- Use Round Robin para testes sequenciais
- Use Least Connections para testes simultâneos

---

##  Benchmarks Esperados

**Hardware de Referência:** PC Médio (4 cores, 8GB RAM)

| Cenário | RPS Esperado | Latência P95 | Taxa Sucesso |
|---------|--------------|--------------|--------------|
| Carga Leve | 800-1200 | 15-30ms | 100% |
| Carga Média | 600-900 | 30-60ms | 100% |
| Black Friday | 400-700 | 80-150ms | 99-100% |
| Pico Extremo | 300-500 | 150-300ms | 95-100% |

---

##  Próximos Passos

1.  Todos os testes passando
2.  Analisar métricas de performance
3.  Otimizar servidores se necessário
4.  Documentar resultados
5.  Deploy em produção