// packages/extension/src/popup/mocks/browser-mock.ts
/**
 * Mock browser API for Vite dev server
 * Simulates extension behavior without actual WebExtension APIs
 */

interface MockStorage {
  local: {
    get: (key: string | string[]) => Promise<any>;
    set: (items: any) => Promise<void>;
    remove: (keys: string | string[]) => Promise<void>;
    onChanged: {
      addListener: (callback: Function) => void;
      removeListener: (callback: Function) => void;
    };
  };
}

interface MockRuntime {
  getManifest: () => { version: string };
  sendMessage: (message: any) => Promise<any>;
  onMessage: {
    addListener: (callback: Function) => void;
    removeListener: (callback: Function) => void;
  };
}

interface MockTabs {
  create: (options: { url: string }) => Promise<void>;
  query: (options: any) => Promise<any[]>;
  sendMessage: (tabId: number, message: any) => Promise<any>;
}

// Mock state storage
let mockState = {
  extensionState: {
    status: "idle" as const,
    platform: undefined,
    pageType: undefined,
    progress: undefined,
    result: undefined,
    error: undefined,
  },
};

const storageListeners: Function[] = [];

// Mock storage API
const storage: MockStorage = {
  local: {
    get: async (key) => {
      console.log("[Mock Browser] storage.local.get:", key);
      if (typeof key === "string") {
        return { [key]: mockState[key as keyof typeof mockState] };
      }
      return mockState;
    },
    set: async (items) => {
      console.log("[Mock Browser] storage.local.set:", items);
      mockState = { ...mockState, ...items };

      // Trigger change listeners
      storageListeners.forEach((listener) => {
        Object.keys(items).forEach((key) => {
          listener(
            {
              [key]: {
                newValue: items[key],
                oldValue: mockState[key as keyof typeof mockState],
              },
            },
            "local",
          );
        });
      });
    },
    remove: async (keys) => {
      console.log("[Mock Browser] storage.local.remove:", keys);
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach((key) => {
        delete mockState[key as keyof typeof mockState];
      });
    },
    onChanged: {
      addListener: (callback: Function) => {
        storageListeners.push(callback);
      },
      removeListener: (callback: Function) => {
        const index = storageListeners.indexOf(callback);
        if (index > -1) storageListeners.splice(index, 1);
      },
    },
  },
};

// Mock runtime API
const runtime: MockRuntime = {
  getManifest: () => {
    console.log("[Mock Browser] runtime.getManifest");
    return { version: "1.0.0-dev" };
  },
  sendMessage: async (message) => {
    console.log("[Mock Browser] runtime.sendMessage:", message);

    // Simulate message responses based on type
    if (message.type === "GET_STATE") {
      return mockState.extensionState;
    }

    return { success: true };
  },
  onMessage: {
    addListener: (callback: Function) => {
      console.log("[Mock Browser] runtime.onMessage.addListener");
    },
    removeListener: (callback: Function) => {
      console.log("[Mock Browser] runtime.onMessage.removeListener");
    },
  },
};

// Mock tabs API
const tabs: MockTabs = {
  create: async (options) => {
    console.log("[Mock Browser] tabs.create:", options);
    window.open(options.url, "_blank");
  },
  query: async (options) => {
    console.log("[Mock Browser] tabs.query:", options);
    return [{ id: 1, url: "https://x.com/example/following" }];
  },
  sendMessage: async (tabId, message) => {
    console.log("[Mock Browser] tabs.sendMessage:", tabId, message);
    return { success: true };
  },
};

// Export mock browser object
export default {
  storage,
  runtime,
  tabs,
};
