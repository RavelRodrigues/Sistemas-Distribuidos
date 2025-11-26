/**
 * Algoritmo Least Connections
 * Direciona requisições para o servidor com MENOS conexões ativas
 * Ideal para quando as requisições têm tempos de processamento variáveis
 */

class LeastConnections {
  constructor(servers) {
    this.servers = servers;
    // Mapa para rastrear conexões ativas por servidor
    this.activeConnections = new Map();
    
    // Inicializar contadores
    servers.forEach(server => {
      this.activeConnections.set(server.name, 0);
    });
  }

  /**
   * Seleciona o servidor com menos conexões ativas
   * @returns {Object} Servidor selecionado
   */
  getNextServer() {
    // Filtrar apenas servidores saudáveis
    const healthyServers = this.servers.filter(s => s.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    // Encontrar servidor com menos conexões
    let selectedServer = healthyServers[0];
    let minConnections = this.activeConnections.get(selectedServer.name) || 0;

    for (const server of healthyServers) {
      const connections = this.activeConnections.get(server.name) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedServer = server;
      }
    }

    return selectedServer;
  }

  /**
   * Incrementa o contador de conexões ativas
   * @param {string} serverName - Nome do servidor
   */
  incrementConnections(serverName) {
    const current = this.activeConnections.get(serverName) || 0;
    this.activeConnections.set(serverName, current + 1);
  }

  /**
   * Decrementa o contador de conexões ativas
   * @param {string} serverName - Nome do servidor
   */
  decrementConnections(serverName) {
    const current = this.activeConnections.get(serverName) || 0;
    if (current > 0) {
      this.activeConnections.set(serverName, current - 1);
    }
  }

  /**
   * Atualiza a lista de servidores disponíveis
   * @param {Array} servers - Nova lista de servidores
   */
  updateServers(servers) {
    this.servers = servers;
    
    // Adicionar novos servidores ao mapa de conexões
    servers.forEach(server => {
      if (!this.activeConnections.has(server.name)) {
        this.activeConnections.set(server.name, 0);
      }
    });
  }

  /**
   * Reseta todos os contadores de conexões
   */
  reset() {
    this.activeConnections.forEach((value, key) => {
      this.activeConnections.set(key, 0);
    });
  }

  /**
   * Retorna informações sobre o estado atual
   */
  getInfo() {
    const connectionsInfo = {};
    this.activeConnections.forEach((value, key) => {
      connectionsInfo[key] = value;
    });

    return {
      algorithm: 'Least Connections',
      totalServers: this.servers.length,
      activeConnections: connectionsInfo,
      totalActiveConnections: Array.from(this.activeConnections.values()).reduce((a, b) => a + b, 0)
    };
  }
}

module.exports = LeastConnections;