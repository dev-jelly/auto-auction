import { useEffect } from 'react';
import { useAuthStore } from '../../stores/auth';

export default function AuthButton() {
  const { user, isAuthenticated, isLoading, openAuthModal, logout, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={() => openAuthModal('login')}
        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
      >
        로그인
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <a
        href="/favorites"
        className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        title="즐겨찾기"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </a>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
            {user.name.charAt(0)}
          </span>
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
          {user.name}
        </span>
      </div>
      <button
        onClick={logout}
        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        title="로그아웃"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
    </div>
  );
}
