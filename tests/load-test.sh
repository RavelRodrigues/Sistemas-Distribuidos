#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

LOAD_BALANCER="http://localhost:8000"

echo ""
echo "======================================================================"
echo " TESTE DE CARGA COM APACHE BENCHMARK - SHOPNOW"
echo "======================================================================"
echo ""

# Verificar se o Apache Benchmark está instalado
if ! command -v ab &> /dev/null; then
    echo -e "${RED} Apache Benchmark (ab) não está instalado!${NC}"
    echo ""
    echo "Instale com:"
    echo "  Ubuntu/Debian: sudo apt-get install apache2-utils"
    echo "  macOS: brew install httpd"
    echo "  Windows: Baixe o Apache em https://www.apachelounge.com/download/"
    echo ""
    echo -e "${YELLOW} Ou use o teste em Node.js: npm run test:load:node${NC}"
    echo ""
    exit 1
fi

# Verificar se o load balancer está rodando
if ! curl -s "$LOAD_BALANCER/lb-info" > /dev/null; then
    echo -e "${RED} Load Balancer não está acessível em $LOAD_BALANCER${NC}"
    echo ""
    echo -e "${YELLOW} Execute primeiro:${NC}"
    echo "   Terminal 1: npm run start:cluster"
    echo "   Terminal 2: npm run start:balancer"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Load Balancer está rodando!${NC}"
echo ""

# Teste 1: Carga Leve
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN} TESTE 1: Carga Leve (100 requisições, 10 simultâneas)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
ab -n 100 -c 10 -g test1.tsv "$LOAD_BALANCER/" 2>/dev/null
echo ""

sleep 2

# Teste 2: Carga Média
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN} TESTE 2: Carga Média (500 requisições, 50 simultâneas)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
ab -n 500 -c 50 -g test2.tsv "$LOAD_BALANCER/products" 2>/dev/null
echo ""

sleep 2

# Teste 3: Carga Alta (Black Friday)
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN} TESTE 3: Black Friday (1000 requisições, 100 simultâneas)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
ab -n 1000 -c 100 -g test3.tsv "$LOAD_BALANCER/" 2>/dev/null
echo ""

sleep 2

# Teste 4: Carga Extrema
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN} TESTE 4: Pico Extremo (2000 requisições, 200 simultâneas)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
ab -n 2000 -c 200 -g test4.tsv "$LOAD_BALANCER/products" 2>/dev/null
echo ""

# Estatísticas finais
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} ESTATÍSTICAS DO LOAD BALANCER${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
curl -s "$LOAD_BALANCER/lb-stats" | head -n 30
echo ""

echo ""
echo -e "${GREEN} TODOS OS TESTES CONCLUÍDOS!${NC}"
echo ""
echo "Arquivos TSV gerados: test1.tsv, test2.tsv, test3.tsv, test4.tsv"
echo "Visualize as estatísticas em: $LOAD_BALANCER/lb-stats"
echo ""