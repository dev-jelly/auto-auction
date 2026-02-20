import type { AuctionItem } from '../../types';
import { AuctionSource } from '../../types';

const VEHICLE_KEYWORDS = [
  '자동차', '차량', '승용', '화물', '트럭', 'SUV', '세단',
  '승합', '버스', '밴', '오토바이', '이륜', '덤프', '특수차',
  '레커', '지게차', '굴삭기',
];

const STATUS_MAP: Record<string, string> = {
  '공매중': '입찰중',
  '입찰중': '입찰중',
  '매각': '매각',
  '유찰': '유찰',
  '취소': '취소',
  '중지': '중지',
};

export function extractXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

export function extractXmlItems(xml: string): string[] {
  const items: string[] = [];
  const regex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

function parseAmount(val: string): number | undefined {
  if (!val) return undefined;
  const n = parseInt(val.replace(/,/g, ''), 10);
  return isNaN(n) ? undefined : n;
}

function parseYear(val: string): number | undefined {
  if (!val) return undefined;
  const s = val.replace(/[^0-9]/g, '');
  if (s.length < 4) return undefined;
  const y = parseInt(s.substring(0, 4), 10);
  return y > 1900 && y <= new Date().getFullYear() + 1 ? y : undefined;
}

function parseDatetime(val: string): string | undefined {
  if (!val) return undefined;
  const s = val.replace(/[^0-9]/g, '');
  // YYYYMMDDHHmmss or YYYYMMDD
  if (s.length >= 14) {
    const year = s.substring(0, 4);
    const month = s.substring(4, 6);
    const day = s.substring(6, 8);
    const hour = s.substring(8, 10);
    const min = s.substring(10, 12);
    const sec = s.substring(12, 14);
    return `${year}-${month}-${day}T${hour}:${min}:${sec}+09:00`;
  }
  if (s.length >= 8) {
    const year = s.substring(0, 4);
    const month = s.substring(4, 6);
    const day = s.substring(6, 8);
    return `${year}-${month}-${day}T00:00:00+09:00`;
  }
  return undefined;
}

function isVehicleItem(itemXml: string): boolean {
  const cltrNm = extractXmlValue(itemXml, 'CLTR_NM');
  const manf = extractXmlValue(itemXml, 'MANF');
  const mdl = extractXmlValue(itemXml, 'MDL');

  if (manf || mdl) return true;

  const nameLower = cltrNm.toLowerCase();
  return VEHICLE_KEYWORDS.some(keyword => nameLower.includes(keyword.toLowerCase()));
}

function mapStatus(statusNm: string): string {
  for (const [key, value] of Object.entries(STATUS_MAP)) {
    if (statusNm.includes(key)) return value;
  }
  return statusNm || '알수없음';
}

export function parseOnbidItem(itemXml: string): AuctionItem | null {
  try {
    if (!isVehicleItem(itemXml)) return null;

    const plnmNo = extractXmlValue(itemXml, 'PLNM_NO');
    const pbctNo = extractXmlValue(itemXml, 'PBCT_NO');
    const cltrMnmtNo = extractXmlValue(itemXml, 'CLTR_MNMT_NO');

    if (!plnmNo) return null;

    const cltrNm = extractXmlValue(itemXml, 'CLTR_NM');
    const mdl = extractXmlValue(itemXml, 'MDL');
    const manf = extractXmlValue(itemXml, 'MANF');
    const nrgt = extractXmlValue(itemXml, 'NRGT');
    const vhclMlge = extractXmlValue(itemXml, 'VHCL_MLGE');
    const fuel = extractXmlValue(itemXml, 'FUEL');
    const grbx = extractXmlValue(itemXml, 'GRBX');
    const apslAsesAvgAmt = extractXmlValue(itemXml, 'APSL_ASES_AVG_AMT');
    const minBidPrc = extractXmlValue(itemXml, 'MIN_BID_PRC');
    const endpc = extractXmlValue(itemXml, 'ENDPC');
    const pbctBegnDtm = extractXmlValue(itemXml, 'PBCT_BEGN_DTM');
    const pbctClsDtm = extractXmlValue(itemXml, 'PBCT_CLS_DTM');
    const pbctCltrStatNm = extractXmlValue(itemXml, 'PBCT_CLTR_STAT_NM');
    const ldnmAdrs = extractXmlValue(itemXml, 'LDNM_ADRS');
    const nmrdAdrs = extractXmlValue(itemXml, 'NMRD_ADRS');
    const orgNm = extractXmlValue(itemXml, 'ORG_NM');

    const sourceId = `onbid:${plnmNo}-${pbctNo}-${cltrMnmtNo}`;

    return {
      sourceId,
      source: AuctionSource.ONBID,
      mgmtNumber: cltrMnmtNo || plnmNo,
      modelName: mdl || cltrNm || undefined,
      manufacturer: manf || undefined,
      year: parseYear(nrgt),
      mileage: parseAmount(vhclMlge),
      fuelType: fuel || undefined,
      transmission: grbx || undefined,
      price: parseAmount(apslAsesAvgAmt),
      minBidPrice: parseAmount(minBidPrc),
      // endpc is engine displacement, not stored as a separate field on AuctionItem
      bidDeadline: parseDatetime(pbctClsDtm),
      status: mapStatus(pbctCltrStatNm),
      location: nmrdAdrs || ldnmAdrs || undefined,
      organization: orgNm || undefined,
      propertyType: '자동차',
      scrapedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error('Error parsing onbid item:', e);
    return null;
  }
}

export function parseOnbidResponse(xml: string): { items: AuctionItem[]; totalCount: number } {
  const totalCountStr = extractXmlValue(xml, 'totalCount');
  const totalCount = parseInt(totalCountStr, 10) || 0;

  const rawItems = extractXmlItems(xml);
  const items: AuctionItem[] = [];

  for (const rawItem of rawItems) {
    const item = parseOnbidItem(rawItem);
    if (item) {
      items.push(item);
    }
  }

  return { items, totalCount };
}
