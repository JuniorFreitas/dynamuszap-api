const fs = require("fs");
const path = require("path");

/**
 * Utilitário para limpar arquivos SingletonLock órfãos
 */
class SessionCleaner {
  /**
   * Remove ou renomeia o arquivo SingletonLock se existir
   * @param {string} sessionName - Nome da sessão
   */
  static cleanSingletonLock(sessionName) {
    const tokenPath = path.join("./tokens", sessionName);
    const singletonLockPath = path.join(tokenPath, "SingletonLock");

    try {
      // Verificar se o diretório de tokens existe
      if (!fs.existsSync(tokenPath)) {
        console.log(`📁 Criando diretório de tokens: ${tokenPath}`);
        fs.mkdirSync(tokenPath, { recursive: true });
        return;
      }

      // Verificar se o arquivo SingletonLock existe
      if (fs.existsSync(singletonLockPath)) {
        console.log(
          `🔒 Arquivo SingletonLock encontrado: ${singletonLockPath}`
        );

        // Verificar se é um link simbólico
        const stats = fs.lstatSync(singletonLockPath);

        if (stats.isSymbolicLink()) {
          console.log(`🔗 SingletonLock é um link simbólico, removendo...`);
          fs.unlinkSync(singletonLockPath);
          console.log(`✅ Link simbólico SingletonLock removido com sucesso`);
        } else {
          // Se for um arquivo regular, renomear com timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const backupPath = `${singletonLockPath}_${timestamp}`;

          console.log(
            `📝 SingletonLock é um arquivo regular, renomeando para: ${backupPath}`
          );
          fs.renameSync(singletonLockPath, backupPath);
          console.log(`✅ Arquivo SingletonLock renomeado com sucesso`);
        }
      } else {
        console.log(
          `✅ Nenhum arquivo SingletonLock encontrado para a sessão: ${sessionName}`
        );
      }
    } catch (error) {
      console.error(
        `❌ Erro ao limpar SingletonLock para sessão ${sessionName}:`,
        error.message
      );

      // Se houver erro, tentar forçar a remoção
      try {
        if (fs.existsSync(singletonLockPath)) {
          fs.unlinkSync(singletonLockPath);
          console.log(`🔧 SingletonLock removido forçadamente`);
        }
      } catch (forceError) {
        console.error(
          `❌ Erro ao forçar remoção do SingletonLock:`,
          forceError.message
        );
      }
    }
  }

  /**
   * Limpa todos os arquivos SingletonLock de todas as sessões
   */
  static cleanAllSingletonLocks() {
    const tokensPath = "./tokens";

    try {
      if (!fs.existsSync(tokensPath)) {
        console.log(`📁 Diretório tokens não existe: ${tokensPath}`);
        return;
      }

      const sessions = fs.readdirSync(tokensPath);
      console.log(
        `🧹 Limpando SingletonLock para ${sessions.length} sessões...`
      );

      sessions.forEach((sessionName) => {
        const sessionPath = path.join(tokensPath, sessionName);
        if (fs.statSync(sessionPath).isDirectory()) {
          this.cleanSingletonLock(sessionName);
        }
      });

      console.log(`✅ Limpeza de SingletonLock concluída`);
    } catch (error) {
      console.error(`❌ Erro ao limpar todos os SingletonLock:`, error.message);
    }
  }

  /**
   * Limpa arquivos temporários e cache antigos
   * @param {string} sessionName - Nome da sessão
   */
  static cleanSessionCache(sessionName) {
    const tokenPath = path.join("./tokens", sessionName);

    try {
      if (!fs.existsSync(tokenPath)) {
        return;
      }

      // Arquivos e diretórios para limpar
      const itemsToClean = [
        "SingletonLock",
        "lockfile",
        ".lock",
        "DevToolsActivePort",
        "chrome_debug.log",
      ];

      itemsToClean.forEach((item) => {
        const itemPath = path.join(tokenPath, item);

        if (fs.existsSync(itemPath)) {
          const stats = fs.lstatSync(itemPath);

          if (stats.isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
            console.log(`🗂️ Diretório removido: ${item}`);
          } else {
            fs.unlinkSync(itemPath);
            console.log(`🗑️ Arquivo removido: ${item}`);
          }
        }
      });
    } catch (error) {
      console.error(
        `❌ Erro ao limpar cache da sessão ${sessionName}:`,
        error.message
      );
    }
  }
}

module.exports = SessionCleaner;
