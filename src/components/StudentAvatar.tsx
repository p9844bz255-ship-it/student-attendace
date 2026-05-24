import React, { useState, useEffect } from 'react';

interface StudentAvatarProps {
  name: string;
  gender?: string;
  sizeClass?: string;
  className?: string;
}

const DEFAULT_AVATAR_URL = "https://www.image2url.com/r2/default/images/1779536420291-e3776ec1-d9fb-4854-acc8-253b945e8435.jpg";

// Global cache tracker to prevent redundant state trigger and enable instant render
let isGloballyLoaded = false;

// Preload the image in browser background immediately
if (typeof window !== 'undefined') {
  const img = new Image();
  img.src = DEFAULT_AVATAR_URL;
  img.onload = () => {
    isGloballyLoaded = true;
  };
}

export default function StudentAvatar({
  name,
  gender = 'L',
  sizeClass = 'w-11 h-11',
  className = '',
}: StudentAvatarProps) {
  const [isLoaded, setIsLoaded] = useState(isGloballyLoaded);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (isGloballyLoaded) {
      setIsLoaded(true);
    }
  }, []);

  const getInitials = (userName: string) => {
    return userName
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className={`relative flex-shrink-0 rounded-full overflow-hidden ${sizeClass} ${className} bg-stone-50`}>
      {/* Light shimmer placeholder/skeleton when not loaded */}
      {!isLoaded && !imgError && (
        <div className="absolute inset-0 bg-stone-100 animate-pulse flex items-center justify-center text-[10px] font-bold text-stone-400">
          {getInitials(name)}
        </div>
      )}

      {!imgError ? (
        <img
          src={DEFAULT_AVATAR_URL}
          alt={name}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async" // Enable asynchronous decoding to keep scrolling smooth
          onLoad={() => {
            isGloballyLoaded = true;
            setIsLoaded(true);
          }}
          onError={() => setImgError(true)}
          className={`w-full h-full rounded-full object-cover border border-stone-100/60 shadow-none transition-opacity duration-300 grayscale ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className={`w-full h-full rounded-full flex items-center justify-center font-bold text-xs shadow-sm border ${
          gender === 'L' 
            ? 'bg-blue-50 text-blue-700 border-blue-100' 
            : 'bg-rose-50 text-rose-700 border-rose-100'
        }`}>
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

