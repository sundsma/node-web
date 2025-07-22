import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './CustomCaptcha.css';

const CustomCaptcha = ({ onVerify, challenge = "scp" }) => {
  const [currentImage, setCurrentImage] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [isVerified, setIsVerified] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [correctPositions, setCorrectPositions] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageKey, setImageKey] = useState(0); // Add key to force image reload

  // List of available image files with hex prefixes
  // Format: {4-digit-hex}_{challenge}_{description}.jpg
  // Hex converts to 16-bit binary representing 4x4 grid where 1 = contains target object, 0 = doesn't contain
  const availableImages = useMemo(() => [
    // Cars challenge - hex prefix converts to binary indicating which cells contain cars
    '0660_scp_collateral_damage.jpg',       // CC00 = 1100110000000000 - Cars in top-left area
    '0CC0_scp_dog_pounce.jpg'         // 0CC0 = 0000110011000000 - Cars in middle area  
    //'000F_cars_highway_view.jpg',        // 000F = 0000000000001111 - Cars in bottom row
    //'8421_cars_intersection.jpg',        // 8421 = 1000010000100001 - Cars scattered
    //'6666_cars_dealership.jpg',          // 6666 = 0110011001100110 - Cars in pattern
    
    // Traffic lights challenge
    //'8000_lights_intersection_1.jpg',    // 8000 = 1000000000000000 - Light in top-left
    //'1000_lights_intersection_2.jpg',    // 1000 = 0001000000000000 - Light in top-right area
    //'0080_lights_street_1.jpg',          // 0080 = 0000000010000000 - Light in middle
    //'0001_lights_crosswalk.jpg',         // 0001 = 0000000000000001 - Light in bottom-right
    
    // Stop signs challenge  
    //'4000_signs_residential_street.jpg', // 4000 = 0100000000000000 - Sign in top area
    //'0008_signs_school_zone.jpg',        // 0008 = 0000000000001000 - Sign in bottom area
    //'0800_signs_corner_view.jpg',        // 0800 = 0000100000000000 - Sign in middle-left
  ], []);

  // Generate random challenge with a single image
  const generateChallenge = useCallback(() => {
    // Filter images that match the current challenge
    const challengeImages = availableImages.filter(img => 
      img.includes(`_${challenge}_`)
    );
    
    if (challengeImages.length === 0) {
      console.warn(`No images found for challenge: ${challenge}`);
      return;
    }
    
    // Select random image from matching challenge
    const randomImage = challengeImages[Math.floor(Math.random() * challengeImages.length)];
    
    // Extract hex prefix and convert to binary, then to array of correct positions
    const hexPrefix = randomImage.split('_')[0];
    
    // Convert hex to binary (16-bit)
    const decimal = parseInt(hexPrefix, 16);
    const binaryString = decimal.toString(2).padStart(16, '0');
    
    const positions = [];
    for (let i = 0; i < 16; i++) {
      if (binaryString[i] === '1') {
        positions.push(i);
      }
    }
    
    setCurrentImage(randomImage);
    setCorrectPositions(positions);
    setSelectedCells([]);
    setIsVerified(false);
    setShowResult(false);
    setImageLoaded(false);
    setImageKey(prev => prev + 1); // Increment key to force image reload
  }, [challenge, availableImages]);

  useEffect(() => {
    generateChallenge();
  }, [generateChallenge]);

  const handleCellClick = (cellIndex) => {
    if (isVerified) return;

    setSelectedCells(prev => {
      if (prev.includes(cellIndex)) {
        return prev.filter(index => index !== cellIndex);
      } else {
        return [...prev, cellIndex];
      }
    });
  };

  const handleVerify = () => {
    // Check if selected cells match the correct positions exactly
    const isCorrect = selectedCells.length === correctPositions.length &&
                     selectedCells.every(cell => correctPositions.includes(cell)) &&
                     correctPositions.every(pos => selectedCells.includes(pos));

    setIsVerified(isCorrect);
    setShowResult(true);
    
    if (onVerify) {
      onVerify(isCorrect);
    }

    // Auto-refresh after 3 seconds if failed
    if (!isCorrect) {
      setTimeout(() => {
        generateChallenge();
      }, 3000);
    }
  };

  const handleRefresh = () => {
    // Don't reset currentImage to null to prevent layout shift
    // Just reset loading state and increment key to force reload
    setImageLoaded(false);
    setSelectedCells([]);
    setIsVerified(false);
    setShowResult(false);
    setImageKey(prev => prev + 1);
    // Generate new challenge without clearing currentImage first
    generateChallenge();
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    console.error(`Failed to load image: ${currentImage}`);
    setImageLoaded(false);
    // Generate a new challenge if image fails to load
    setTimeout(() => {
      generateChallenge();
    }, 1000);
  };

  // Extract challenge name from filename for display
  const getChallengeName = () => {
    if (!currentImage) return challenge;
    const parts = currentImage.split('_');
    return parts.length > 1 ? parts[1] : challenge;
  };

  return (
    <div className="custom-captcha">
      <div className="captcha-header">
        <div className="captcha-title">
          <h4>🤖 Security Verification</h4>
          <p>Select all squares containing <strong>{getChallengeName()}</strong></p>
        </div>
        <button 
          type="button" 
          className="captcha-refresh" 
          onClick={handleRefresh}
          title="Refresh image"
        >
          🔄
        </button>
      </div>
      
      <div className="captcha-container">
        {currentImage && (
          <div className="captcha-image-grid">
            <img
              key={imageKey} // Force reload with key
              src={`/captcha-images/${currentImage}`}
              alt="Captcha challenge"
              className={`captcha-base-image ${imageLoaded ? 'loaded' : 'loading'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            
            {/* 4x4 grid overlay */}
            <div className="captcha-grid-overlay">
              {Array.from({ length: 16 }, (_, index) => (
                <div
                  key={index}
                  className={`captcha-cell ${selectedCells.includes(index) ? 'selected' : ''} ${isVerified && showResult ? 'verified' : ''}`}
                  onClick={() => handleCellClick(index)}
                  data-cell={index}
                >
                  {selectedCells.includes(index) && (
                    <div className="cell-indicator">✓</div>
                  )}
                </div>
              ))}
            </div>
            
            {!imageLoaded && (
              <div className="image-loading">
                <div className="loading-spinner"></div>
                <p>Loading challenge...</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="captcha-actions">
        <button
          type="button"
          className="btn btn-outline captcha-verify"
          onClick={handleVerify}
          disabled={selectedCells.length === 0 || showResult || !imageLoaded}
        >
          Verify
        </button>
        
        {showResult && (
          <div className={`captcha-result ${isVerified ? 'success' : 'error'}`}>
            {isVerified ? (
              <>
                <span className="result-icon">✅</span>
                <span>Verification successful!</span>
              </>
            ) : (
              <>
                <span className="result-icon">❌</span>
                <span>Try again. Select squares with {getChallengeName()}.</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomCaptcha;
