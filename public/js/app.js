/**
 * DynamusZap Frontend Application
 * Gerencia toda a interface do usuário e comunicação com a API
 */

class DynamusZapApp {
  constructor() {
    this.socket = null;
    this.apiUrl = "http://localhost:3333"; // Default fallback
    this.currentRoom = null;
    this.messageHistory = [];
    this.logs = [];
    this.startTime = new Date();
    this.stats = {
      totalConnections: 0,
      messagesSent: 0,
      whatsappStatus: "Offline",
    };

    this.init();
  }

  async init() {
    // Check authentication
    if (!this.checkAuthentication()) {
      window.location.href = "login.html";
      return;
    }

    // Load configuration from backend
    await this.loadConfig();

    this.setupEventListeners();
    this.setupSocketConnection();
    this.loadInitialData();
    this.startPeriodicUpdates();
    this.showNotification("Sistema inicializado com sucesso!", "success");
  }

  async loadConfig() {
    try {
      // Try to load config from backend using default URL
      const response = await fetch(`${this.apiUrl}/api/config`);
      const result = await response.json();

      if (result.status === "success" && result.data.apiUrl) {
        this.apiUrl = result.data.apiUrl;
        this.addLog(`Configuração carregada: ${this.apiUrl}`, "success");

        // Update settings form if exists
        const apiUrlInput = document.getElementById("apiUrl");
        if (apiUrlInput) {
          apiUrlInput.value = this.apiUrl;
        }
      } else {
        this.addLog("Usando URL padrão: " + this.apiUrl, "info");
      }
    } catch (error) {
      console.warn("Erro ao carregar configuração do backend:", error);
      this.addLog("Usando URL padrão: " + this.apiUrl, "warning");

      // Try to load from localStorage as fallback
      const savedUrl = localStorage.getItem("dynamuszap_api_url");
      if (savedUrl) {
        this.apiUrl = savedUrl;
        this.addLog(`URL carregada do localStorage: ${this.apiUrl}`, "info");
      }
    }
  }

  checkAuthentication() {
    return localStorage.getItem("dynamuszap_logged_in") === "true";
  }

