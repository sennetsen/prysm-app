import React, { useState, useEffect } from 'react';
import { getBestAvatarUrl } from '../../utils/avatarUtils';
import fallbackImg from '../../img/fallback.png';
import './Avatar.css';

interface User {
  full_name?: string;
  name?: string;
  avatar_url?: string;
  avatar_storage_path?: string;
  id?: string;
}

interface AvatarProps {
  user?: User;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Avatar: React.FC<AvatarProps> = ({ 
  user, 
  size = 40, 
  className = '', 
  style = {} 
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      setImageError(false);
      return;
    }

    // Use the utility function to get the best available avatar URL
    const bestUrl = getBestAvatarUrl(user);
    console.log('Avatar component - User:', user, 'Best URL:', bestUrl);
    setAvatarUrl(bestUrl);
    setImageError(false);
  }, [user]);

  // If we have a valid avatar URL and no errors, show the image
  if (avatarUrl && !imageError) {
    console.log('🖼️ Rendering avatar image with URL:', avatarUrl);
    return (
      <img
        src={avatarUrl}
        alt={user?.full_name || user?.name || 'User'}
        className={`avatar-image ${size === 24 ? 'avatar-small' : ''} ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          ...style
        }}
        onError={(e) => {
          console.log('❌ Image failed to load:', avatarUrl, 'Error:', e);
          setImageError(true);
        }}
        onLoad={() => {
          console.log('✅ Image loaded successfully:', avatarUrl);
        }}
      />
    );
  }

  // Fallback: Show fallback image instead of generic icon
  console.log('🔄 Showing fallback image. avatarUrl:', avatarUrl, 'imageError:', imageError);
  return (
    <img
      src={fallbackImg}
      alt="User"
      className={`avatar-image ${size === 24 ? 'avatar-small' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        ...style
      }}
    />
  );
};

export default Avatar;
