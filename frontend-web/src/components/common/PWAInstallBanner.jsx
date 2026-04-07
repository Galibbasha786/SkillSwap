// components/common/PWAInstallBanner.jsx
import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { IoClose } from 'react-icons/io5';
import { AiOutlineDownload } from 'react-icons/ai';

const PWAInstallBanner = () => {
  const { showInstallPrompt, handleInstall, handleDismiss } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (showInstallPrompt) {
      setIsVisible(true);
    }
  }, [showInstallPrompt]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AiOutlineDownload className="text-2xl flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm sm:text-base">Install SkillSwap</p>
            <p className="text-xs sm:text-sm text-blue-100">
              Install our app for a better experience on this device
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
          >
            Install
          </button>
          <button
            onClick={() => {
              handleDismiss();
              setIsVisible(false);
            }}
            className="text-white hover:text-blue-100 transition-colors p-1"
          >
            <IoClose size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
