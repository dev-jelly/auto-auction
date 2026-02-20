import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth';
import { favoritesApi } from '../../lib/api/favorites';

interface FavoriteButtonProps {
  vehicleId: number;
  initialIsFavorite?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function FavoriteButton({
  vehicleId,
  initialIsFavorite = false,
  size = 'md',
  showLabel = false,
}: FavoriteButtonProps) {
  const { isAuthenticated, isLoading: isAuthLoading, openAuthModal } = useAuthStore();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    
    if (isAuthenticated && !initialIsFavorite) {
      favoritesApi.isFavorite(vehicleId).then(setIsFavorite).catch(() => {});
    }
  }, [vehicleId, isAuthenticated, isAuthLoading, initialIsFavorite]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    setIsLoading(true);
    try {
      if (isFavorite) {
        await favoritesApi.remove(vehicleId);
        setIsFavorite(false);
      } else {
        await favoritesApi.add(vehicleId);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center justify-center ${sizeClasses[size]} rounded-full transition-all ${
        isFavorite
          ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
          : 'bg-white/80 dark:bg-gray-800/80 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
      } shadow-sm hover:shadow-md disabled:opacity-50`}
      title={isFavorite ? '즐겨찾기 제거' : '즐겨찾기 추가'}
    >
      {isLoading ? (
        <svg className={`animate-spin ${iconSizeClasses[size]}`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg
          className={iconSizeClasses[size]}
          fill={isFavorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {isFavorite ? '저장됨' : '저장'}
        </span>
      )}
    </button>
  );
}
