/**
 * Application Configuration
 *
 * Handles environment-specific settings and constants.
 * Note: Vite embeds env vars at BUILD time (not runtime).
 *
 * DEPLOYMENT CHECKLIST (Vercel):
 *   → Set VITE_API_BASE_URL in Vercel Project → Settings → Environment Variables
 *   → Value should be your Render backend URL, e.g. https://electronest-backend.onrender.com/api
 *   → Missing this env var causes ALL API calls to hit http://localhost:8000/api (fails in production)
 */

const rawApiUrl = import.meta.env.VITE_API_BASE_URL;
const productionApiUrl = 'https://electronest-api.onrender.com/api';
const localApiUrl = 'http://127.0.0.1:8000/api';

if (!rawApiUrl && import.meta.env.PROD) {
  console.error(
    `[Config] VITE_API_BASE_URL is not set! Falling back to ${productionApiUrl}. ` +
    'Add this env var in your Vercel project settings for explicit configuration.'
  );
}

export const API_BASE_URL = rawApiUrl || (import.meta.env.PROD ? productionApiUrl : localApiUrl);
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
