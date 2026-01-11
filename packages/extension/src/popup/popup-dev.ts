// packages/extension/src/popup/popup-dev.ts
/**
 * Development entry point for popup UI
 * Simulates extension behavior for UI development
 */

import type { ExtensionState } from "../lib/messaging.js";

// Build mode injected at build time (mock for dev)
declare const __BUILD_MODE__: string;
const BUILD_MODE = "development";

// Mock browser object (handled by Vite alias)
import browser from "webextension-polyfill";

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
  statusMessage: document.getElementById("status-message")!,
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
  console.log("[Popup Dev] Updating UI with state:", state);

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
        elements.statusMessage.textContent = state.progress.message || "";

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

/**
 * Simulate state transitions for development
 */
let currentState: ExtensionState = { status: "idle" };
let simulationInterval: number | null = null;

function simulateScraping() {
  let count = 0;
  currentState = {
    status: "scraping",
    platform: "twitter",
    pageType: "following",
    progress: {
      count: 0,
      status: "scraping",
      message: "Starting scan...",
    },
  };
  updateUI(currentState);

  simulationInterval = window.setInterval(() => {
    count += Math.floor(Math.random() * 25) + 5;

    if (count >= 247) {
      count = 247;
      if (simulationInterval) clearInterval(simulationInterval);

      currentState = {
        status: "complete",
        platform: "twitter",
        pageType: "following",
        result: {
          usernames: Array(247).fill("mockuser"),
          totalCount: 247,
          scrapedAt: new Date().toISOString(),
        },
      };
      updateUI(currentState);
      return;
    }

    currentState = {
      ...currentState,
      status: "scraping",
      progress: {
        count,
        status: "scraping",
        message: `Found ${count} users...`,
      },
    };
    updateUI(currentState);
  }, 500);
}

/**
 * Initialize popup
 */
async function init(): Promise<void> {
  console.log("[Popup Dev] Initializing development popup...");

  // Show ready state for development
  currentState = {
    status: "ready",
    platform: "twitter",
    pageType: "following",
  };
  updateUI(currentState);

  // Set up event listeners
  elements.btnStart.addEventListener("click", () => {
    console.log("[Popup Dev] Start scan clicked");
    elements.btnStart.disabled = true;
    simulateScraping();
  });

  elements.btnUpload.addEventListener("click", () => {
    console.log("[Popup Dev] Upload clicked");
    alert("In a real extension, this would open ATlast with your results!");
  });

  elements.btnRetry.addEventListener("click", () => {
    console.log("[Popup Dev] Retry clicked");
    currentState = {
      status: "ready",
      platform: "twitter",
      pageType: "following",
    };
    updateUI(currentState);
    elements.btnStart.disabled = false;
  });

  elements.btnCheckServer.addEventListener("click", () => {
    console.log("[Popup Dev] Check server clicked");
    currentState = {
      status: "ready",
      platform: "twitter",
      pageType: "following",
    };
    updateUI(currentState);
  });

  elements.btnOpenAtlast.addEventListener("click", () => {
    console.log("[Popup Dev] Open ATlast clicked");
    window.open("http://127.0.0.1:8888", "_blank");
  });

  elements.btnRetryLogin.addEventListener("click", () => {
    console.log("[Popup Dev] Retry login clicked");
    currentState = {
      status: "ready",
      platform: "twitter",
      pageType: "following",
    };
    updateUI(currentState);
  });

  // Add dev toolbar
  addDevToolbar();

  console.log("[Popup Dev] Ready");
}

/**
 * Add development toolbar for testing different states
 */
function addDevToolbar() {
  const toolbar = document.createElement("div");
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
      currentState = state;
      updateUI(state);
      elements.btnStart.disabled = false;
    };
    return btn;
  };

  toolbar.innerHTML = '<strong style="margin-right: 8px;">Dev Tools:</strong>';
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

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
