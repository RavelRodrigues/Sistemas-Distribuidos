#  Sistema de Múltiplas Instâncias - ShopNow

##  Visão Geral

Este documento explica como funciona o sistema de múltiplas instâncias do servidor ShopNow.

##  Por que Múltiplas Instâncias?

Em um e-commerce real durante eventos como Black Friday:
- **Milhares de usuários** acessam simultaneamente
- **Um único servidor** não aguenta a carga
- **Múltiplas instâncias** distribuem a carga de trabalho

##  Arquitetura Atual
```
┌─────────────────────────────────────┐
│     Cluster Manager                 │
│  (Gerencia todos os servidores)     │
└─────────────────┬───────────────────┘
                  │
         ┌────────┼────────┐
         │        │        │
         ▼        ▼        ▼
    ┌────────┬────────┬────────┐
    │Server-1│Server-2│Server-3│
    │:3001   │:3002   │:3003   │
    └────────┴────────┴────────┘
```

##  Configuração das Instâncias

| Instância | Porta | Identificação | Cor no Terminal |
|-----------|-------|---------------|-----------------|
| Server-1  | 3001  | Server-3001   | Ciano          |
| Server-2  | 3002  | Server-3002   | Amarelo        |
| Server-3  | 3003  | Server-3003   | Magenta        |

##  Como Funciona o Cluster Manager

O `cluster-manager.js` é responsável por:

1. **Inicializar** todas as instâncias simultaneamente
2. **Monitorar** o status de cada servidor
3. **Gerenciar** o ciclo de vida dos processos
4. **Encerrar** todos os servidores de forma coordenada

### Fluxo de Inicialização
```
1. Cluster Manager inicia
2. Para cada servidor na configuração:
   - Cria um processo Node.js separado
   - Passa a porta como argumento
   - Monitora eventos (spawn, error, exit)
3. Exibe status de todos os servidores
4. Aguarda comandos do usuário
```

##  Scripts de Teste

### Test Instances
O script `test-instances.js` verifica:
- ✅ Se todos os servidores estão respondendo
- ✅ Se as rotas principais funcionam
- ✅ Se o health check está OK
- ✅ Performance básica de cada instância

##  Comandos Disponíveis
```bash
# Iniciar todas as instâncias via Cluster Manager
npm run start:cluster

# Iniciar servidores individuais (terminal separado para cada)
npm run start:server1  # Porta 3001
npm run start:server2  # Porta 3002
npm run start:server3  # Porta 3003

# Testar todas as instâncias
npm run test:instances
```

##  Métricas por Instância

Cada servidor mantém suas próprias estatísticas:
- Total de requisições processadas
- Número de erros
- Tempo de atividade (uptime)
- Timestamp de inicialização

Acesse: `http://localhost:PORT/stats`

##  Troubleshooting

### Problema: Porta já em uso
```bash
# Erro: EADDRINUSE: address already in use :::3001
# Solução: Matar o processo na porta
kill -9 $(lsof -ti:3001)
```

### Problema: Servidor não responde
```bash
# Verificar se está rodando
curl http://localhost:3001/health

# Se não responder, reiniciar
npm run start:cluster
```

##  Próximos Passos

No próximo commit, implementaremos o **Load Balancer** que:
- Receberá todas as requisições na porta 8000
- Distribuirá entre as 3 instâncias
- Implementará algoritmos de balanceamento