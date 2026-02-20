import { useState } from 'react';
import type { Vehicle, AuctionHistoryEntry, VehicleInspection } from '../../types/vehicle';

interface CopyToLLMButtonProps {
  vehicle: Vehicle;
  history: AuctionHistoryEntry[];
  inspection: VehicleInspection | null;
}

export default function CopyToLLMButton({ vehicle, history, inspection }: CopyToLLMButtonProps) {
  const [copied, setCopied] = useState(false);

  const formatPrice = (price?: number) => {
    if (!price) return '정보 없음';
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const handleCopy = async () => {
    const data = inspection?.report_data;
    
    let text = `## 차량 정보 분석 요청\n`;
    text += `다음은 경매 플랫폼에서 추출한 차량 데이터입니다. 이 차량의 유지비(유지보수 비용), 실제 가치, 그리고 낙찰 전략에 대해 분석해 주세요.\n\n`;

    text += `### 1. 기본 사양\n`;
    text += `- 모델명: ${vehicle.model_name}\n`;
    text += `- 연식: ${vehicle.year}년\n`;
    text += `- 연료: ${vehicle.fuel_type}\n`;
    text += `- 변속기: ${vehicle.transmission}\n`;
    text += `- 주행거리: ${vehicle.mileage ? vehicle.mileage.toLocaleString() : '정보 없음'}km\n`;
    text += `- 배기량: ${inspection?.displacement || data?.basic_info?.displacement || '정보 없음'}\n`;
    text += `- 구동방식: ${inspection?.drive_type || data?.basic_info?.drive_type || '정보 없음'}\n`;
    text += `- 위치/보관소: ${vehicle.location} (${vehicle.organization})\n\n`;

    text += `### 2. 경매 및 가격 정보\n`;
    text += `- 현재 상태: ${vehicle.result_status || vehicle.status}\n`;
    text += `- 감정가/예정가: ${formatPrice(vehicle.price)}\n`;
    if (vehicle.min_bid_price) text += `- 최저입찰가: ${formatPrice(vehicle.min_bid_price)}\n`;
    if (vehicle.final_price) text += `- 최종 낙찰가: ${formatPrice(vehicle.final_price)}\n`;
    text += `- 경매 횟수: ${vehicle.auction_count || 0}회\n\n`;

    if (history.length > 0) {
      text += `### 3. 경매 이력 (최근)\n`;
      history.slice(0, 5).forEach(h => {
        text += `- ${h.auction_round || '?'}차: 예정가 ${formatPrice(h.listed_price)} / 최저가 ${formatPrice(h.min_bid_price)} / 결과 ${h.status}${h.final_price ? ` (낙찰가 ${formatPrice(h.final_price)})` : ''}\n`;
      });
      text += `\n`;
    }

    if (data) {
      text += `### 4. 차량 상태 및 점검 요약\n`;
      if (data.special_notes) text += `- 특이사항: ${data.special_notes}\n`;
      if (data.exterior_interior_assessment) text += `- 내외관 평가: ${data.exterior_interior_assessment}\n`;
      if (data.repair_recommendations) text += `- 수리 권장: ${data.repair_recommendations}\n`;
      
      const poorCount = Object.values(data.fluid_conditions || {}).filter(v => v === '하' || v === '불량').length +
                        Object.values(data.mechanical_inspection || {}).flatMap(cat => Object.values(cat)).filter(v => v === '하' || v === '불량').length;
      
      if (poorCount > 0) text += `- 불량/요정비 항목: 총 ${poorCount}개 발견됨\n`;
      
      if (data.insurance_history) {
        text += `- 보험 이력: 총 ${data.insurance_history.count}건 / 누적 보험금 ${formatPrice(data.insurance_history.total_amount)}\n`;
      }
      text += `\n`;
    }

    text += `### 분석 요청 사항\n`;
    text += `1. **유지비 추정**: 이 차량의 연식, 주행거리, 연료 타입을 고려할 때 연간 예상되는 소모품 교체 및 정비 비용은 어느 정도일까요?\n`;
    text += `2. **낙찰 가이드**: 현재 감정가와 경매 이력을 볼 때, 어느 정도 가격대에 낙찰받는 것이 합리적인가요?\n`;
    text += `3. **잠재적 리스크**: 점검 기록과 보험 이력을 바탕으로 구매 후 발생할 수 있는 주요 수리 리스크를 짚어주세요.\n`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('클립보드 복사에 실패했습니다.');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        copied
          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 ring-1 ring-green-500'
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 shadow-sm hover:shadow'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          복사 완료!
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          LLM 분석용 데이터 복사
        </>
      )}
    </button>
  );
}
