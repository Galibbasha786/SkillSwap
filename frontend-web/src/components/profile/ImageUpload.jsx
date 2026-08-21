// frontend-web/src/components/profile/ImageUpload.jsx

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiX, FiUser, FiCamera, FiMaximize2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { userAPI } from '../../services/api';

const ImageUpload = ({ currentImage, onImageUpdate, onImageRemove, size = 'small' }) => {
  const [uploading, setUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showEnlarged, setShowEnlarged] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const displayImage = previewImage || currentImage;

  const getSizeClasses = () => {
    switch (size) {
      case 'large':
        return {
          container: 'w-24 h-24',
          buttonPosition: 'bottom-0 right-0',
          buttonSize: 'p-1.5',
          iconSize: 'w-4 h-4',
          loadingSpinner: 'w-8 h-8',
        };
      case 'medium':
        return {
          container: 'w-16 h-16',
          buttonPosition: 'bottom-0 right-0',
          buttonSize: 'p-1',
          iconSize: 'w-3 h-3',
          loadingSpinner: 'w-6 h-6',
        };
      default:
        return {
          container: 'w-10 h-10',
          buttonPosition: 'bottom-0 right-0',
          buttonSize: 'p-1',
          iconSize: 'w-3 h-3',
          loadingSpinner: 'w-5 h-5',
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await userAPI.uploadProfileImage(formData);
      const imageUrl = response.data.profileImage;
      if (imageUrl) {
        toast.success('Profile image updated!');
        onImageUpdate(imageUrl);
      } else {
        toast.error('Image uploaded but URL not received');
      }
      setPreviewImage(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      setPreviewImage(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    setUploading(true);
    try {
      const response = await userAPI.removeProfileImage();
      onImageRemove(response.data.profileImage || undefined);
      toast.success('Profile image removed');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove image');
    } finally {
      setUploading(false);
      setShowOptions(false);
    }
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = 'https://via.placeholder.com/150';
  };

  const optionsMenu = (
    <AnimatePresence>
      {showOptions && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[200]"
            onClick={() => setShowOptions(false)}
            aria-label="Close photo options"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="fixed left-1/2 top-1/2 z-[210] w-[min(92vw,20rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-900">Profile photo</p>
              <p className="text-xs text-gray-500 mt-0.5">Choose an action</p>
            </div>
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
                setShowOptions(false);
              }}
              disabled={uploading}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 w-full text-left transition-colors border-b border-gray-50"
            >
              <FiUpload className="w-5 h-5 text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-gray-800">Upload photo</span>
            </button>
            {currentImage && currentImage !== 'https://via.placeholder.com/150' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowEnlarged(true);
                    setShowOptions(false);
                  }}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 w-full text-left transition-colors border-b border-gray-50"
                >
                  <FiMaximize2 className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm font-medium text-gray-800">View full size</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={uploading}
                  className="flex items-center gap-3 p-4 hover:bg-red-50 w-full text-left transition-colors"
                >
                  <FiX className="w-5 h-5 text-red-500 shrink-0" />
                  <span className="text-sm font-medium text-red-600">Remove photo</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowOptions(false)}
              className="w-full py-3 text-sm text-gray-500 hover:bg-gray-50 border-t border-gray-100"
            >
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="relative z-10">
        <div className="relative group">
          <div
            className={`${sizeClasses.container} rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 p-0.5 cursor-pointer`}
            onClick={() => {
              if (displayImage && displayImage !== 'https://via.placeholder.com/150') {
                setShowEnlarged(true);
              }
            }}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FiUser className={`${sizeClasses.iconSize} text-gray-400`} />
                </div>
              )}
            </div>
          </div>

          {displayImage && displayImage !== 'https://via.placeholder.com/150' && (
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
              <FiMaximize2 className={`${sizeClasses.iconSize} text-white`} />
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions(true);
            }}
            className={`absolute ${sizeClasses.buttonPosition} bg-gradient-to-r from-blue-500 to-purple-500 text-white ${sizeClasses.buttonSize} rounded-full shadow-lg hover:scale-110 transition-transform z-20`}
          >
            <FiCamera className={sizeClasses.iconSize} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          disabled={uploading}
        />

        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center z-30">
            <div className={`${sizeClasses.loadingSpinner} border-2 border-white border-t-transparent rounded-full animate-spin`} />
          </div>
        )}
      </div>

      {typeof document !== 'undefined' && createPortal(optionsMenu, document.body)}

      <AnimatePresence>
        {showEnlarged && displayImage && displayImage !== 'https://via.placeholder.com/150' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[220] flex items-center justify-center p-4"
            onClick={() => setShowEnlarged(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={displayImage}
                alt="Profile enlarged"
                className="w-full max-h-[85vh] object-contain rounded-xl mx-auto"
              />
              <button
                type="button"
                onClick={() => setShowEnlarged(false)}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <FiX className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageUpload;
