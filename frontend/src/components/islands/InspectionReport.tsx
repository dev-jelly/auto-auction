import { useState } from 'react';
import type { VehicleInspection, InspectionReportData } from '../../types/vehicle';

const ACCESSORY_LABELS: Record<string, string> = {
  power_steering: '파워 스티어링',
  cruise_control: '크루즈 컨트롤',
  navigation: '네비게이션',
  sunroof: '선루프',
  heated_seats: '열선시트',
  ventilated_seats: '통풍시트',
  rear_camera: '후방카메라',
  front_camera: '전방카메라',
  surround_view: '어라운드 뷰',
  airbag_driver: '운전석 에어백',
  airbag_passenger: '동승석 에어백',
  lane_departure: '차선이탈 경보',
  smart_key: '스마트키',
  auto_parking: '자동주차',
  heated_steering: '열선핸들',
  rear_sensor: '후방센서',
  front_sensor: '전방센서',
  blind_spot: '사각지대 감지',
  hud: '헤드업 디스플레이',
  dash_cam: '블랙박스',
};

const FLUID_LABELS: Record<string, string> = {
  battery: '배터리',
  engine_oil: '엔진오일',
  coolant: '냉각수',
  power_steering_oil: '파워스티어링 오일',
  brake_fluid: '브레이크액',
  washer_fluid: '워셔액',
  transmission_oil: '변속기 오일',
};

const BODY_PART_LABELS: Record<string, string> = {
  A: '후드',
  B: '프론트 펜더(좌)',
  C: '프론트 펜더(우)',
  D: '프론트 도어(좌)',
  E: '프론트 도어(우)',
  F: '리어 도어(좌)',
  G: '리어 도어(우)',
  H: '사이드 패널(좌)',
  I: '사이드 패널(우)',
  J: '트렁크리드',
  K: '라디에이터 서포트',
  L: '루프패널',
  M: '플로어',
  N: '프론트 범퍼',
  O: '리어 범퍼',
  P: '프론트 휠(좌)',
  Q: '프론트 휠(우)',
};

