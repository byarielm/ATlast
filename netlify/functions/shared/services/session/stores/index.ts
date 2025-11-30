export * from "./StateStore";
export * from "./SessionStore";
export * from "./UserSessionStore";

import { PostgresStateStore } from "./StateStore";
import { PostgresSessionStore } from "./SessionStore";
import { PostgresUserSessionStore } from "./UserSessionStore";

// Export singleton instances
export const stateStore = new PostgresStateStore();
export const sessionStore = new PostgresSessionStore();
export const userSessions = new PostgresUserSessionStore();
