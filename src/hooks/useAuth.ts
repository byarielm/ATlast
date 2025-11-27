import { useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient";
import type { AtprotoSession, AppStep } from "../types";

export function useAuth() {
  const [session, setSession] = useState<AtprotoSession | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>("checking");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    try {
      console.log("[useAuth] Checking existing session...");
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session");
      const error = params.get("error");

      if (error) {
        console.log("[useAuth] Error in URL:", error);
        setStatusMessage(`Login failed: ${error}`);
        setCurrentStep("login");
        window.history.replaceState({}, "", "/");
        return;
      }

      // If we have a session parameter in URL, this is an OAuth callback
      if (sessionId) {
        console.log("[useAuth] Session ID in URL:", sessionId);
        setStatusMessage("Loading your session...");

        // Single call now gets both session AND profile data
        const data = await apiClient.getSession();
        setSession({
          did: data.did,
          handle: data.handle,
          displayName: data.displayName,
          avatar: data.avatar,
          description: data.description,
        });
        setCurrentStep("home");
        setStatusMessage(`Welcome back, ${data.handle}!`);

        window.history.replaceState({}, "", "/");
        return;
      }

      // Otherwise, check if there's an existing session cookie
      // Single call now gets both session AND profile data
      console.log("[useAuth] Checking for existing session cookie...");
      const data = await apiClient.getSession();
      console.log("[useAuth] Found existing session:", data);
      setSession({
        did: data.did,
        handle: data.handle,
        displayName: data.displayName,
        avatar: data.avatar,
        description: data.description,
      });
      setCurrentStep("home");
      setStatusMessage(`Welcome back, ${data.handle}!`);
    } catch (error) {
      console.log("[useAuth] No valid session found:", error);
      setCurrentStep("login");
    }
  }

  async function login(handle: string) {
    if (!handle) {
      const errorMsg = "Please enter your handle";
      setStatusMessage(errorMsg);
      throw new Error(errorMsg);
    }

    setStatusMessage("Starting authentication...");

    const { url } = await apiClient.startOAuth(handle);
    setStatusMessage("Redirecting to authentication...");
    window.location.href = url;
  }

  async function logout() {
    try {
      console.log("[useAuth] Cookies before logout:", document.cookie);
      console.log("[useAuth] Starting logout...");
      setStatusMessage("Logging out...");
      await apiClient.logout();
      console.log("[useAuth] Cookies after logout:", document.cookie);

      apiClient.cache.clear(); // Clear client-side cache
      console.log("[useAuth] Cache cleared");
      setSession(null);
      setCurrentStep("login");
      setStatusMessage("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      setStatusMessage("Error logging out");
      throw error;
    }
  }

  return {
    session,
    currentStep,
    statusMessage,
    setCurrentStep,
    setStatusMessage,
    login,
    logout,
  };
}
