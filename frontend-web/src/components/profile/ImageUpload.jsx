// frontend-web/src/components/profile/ImageUpload.jsx

import React, { useState, useRef } from 'react';
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

  // Determine size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'large':
        return {
          container: 'w-24 h-24',
          buttonPosition: 'bottom-0 right-0',
          buttonSize: 'p-1.5',
          iconSize: 'w-4 h-4',
          loadingSpinner: 'w-8 h-8',
          uploadOverlay: 'w-6 h-6'
        };
      case 'medium':
        return {
          container: 'w-16 h-16',
          buttonPosition: 'bottom-0 right-0',
          buttonSize: 'p-1',
          iconSize: 'w-3 h-3',
          loadingSpinner: 'w-6 h-6',
          uploadOverlay: 'w-4 h-4'
        };
      default: // small
        return {
          container: 'w-10 h-10',
          buttonPosition: 'bottom-0 right-0',
          buttonSize: 'p-1',
          iconSize: 'w-3 h-3',
          loadingSpinner: 'w-5 h-5',
          uploadOverlay: 'w-4 h-4'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await userAPI.uploadProfileImage(formData);
      console.log('Upload response:', response.data);
      
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
      console.log('Remove response:', response.data);
      
      const imageUrl = response.data.profileImage;
      if (imageUrl) {
        onImageRemove(imageUrl);
      } else {
        onImageRemove();
      }
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
    console.log('Image failed to load, using fallback');
    e.target.onerror = null;
    e.target.src = 'https://via.placeholder.com/150';
  };

  const handleImageClick = () => {
    if (displayImage && displayImage !== 'https://via.placeholder.com/150') {
      setShowEnlarged(true);
    }
  };

  return (
    <>
      <div className="relative">
        {/* Profile Image Container */}
        <div className="relative group">
          <div 
            className={`${sizeClasses.container} rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 p-0.5 cursor-pointer`}
            onClick={handleImageClick}
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

          {/* Hover Overlay for Enlarge Hint */}
          {displayImage && displayImage !== 'https://via.placeholder.com/150' && (
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <FiMaximize2 className={`${sizeClasses.iconSize} text-white`} />
            </div>
          )}

          {/* Upload Button Overlay */}
          <button
            onClick={() => setShowOptions(!showOptions)}
            className={`absolute ${sizeClasses.buttonPosition} bg-gradient-to-r from-blue-500 to-purple-500 text-white ${sizeClasses.buttonSize} rounded-full shadow-lg hover:scale-110 transition-transform`}
          >
            <FiCamera className={sizeClasses.iconSize} />
          </button>
        </div>

        {/* Options Modal */}
        <AnimatePresence>
          {showOptions && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setShowOptions(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl z-50 w-48 overflow-hidden"
              >
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowOptions(false);
                  }}
                  disabled={uploading}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 w-full text-left transition-colors"
                >
                  <FiUpload className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Upload Photo</span>
                </button>
                
                {currentImage && currentImage !== 'https://via.placeholder.com/150' && (
                  <>
                    <button
                      onClick={() => {
                        setShowEnlarged(true);
                        setShowOptions(false);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 w-full text-left transition-colors"
                    >
                      <FiMaximize2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">View Full Size</span>
                    </button>
                    <button
                      onClick={handleRemoveImage}
                      disabled={uploading}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 w-full text-left transition-colors"
                    >
                      <FiX className="w-4 h-4 text-red-500" />
                      <span className="text-sm">Remove Photo</span>
                    </button>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          disabled={uploading}
        />

        {/* Uploading Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className={`${sizeClasses.loadingSpinner} border-2 border-white border-t-transparent rounded-full animate-spin`} />
          </div>
        )}
      </div>

      {/* Enlarged Image Modal */}
      <AnimatePresence>
        {showEnlarged && displayImage && displayImage !== 'https://via.placeholder.com/150' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowEnlarged(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={displayImage}
                alt="Profile Enlarged"
                className="w-full h-full object-contain rounded-xl"
              />
              
              {/* Close Button */}
              <button
                onClick={() => setShowEnlarged(false)}
                className="absolute -top-10 -right-10 text-white hover:text-gray-300 transition-colors"
              >
                <FiX className="w-8 h-8" />
              </button>
              
              {/* Download Button */}
              <a
                href={displayImage}
                download="profile-image.jpg"
                className="absolute -bottom-10 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <FiUpload className="w-6 h-6" />
              </a>
              
              {/* Image Info */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                Click anywhere to close
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageUpload;