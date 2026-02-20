import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth';
import { favoritesApi } from '../../lib/api/favorites';
import type { Vehicle } from '../../types/vehicle';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price);
};

export default function FavoritesGrid() {
  const { isAuthenticated, isLoading: isAuthLoading, openAuthModal } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    loadFavorites();
  }, [isAuthenticated, isAuthLoading]);

  const loadFavorites = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await favoritesApi.list(1, 50);
      setVehicles(response.data);
      setTotal(response.pagination.total);
    } catch (err) {
      setError('즐겨찾기를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (vehicleId: number) => {
    try {
      await favoritesApi.remove(vehicleId);
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400">로그인이 필요합니다</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200 dark:bg-gray-700" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500">{error}</p>
        <button onClick={loadFavorites} className="mt-4 btn btn-primary">
          다시 시도
        </button>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-16">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          즐겨찾기가 비어있습니다
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          마음에 드는 차량에 하트를 눌러 추가해보세요
        </p>
        <a href="/" className="btn btn-primary">
          차량 둘러보기
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        총 {total}대의 차량
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <a href={`/vehicles/${vehicle.id}`} className="block">
              <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
                {vehicle.image_urls && vehicle.image_urls.length > 0 ? (
                  <img
                    src={vehicle.image_urls[0]}
                    alt={vehicle.model_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {vehicle.model_name}
                </h3>
                <p className="text-xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                  {vehicle.price ? `${formatPrice(vehicle.price)}원` : '가격 정보 없음'}
                </p>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{vehicle.year}년</span>
                  <span>•</span>
                  <span>{vehicle.fuel_type}</span>
                  {vehicle.mileage && (
                    <>
                      <span>•</span>
                      <span>{formatPrice(vehicle.mileage)}km</span>
                    </>
                  )}
                </div>
              </div>
            </a>
            <div className="px-4 pb-4">
              <button
                onClick={() => handleRemove(vehicle.id)}
                className="w-full py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                즐겨찾기 제거
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
