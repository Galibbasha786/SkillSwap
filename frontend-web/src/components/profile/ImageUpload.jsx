// frontend-web/src/components/profile/ImageUpload.jsx

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiX, FiUser, FiCamera } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { userAPI } from '../../services/api';

const ImageUpload = ({ currentImage, onImageUpdate, onImageRemove }) => {
  const [uploading, setUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const displayImage = previewImage || currentImage;

  // frontend-web/src/components/profile/ImageUpload.jsx

// Update the handleImageSelect function
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
    
    // ✅ FIX: Get the image URL from response
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
    
    // ✅ FIX: Get the new image URL from response
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

  return (
    <div className="relative">
      {/* Profile Image Container */}
      <div className="relative group">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 p-0.5">
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
                <FiUser className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Upload Button Overlay */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <FiCamera className="w-3 h-3" />
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
                <button
                  onClick={handleRemoveImage}
                  disabled={uploading}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 w-full text-left transition-colors"
                >
                  <FiX className="w-4 h-4 text-red-500" />
                  <span className="text-sm">Remove Photo</span>
                </button>
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
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;