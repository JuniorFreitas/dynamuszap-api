/**
 * Configuração otimizada do Puppeteer para Alpine Linux
 */

const getPuppeteerConfig = (sessionName) => {
  const isAlpine =
    process.platform === "linux" && process.env.NODE_ENV === "production";

  const baseConfig = {
    multidevice: true,
    headless: "new",
    devtools: false,
    useChrome: true,
    debug: false,
    logQR: true,
    browserWS: "",
    addProxy: [""],
    session: sessionName,
    puppeteerOptions: {
      userDataDir: `./tokens/${sessionName}`,
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        (isAlpine ? "/usr/bin/chromium-browser" : undefined),
      timeout: 60000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    },
  };

  // Configurações específicas para Alpine Linux
  if (isAlpine) {
    baseConfig.puppeteerOptions.args = [
      ...baseConfig.puppeteerOptions.args,
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-translate",
      "--disable-ipc-flooding-protection",
      "--disable-hang-monitor",
      "--disable-client-side-phishing-detection",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-domain-reliability",
      "--disable-extensions",
      "--disable-features=AudioServiceOutOfProcess",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--single-process",
      "--no-crash-upload",
      "--disable-software-rasterizer",
      "--memory-pressure-off",
      "--max_old_space_size=4096",
      "--disable-crash-reporter",
      "--disable-extensions-http-throttling",
      "--disable-logging",
      "--disable-login-animations",
      "--disable-notifications",
      "--disable-gpu-sandbox",
      "--disable-software-rasterizer",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--disable-client-side-phishing-detection",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-sync",
      "--hide-scrollbars",
      "--mute-audio",
      "--no-default-browser-check",
      "--no-pings",
      "--window-size=1920,1080",
      "--start-maximized",
    ];

    // Configurações adicionais para ambientes containerizados
    baseConfig.puppeteerOptions.handleSIGINT = false;
    baseConfig.puppeteerOptions.handleSIGTERM = false;
    baseConfig.puppeteerOptions.handleSIGHUP = false;
  }

  return baseConfig;
};

module.exports = { getPuppeteerConfig };
