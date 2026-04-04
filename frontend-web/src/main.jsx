// frontend-web/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';

// Your Google Client ID - make sure this is correct
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.error('❌ CRITICAL: Missing VITE_GOOGLE_CLIENT_ID in environment variables');
  console.error('Add this to .env.production:');
  console.error('VITE_GOOGLE_CLIENT_ID=your-client-id-from-google-console');
} else {
  console.log('✅ Google Client ID loaded:', GOOGLE_CLIENT_ID.substring(0, 20) + '...');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider 
      clientId={GOOGLE_CLIENT_ID}
      onScriptLoad={() => console.log('✅ Google OAuth script loaded')}
      onScriptLoadError={() => console.error('❌ Failed to load Google OAuth script')}
    >
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);