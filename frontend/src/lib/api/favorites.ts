import { apiClient } from './client';
import type { Vehicle } from '../../types/vehicle';

interface FavoritesListResponse {
  data: Vehicle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export const favoritesApi = {
  add: (vehicleId: number) => apiClient.post<void>(`/favorites/${vehicleId}`),
  remove: (vehicleId: number) => apiClient.del<void>(`/favorites/${vehicleId}`),
  list: (page = 1, limit = 20) =>
    apiClient.get<FavoritesListResponse>(`/favorites?page=${page}&limit=${limit}`),
  check: (vehicleIds: number[]) =>
    apiClient.post<{ favorites: Record<number, boolean> }>('/favorites/check', {
      vehicle_ids: vehicleIds,
    }),
  isFavorite: (vehicleId: number) =>
    apiClient
      .get<{ is_favorite: boolean }>(`/favorites/check/${vehicleId}`)
      .then((r) => r.is_favorite),
};