  logout() {
    localStorage.removeItem("dynamuszap_logged_in");
    localStorage.removeItem("dynamuszap_username");
    this.showNotification("Logout realizado com sucesso!", "info");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const section = e.target.closest(".nav-link").dataset.section;
        this.showSection(section);
      });
    });

    // Menu toggle for mobile
    document.getElementById("menuToggle")?.addEventListener("click", () => {
      document.querySelector(".sidebar").classList.toggle("open");
    });

    // Forms
    this.setupFormHandlers();

    // Real-time controls
    this.setupRealtimeControls();

    // WhatsApp controls
    this.setupWhatsAppControls();

    // Settings
    this.setupSettingsHandlers();
  }

  setupFormHandlers() {
    // Send message form
    document
      .getElementById("sendMessageForm")
      ?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.sendMessage();
      });

    // Bulk message form
    document
      .getElementById("bulkMessageForm")
      ?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.sendBulkMessage();
      });

    // Message type change
    document.getElementById("messageType")?.addEventListener("change", (e) => {
      const fileGroup = document.getElementById("fileGroup");
      if (e.target.value === "text") {
        fileGroup.style.display = "none";
      } else {
        fileGroup.style.display = "block";
      }
    });

    // Chat input
    document.getElementById("chatInput")?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.sendChatMessage();
      }
    });
  }

  setupRealtimeControls() {
    // Room selection
    document.getElementById("roomSelect")?.addEventListener("change", (e) => {
      // Auto-update room selection
    });
  }

  setupWhatsAppControls() {
    document
      .getElementById("connectWhatsApp")
      ?.addEventListener("click", () => {
        this.connectWhatsApp();
      });

    document
      .getElementById("disconnectWhatsApp")
      ?.addEventListener("click", () => {
        this.disconnectWhatsApp();
      });

    document.getElementById("statusWhatsApp")?.addEventListener("click", () => {
      this.checkWhatsAppStatus();
    });

    document.getElementById("syncWhatsApp")?.addEventListener("click", () => {
      this.syncWhatsAppStatus();
    });
  }

  setupSettingsHandlers() {
    document
      .getElementById("apiConfigForm")
      ?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveApiSettings();
      });

    document
      .getElementById("notificationSettings")
      ?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveNotificationSettings();
      });
  }

  setupSocketConnection() {
    try {
      this.socket = io();

      this.socket.on("connect", () => {
        this.updateConnectionStatus(true);
        this.addLog("Conectado ao Socket.IO", "success");
        this.joinDefaultRooms();
        // Verificar status inicial do WhatsApp
        setTimeout(() => {
          this.checkWhatsAppStatus();
        }, 1000);
      });

      this.socket.on("disconnect", () => {
        this.updateConnectionStatus(false);
        this.addLog("Desconectado do Socket.IO", "warning");
      });

      this.socket.on("messageReceived", (data) => {
        this.handleMessageReceived(data);
      });

      this.socket.on("whatsappQrCode", (data) => {
        console.log("QR Code recebido via Socket.IO:", data);
        this.displayQRCode(data.qrCode);
        this.showNotification(
          "QR Code recebido! Escaneie com seu WhatsApp",
          "info"
        );
        this.addLog("QR Code recebido", "info");
      });

      this.socket.on("whatsappMessage", (data) => {
        console.log("Mensagem WhatsApp recebida:", data);
        this.addLog(`Mensagem recebida de ${data.from}: ${data.body}`, "info");
        this.showNotification(`Nova mensagem de ${data.from}`, "info");
      });

      this.socket.on("whatsappConnected", (data) => {
        console.log("WhatsApp conectado via Socket.IO:", data);
        this.stats.whatsappStatus = "Online";
        this.updateStatsDisplay();
        this.showNotification("WhatsApp conectado com sucesso!", "success");
        this.addLog("WhatsApp conectado", "success");

        // Limpar QR Code e mostrar status conectado
        const qrContainer = document.getElementById("qrContainer");
        if (qrContainer) {
          qrContainer.innerHTML = `
            <div class="connection-status connected">
              <i class="fas fa-check-circle"></i>
              <p>WhatsApp Conectado!</p>
            </div>
          `;
        }
      });

      this.socket.on("whatsappDisconnected", () => {
        this.stats.whatsappStatus = "Offline";
        this.updateStatsDisplay();
        this.showNotification("WhatsApp desconectado", "warning");
        this.addLog("WhatsApp desconectado", "warning");

        // Atualizar QR Container para mostrar estado desconectado
        const qrContainer = document.getElementById("qrContainer");
        if (qrContainer) {
          qrContainer.innerHTML = `
            <div class="qr-placeholder">
              <i class="fas fa-qrcode"></i>
              <p>Clique em "Gerar QR Code" para conectar</p>
              <button class="btn btn-primary" onclick="generateQRCode()">
                <i class="fas fa-qrcode"></i> Gerar QR Code
              </button>
            </div>
          `;
        }
      });

      this.socket.on("notification", (data) => {
        this.showNotification(data.message, data.type);
        this.addLog(`Notificação: ${data.message}`, data.type);
      });

      this.socket.on("userJoined", (data) => {
        this.addLog(
          `Usuário ${data.userId} entrou na sala ${data.room}`,
          "info"
        );
        this.updateUsersList();
      });

      this.socket.on("userLeft", (data) => {
        this.addLog(`Usuário ${data.userId} saiu da sala ${data.room}`, "info");
        this.updateUsersList();
      });
    } catch (error) {
      console.error("Erro ao conectar Socket.IO:", error);
      this.addLog("Erro ao conectar Socket.IO", "error");
    }
  }

  joinDefaultRooms() {
    const defaultRooms = [
      "whatsapp-room",
      "general-room",
      "notifications-room",
    ];
    defaultRooms.forEach((room) => {
      this.joinRoom(room);
    });
  }

  updateConnectionStatus(connected) {
    const indicator = document.getElementById("connectionIndicator");
    const dot = indicator?.querySelector(".status-dot");
    const text = indicator?.querySelector(".status-text");

    if (connected) {
      dot?.classList.add("connected");
      dot?.classList.remove("disconnected");
      if (text) text.textContent = "Conectado";
    } else {
      dot?.classList.add("disconnected");
      dot?.classList.remove("connected");
      if (text) text.textContent = "Desconectado";
    }
  }

  showSection(sectionName) {
    // Update navigation
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });
    document
      .querySelector(`[data-section="${sectionName}"]`)
      ?.classList.add("active");

    // Update content
    document.querySelectorAll(".content-section").forEach((section) => {
      section.classList.remove("active");
    });
    document.getElementById(`${sectionName}-section`)?.classList.add("active");

    // Update page title
    const titles = {
      dashboard: "Dashboard",
      whatsapp: "WhatsApp",
      realtime: "Tempo Real",
      logs: "Logs",
      settings: "Configurações",
    };
    document.getElementById("pageTitle").textContent =
      titles[sectionName] || "Dashboard";

    // Load section-specific data
    this.loadSectionData(sectionName);
  }

  loadSectionData(section) {
    switch (section) {
      case "dashboard":
        this.updateDashboard();
        break;
      case "whatsapp":
        this.loadMessageHistory();
        break;
      case "realtime":
        this.updateUsersList();
        this.updateRoomsList();
        break;
      case "logs":
        this.displayLogs();
        break;
    }
  }

  async loadInitialData() {
    try {
      await this.updateStats();
      this.updateDashboard();
      this.addLog("Dados iniciais carregados", "success");

      // Verificar status inicial do WhatsApp
      setTimeout(() => {
        this.checkWhatsAppStatus();
      }, 1000);
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      this.addLog("Erro ao carregar dados iniciais", "error");
    }
  }

  startPeriodicUpdates() {
    // Update stats every 5 seconds
    setInterval(() => {
      this.updateStats();
      this.updateUptime();
    }, 5000);

    // Update dashboard every 10 seconds
    setInterval(() => {
      this.updateDashboard();
    }, 10000);

    // Check WhatsApp status every 15 seconds
    setInterval(() => {
      this.checkWhatsAppStatus();
    }, 15000);
  }

  async updateStats() {
    try {
      const response = await fetch(`${this.apiUrl}/api/socket/stats`);
      const data = await response.json();

      if (data.success) {
        this.stats.totalConnections = data.data.totalConnections;
        this.updateStatsDisplay();
      }
    } catch (error) {
      console.error("Erro ao atualizar estatísticas:", error);
    }
  }

  updateStatsDisplay() {
    document.getElementById("totalConnections").textContent =
      this.stats.totalConnections;
    document.getElementById("whatsappStatus").textContent =
      this.stats.whatsappStatus;
    document.getElementById("messagesSent").textContent =
      this.stats.messagesSent;

    // Atualizar indicador visual do WhatsApp
    this.updateWhatsAppStatusIndicator();
  }

  updateWhatsAppStatusIndicator() {
    const indicator = document.getElementById("whatsappStatusIndicator");
    const statusCard = indicator?.querySelector(".status-card");
    const statusIcon = document.getElementById("whatsappStatusIcon");
    const statusTitle = document.getElementById("whatsappStatusTitle");
    const statusDescription = document.getElementById(
      "whatsappStatusDescription"
    );
    const connectionState = document.getElementById("whatsappConnectionState");

    if (!statusCard || !statusIcon || !statusTitle || !statusDescription)
      return;

    // Remover classes anteriores
    statusCard.classList.remove("connected", "disconnected", "checking");

    if (this.stats.whatsappStatus === "Online") {
      statusCard.classList.add("connected");
      statusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
      statusTitle.textContent = "WhatsApp Conectado";
      statusDescription.textContent = "Pronto para enviar e receber mensagens";
      connectionState.textContent = "CONNECTED";
    } else if (this.stats.whatsappStatus === "Offline") {
      statusCard.classList.add("disconnected");
      statusIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
      statusTitle.textContent = "WhatsApp Desconectado";
      statusDescription.textContent =
        "Clique em 'Conectar' ou 'Gerar QR Code' para iniciar";
      connectionState.textContent = "DISCONNECTED";
    } else {
      statusCard.classList.add("checking");
      statusIcon.innerHTML = '<i class="fas fa-spinner"></i>';
      statusTitle.textContent = "Verificando Status...";
      statusDescription.textContent = "Aguarde enquanto verificamos a conexão";
      connectionState.textContent = "CHECKING";
    }
  }

  updateUptime() {
    const now = new Date();
    const diff = now - this.startTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById("uptime").textContent = `${hours
      .toString()
      .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  updateDashboard() {
    this.updateRecentActivity();
  }

  updateRecentActivity() {
    const container = document.getElementById("recentActivity");
    if (!container) return;

    const recentLogs = this.logs.slice(-5).reverse();
    container.innerHTML = "";

    recentLogs.forEach((log) => {
      const item = document.createElement("div");
      item.className = "activity-item";

      item.innerHTML = `
                <div class="activity-icon ${log.level}">
                    <i class="fas fa-${this.getLogIcon(log.level)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${log.message}</div>
                    <div class="activity-time">${log.time}</div>
                </div>
            `;

      container.appendChild(item);
    });
  }

  getLogIcon(level) {
    const icons = {
      success: "check",
      error: "times",
      warning: "exclamation-triangle",
      info: "info-circle",
    };
    return icons[level] || "info-circle";
  }

  async sendMessage() {
    const phoneNumber = document.getElementById("phoneNumber").value;
    const messageText = document.getElementById("messageText").value;
    const messageType = document.getElementById("messageType").value;

    if (!phoneNumber || !messageText) {
      this.showNotification("Preencha todos os campos obrigatórios", "error");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("phoneNumber", phoneNumber);
      formData.append("message", messageText);
      formData.append("type", messageType);

      if (messageType !== "text") {
        const fileInput = document.getElementById("fileInput");
        if (fileInput.files[0]) {
          formData.append("file", fileInput.files[0]);
        }
      }

      let response, result;

      if (messageType === "text") {
        // Send text message
        response = await fetch(`${this.apiUrl}/api/whatsapp/send-message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: phoneNumber,
            message: messageText,
            sessionName: "default",
          }),
        });
      } else {
        // Send file message
        response = await fetch(`${this.apiUrl}/api/whatsapp/send-message`, {
          method: "POST",
          body: formData,
        });
      }

      result = await response.json();

      if (result.status === "success") {
        this.showNotification("Mensagem enviada com sucesso!", "success");
        this.stats.messagesSent++;
        this.updateStatsDisplay();
        this.addMessageToHistory(phoneNumber, messageText, "sent");
        document.getElementById("sendMessageForm").reset();
      } else {
        this.showNotification(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      this.showNotification("Erro ao enviar mensagem", "error");
    }
  }

  async sendBulkMessage() {
    const phoneList = document.getElementById("phoneList").value;
    const bulkMessage = document.getElementById("bulkMessage").value;
    const delayBetween = document.getElementById("delayBetween").value;

    if (!phoneList || !bulkMessage) {
      this.showNotification("Preencha todos os campos obrigatórios", "error");
      return;
    }

    const phones = phoneList.split("\n").filter((phone) => phone.trim());

    try {
      const response = await fetch(
        `${this.apiUrl}/api/whatsapp/send-bulk-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumbers: phones,
            message: bulkMessage,
            delay: parseInt(delayBetween),
            sessionName: "default",
          }),
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        this.showNotification(
          `Mensagens enviadas para ${phones.length} contatos!`,
          "success"
        );
        this.stats.messagesSent += phones.length;
        this.updateStatsDisplay();
        document.getElementById("bulkMessageForm").reset();
      } else {
        this.showNotification(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagens em massa:", error);
      this.showNotification("Erro ao enviar mensagens em massa", "error");
    }
  }

  addMessageToHistory(phone, message, status) {
    const messageItem = {
      phone,
      message,
      status,
      timestamp: new Date(),
    };

    this.messageHistory.unshift(messageItem);
    this.updateMessageHistoryDisplay();
  }

  updateMessageHistoryDisplay() {
    const container = document.getElementById("messageHistory");
    if (!container) return;

    container.innerHTML = "";

    this.messageHistory.slice(0, 10).forEach((msg) => {
      const item = document.createElement("div");
      item.className = "message-item";

      item.innerHTML = `
                <div class="message-header">
                    <span class="message-phone">${msg.phone}</span>
                    <span class="message-time">${msg.timestamp.toLocaleString()}</span>
                </div>
                <div class="message-content">${msg.message}</div>
                <span class="message-status ${msg.status}">${msg.status}</span>
            `;

      container.appendChild(item);
    });
  }

  loadMessageHistory() {
    this.updateMessageHistoryDisplay();
  }

  async generateQRCode() {
    try {
      const response = await fetch(`${this.apiUrl}/api/whatsapp/qr-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionName: "default",
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        this.showNotification("QR Code gerado! Aguarde a exibição...", "info");
        this.addLog("QR Code gerado", "info");
      } else {
        this.showNotification(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      this.showNotification("Erro ao solicitar QR Code", "error");
    }
  }

  displayQRCode(qrCodeData) {
    const container = document.getElementById("qrContainer");
    if (!container) return;

    container.innerHTML = `
            <div class="qr-code-container">
                <img src="${qrCodeData}" alt="QR Code" class="qr-code">
                <p>Escaneie o QR Code com seu WhatsApp</p>
                <button class="btn btn-secondary" onclick="app.generateQRCode()">
                    <i class="fas fa-refresh"></i> Gerar Novo QR
                </button>
            </div>
        `;
  }

  async connectWhatsApp() {
    try {
      const response = await fetch(`${this.apiUrl}/api/whatsapp/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionName: "default",
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        this.showNotification("WhatsApp conectado com sucesso!", "success");
        this.addLog("WhatsApp conectado", "success");
        this.stats.whatsappStatus = "Online";
        this.updateStatsDisplay();
      } else {
        this.showNotification(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao conectar WhatsApp:", error);
      this.showNotification("Erro ao conectar WhatsApp", "error");
    }
  }

  async disconnectWhatsApp() {
    try {
      const response = await fetch(`${this.apiUrl}/api/whatsapp/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionName: "default",
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        this.showNotification("WhatsApp desconectado", "warning");
        this.stats.whatsappStatus = "Offline";
        this.updateStatsDisplay();
        this.addLog("WhatsApp desconectado", "warning");
      } else {
        this.showNotification(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao desconectar WhatsApp:", error);
      this.showNotification("Erro ao desconectar WhatsApp", "error");
    }
  }

  async checkWhatsAppStatus() {
    try {
      // Mostrar estado de verificação
      this.stats.whatsappStatus = "Checking";
      this.updateStatsDisplay();

      const response = await fetch(
        `${this.apiUrl}/api/whatsapp/status?sessionName=default`
      );
      const result = await response.json();

      if (result.status === "success") {
        this.stats.whatsappStatus = result.data.connected
          ? "Online"
          : "Offline";
        this.updateStatsDisplay();

        // Atualizar interface se conectado
        if (result.data.connected) {
          const qrContainer = document.getElementById("qrContainer");
          if (qrContainer) {
            qrContainer.innerHTML = `
              <div class="connection-status connected">
                <i class="fas fa-check-circle"></i>
                <p>WhatsApp Conectado!</p>
              </div>
            `;
          }
        }

        this.addLog(
          `Status WhatsApp: ${this.stats.whatsappStatus}`,
          result.data.connected ? "success" : "warning"
        );
      } else {
        this.stats.whatsappStatus = "Offline";
        this.updateStatsDisplay();
        this.showNotification(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      this.stats.whatsappStatus = "Offline";
      this.updateStatsDisplay();
      this.showNotification("Erro ao verificar status", "error");
    }
  }

  async syncWhatsAppStatus() {
    try {
      // Mostrar estado de sincronização
      this.stats.whatsappStatus = "Checking";
      this.updateStatsDisplay();

      this.addLog("Sincronizando status do WhatsApp...", "info");
      const response = await fetch(`${this.apiUrl}/api/whatsapp/sync-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionName: "default",
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        this.showNotification("Status sincronizado com sucesso!", "success");
        this.addLog("Status do WhatsApp sincronizado", "success");

        // Atualizar status local
        this.stats.whatsappStatus = result.data.connected
          ? "Online"
          : "Offline";
        this.updateStatsDisplay();

        // Atualizar interface se conectado
        if (result.data.connected) {
          const qrContainer = document.getElementById("qrContainer");
          if (qrContainer) {
            qrContainer.innerHTML = `
              <div class="connection-status connected">
                <i class="fas fa-check-circle"></i>
                <p>WhatsApp Conectado!</p>
              </div>
            `;
          }
        }
      } else {
        this.stats.whatsappStatus = "Offline";
        this.updateStatsDisplay();
        this.showNotification(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao sincronizar status:", error);
      this.stats.whatsappStatus = "Offline";
      this.updateStatsDisplay();
      this.showNotification("Erro ao sincronizar status", "error");
    }
  }

  joinRoom(room) {
    if (this.socket) {
      this.socket.emit("joinRoom", room);
      this.currentRoom = room;
      this.addLog(`Entrando na sala: ${room}`, "info");
    }
  }

  leaveRoom(room) {
    if (this.socket) {
      this.socket.emit("leaveRoom", room);
      if (this.currentRoom === room) {
        this.currentRoom = null;
      }
      this.addLog(`Saindo da sala: ${room}`, "info");
    }
  }

  joinSelectedRoom() {
    const roomSelect = document.getElementById("roomSelect");
    const room = roomSelect.value;

    if (room) {
      this.joinRoom(room);
      this.showNotification(`Entrando na sala: ${room}`, "info");
    } else {
      this.showNotification("Selecione uma sala", "warning");
    }
  }

  leaveSelectedRoom() {
    const roomSelect = document.getElementById("roomSelect");
    const room = roomSelect.value;

    if (room) {
      this.leaveRoom(room);
      this.showNotification(`Saindo da sala: ${room}`, "warning");
    } else {
      this.showNotification("Selecione uma sala", "warning");
    }
  }

  sendChatMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();

    if (!message) return;

    const data = {
      message,
      room: this.currentRoom,
    };

    if (this.socket) {
      this.socket.emit("sendMessage", data);
      this.addChatMessage(message, true);
      input.value = "";
    }
  }

  handleMessageReceived(data) {
    this.addChatMessage(data.message, false, data.from);
  }

  addChatMessage(message, own = false, from = null) {
    const container = document.getElementById("chatMessages");
    if (!container) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${own ? "own" : "other"}`;

    const timestamp = new Date().toLocaleTimeString();

    messageDiv.innerHTML = `
            <div class="message-info">
                ${!own ? `<strong>${from || "Anônimo"}:</strong> ` : ""}
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-text">${message}</div>
        `;

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  }

  updateUsersList() {
    // Implementation for updating users list
    const container = document.getElementById("usersList");
    if (!container) return;

    // Mock data for now
    container.innerHTML = `
            <div class="user-item">
                <div class="user-icon"><i class="fas fa-user"></i></div>
                <div class="user-info">
                    <div class="user-name">Admin</div>
                    <div class="user-status">Online</div>
                </div>
            </div>
        `;
  }

  updateRoomsList() {
    const container = document.getElementById("roomsList");
    if (!container) return;

    const rooms = [
      { name: "WhatsApp Room", count: this.stats.totalConnections },
      { name: "General Room", count: 0 },
      { name: "Notifications Room", count: 0 },
    ];

    container.innerHTML = "";

    rooms.forEach((room) => {
      const item = document.createElement("div");
      item.className = "room-item";

      item.innerHTML = `
                <div class="room-icon"><i class="fas fa-hashtag"></i></div>
                <div class="room-info">
                    <div class="room-name">${room.name}</div>
                    <div class="room-count">${room.count} usuários</div>
                </div>
            `;

      container.appendChild(item);
    });
  }

  addLog(message, level = "info") {
    const log = {
      message,
      level,
      time: new Date().toLocaleString(),
      timestamp: new Date(),
    };

    this.logs.unshift(log);

    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }

    this.updateRecentActivity();
  }

  displayLogs() {
    const container = document.getElementById("logsContent");
    if (!container) return;

    container.innerHTML = "";

    this.logs.forEach((log) => {
      const entry = document.createElement("div");
      entry.className = "log-entry";

      entry.innerHTML = `
                <div class="log-time">${log.time}</div>
                <div class="log-level ${log.level}">${log.level}</div>
                <div class="log-message">${log.message}</div>
            `;

      container.appendChild(entry);
    });
  }

  clearLogs() {
    this.logs = [];
    this.displayLogs();
    this.showNotification("Logs limpos", "info");
  }

  exportLogs() {
    const logsText = this.logs
      .map((log) => `[${log.time}] [${log.level.toUpperCase()}] ${log.message}`)
      .join("\n");

    const blob = new Blob([logsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dynamuszap-logs-${
      new Date().toISOString().split("T")[0]
    }.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification("Logs exportados", "success");
  }

  saveApiSettings() {
    const apiUrl = document.getElementById("apiUrl").value;
    const autoReconnect = document.getElementById("autoReconnect").checked;

    // Validate URL format
    try {
      new URL(apiUrl);
    } catch (error) {
      this.showNotification(
        "URL inválida. Use formato: http://localhost:3333",
        "error"
      );
      return;
    }

    // Save to localStorage
    localStorage.setItem("dynamuszap_api_url", apiUrl);
    localStorage.setItem("dynamuszap_auto_reconnect", autoReconnect);

    // Apply immediately
    const oldUrl = this.apiUrl;
    this.apiUrl = apiUrl;

    this.showNotification("Configurações salvas", "success");
    this.addLog(`API URL atualizada: ${oldUrl} → ${apiUrl}`, "info");

    // Optionally reconnect socket if URL changed
    if (oldUrl !== apiUrl && autoReconnect) {
      this.addLog("Reconectando com nova URL...", "info");
      setTimeout(() => {
        this.setupSocketConnection();
      }, 1000);
    }
  }

  saveNotificationSettings() {
    const enableNotifications = document.getElementById(
      "enableNotifications"
    ).checked;
    const notificationSound =
      document.getElementById("notificationSound").checked;

    // Save to localStorage
    localStorage.setItem("dynamuszap_notifications", enableNotifications);
    localStorage.setItem("dynamuszap_notification_sound", notificationSound);

    this.showNotification("Configurações de notificação salvas", "success");
    this.addLog("Configurações de notificação atualizadas", "info");
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Play sound if enabled
    const soundEnabled =
      localStorage.getItem("dynamuszap_notification_sound") !== "false";
    if (soundEnabled && type === "error") {
      // You can add sound here
    }

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

// Global functions for buttons
window.generateQRCode = () => app.generateQRCode();
window.joinSelectedRoom = () => app.joinSelectedRoom();
window.leaveSelectedRoom = () => app.leaveSelectedRoom();
window.sendChatMessage = () => app.sendChatMessage();
window.clearLogs = () => app.clearLogs();
window.exportLogs = () => app.exportLogs();

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new DynamusZapApp();
});
