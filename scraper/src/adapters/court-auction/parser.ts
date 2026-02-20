import type { AuctionItem } from '../../types';
import { AuctionSource } from '../../types';

// Actual fuel code values from courtauction.go.kr API
const FUEL_TYPE_MAP: Record<string, string> = {
  '0001001': '휘발유',
  '0001002': '경유',
  '0001003': 'LPG',
  '0001004': '전기',
  '0001005': '하이브리드',
  '0001006': 'CNG',
  '0001007': '수소',
};

// Transmission codes
const TRANSMISSION_MAP: Record<string, string> = {
  '0001101': '자동',
  '0001102': '수동',
  '0001103': '세미오토',
};

function parseAmount(val: any): number | undefined {
  if (!val) return undefined;
  const n = parseInt(String(val).replace(/,/g, ''), 10);
  return isNaN(n) || n === 0 ? undefined : n;
}

function parseYear(val: any): number | undefined {
  if (!val) return undefined;
  const s = String(val).replace(/[^0-9]/g, '').substring(0, 4);
  const y = parseInt(s, 10);
  return y > 1900 && y <= new Date().getFullYear() + 1 ? y : undefined;
}

function parseMaeGiil(val: any): string | undefined {
  // Format: "YYYYMMDD"
  if (!val) return undefined;
  const s = String(val).trim();
  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return undefined;
  return `${m[1]}-${m[2]}-${m[3]}T10:00:00Z`;
}

export function parseCourtAuctionResult(row: any): AuctionItem | null {
  try {
    if (!row) return null;

    const caseNumber = String(row.srnSaNo || '').trim();
    if (!caseNumber) return null;

    const itemSeq = String(row.maemulSer || '1').trim();
    const sourceId = `court:${caseNumber}:${itemSeq}`;

    // Car name: prefer carNm, fall back to buldNm
    const modelName = String(row.carNm || row.buldNm || '').trim();
    const manufacturer = String(row.jejosaNm || '').trim() || undefined;

    // Fuel type & transmission
    const fuelCode = String(row.fuelKindcd || '').trim();
    const fuelType = FUEL_TYPE_MAP[fuelCode] || undefined;

    const transCode = String(row.bsgFormCd || '').trim();
    const transmission = TRANSMISSION_MAP[transCode] || undefined;

    const year = parseYear(row.carYrtype);
    const price = parseAmount(row.gamevalAmt);
    const minBidPrice = parseAmount(row.notifyMinmaePrice1) || parseAmount(row.minmaePrice);
    const bidDeadline = parseMaeGiil(row.maeGiil);

    // Location: printSt has the full address
    const location = String(row.printSt || '').replace(/^사용본거지\s*:\s*/, '').trim();
    const courtName = String(row.jiwonNm || '').trim();
    const department = String(row.jpDeptNm || '').trim();
    const organization = department ? `${courtName} ${department}` : courtName;

    // Status: maeAmt > 0 = sold, yuchalCnt > 0 = had failed bids
    const yuchalCnt = parseInt(String(row.yuchalCnt || '0'), 10);
    const maeAmt = parseAmount(row.maeAmt);

    let status = '입찰중';
    let resultStatus: string | undefined;
    let finalPrice: number | undefined;
    let auctionCount: number | undefined;

    if (maeAmt && maeAmt > 0) {
      status = '매각';
      resultStatus = '매각';
      finalPrice = maeAmt;
    } else if (yuchalCnt > 0) {
      // Had failed bids but still active
      status = '입찰중';
      auctionCount = yuchalCnt;
    }

    // Detail URL using the WebSquare XML path
    const detailUrl = `https://www.courtauction.go.kr/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ154M03.xml&srnSaNo=${encodeURIComponent(caseNumber)}&maemulSer=${itemSeq}`;

    return {
      sourceId,
      source: AuctionSource.COURT_AUCTION,
      mgmtNumber: caseNumber,
      modelName: modelName || `법원경매 ${caseNumber}`,
      manufacturer: manufacturer || undefined,
      fuelType,
      transmission,
      year,
      price: price ?? minBidPrice,
      minBidPrice,
      finalPrice,
      bidDeadline,
      auctionCount,
      status,
      resultStatus,
      location,
      organization,
      caseNumber,
      courtName,
      propertyType: '자동차',
      detailUrl,
      scrapedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error('Error parsing court auction result:', e);
    return null;
  }
}
