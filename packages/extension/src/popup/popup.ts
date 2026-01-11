import browser from "webextension-polyfill";
import {
  MessageType,
  sendToBackground,
  sendToContent,
  type ExtensionState,
} from "../lib/messaging.js";

// Build mode injected at build time
declare const __BUILD_MODE__: string;
const IS_DEV_MODE = __BUILD_MODE__ === "development";

/**
 * DOM elements
 */
const states = {
  idle: document.getElementById("state-idle")!,
  ready: document.getElementById("state-ready")!,
  scraping: document.getElementById("state-scraping")!,
  complete: document.getElementById("state-complete")!,
  uploading: document.getElementById("state-uploading")!,
  error: document.getElementById("state-error")!,
  offline: document.getElementById("state-offline")!,
  notLoggedIn: document.getElementById("state-not-logged-in")!,
};

const elements = {
  platformName: document.getElementById("platform-name")!,
  count: document.getElementById("count")!,
  finalCount: document.getElementById("final-count")!,
  errorMessage: document.getElementById("error-message")!,
  serverUrl: document.getElementById("server-url")!,
  devInstructions: document.getElementById("dev-instructions")!,
  progressFill: document.getElementById("progress-fill")! as HTMLElement,
  btnStart: document.getElementById("btn-start")! as HTMLButtonElement,
  btnUpload: document.getElementById("btn-upload")! as HTMLButtonElement,
  btnRetry: document.getElementById("btn-retry")! as HTMLButtonElement,
  btnCheckServer: document.getElementById(
    "btn-check-server",
  )! as HTMLButtonElement,
  btnOpenAtlast: document.getElementById(
    "btn-open-atlast",
  )! as HTMLButtonElement,
  btnRetryLogin: document.getElementById(
    "btn-retry-login",
  )! as HTMLButtonElement,
};

/**
 * Show specific state, hide others
 */
function showState(stateName: keyof typeof states): void {
  Object.keys(states).forEach((key) => {
    states[key as keyof typeof states].classList.add("hidden");
  });
  states[stateName].classList.remove("hidden");
}

/**
 * Update UI based on extension state
 */
function updateUI(state: ExtensionState): void {
  console.log("[Popup] Updating UI with state:", state);

  switch (state.status) {
    case "idle":
      showState("idle");
      break;

    case "ready":
      showState("ready");
      if (state.platform) {
        const platformName =
          state.platform === "twitter" ? "Twitter/X" : state.platform;
        elements.platformName.textContent = platformName;
      }
      break;

    case "scraping":
      showState("scraping");
      if (state.progress) {
        elements.count.textContent = state.progress.count.toString();

        // Animate progress bar
        const progress = Math.min(state.progress.count / 100, 1) * 100;
        elements.progressFill.style.width = `${progress}%`;
      }
      break;

    case "complete":
      showState("complete");
      if (state.result) {
        elements.finalCount.textContent = state.result.totalCount.toString();
      }
      break;

    case "uploading":
      showState("uploading");
      break;

    case "error":
      showState("error");
      elements.errorMessage.textContent =
        state.error || "An unknown error occurred";
      break;

    default:
      showState("idle");
  }
}

// ============================================================================
// DEV MODE: Mock state and UI injection
// ============================================================================

let devState: ExtensionState = { status: "idle" };
let devSimulationInterval: number | null = null;

/**
 * Inject dev mode banner at top of page
 */
function injectDevBanner(): void {
  const banner = document.createElement("div");
  banner.id = "dev-banner";
  banner.style.cssText = `
    background: #f97316;
    color: white;
    text-align: center;
    padding: 4px;
    font-size: 11px;
    font-weight: bold;
  `;
  banner.textContent = "🔧 DEVELOPMENT MODE";
  document.body.insertBefore(banner, document.body.firstChild);
}

/**
 * Inject dev toolbar for state switching
 */
function injectDevToolbar(): void {
  const toolbar = document.createElement("div");
  toolbar.id = "dev-toolbar";
  toolbar.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #1e293b;
    color: white;
    padding: 8px;
    font-size: 12px;
    border-top: 2px solid #f97316;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    z-index: 10000;
  `;

  const createButton = (label: string, state: ExtensionState) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText = `
      background: #f97316;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    `;
    btn.onclick = () => {
      devState = state;
      updateUI(state);
      elements.btnStart.disabled = false;
    };
    return btn;
  };

  const label = document.createElement("strong");
  label.textContent = "Dev Tools:";
  label.style.marginRight = "8px";
  toolbar.appendChild(label);

  toolbar.appendChild(createButton("Idle", { status: "idle" }));
  toolbar.appendChild(
    createButton("Ready", {
      status: "ready",
      platform: "twitter",
      pageType: "following",
    }),
  );
  toolbar.appendChild(
    createButton("Scraping", {
      status: "scraping",
      platform: "twitter",
      progress: { count: 42, status: "scraping", message: "Found 42 users..." },
    }),
  );
  toolbar.appendChild(
    createButton("Complete", {
      status: "complete",
      platform: "twitter",
      result: {
        usernames: [],
        totalCount: 247,
        scrapedAt: new Date().toISOString(),
      },
    }),
  );
  toolbar.appendChild(
    createButton("Error", {
      status: "error",
      error: "Failed to scrape page",
    }),
  );
  toolbar.appendChild(createButton("Offline", { status: "idle" }));
  toolbar.appendChild(createButton("Not Logged In", { status: "idle" }));

  document.body.appendChild(toolbar);
}

