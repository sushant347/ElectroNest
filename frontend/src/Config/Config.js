/**
 * Application Configuration
 * 
 * Handles environment-specific settings and constants.
 * Note: Vite uses import.meta.env for environment variables.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const API_TIMEOUT = 65000; // 65 seconds — covers Render free-tier cold starts (up to ~60s)
export const AUTH_TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const config = {
  API_BASE_URL,
  API_TIMEOUT,
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  MAX_FILE_SIZE,
};

export default config;
