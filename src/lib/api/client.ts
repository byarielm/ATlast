import { IApiClient } from "./IApiClient";
import { RealApiAdapter } from "./adapters/RealApiAdapter";
import { MockApiAdapter } from "./adapters/MockApiAdapter";
import { ENV } from "../../config/env";

/**
 * API Client Factory
 * Returns the appropriate implementation based on environment
 **/
function createApiClient(): IApiClient {
  if (ENV.IS_LOCAL_MOCK) {
    console.log("[API] Using Mock API Adapter");
    return new MockApiAdapter();
  }

  console.log("[API] Using Real API Adapter");
  return new RealApiAdapter();
}

// Export singleton instance
export const apiClient = createApiClient();
