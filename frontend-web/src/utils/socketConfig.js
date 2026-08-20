const PLACEHOLDER_PATTERNS = [
  'your-production-domain.com',
  'your-backend-domain.com',
  'your-backend-url.com',
];

const DEFAULT_API_URL = 'http://localhost:5001/api';

const isPlaceholderUrl = (value) => {
  if (!value || typeof value !== 'string') return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (PLACEHOLDER_PATTERNS.some((pattern) => normalized.includes(pattern))) return true;
  if (import.meta.env.PROD && normalized.includes('localhost')) return true;
  return false;
};

const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

/**
 * Socket.IO treats URL path segments as namespaces (e.g. /api -> "Invalid namespace").
 * Always reduce configured URLs to origin only: https://host[:port]
 */
export const normalizeSocketUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let candidate = stripTrailingSlash(rawUrl.trim());
  if (!candidate) return null;

  candidate = candidate.replace(/\/api\/?$/, '');

  try {
    const parsed = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
    return parsed.origin;
  } catch {
    return candidate.split('/').slice(0, 3).join('/');
  }
};

/**
 * Resolve the Socket.IO server URL for the current build/runtime.
 */
export const getSocketUrl = () => {
  const socketEnv = import.meta.env.VITE_SOCKET_URL?.trim();
  const apiEnv = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).trim();

  if (socketEnv && !isPlaceholderUrl(socketEnv)) {
    const normalized = normalizeSocketUrl(socketEnv);
    if (normalized) return normalized;
  }

  const fromApi = normalizeSocketUrl(apiEnv);
  if (fromApi && !isPlaceholderUrl(fromApi)) {
    return fromApi;
  }

  return 'http://localhost:5001';
};

export const getSocketOptions = (userId) => ({
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  upgrade: true,
  auth: {
    token: localStorage.getItem('token'),
    userId: userId != null ? String(userId) : undefined
  },
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 300,
  reconnectionDelayMax: 2000,
  timeout: 10000,
  forceNew: false
});

export const waitForSocketConnection = (socket, timeoutMs = 20000) =>
  new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket is not initialized'));
      return;
    }

    if (socket.connected) {
      resolve(socket);
      return;
    }

    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Could not connect to realtime server at ${getSocketUrl()}. Check backend is running.`));
    }, timeoutMs);

    const onConnect = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(socket);
    };

    const onError = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      const message = error?.message || 'Socket connection failed';
      if (message.toLowerCase().includes('invalid namespace')) {
        reject(new Error('Invalid socket URL. Remove /api from VITE_SOCKET_URL and redeploy frontend.'));
        return;
      }
      reject(new Error(message));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onError);

    if (!socket.connected) {
      socket.connect();
    }
  });
