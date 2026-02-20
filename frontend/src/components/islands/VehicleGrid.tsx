import FavoriteButton from './FavoriteButton';
import { useState, useEffect, useCallback } from 'react';
import type { Vehicle, VehicleFilters, VehicleApiResponse } from '../../types/vehicle';
import FilterSidebar from './FilterSidebar';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
};

const getFuelTypeLabel = (fuel: string) => {
  const labels: Record<string, string> = {
    gasoline: '휘발유',
    diesel: '경유',
    lpg: 'LPG',
    hybrid: '하이브리드',
    electric: '전기',
    휘발유: '휘발유',
    경유: '경유',
    하이브리드: '하이브리드',
    전기: '전기',
  };
  return labels[fuel.toLowerCase()] || labels[fuel] || fuel;
};

const getTransmissionLabel = (trans: string) => {
  const labels: Record<string, string> = {
    auto: '자동',
    automatic: '자동',
    manual: '수동',
  };
  return labels[trans.toLowerCase()] || trans;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case '입찰중':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case '유찰':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case '매각':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case '종료':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const getStatusLabel = (status: string) => {
  return status;
};

const getSourceLabel = (source?: string) => {
  const labels: Record<string, string> = {
    automart: '오토마트',
    court_auction: '법원경매',
    onbid: '온비드',
  };
  return source ? labels[source] || source : '';
};

const getSourceColor = (source?: string) => {
  switch (source) {
    case 'automart':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    case 'court_auction':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'onbid':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

interface VehicleCardProps {
  vehicle: Vehicle;
}

function VehicleCard({ vehicle }: VehicleCardProps) {
  const [imgError, setImgError] = useState(false);
  const isCompleted = !!vehicle.result_status;
  const displayPrice = isCompleted && vehicle.final_price ? vehicle.final_price : vehicle.price;
  const priceLabel = isCompleted && vehicle.final_price ? '낙찰가' : '예정가';
  const hasImage = vehicle.image_urls?.[0] && !imgError;

  return (
    <a href={`/vehicles/${vehicle.id}`} className="block">
    <article className="card card-hover overflow-hidden group">
      <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
        {hasImage ? (
          <img
            src={vehicle.image_urls![0]}
            alt={vehicle.model_name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <svg
            className="w-16 h-16 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        )}
        {vehicle.source && (
          <span
            className={`absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded ${getSourceColor(
              vehicle.source
            )}`}
          >
            {getSourceLabel(vehicle.source)}
          </span>
        )}
        <span
          className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
            vehicle.result_status || vehicle.status
          )}`}
        >
          {getStatusLabel(vehicle.result_status || vehicle.status)}
        </span>
        {vehicle.has_inspection && (
          <span
            className="absolute bottom-3 right-3 p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm"
            title="점검서 보유"
          >
            <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
        )}
        <div className="absolute bottom-3 left-3">
          <FavoriteButton vehicleId={vehicle.id} size="sm" />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {vehicle.model_name}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {vehicle.year}년
          </span>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{priceLabel}</p>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {formatPrice(displayPrice)}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">원</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
            {getFuelTypeLabel(vehicle.fuel_type)}
          </span>
          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
            {getTransmissionLabel(vehicle.transmission)}
          </span>
        </div>

        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="truncate">{vehicle.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span className="truncate">{vehicle.organization}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>마감: {formatDate(vehicle.due_date)}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            관리번호: {vehicle.mgmt_number}
          </span>
          <span className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium transition-colors">
            상세보기 &rarr;
          </span>
        </div>
      </div>
    </article>
    </a>
  );
}

function LoadingSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-200 dark:bg-gray-700" />
      <div className="p-4">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
        <div className="flex gap-2 mb-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        검색 결과가 없습니다
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-md">
        조건에 맞는 차량을 찾을 수 없습니다. 필터 조건을 변경해 보세요.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="w-16 h-16 text-red-400 dark:text-red-500 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        데이터를 불러오는 데 실패했습니다
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">{message}</p>
      <button onClick={onRetry} className="btn btn-primary">
        다시 시도
      </button>
    </div>
  );
}

interface VehicleGridProps {
  defaultListingType?: string;
}

function readUrlState(defaultListingType?: string) {
  if (typeof window === 'undefined') {
    return {
      filters: defaultListingType ? { listingType: defaultListingType } as VehicleFilters : {} as VehicleFilters,
      page: 1,
      sortBy: 'dueDate' as const,
      sortOrder: 'asc' as const,
    };
  }
  const sp = new URLSearchParams(window.location.search);
  const filters: VehicleFilters = defaultListingType ? { listingType: defaultListingType } : {};
  if (sp.get('status')) filters.status = sp.get('status')!;
  if (sp.get('source')) filters.source = sp.get('source')!;
  if (sp.get('fuel_type')) filters.fuelType = sp.get('fuel_type')!;
  if (sp.get('year_min')) filters.yearMin = Number(sp.get('year_min'));
  if (sp.get('price_min')) filters.priceMin = Number(sp.get('price_min'));
  if (sp.get('price_max')) filters.priceMax = Number(sp.get('price_max'));
  if (sp.get('search')) filters.search = sp.get('search')!;
  if (sp.get('car_number')) filters.carNumber = sp.get('car_number')!;
  if (sp.get('location')) filters.location = sp.get('location')!;
  if (sp.get('listing_type')) filters.listingType = sp.get('listing_type')!;
  if (sp.get('has_inspection') === 'true') filters.hasInspection = true;
  if (sp.get('result_status')) filters.resultStatus = sp.get('result_status')!;

  const sortByMap: Record<string, 'price' | 'year' | 'dueDate'> = {
    price: 'price', year: 'year', dueDate: 'dueDate',
  };

  return {
    filters,
    page: Number(sp.get('p')) || 1,
    sortBy: sortByMap[sp.get('sort') || ''] || 'dueDate',
    sortOrder: (sp.get('dir') === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc',
  };
}

export default function VehicleGrid({ defaultListingType }: VehicleGridProps = {}) {
  const [initState] = useState(() => readUrlState(defaultListingType));
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<VehicleFilters>(initState.filters);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initState.page);
  const [sortBy, setSortBy] = useState<'price' | 'year' | 'dueDate'>(initState.sortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initState.sortOrder);
  const pageSize = 12;

  const buildQueryString = useCallback(
    (filters: VehicleFilters, page: number) => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      const sortByMapping: Record<string, string> = {
        dueDate: 'due_date',
        price: 'price',
        year: 'year',
      };
      params.set('sort_by', sortByMapping[sortBy] || sortBy);
      params.set('sort_dir', sortOrder);

      if (filters.yearMin) params.set('year', String(filters.yearMin));
      if (filters.priceMin) params.set('price_min', String(filters.priceMin));
      if (filters.priceMax) params.set('price_max', String(filters.priceMax));
      if (filters.fuelType) params.set('fuel_type', filters.fuelType);
      if (filters.status) params.set('status', filters.status);
      if (filters.source) params.set('source', filters.source);
      if (filters.listingType) params.set('listing_type', filters.listingType);
      if (filters.hasInspection) params.set('has_inspection', 'true');
      if (filters.search) params.set('search', filters.search);
      if (filters.carNumber) params.set('car_number', filters.carNumber);

      return params.toString();
    },
    [sortBy, sortOrder]
  );

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(filters, page);
      const response = await fetch(`/api/vehicles?${queryString}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: VehicleApiResponse = await response.json();
      setVehicles(data.data);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      setVehicles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, buildQueryString]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Sync state to URL so browser back button restores it
  useEffect(() => {
    const sp = new URLSearchParams();
    if (page > 1) sp.set('p', String(page));
    if (sortBy !== 'dueDate') sp.set('sort', sortBy);
    if (sortOrder !== 'asc') sp.set('dir', sortOrder);
    if (filters.status) sp.set('status', filters.status);
    if (filters.source) sp.set('source', filters.source);
    if (filters.fuelType) sp.set('fuel_type', filters.fuelType);
    if (filters.yearMin) sp.set('year_min', String(filters.yearMin));
    if (filters.priceMin) sp.set('price_min', String(filters.priceMin));
    if (filters.priceMax) sp.set('price_max', String(filters.priceMax));
    if (filters.search) sp.set('search', filters.search);
    if (filters.carNumber) sp.set('car_number', filters.carNumber);
    if (filters.location) sp.set('location', filters.location);
    if (filters.listingType && filters.listingType !== defaultListingType) sp.set('listing_type', filters.listingType);
    if (filters.hasInspection) sp.set('has_inspection', 'true');
    if (filters.resultStatus) sp.set('result_status', filters.resultStatus);

    const qs = sp.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [page, sortBy, sortOrder, filters, defaultListingType]);

  const handleFiltersChange = useCallback((newFilters: VehicleFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((newSortBy: typeof sortBy) => {
    setSortBy(newSortBy);
    if (newSortBy === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortOrder('asc');
    }
    setPage(1);
  }, [sortBy]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex gap-6">
      <FilterSidebar filters={filters} onFiltersChange={handleFiltersChange} />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">차량 목록</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              총 <span className="font-semibold text-primary-600 dark:text-primary-400">{total}</span>대의 차량
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">정렬:</span>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => handleSortChange('dueDate')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  sortBy === 'dueDate'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                마감일
              </button>
              <button
                onClick={() => handleSortChange('price')}
                className={`px-3 py-1.5 text-sm border-l border-gray-300 dark:border-gray-600 transition-colors ${
                  sortBy === 'price'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                가격
              </button>
              <button
                onClick={() => handleSortChange('year')}
                className={`px-3 py-1.5 text-sm border-l border-gray-300 dark:border-gray-600 transition-colors ${
                  sortBy === 'year'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                연식
              </button>
            </div>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title={sortOrder === 'asc' ? '오름차순' : '내림차순'}
            >
              <svg
                className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
                  sortOrder === 'desc' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} />)
          ) : error && vehicles.length === 0 ? (
            <ErrorState message={error} onRetry={fetchVehicles} />
          ) : vehicles.length === 0 ? (
            <EmptyState />
          ) : (
            vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === 1}
              className="btn btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => { setPage(pageNum); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === totalPages}
              className="btn btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