/**
 * Simulate scraping progress for dev mode
 */
function devSimulateScraping(): void {
  let count = 0;
  devState = {
    status: "scraping",
    platform: "twitter",
    pageType: "following",
    progress: {
      count: 0,
      status: "scraping",
      message: "Starting scan...",
    },
  };
  updateUI(devState);

  devSimulationInterval = window.setInterval(() => {
    count += Math.floor(Math.random() * 25) + 5;

    if (count >= 247) {
      count = 247;
      if (devSimulationInterval) clearInterval(devSimulationInterval);

      devState = {
        status: "complete",
        platform: "twitter",
        pageType: "following",
        result: {
          usernames: Array(247).fill("mockuser"),
          totalCount: 247,
          scrapedAt: new Date().toISOString(),
        },
      };
      updateUI(devState);
      return;
    }

    devState = {
      ...devState,
      status: "scraping",
      progress: {
        count,
        status: "scraping",
        message: `Found ${count} users...`,
      },
    };
    updateUI(devState);
  }, 500);
}

/**
 * Initialize dev mode
 */
function initDevMode(): void {
  console.log("[Popup Dev] Initializing development mode...");

  // Inject dev UI
  injectDevBanner();
  injectDevToolbar();

  // Start with ready state
  devState = {
    status: "ready",
    platform: "twitter",
    pageType: "following",
  };
  updateUI(devState);

  // Set up event listeners for dev mode
  elements.btnStart.addEventListener("click", () => {
    console.log("[Popup Dev] Start scan clicked");
    elements.btnStart.disabled = true;
    devSimulateScraping();
  });

  elements.btnUpload.addEventListener("click", () => {
    console.log("[Popup Dev] Upload clicked");
    alert("In dev mode - would open ATlast with results!");
  });

  elements.btnRetry.addEventListener("click", () => {
    console.log("[Popup Dev] Retry clicked");
    devState = {
      status: "ready",
      platform: "twitter",
      pageType: "following",
    };
    updateUI(devState);
    elements.btnStart.disabled = false;
  });

  elements.btnCheckServer.addEventListener("click", () => {
    console.log("[Popup Dev] Check server clicked");
    devState = {
      status: "ready",
      platform: "twitter",
      pageType: "following",
    };
    updateUI(devState);
  });

  elements.btnOpenAtlast.addEventListener("click", () => {
    console.log("[Popup Dev] Open ATlast clicked");
    window.open("http://127.0.0.1:8888", "_blank");
  });

  elements.btnRetryLogin.addEventListener("click", () => {
    console.log("[Popup Dev] Retry login clicked");
    devState = {
      status: "ready",
      platform: "twitter",
      pageType: "following",
    };
    updateUI(devState);
  });

  console.log("[Popup Dev] Ready");
}

// ============================================================================
// PRODUCTION MODE: Real extension logic
// ============================================================================

/**
 * Start scraping
 */
async function startScraping(): Promise<void> {
  try {
    elements.btnStart.disabled = true;

    await sendToContent({
      type: MessageType.START_SCRAPE,
    });

    // Poll for updates
    pollForUpdates();
  } catch (error) {
    console.error("[Popup] Error starting scrape:", error);
    alert("Error: Make sure you are on a Twitter/X Following page");
    elements.btnStart.disabled = false;
  }
}

/**
 * Upload to ATlast
 */
async function uploadToATlast(): Promise<void> {
  try {
    elements.btnUpload.disabled = true;
    showState("uploading");

    const state = await sendToBackground<ExtensionState>({
      type: MessageType.GET_STATE,
    });

    if (!state.result || !state.platform) {
      throw new Error("No scan results found");
    }

    if (state.result.usernames.length === 0) {
      throw new Error("No users found. Please scan the page first.");
    }

    // Import API client
    const { uploadToATlast: apiUpload, getExtensionVersion } =
      await import("../lib/api-client.js");

    // Prepare request
    const request = {
      platform: state.platform,
      usernames: state.result.usernames,
      metadata: {
        extensionVersion: getExtensionVersion(),
        scrapedAt: state.result.scrapedAt,
        pageType: state.pageType || "following",
        sourceUrl: window.location.href,
      },
    };

    // Upload to ATlast
    const response = await apiUpload(request);

    console.log("[Popup] Upload successful:", response.importId);

    // Open ATlast at results page with upload data
    const { getApiUrl } = await import("../lib/api-client.js");
    const resultsUrl = `${getApiUrl()}${response.redirectUrl}`;
    browser.tabs.create({ url: resultsUrl });
  } catch (error) {
    console.error("[Popup] Error uploading:", error);
    alert("Error uploading to ATlast. Please try again.");
    elements.btnUpload.disabled = false;
    showState("complete");
  }
}

