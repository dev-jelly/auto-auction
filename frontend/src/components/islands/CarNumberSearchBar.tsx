import { useState, useCallback } from 'react';
import type { Vehicle } from '../../types/vehicle';

interface LookupResult {
  vehicles: Vehicle[];
  external_info: unknown;
  car365_url: string;
}

export default function CarNumberSearchBar() {
  const [carNumber, setCarNumber] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(() => {
    const trimmed = carNumber.trim();
    if (!trimmed) return;

    // Update URL to filter the vehicle grid
    const sp = new URLSearchParams(window.location.search);
    sp.set('car_number', trimmed);
    sp.delete('p');
    const newUrl = `${window.location.pathname}?${sp.toString()}`;
    window.location.href = newUrl;
  }, [carNumber]);

  const handleLookup = useCallback(async () => {
    const trimmed = carNumber.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles/lookup/${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data: LookupResult = await res.json();
        setLookupResult(data);
      }
    } catch (err) {
      console.error('Lookup failed:', err);
    } finally {
      setLoading(false);
    }
  }, [carNumber]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const car365URL = carNumber.trim()
    ? `https://www.car365.go.kr/acat/catIntgVhclHist.do?carNo=${encodeURIComponent(carNumber.trim())}`
    : null;

  return (
    <div className="card p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="차량번호로 검색 (예: 12가3456)"
            value={carNumber}
            onChange={(e) => {
              setCarNumber(e.target.value);
              setLookupResult(null);
            }}
            onKeyDown={handleKeyDown}
            className="input pl-10 w-full"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleSearch}
            disabled={!carNumber.trim()}
            className="btn btn-primary flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            조회
          </button>
          <button
            onClick={handleLookup}
            disabled={!carNumber.trim() || loading}
            className="btn btn-secondary flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '검색중...' : '상세조회'}
          </button>
          {car365URL && (
            <a
              href={car365URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary flex-1 sm:flex-none inline-flex items-center gap-1.5"
            >
              자동차365 이력조회
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Lookup results */}
      {lookupResult && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {lookupResult.vehicles.length > 0 ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-semibold text-primary-600 dark:text-primary-400">
                  {lookupResult.vehicles.length}
                </span>
                대의 차량이 검색되었습니다
              </p>
              <div className="flex flex-wrap gap-2">
                {lookupResult.vehicles.map((v) => (
                  <a
                    key={v.id}
                    href={`/vehicles/${v.id}`}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {v.model_name}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {v.year}년
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              해당 차량번호로 등록된 경매 차량이 없습니다.
            </p>
          )}

          {lookupResult.car365_url && (
            <a
              href={lookupResult.car365_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              자동차365에서 이력 조회
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      )}
    </div>
  );
}
