const PLACEHOLDER_PATTERNS = [
  'your-production-domain.com',
  'your-backend-domain.com',
  'your-backend-url.com',
];

const isPlaceholderUrl = (value) => {
  if (!value || typeof value !== 'string') return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (PLACEHOLDER_PATTERNS.some((pattern) => normalized.includes(pattern))) return true;
  if (import.meta.env.PROD && normalized.includes('localhost')) return true;
  return false;
};

const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const deriveFromApiUrl = (apiUrl) => {
  if (!apiUrl) return null;
  return stripTrailingSlash(apiUrl.replace(/\/api\/?$/, ''));
};

/**
 * Resolve the Socket.IO server URL for the current build/runtime.
 * Prefers VITE_SOCKET_URL, then derives from VITE_API_URL.
 * Ignores placeholder/example values that ship in template env files.
 */
export const getSocketUrl = () => {
  const socketEnv = import.meta.env.VITE_SOCKET_URL?.trim();
  const apiEnv = import.meta.env.VITE_API_URL?.trim();

  if (socketEnv && !isPlaceholderUrl(socketEnv)) {
    return stripTrailingSlash(socketEnv);
  }

  const fromApi = deriveFromApiUrl(apiEnv);
  if (fromApi && !isPlaceholderUrl(fromApi)) {
    return fromApi;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }

  console.error(
    '[SkillSwap] Socket URL is not configured. Set VITE_SOCKET_URL or VITE_API_URL in your production build env.'
  );
  return fromApi || stripTrailingSlash(socketEnv || '') || 'http://localhost:5000';
};

export const getSocketOptions = (userId) => ({
  transports: ['websocket', 'polling'],
  auth: {
    token: localStorage.getItem('token'),
    userId: userId != null ? String(userId) : undefined
  },
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

export const waitForSocketConnection = (socket, timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket is not initialized'));
      return;
    }

    if (socket.connected) {
      resolve(socket);
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Could not connect to realtime server. Check VITE_SOCKET_URL and backend CLIENT_URL.'));
    }, timeoutMs);

    const onConnect = () => {
      cleanup();
      resolve(socket);
    };

    const onError = (error) => {
      cleanup();
      reject(error instanceof Error ? error : new Error(error?.message || 'Socket connection failed'));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onError);

    if (!socket.active) {
      socket.connect();
    }
  });
