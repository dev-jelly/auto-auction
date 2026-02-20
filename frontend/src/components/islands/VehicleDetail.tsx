import { useState, useEffect, useCallback } from 'react';
import type { Vehicle, AuctionHistoryEntry, VehicleInspection, MarketMappings } from '../../types/vehicle';
import InspectionReport from './InspectionReport';
import ImageLightbox from './ImageLightbox';
import CopyToLLMButton from './CopyToLLMButton';
import MarketSearchButtons from './MarketSearchButtons';
import FavoriteButton from './FavoriteButton';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
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

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/2 h-64 lg:h-80 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div className="flex-1 space-y-4">
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
          <div className="space-y-2 pt-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="card p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="card p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
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
        차량 정보를 불러올 수 없습니다
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">{message}</p>
      <button onClick={onRetry} className="btn btn-primary">
        다시 시도
      </button>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
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
        차량을 찾을 수 없습니다
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        요청하신 차량 정보가 존재하지 않습니다.
      </p>
      <a href="/" className="btn btn-primary">
        차량 목록으로 돌아가기
      </a>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div>
      <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-900 dark:text-white mt-0.5">{value}</dd>
    </div>
  );
}

export default function VehicleDetail() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [history, setHistory] = useState<AuctionHistoryEntry[]>([]);
  const [inspection, setInspection] = useState<VehicleInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [marketMappings, setMarketMappings] = useState<MarketMappings | null>(null);

  const fetchData = useCallback(async () => {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const idStr = pathParts[pathParts.length - 1];
    const vehicleId = Number(idStr);

    if (!idStr || isNaN(vehicleId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const [vehicleRes, historyRes, inspectionRes, mappingsRes] = await Promise.all([
        fetch(`/api/vehicles/${vehicleId}`),
        fetch(`/api/vehicles/${vehicleId}/history`),
        fetch(`/api/vehicles/${vehicleId}/inspection`),
        fetch('/api/market-mappings'),
      ]);

      if (vehicleRes.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!vehicleRes.ok) {
        throw new Error(`서버 오류 (${vehicleRes.status})`);
      }

      const vehicleData: Vehicle = await vehicleRes.json();
      setVehicle(vehicleData);

      if (historyRes.ok) {
        const historyData: AuctionHistoryEntry[] = await historyRes.json();
        setHistory(Array.isArray(historyData) ? historyData : []);
      }

      if (inspectionRes.ok) {
        const inspectionData: VehicleInspection = await inspectionRes.json();
        setInspection(inspectionData);
      }

      if (mappingsRes.ok) {
        const mappingsData: MarketMappings = await mappingsRes.json();
        setMarketMappings(mappingsData);
      }
    } catch (err) {
      console.error('Failed to fetch vehicle:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는 데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (notFound) {
    return <NotFoundState />;
  }

  if (error || !vehicle) {
    return <ErrorState message={error || '알 수 없는 오류가 발생했습니다'} onRetry={fetchData} />;
  }

  const isCompleted = !!vehicle.result_status;
  const displayPrice = isCompleted && vehicle.final_price ? vehicle.final_price : vehicle.price;
  const priceLabel = isCompleted && vehicle.final_price ? '낙찰가' : '예정가';
  const isCourtAuction = vehicle.source === 'court_auction';
  const imageEntries = (vehicle.image_urls ?? []).map((url, index) => ({
    url,
    index,
    label: vehicle.image_labels?.[index],
  }));
  const validImageEntries = imageEntries.filter((entry) => !failedImages.has(entry.index));
  const handleLightboxNavigate = useCallback((index: number) => {
    const mapped = validImageEntries[index];
    if (mapped) {
      setSelectedImageIndex(mapped.index);
    }
  }, [validImageEntries]);

  const selectedImageEntry =
    validImageEntries.find((entry) => entry.index === selectedImageIndex) ?? validImageEntries[0];
  const selectedVisibleIndex = Math.max(
    0,
    validImageEntries.findIndex((entry) => entry.index === selectedImageEntry?.index)
  );

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = '/';
          }
        }}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        차량 목록으로 돌아가기
      </button>

      {/* Top section: image + info */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Image section */}
        <div className="w-full lg:w-1/2 space-y-2">
          <div className="relative h-64 lg:h-80 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl flex items-center justify-center overflow-hidden group">
            {selectedImageEntry ? (
              <button
                onClick={() => setLightboxOpen(true)}
                className="relative w-full h-full cursor-zoom-in"
              >
                  <img
                    key={selectedImageEntry.index}
                    src={selectedImageEntry.url}
                    alt={vehicle.model_name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={() => {
                      const failedIndex = selectedImageEntry.index;
                      setFailedImages((prev) => {
                        const next = new Set(prev);
                        next.add(failedIndex);
                        return next;
                      });

                      const nextEntry = validImageEntries.find((entry) => entry.index !== failedIndex);
                      if (nextEntry) {
                        setSelectedImageIndex(nextEntry.index);
                      }
                    }}
                  />
                  {selectedImageEntry.label && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/50 backdrop-blur-sm text-white text-sm font-medium">
                      {selectedImageEntry.label}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="p-2 rounded-full bg-white/90 shadow-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/60 text-white text-[10px] font-bold tracking-wider uppercase opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      Click to expand
                    </div>
                  </div>
                </button>
            ) : (
              <svg
                className="w-24 h-24 text-gray-400 dark:text-gray-500"
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
                className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-medium rounded ${getSourceColor(vehicle.source)}`}
              >
                {getSourceLabel(vehicle.source)}
              </span>
            )}
            <span
              className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(vehicle.result_status || vehicle.status)}`}
            >
              {vehicle.result_status || vehicle.status}
            </span>
          </div>
          {validImageEntries.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {validImageEntries.map((entry, visibleIndex) => (
                  <button
                    key={entry.index}
                    onClick={() => setSelectedImageIndex(entry.index)}
                    className={`relative h-16 lg:h-20 rounded-lg overflow-hidden transition-all ${
                      selectedImageEntry?.index === entry.index
                        ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={entry.url}
                      alt={`${vehicle.model_name} ${visibleIndex + 1}`}
                      className="w-full h-full object-cover"
                      onError={() => setFailedImages((prev) => new Set(prev).add(entry.index))}
                    />
                    {entry.label && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[10px] leading-tight text-white truncate">
                        {entry.label}
                      </div>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Vehicle info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {vehicle.model_name}
          </h1>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2.5 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
              {vehicle.year}년
            </span>
            <span className="px-2.5 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
              {getFuelTypeLabel(vehicle.fuel_type)}
            </span>
            <span className="px-2.5 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
              {getTransmissionLabel(vehicle.transmission)}
            </span>
            {vehicle.mileage !== undefined && vehicle.mileage > 0 && (
              <span className="px-2.5 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                {formatPrice(vehicle.mileage)}km
              </span>
            )}
          </div>

          {/* Price display */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{priceLabel}</p>
            <p className="text-3xl sm:text-4xl font-bold text-primary-600 dark:text-primary-400">
              {formatPrice(displayPrice)}
              <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-1">원</span>
            </p>
            {isCompleted && vehicle.final_price && vehicle.price && vehicle.final_price !== vehicle.price && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                예정가: {formatPrice(vehicle.price)}원
                <span className="ml-2">
                  ({Math.round((vehicle.final_price / vehicle.price) * 100)}%)
                </span>
              </p>
            )}
            {vehicle.min_bid_price && vehicle.min_bid_price !== displayPrice && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                최저입찰가:{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {formatPrice(vehicle.min_bid_price)}원
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span>{vehicle.organization}</span>
            </div>
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
              <span>{vehicle.location}</span>
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

          <div className="flex flex-wrap gap-2 mt-4">
            {vehicle.detail_url && (
              <a
                href={vehicle.detail_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary inline-flex items-center gap-2"
              >
                원본 페이지에서 보기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
            <FavoriteButton vehicleId={vehicle.id} size="md" showLabel />
            <CopyToLLMButton vehicle={vehicle} history={history} inspection={inspection} />
            <MarketSearchButtons vehicle={vehicle} mappings={marketMappings} />
            {vehicle.car_number && (
              <a
                href={`https://www.car365.go.kr/acat/catIntgVhclHist.do?carNo=${encodeURIComponent(vehicle.car_number)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary inline-flex items-center gap-2"
              >
                자동차365 이력조회
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">상세 정보</h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <DetailField label="관리번호" value={vehicle.mgmt_number} />
          <DetailField label="차량번호" value={vehicle.car_number} />
          <DetailField label="연식" value={`${vehicle.year}년`} />
          <DetailField label="연료" value={getFuelTypeLabel(vehicle.fuel_type)} />
          <DetailField label="변속기" value={getTransmissionLabel(vehicle.transmission)} />
          <DetailField label="진행기관" value={vehicle.organization} />
          <DetailField label="보관소" value={vehicle.location} />
          <DetailField label="입찰마감" value={formatDate(vehicle.due_date)} />
          <DetailField label="등록일" value={formatDate(vehicle.created_at)} />
          {vehicle.auction_count !== undefined && (
            <DetailField label="경매 횟수" value={`${vehicle.auction_count}회`} />
          )}
          {isCourtAuction && (
            <>
              <DetailField label="사건번호" value={vehicle.case_number} />
              <DetailField label="법원" value={vehicle.court_name} />
            </>
          )}
          {vehicle.result_status && (
            <>
              <DetailField label="결과 상태" value={vehicle.result_status} />
              {vehicle.result_date && (
                <DetailField label="결과일" value={formatDate(vehicle.result_date)} />
              )}
            </>
          )}
        </dl>
      </div>

      {/* Inspection report */}
      {inspection && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">차량점검서</h2>
          <InspectionReport inspection={inspection} />
        </div>
      )}

      {/* Auction history */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">경매 이력</h2>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">경매 이력이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">회차</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">예정가</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">최저입찰가</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">낙찰가</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500 dark:text-gray-400">상태</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">마감일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-3 text-gray-900 dark:text-white">
                      {entry.auction_round ? `${entry.auction_round}차` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300">
                      {entry.listed_price ? `${formatPrice(entry.listed_price)}원` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300">
                      {entry.min_bid_price ? `${formatPrice(entry.min_bid_price)}원` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-primary-600 dark:text-primary-400">
                      {entry.final_price ? `${formatPrice(entry.final_price)}원` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(entry.status)}`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-500 dark:text-gray-400">
                      {entry.bid_deadline
                        ? formatDate(entry.bid_deadline)
                        : entry.result_date
                          ? formatDate(entry.result_date)
                          : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {validImageEntries.length > 0 && lightboxOpen && (
        <ImageLightbox
          images={validImageEntries.map((entry) => entry.url)}
          labels={validImageEntries.map((entry) => entry.label || '')}
          initialIndex={selectedVisibleIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={handleLightboxNavigate}
        />
      )}
    </div>
  );
}