const CONDITION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  '정상': { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', label: '정상' },
  normal: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', label: '정상' },
  '흠집': { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', label: '흠집' },
  scratch: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', label: '흠집' },
  '수리이력': { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', label: '수리이력' },
  repair: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', label: '수리이력' },
  '교환이력': { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', label: '교환이력' },
  replace: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', label: '교환이력' },
  '도색': { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', label: '도색' },
  paint: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', label: '도색' },
};

function getGradeBadge(value: string) {
  switch (value) {
    case '상':
    case '양호':
    case '정상':
      return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    case '중':
    case '주의':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case '하':
    case '불량':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('ko-KR').format(amount);
};

function SectionDivider() {
  return <hr className="my-6 border-gray-200 dark:border-gray-700" />;
}

function Header({ inspection }: { inspection: VehicleInspection }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">차량점검 리포트</h3>
          {inspection.inspection_date && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              점검일: {formatDate(inspection.inspection_date)}
            </p>
          )}
        </div>
      </div>
      {inspection.report_url && (
        <a
          href={inspection.report_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
        >
          원본 보기
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  );
}

function BasicInfo({ info }: { info: InspectionReportData['basic_info'] }) {
  if (!info) return null;

  const fields = [
    { label: '차대번호 (VIN)', value: info.vin },
    { label: '배기량', value: info.displacement },
    { label: '주행거리', value: info.mileage },
    { label: '색상', value: info.color },
    { label: '구동방식', value: info.drive_type },
    { label: '차종', value: info.vehicle_type },
  ].filter((f) => f.value);

  if (fields.length === 0) return null;

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">점검 기본 정보</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
        {fields.map((f) => (
          <div key={f.label} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">{f.label}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConditionSummary({ data }: { data: InspectionReportData }) {
  let good = 0;
  let fair = 0;
  let poor = 0;

  // Count from fluid_conditions
  if (data.fluid_conditions) {
    for (const v of Object.values(data.fluid_conditions)) {
      if (v === '상') good++;
      else if (v === '중') fair++;
      else if (v === '하') poor++;
    }
  }

  // Count from mechanical_inspection
  if (data.mechanical_inspection) {
    for (const category of Object.values(data.mechanical_inspection)) {
      for (const v of Object.values(category)) {
        if (v === '상' || v === '양호' || v === '정상') good++;
        else if (v === '중' || v === '주의') fair++;
        else if (v === '하' || v === '불량') poor++;
      }
    }
  }

  const total = good + fair + poor;
  if (total === 0) return null;

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">종합 상태 요약</h4>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{good}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">양호 (상)</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{fair}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">보통 (중)</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{poor}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">불량 (하)</p>
        </div>
      </div>
    </div>
  );
}

type GradeFilter = '전체' | '상' | '중' | '하';

function normalizeGrade(grade: string): '상' | '중' | '하' | null {
  if (grade === '상' || grade === '양호' || grade === '정상') return '상';
  if (grade === '중' || grade === '주의') return '중';
  if (grade === '하' || grade === '불량') return '하';
  return null;
}

const GRADE_FILTER_STYLES: Record<GradeFilter, { active: string; inactive: string }> = {
  '전체': {
    active: 'bg-gray-800 text-white dark:bg-white dark:text-gray-900',
    inactive: 'bg-white text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  },
  '상': {
    active: 'bg-green-600 text-white dark:bg-green-500',
    inactive: 'bg-white text-green-700 border-green-200 dark:bg-gray-800 dark:text-green-400 dark:border-green-800',
  },
  '중': {
    active: 'bg-amber-500 text-white dark:bg-amber-500',
    inactive: 'bg-white text-amber-700 border-amber-200 dark:bg-gray-800 dark:text-amber-400 dark:border-amber-800',
  },
  '하': {
    active: 'bg-red-600 text-white dark:bg-red-500',
    inactive: 'bg-white text-red-700 border-red-200 dark:bg-gray-800 dark:text-red-400 dark:border-red-800',
  },
};

function MechanicalInspection({ inspection }: { inspection: Record<string, Record<string, string>> }) {
  const [filter, setFilter] = useState<GradeFilter>('전체');
  const categories = Object.entries(inspection);
  if (categories.length === 0) return null;

  const filteredCategories = categories
    .map(([category, items]) => {
      if (filter === '전체') return [category, items] as const;
      const filtered = Object.fromEntries(
        Object.entries(items).filter(([, grade]) => normalizeGrade(grade) === filter)
      );
      return [category, filtered] as const;
    })
    .filter(([, items]) => Object.keys(items).length > 0);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">기계 점검</h4>
        <div className="flex gap-1.5">
          {(['전체', '상', '중', '하'] as GradeFilter[]).map((g) => {
            const isActive = filter === g;
            const styles = GRADE_FILTER_STYLES[g];
            return (
              <button
                key={g}
                onClick={() => setFilter(g)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                  isActive ? styles.active + ' border-transparent' : styles.inactive + ' hover:opacity-80'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-4">
        {filteredCategories.map(([category, items]) => (
          <div key={category} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{category}</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {Object.entries(items).map(([item, grade]) => (
                <div key={item} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item}</span>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getGradeBadge(grade)}`}>
                    {grade}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            해당 등급의 항목이 없습니다
          </p>
        )}
      </div>
    </div>
  );
}

function FluidConditions({ fluids }: { fluids: Record<string, string> }) {
  const entries = Object.entries(fluids);
  if (entries.length === 0) return null;

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">유체 상태</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">{FLUID_LABELS[key] || key}</span>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getGradeBadge(value)}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BodyDiagram({ diagram }: { diagram: Record<string, { part: string; condition: string }> }) {
  const entries = Object.entries(diagram);
  if (entries.length === 0) return null;

  // Only show unique legend items
  const legendItems = new Map<string, { bg: string; text: string; label: string }>();
  legendItems.set('정상', CONDITION_COLORS['정상']);
  legendItems.set('흠집', CONDITION_COLORS['흠집']);
  legendItems.set('수리이력', CONDITION_COLORS['수리이력']);
  legendItems.set('교환이력', CONDITION_COLORS['교환이력']);
  legendItems.set('도색', CONDITION_COLORS['도색']);

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">외판 부위별 상태</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {entries.map(([key, { condition }]) => {
          const style = CONDITION_COLORS[condition] || {
            bg: 'bg-gray-100 dark:bg-gray-700',
            text: 'text-gray-700 dark:text-gray-300',
            label: condition,
          };
          return (
            <div
              key={key}
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${style.bg}`}
            >
              <span className={`text-sm font-medium ${style.text}`}>
                {BODY_PART_LABELS[key] || key}
              </span>
              <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {Array.from(legendItems.entries()).map(([label, style]) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className={`w-3 h-3 rounded-sm ${style.bg}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function TextNotes({ data }: { data: InspectionReportData }) {
  // Filter out header-only content (e.g. just "◈ 특이사항" with no real text)
  const isHeaderOnly = (text: string | undefined) => {
    if (!text) return true;
    const cleaned = text.replace(/[◈◇■□▶▷●○※★☆\s]/g, '').trim();
    if (cleaned.length < 3) return true;
    // Check if it's just a label repeated
    const headerPatterns = ['특이사항', '수리권장', '소견', '외장내장'];
    for (const pat of headerPatterns) {
      if (cleaned === pat) return true;
    }
    return false;
  };

  // Expand body part letter codes (e.g. "A,B,C 판금" → "후드, 프론트 펜더(좌), 프론트 펜더(우) 판금")
  const expandPartCodes = (text: string) => {
    return text.replace(/\b([A-Q])(?:\s*[,/]\s*([A-Q]))*\b/g, (match) => {
      const letters = match.split(/[,/\s]+/).filter((l) => /^[A-Q]$/.test(l));
      if (letters.length === 0) return match;
      const names = letters.map((l) => BODY_PART_LABELS[l] || l);
      return names.join(', ');
    });
  };

  const notes = [
    { key: 'special_notes', label: '특이사항', value: data.special_notes, variant: 'info' as const },
    { key: 'assessment', label: '외관/내관 평가', value: data.exterior_interior_assessment, variant: 'default' as const },
    { key: 'repair', label: '수리 권장사항', value: data.repair_recommendations, variant: 'warning' as const },
  ].filter((n) => !isHeaderOnly(n.value));

  if (notes.length === 0) return null;

  const variantStyles = {
    info: 'border-l-4 border-l-blue-400 dark:border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
    default: 'border-l-4 border-l-gray-300 dark:border-l-gray-600 bg-gray-50 dark:bg-gray-800',
    warning: 'border-l-4 border-l-amber-400 dark:border-l-amber-500 bg-amber-50 dark:bg-amber-900/20',
  };

  return (
    <div className="mb-6 space-y-3">
      {notes.map((note) => (
        <div key={note.key} className={`rounded-lg p-4 ${variantStyles[note.variant]}`}>
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{note.label}</h5>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
            {expandPartCodes(note.value!)}
          </p>
        </div>
      ))}
    </div>
  );
}

function AccessoriesGrid({ accessories }: { accessories: Record<string, boolean> }) {
  const entries = Object.entries(accessories);
  if (entries.length === 0) return null;

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">편의장치</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {entries.map(([key, equipped]) => (
          <div
            key={key}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              equipped
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
            }`}
          >
            {equipped ? (
              <svg className="w-4 h-4 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            )}
            <span className={equipped ? '' : 'line-through'}>{ACCESSORY_LABELS[key] || key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsuranceHistory({ history }: { history: { count: number; total_amount: number; details: string } }) {
  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">보험 이력</h4>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-6 mb-3">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">사고 횟수</span>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{history.count}건</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">총 보험금</span>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatAmount(history.total_amount)}원</p>
          </div>
        </div>
        {history.details && (
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{history.details}</p>
        )}
      </div>
    </div>
  );
}

interface InspectionReportProps {
  inspection: VehicleInspection;
}

export default function InspectionReport({ inspection }: InspectionReportProps) {
  const data = inspection.report_data;
  const hasBasicInfo = data.basic_info && Object.values(data.basic_info).some(Boolean);
  const hasMechanical = data.mechanical_inspection && Object.keys(data.mechanical_inspection).length > 0;
  const hasFluids = data.fluid_conditions && Object.keys(data.fluid_conditions).length > 0;
  const hasBody = data.body_diagram && Object.keys(data.body_diagram).length > 0;
  const hasAccessories = data.accessories && Object.keys(data.accessories).length > 0;

  return (
    <div>
      <Header inspection={inspection} />

      {/* Group 1: Basic info & summary */}
      {hasBasicInfo && <BasicInfo info={data.basic_info} />}
      <ConditionSummary data={data} />

      {/* Group 2: Detailed inspection */}
      {(hasMechanical || hasFluids) && <SectionDivider />}
      {hasMechanical && <MechanicalInspection inspection={data.mechanical_inspection} />}
      {hasFluids && <FluidConditions fluids={data.fluid_conditions} />}

      {/* Group 3: Body & notes */}
      {(hasBody || data.special_notes || data.exterior_interior_assessment || data.repair_recommendations) && <SectionDivider />}
      {hasBody && <BodyDiagram diagram={data.body_diagram} />}
      <TextNotes data={data} />

      {/* Group 4: Accessories & insurance */}
      {(hasAccessories || data.insurance_history) && <SectionDivider />}
      {hasAccessories && <AccessoriesGrid accessories={data.accessories} />}
      {data.insurance_history && <InsuranceHistory history={data.insurance_history} />}
    </div>
  );
}
