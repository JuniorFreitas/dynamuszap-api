/**
 * DynamusZap Authentication Manager
 * Gerencia autenticação JWT, proteção de rotas e renovação de tokens
 */
class AuthManager {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    this.refreshTimer = null;
    this.isRefreshing = false;

    this.loadTokens();
    this.setupAutoRefresh();
  }

  /**
   * Carrega tokens do storage
   */
  loadTokens() {
    this.token =
      localStorage.getItem("dynamuszap_token") ||
      sessionStorage.getItem("dynamuszap_token");
    this.refreshToken =
      localStorage.getItem("dynamuszap_refresh_token") ||
      sessionStorage.getItem("dynamuszap_refresh_token");

    if (this.token) {
      this.user = this.parseJWT(this.token);
    }
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated() {
    return !!this.token && !this.isTokenExpired();
  }

  /**
   * Verifica se o token está expirado
   */
  isTokenExpired() {
    if (!this.token) return true;

    try {
      const payload = this.parseJWT(this.token);
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch (error) {
      return true;
    }
  }

  /**
   * Parse JWT token
   */
  parseJWT(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Erro ao fazer parse do JWT:", error);
      return null;
    }
  }

  /**
   * Salva tokens no storage
   */
  saveTokens(accessToken, refreshToken, remember = false) {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    this.user = this.parseJWT(accessToken);

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("dynamuszap_token", accessToken);
    storage.setItem("dynamuszap_refresh_token", refreshToken);

    this.setupAutoRefresh();
  }

  /**
   * Remove tokens do storage
   */
  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;

    localStorage.removeItem("dynamuszap_token");
    localStorage.removeItem("dynamuszap_refresh_token");
    sessionStorage.removeItem("dynamuszap_token");
    sessionStorage.removeItem("dynamuszap_refresh_token");

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Configura renovação automática do token
   */
  setupAutoRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.token || !this.refreshToken) return;

    const payload = this.parseJWT(this.token);
    if (!payload) return;

    // Renovar token 2 minutos antes de expirar
    const refreshTime = payload.exp * 1000 - Date.now() - 2 * 60 * 1000;

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTokenSilently();
      }, refreshTime);
    } else {
      // Token já expirado ou prestes a expirar, tentar renovar agora
      this.refreshTokenSilently();
    }
  }

  /**
   * Renova token silenciosamente
   */
  async refreshTokenSilently() {
    if (this.isRefreshing || !this.refreshToken) return;

    this.isRefreshing = true;

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const result = await response.json();
        const remember = !!localStorage.getItem("dynamuszap_token");
        this.saveTokens(result.data.accessToken, this.refreshToken, remember);
        console.log("Token renovado automaticamente");
      } else {
        console.warn("Falha ao renovar token automaticamente");
        this.handleTokenRefreshFailure();
      }
    } catch (error) {
      console.error("Erro ao renovar token:", error);
      this.handleTokenRefreshFailure();
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Lida com falha na renovação do token
   */
  handleTokenRefreshFailure() {
    this.clearTokens();
    // Só redirecionar se estiver em uma página protegida
    if (this.isProtectedPage()) {
      this.redirectToLogin();
    }
  }

  /**
   * Verifica se a página atual é protegida
   */
  isProtectedPage() {
    const path = window.location.pathname;

    // Páginas não protegidas (lista de exclusão)
    const unprotectedPaths = ["/login.html"];

    // Se a página está na lista de não protegidas, retorna false
    if (
      unprotectedPaths.some((unprotectedPath) => path.includes(unprotectedPath))
    ) {
      return false;
    }

    // Todas as outras páginas são protegidas
    // Incluindo raiz (/), index.html e qualquer outra página HTML
    return true;
  }

  /**
   * Redireciona para login
   */
  redirectToLogin() {
    const currentUrl = encodeURIComponent(window.location.href);
    // Usar apenas o pathname se for local para evitar problemas de codificação
    const returnUrl =
      window.location.origin === location.origin
        ? window.location.pathname
        : window.location.href;
    window.location.href = `/login.html?returnUrl=${encodeURIComponent(
      returnUrl
    )}`;
  }

  /**
   * Faz logout
   */
  async logout() {
    try {
      if (this.token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        });
      }
    } catch (error) {
      console.error("Erro no logout:", error);
    } finally {
      this.clearTokens();
      this.redirectToLogin();
    }
  }

  /**
   * Obtém headers de autorização para requisições
   */
  getAuthHeaders() {
    if (!this.token) return {};

    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Faz requisição autenticada
   */
  async authenticatedFetch(url, options = {}) {
    // Verificar se o token está válido
    if (this.isTokenExpired() && this.refreshToken) {
      await this.refreshTokenSilently();
    }

    if (!this.isAuthenticated()) {
      throw new Error("Usuário não autenticado");
    }

    const headers = {
      ...options.headers,
      ...this.getAuthHeaders(),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Se receber 401, tentar renovar token uma vez
    if (response.status === 401 && !options._retry) {
      if (this.refreshToken) {
        await this.refreshTokenSilently();

        if (this.isAuthenticated()) {
          return this.authenticatedFetch(url, { ...options, _retry: true });
        }
      }

      this.handleTokenRefreshFailure();
      throw new Error("Token expirado");
    }

    return response;
  }

  /**
   * Protege uma página (chama esta função no início das páginas protegidas)
   */
  protectPage() {
    if (!this.isAuthenticated()) {
      this.redirectToLogin();
      return false;
    }
    return true;
  }

  /**
   * Obtém informações do usuário
   */
  getUser() {
    return this.user;
  }

  /**
   * Verifica se o usuário tem uma role específica
   */
  hasRole(role) {
    return this.user && this.user.role === role;
  }

  /**
   * Adiciona indicador visual de status de autenticação
   */
  addAuthStatusIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "auth-status";
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    `;

    if (this.isAuthenticated()) {
      indicator.innerHTML = `👤 ${this.user.username} | 🚪 Sair`;
      indicator.style.background = "#10b981";
      indicator.style.color = "white";
      indicator.onclick = () => this.logout();
    } else {
      indicator.innerHTML = "🔒 Não autenticado";
      indicator.style.background = "#ef4444";
      indicator.style.color = "white";
      indicator.onclick = () => this.redirectToLogin();
    }

    document.body.appendChild(indicator);
    return indicator;
  }
}

// Instância global do AuthManager
const authManager = new AuthManager();

// Função de conveniência para proteger páginas
function protectPage() {
  return authManager.protectPage();
}

// Função de conveniência para fazer requisições autenticadas
function authenticatedFetch(url, options) {
  return authManager.authenticatedFetch(url, options);
}

// Exportar para uso global
window.authManager = authManager;
window.protectPage = protectPage;
window.authenticatedFetch = authenticatedFetch;
