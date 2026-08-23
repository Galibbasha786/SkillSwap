import React from 'react';
import { FaGithub } from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import { startOAuthLogin, isGitHubLoginEnabled } from '../../utils/oauthLogin';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const SocialLoginButtons = ({ onGoogleSuccess, onGoogleError, disabled = false }) => {
  const hasOAuth = GOOGLE_CLIENT_ID || isGitHubLoginEnabled;

  if (!hasOAuth) return null;

  return (
    <div className="space-y-3">
      {GOOGLE_CLIENT_ID && (
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={onGoogleError}
            useOneTap={false}
            theme="outline"
            size="large"
            shape="rectangular"
            text="continue_with"
            width={380}
          />
        </div>
      )}

      {isGitHubLoginEnabled && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => startOAuthLogin('github')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium text-gray-800"
        >
          <FaGithub className="w-5 h-5" />
          Continue with GitHub
        </button>
      )}
    </div>
  );
};

export default SocialLoginButtons;
