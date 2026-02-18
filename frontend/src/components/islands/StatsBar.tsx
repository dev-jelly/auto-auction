import { useState, useEffect } from 'react';

interface Stats {
  total_count: number;
  avg_price: number;
  by_fuel_type: { fuel_type: string; count: number; avg_price: number }[];
  by_status: { status: string; count: number }[];
  by_source?: { source: string; count: number }[];
  price_range: { min: number; max: number };
}

const formatPrice = (price: number) => {
  if (price >= 10000) {
    return `${Math.round(price / 10000).toLocaleString('ko-KR')}만`;
  }
  return new Intl.NumberFormat('ko-KR').format(price);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case '입찰중':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case '유찰':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case '매각':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

const getSourceLabel = (source: string) => {
  const labels: Record<string, string> = {
    automart: '오토마트',
    court_auction: '법원경매',
    onbid: '온비드',
  };
  return labels[source] || source;
};

const getSourceColor = (source: string) => {
  switch (source) {
    case 'automart':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    case 'court_auction':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'onbid':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
      })
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats || stats.total_count === 0) return null;

  const topFuels = stats.by_fuel_type
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const statuses = stats.by_status
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const sources = stats.by_source
    ? stats.by_source.sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">등록 차량</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total_count.toLocaleString('ko-KR')}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">대</span>
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">평균 예정가</p>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {formatPrice(stats.avg_price)}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">원</span>
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">최저가</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatPrice(stats.price_range.min)}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">원</span>
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">최고가</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatPrice(stats.price_range.max)}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">원</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {sources.length > 0 && (
          <div className="card p-3 flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">출처별</span>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s) => (
                <span
                  key={s.source}
                  className={`px-2 py-0.5 text-xs rounded ${getSourceColor(s.source)}`}
                >
                  {getSourceLabel(s.source)} <span className="font-semibold">{s.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {topFuels.length > 0 && (
          <div className="card p-3 flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">연료별</span>
            <div className="flex flex-wrap gap-1.5">
              {topFuels.map((ft) => (
                <span
                  key={ft.fuel_type}
                  className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                >
                  {ft.fuel_type} <span className="font-semibold">{ft.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {statuses.length > 0 && (
          <div className="card p-3 flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">상태별</span>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map((s) => (
                <span
                  key={s.status}
                  className={`px-2 py-0.5 text-xs rounded ${getStatusColor(s.status)}`}
                >
                  {s.status} <span className="font-semibold">{s.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
