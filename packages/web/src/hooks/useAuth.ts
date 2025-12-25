import { useState, useEffect } from "react";
import { apiClient } from "../lib/api/client";
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

      if (sessionId) {
        console.log("[useAuth] Session ID in URL:", sessionId);
        setStatusMessage("Loading your session...");

        const data = await apiClient.getSession();
        setSession(data);
        setCurrentStep("home");
        setStatusMessage(`Welcome back, ${data.handle}!`);

        window.history.replaceState({}, "", "/");
        return;
      }

      console.log("[useAuth] Checking for existing session cookie...");
      const data = await apiClient.getSession();
      console.log("[useAuth] Found existing session:", data);
      setSession(data);
      setCurrentStep("home");
      setStatusMessage(`Welcome back, ${data.handle}!`);
    } catch (error) {
      console.log("[useAuth] No valid session found:", error);
      setCurrentStep("login");
    }
  }

  async function login(handle: string) {
    if (!handle) {
      throw new Error("Please enter your handle");
    }

    setStatusMessage("Starting authentication...");

    const { url } = await apiClient.startOAuth(handle);
    setStatusMessage("Redirecting to authentication...");
    window.location.href = url;
  }

  async function logout() {
    try {
      console.log("[useAuth] Starting logout...");
      setStatusMessage("Logging out...");
      await apiClient.logout();

      apiClient.cache.clear();
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
