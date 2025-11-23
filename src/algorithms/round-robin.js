/**
 * Algoritmo Round Robin
 * Distribui requisições de forma circular entre os servidores disponíveis
 * Exemplo: Server1 → Server2 → Server3 → Server1 → ...
 */

class RoundRobin {
  constructor(servers) {
    this.servers = servers; // Lista de servidores disponíveis
    this.currentIndex = 0;  // Índice atual na rotação
  }

  /**
   * Seleciona o próximo servidor na sequência
   * @returns {Object} Servidor selecionado
   */
  getNextServer() {
    // Se não há servidores disponíveis
    if (this.servers.length === 0) {
      return null;
    }

    // Pega o servidor atual
    const server = this.servers[this.currentIndex];

    // Avança para o próximo índice (circular)
    this.currentIndex = (this.currentIndex + 1) % this.servers.length;

    return server;
  }

  /**
   * Atualiza a lista de servidores disponíveis
   * @param {Array} servers - Nova lista de servidores
   */
  updateServers(servers) {
    this.servers = servers;
    
    // Resetar índice se ultrapassar o tamanho da lista
    if (this.currentIndex >= servers.length) {
      this.currentIndex = 0;
    }
  }

  /**
   * Reseta o índice para o início
   */
  reset() {
    this.currentIndex = 0;
  }

  /**
   * Retorna informações sobre o estado atual
   */
  getInfo() {
    return {
      algorithm: 'Round Robin',
      totalServers: this.servers.length,
      currentIndex: this.currentIndex,
      nextServer: this.servers[this.currentIndex]?.url || 'N/A'
    };
  }
}

module.exports = RoundRobin;