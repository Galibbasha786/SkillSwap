// frontend-web/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App';
import './index.css';

// Your Google Client ID - make sure this is correct
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.error('❌ CRITICAL: Missing VITE_GOOGLE_CLIENT_ID in environment variables');
  console.error('Add this to .env.production:');
  console.error('VITE_GOOGLE_CLIENT_ID=your-client-id-from-google-console');
} else {
  console.log('✅ Google OAuth config:', {
    origin: window.location.origin,
    clientId: GOOGLE_CLIENT_ID
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <GoogleOAuthProvider 
        clientId={GOOGLE_CLIENT_ID}
        onScriptLoad={() => console.log('✅ Google OAuth script loaded')}
        onScriptLoadError={() => console.error('❌ Failed to load Google OAuth script')}
      >
        <App />
      </GoogleOAuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