/**
 * Poll for state updates
 */
let pollInterval: number | null = null;

async function pollForUpdates(): Promise<void> {
  if (pollInterval) {
    clearInterval(pollInterval);
  }

  pollInterval = window.setInterval(async () => {
    const state = await sendToBackground<ExtensionState>({
      type: MessageType.GET_STATE,
    });

    updateUI(state);

    // Stop polling when scraping is done
    if (state.status === "complete" || state.status === "error") {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }
  }, 500);
}

/**
 * Check server health and show offline state if needed
 */
async function checkServer(): Promise<boolean> {
  console.log("[Popup] Checking server health...");

  // Import health check function
  const { checkServerHealth, getApiUrl } = await import("../lib/api-client.js");

  const isOnline = await checkServerHealth();

  if (!isOnline) {
    console.log("[Popup] Server is offline");
    showState("offline");

    // Show appropriate message based on build mode
    const apiUrl = getApiUrl();
    const isDev = __BUILD_MODE__ === "development";

    // Hide dev instructions in production
    if (!isDev) {
      elements.devInstructions.classList.add("hidden");
    }

    elements.serverUrl.textContent = isDev
      ? `Development server at ${apiUrl}`
      : `Cannot reach ${apiUrl}`;

    return false;
  }

  console.log("[Popup] Server is online");
  return true;
}

/**
 * Initialize production mode
 */
async function initProdMode(): Promise<void> {
  console.log("[Popup] Initializing popup...");

  // Check server health first (only in dev mode)
  const { getApiUrl } = await import("../lib/api-client.js");
  const isDev =
    getApiUrl().includes("127.0.0.1") || getApiUrl().includes("localhost");

  if (isDev) {
    const serverOnline = await checkServer();
    if (!serverOnline) {
      // Set up retry button
      elements.btnCheckServer.addEventListener("click", async () => {
        elements.btnCheckServer.disabled = true;
        elements.btnCheckServer.textContent = "Checking...";

        const online = await checkServer();
        if (online) {
          // Server is back online, re-initialize
          initProdMode();
        } else {
          elements.btnCheckServer.disabled = false;
          elements.btnCheckServer.textContent = "Check Again";
        }
      });
      return;
    }
  }

  // Check if user is logged in to ATlast
  console.log("[Popup] Checking login status...");
  const { checkSession } = await import("../lib/api-client.js");
  const session = await checkSession();

  if (!session) {
    console.log("[Popup] Not logged in");
    showState("notLoggedIn");

    // Set up login buttons
    elements.btnOpenAtlast.addEventListener("click", () => {
      browser.tabs.create({ url: getApiUrl() });
    });

    elements.btnRetryLogin.addEventListener("click", async () => {
      elements.btnRetryLogin.disabled = true;
      elements.btnRetryLogin.textContent = "Checking...";

      const newSession = await checkSession();
      if (newSession) {
        // User is now logged in, re-initialize
        initProdMode();
      } else {
        elements.btnRetryLogin.disabled = false;
        elements.btnRetryLogin.textContent = "Check Again";
      }
    });
    return;
  }

  console.log("[Popup] Logged in as", session.handle);

  // Get current state
  console.log("[Popup] Requesting state from background...");
  const state = await sendToBackground<ExtensionState>({
    type: MessageType.GET_STATE,
  });

  console.log("[Popup] Received state from background:", state);
  updateUI(state);

  // Set up event listeners
  elements.btnStart.addEventListener("click", startScraping);
  elements.btnUpload.addEventListener("click", uploadToATlast);
  elements.btnRetry.addEventListener("click", async () => {
    const state = await sendToBackground<ExtensionState>({
      type: MessageType.GET_STATE,
    });
    updateUI(state);
  });

  // Listen for storage changes (when background updates state)
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.extensionState) {
      const newState = changes.extensionState.newValue;
      console.log("[Popup] Storage changed, new state:", newState);
      updateUI(newState);
    }
  });

  // Poll for updates if currently scraping
  if (state.status === "scraping") {
    pollForUpdates();
  }

  console.log("[Popup] Popup ready");
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init(): void {
  if (IS_DEV_MODE) {
    initDevMode();
  } else {
    initProdMode();
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
