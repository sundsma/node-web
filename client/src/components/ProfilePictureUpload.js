import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, Check, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import './ProfilePictureUpload.css';

// Constants moved outside component to prevent re-creation on each render
const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const TARGET_SIZE = 400; // 400x400 pixels

const ProfilePictureUpload = ({ currentImage, onImageUpdate, userId }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [currentProfileImage, setCurrentProfileImage] = useState(currentImage || '/default-profile.png');
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Load current profile picture when component mounts or userId changes
  useEffect(() => {
    const loadCurrentImage = async () => {
      if (userId) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('/api/profile-picture', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          if (data.success && data.profilePicture) {
            setCurrentProfileImage(data.profilePicture.imageData);
          }
        } catch (error) {
          console.error('Failed to load profile picture:', error);
        }
      }
    };

    loadCurrentImage();
  }, [userId]);

  // Update current image when prop changes
  useEffect(() => {
    if (currentImage) {
      setCurrentProfileImage(currentImage);
    }
  }, [currentImage]);

  const resizeImageToCanvas = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        try {
          // Set canvas dimensions
          canvas.width = TARGET_SIZE;
          canvas.height = TARGET_SIZE;

          // Calculate crop dimensions to maintain aspect ratio
          const { width: imgWidth, height: imgHeight } = img;
          const size = Math.min(imgWidth, imgHeight);
          const startX = (imgWidth - size) / 2;
          const startY = (imgHeight - size) / 2;

          // Clear canvas
          ctx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);

          // Draw image with crop and resize
          ctx.drawImage(
            img,
            startX, startY, size, size, // source rectangle (crop to square)
            0, 0, TARGET_SIZE, TARGET_SIZE // destination rectangle (resize to target)
          );

          // Convert to base64
          const base64Data = canvas.toDataURL(file.type, 0.9); // 0.9 quality for JPEG compression
          
          // Check if the resulting Base64 is too large (>8MB to leave room for JSON overhead)
          const maxBase64Size = 8 * 1024 * 1024; // 8MB
          if (base64Data.length > maxBase64Size) {
            reject(new Error('Processed image is too large. Please use a smaller image or lower quality.'));
            return;
          }
          
          // Clean up object URL
          URL.revokeObjectURL(img.src);
          
          resolve({
            imageData: base64Data,
            mimeType: file.type,
            filename: file.name,
            fileSize: Math.round(base64Data.length * 0.75) // Approximate file size
          });
        } catch (error) {
          URL.revokeObjectURL(img.src);
          reject(new Error('Failed to process image: ' + error.message));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image file'));
      };

      // Create object URL for image loading
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      toast.error('Please select a PNG or JPEG image file');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 2MB');
      return;
    }

    try {
      // Process image with canvas
      const processedImage = await resizeImageToCanvas(file);
      setPreviewImage(processedImage);
      setShowPreview(true);
      setShowUpload(false); // Hide upload area when preview is shown
    } catch (error) {
      console.error('Image processing error:', error);
      toast.error(error.message || 'Failed to process image');
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resizeImageToCanvas]);

  const handleUpload = async () => {
    if (!previewImage) return;

    setIsUploading(true);
    try {
      const response = await fetch('/api/profile-picture/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(previewImage)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Profile picture updated successfully!');
        setCurrentProfileImage(data.profilePicture.imageData); // Update the current image
        if (onImageUpdate) {
          onImageUpdate(data.profilePicture.imageData);
        }
        setShowPreview(false);
        setPreviewImage(null);
      } else {
        // Handle specific error cases
        if (response.status === 413) {
          throw new Error('Image is too large. Please use a smaller image (max 2MB).');
        } else {
          throw new Error(data.message || 'Upload failed');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Check if it's a network error (like payload too large)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        toast.error('Image is too large or network error occurred. Please try a smaller image.');
      } else {
        toast.error(error.message || 'Failed to upload profile picture');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setShowPreview(false);
    setPreviewImage(null);
    setShowUpload(false); // Also hide upload area when canceling
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const event = { target: { files } };
      handleFileSelect(event);
    }
  }, [handleFileSelect]);

  const showUploadArea = () => {
    setShowUpload(true);
  };

  const hideUploadArea = () => {
    setShowUpload(false);
  };

  return (
    <div className="profile-picture-upload">
      <div className="current-image">
        <img 
          src={currentProfileImage} 
          alt="Current profile" 
          className="profile-image"
        />
      </div>

      <div className="upload-actions">
        <button
          type="button"
          className="btn btn-outline upload-btn"
          onClick={showUploadArea}
          disabled={isUploading}
        >
          <Upload size={18} />
          Upload New Photo
        </button>
      </div>

      {/* Upload Overlay */}
      {showUpload && (
        <div className="upload-overlay">
          <div className="upload-modal">
            <div className="upload-header">
              <h3>Upload Profile Picture</h3>
              <button className="close-btn" onClick={hideUploadArea}>
                <X size={20} />
              </button>
            </div>
            <div
              className="upload-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
            >
              <Camera size={48} />
              <p>Click to upload or drag and drop</p>
              <span>PNG, JPG up to 2MB (400x400px recommended)</span>
            </div>
            <div className="upload-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={hideUploadArea}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Hidden canvas for image processing */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        width={TARGET_SIZE}
        height={TARGET_SIZE}
      />

      {/* Preview Modal */}
      {showPreview && previewImage && (
        <div className="preview-modal-overlay">
          <div className="preview-modal">
            <div className="preview-header">
              <h3>Preview Profile Picture</h3>
              <button className="close-btn" onClick={handleCancel}>
                <X size={20} />
              </button>
            </div>
            
            <div className="preview-content">
              <div className="preview-image">
                <img src={previewImage.imageData} alt="Preview" />
              </div>
              
              <div className="preview-info">
                <p><strong>Filename:</strong> {previewImage.filename}</p>
                <p><strong>Size:</strong> {Math.round(previewImage.fileSize / 1024)}KB</p>
                <p><strong>Dimensions:</strong> 400x400px</p>
                <p><strong>Type:</strong> {previewImage.mimeType}</p>
              </div>
            </div>

            <div className="preview-actions">
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={isUploading}
              >
                <RotateCcw size={18} />
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <span className="loading">Uploading...</span>
                ) : (
                  <>
                    <Check size={18} />
                    Confirm Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePictureUpload;
