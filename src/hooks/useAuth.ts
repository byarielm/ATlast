import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import type { AtprotoSession, AppStep } from '../types';

export function useAuth() {
  const [session, setSession] = useState<AtprotoSession | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>('checking');
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    try {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session');
      const error = params.get('error');

      if (error) {
        setStatusMessage(`Login failed: ${error}`);
        setCurrentStep('login');
        window.history.replaceState({}, '', '/');
        return;
      }

      // If we have a session parameter in URL, this is an OAuth callback
      if (sessionId) {
        setStatusMessage('Loading your session...');
        await fetchProfile();
        setCurrentStep('home');
        window.history.replaceState({}, '', '/');
        return;
      }

      // Otherwise, check if there's an existing session cookie
      const data = await apiClient.getSession();
      setSession({
        did: data.did,
        handle: data.handle,
        displayName: data.displayName,
        avatar: data.avatar,
        description: data.description,
      });
      setCurrentStep('home');
      setStatusMessage(`Welcome back, ${data.handle}!`);
    } catch (error) {
      console.error('Session check error:', error);
      setCurrentStep('login');
    }
  }

  async function fetchProfile() {
    try {
      const data = await apiClient.getProfile();
      setSession({
        did: data.did,
        handle: data.handle,
        displayName: data.displayName,
        avatar: data.avatar,
        description: data.description,
      });
      setStatusMessage(`Successfully logged in as ${data.handle}`);
    } catch (err) {
      console.error('Profile fetch error:', err);
      setStatusMessage('Failed to load profile');
      throw err;
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
      setStatusMessage('Logging out...');
      await apiClient.logout();
      setSession(null);
      setCurrentStep('login');
      setStatusMessage('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      setStatusMessage('Error logging out');
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