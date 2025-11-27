import { isLocalMockMode } from "../config";

// Import both clients
import { apiClient as realApiClient } from "./realApiClient";
import { mockApiClient } from "./mockApiClient";

// Export the appropriate client
export const apiClient = isLocalMockMode() ? mockApiClient : realApiClient;

// Also export both for explicit usage
export { realApiClient, mockApiClient };
