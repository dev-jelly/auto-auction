import { useState, useCallback, useEffect } from 'react';
import type { VehicleFilters } from '../../types/vehicle';

interface FilterSidebarProps {
  filters: VehicleFilters;
  onFiltersChange: (filters: VehicleFilters) => void;
}

const FUEL_TYPES = [
  { value: '', label: '전체' },
  { value: '경유', label: '경유' },
  { value: '휘발유', label: '휘발유' },
  { value: 'LPG', label: 'LPG' },
  { value: '하이브리드', label: '하이브리드' },
  { value: '전기', label: '전기' },
];

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: '입찰중', label: '입찰중' },
  { value: '유찰', label: '유찰' },
  { value: '매각', label: '매각' },
];

const SOURCE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'automart', label: '오토마트' },
  { value: 'court_auction', label: '법원경매' },
  { value: 'onbid', label: '온비드' },
];

const YEAR_OPTIONS = (() => {
  const currentYear = new Date().getFullYear();
  const years: { value: number | ''; label: string }[] = [{ value: '', label: '전체' }];
  for (let year = currentYear; year >= currentYear - 20; year--) {
    years.push({ value: year, label: `${year}년` });
  }
  return years;
})();

const PRICE_RANGES = [
  { value: '', min: undefined, max: undefined, label: '전체' },
  { value: '0-500', min: 0, max: 5000000, label: '500만원 이하' },
  { value: '500-1000', min: 5000000, max: 10000000, label: '500~1,000만원' },
  { value: '1000-2000', min: 10000000, max: 20000000, label: '1,000~2,000만원' },
  { value: '2000-3000', min: 20000000, max: 30000000, label: '2,000~3,000만원' },
  { value: '3000+', min: 30000000, max: undefined, label: '3,000만원 이상' },
];

export default function FilterSidebar({ filters, onFiltersChange }: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<VehicleFilters>(filters);
  const [selectedPriceRange, setSelectedPriceRange] = useState('');

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = useCallback(
    (key: keyof VehicleFilters, value: string | number | undefined) => {
      const newFilters = { ...localFilters, [key]: value || undefined };
      setLocalFilters(newFilters);
    },
    [localFilters]
  );

  const handlePriceRangeChange = useCallback(
    (rangeValue: string) => {
      setSelectedPriceRange(rangeValue);
      const range = PRICE_RANGES.find((r) => r.value === rangeValue);
      if (range) {
        const newFilters = {
          ...localFilters,
          priceMin: range.min,
          priceMax: range.max,
        };
        setLocalFilters(newFilters);
      }
    },
    [localFilters]
  );

  const handleApplyFilters = useCallback(() => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  }, [localFilters, onFiltersChange]);

  const handleResetFilters = useCallback(() => {
    const emptyFilters: VehicleFilters = {};
    setLocalFilters(emptyFilters);
    setSelectedPriceRange('');
    onFiltersChange(emptyFilters);
  }, [onFiltersChange]);

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== ''
  ).length;

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-40 btn btn-primary shadow-lg rounded-full px-4 py-3"
        aria-label="필터 열기"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        필터
        {activeFilterCount > 0 && (
          <span className="ml-2 bg-white text-primary-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 lg:top-20 left-0 z-50 lg:z-auto
          h-full lg:h-auto max-h-screen lg:max-h-[calc(100vh-6rem)]
          w-80 lg:w-72 bg-white dark:bg-gray-800
          border-r lg:border lg:rounded-xl border-gray-200 dark:border-gray-700
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto scrollbar-thin
        `}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">필터</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="닫기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <label htmlFor="search" className="label">검색</label>
            <div className="relative">
              <input
                type="text"
                id="search"
                placeholder="차량명, 관리번호..."
                value={localFilters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input pl-10"
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
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="label">경매 상태</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange('status', option.value)}
                  className={`
                    px-3 py-1.5 text-sm rounded-full border transition-colors
                    ${
                      localFilters.status === option.value ||
                      (!localFilters.status && option.value === '')
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div className="mb-6">
            <label className="label">출처</label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange('source', option.value)}
                  className={`
                    px-3 py-1.5 text-sm rounded-full border transition-colors
                    ${
                      localFilters.source === option.value ||
                      (!localFilters.source && option.value === '')
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Year Range */}
          <div className="mb-6">
            <label className="label">연식</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={localFilters.yearMin || ''}
                onChange={(e) =>
                  handleFilterChange('yearMin', e.target.value ? Number(e.target.value) : undefined)
                }
                className="input text-sm"
              >
                <option value="">최소</option>
                {YEAR_OPTIONS.slice(1).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={localFilters.yearMax || ''}
                onChange={(e) =>
                  handleFilterChange('yearMax', e.target.value ? Number(e.target.value) : undefined)
                }
                className="input text-sm"
              >
                <option value="">최대</option>
                {YEAR_OPTIONS.slice(1).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <label className="label">가격대</label>
            <div className="space-y-2">
              {PRICE_RANGES.map((range) => (
                <label
                  key={range.value}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="priceRange"
                    value={range.value}
                    checked={selectedPriceRange === range.value}
                    onChange={(e) => handlePriceRangeChange(e.target.value)}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {range.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Fuel Type */}
          <div className="mb-6">
            <label className="label">연료 종류</label>
            <select
              value={localFilters.fuelType || ''}
              onChange={(e) => handleFilterChange('fuelType', e.target.value)}
              className="input"
            >
              {FUEL_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Inspection report */}
          <div className="mb-6">
            <label className="label">차량점검서</label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={!!localFilters.hasInspection}
                onChange={(e) => {
                  const newFilters = { ...localFilters, hasInspection: e.target.checked || undefined };
                  setLocalFilters(newFilters);
                }}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                점검서 보유 차량만
              </span>
            </label>
          </div>

          {/* Location */}
          <div className="mb-6">
            <label htmlFor="location" className="label">지역</label>
            <input
              type="text"
              id="location"
              placeholder="예: 서울, 경기"
              value={localFilters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="input"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={handleResetFilters} className="btn btn-secondary flex-1">
              초기화
            </button>
            <button onClick={handleApplyFilters} className="btn btn-primary flex-1">
              적용
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
