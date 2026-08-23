const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const startOAuthLogin = (provider) => {
  window.location.href = `${API_URL}/auth/${provider}`;
};

export const isGitHubLoginEnabled = Boolean(import.meta.env.VITE_GITHUB_LOGIN_ENABLED !== 'false');
