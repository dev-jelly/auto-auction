import type { ElementHandle } from 'playwright';
import { AuctionItem, AuctionSource } from '../../types';

interface ParsedVehicleData {
  mgmtNumber: string;
  carNumber: string;
  fuelType: string;
  modelName: string;
  organization: string;
  location: string;
  year: number | null;
  transmission: string;
  price: number | null;
  bidDeadline: string;
  resultDate: string;
  status: string;
  detailUrl: string;
  finalPrice?: number;
  resultStatus?: string;
}

async function getCellText(cells: ElementHandle[], index: number): Promise<string> {
  if (index >= cells.length) return '';
  return (await cells[index].innerText()).trim();
}

function parsePrice(priceText: string): number | null {
  if (!priceText) return null;
  const match = priceText.replace(/,/g, '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract the detail page URL from a listing row.
 * Tries href containing p_NotNo first, then falls back to onclick parsing.
 */
async function extractDetailUrl(row: ElementHandle): Promise<string> {
  try {
    // Primary: find <a href="...p_NotNo=..."> in the row
    const detailLink = await row.$('a[href*="p_NotNo"]');
    if (detailLink) {
      const href = await detailLink.getAttribute('href');
      if (href) {
        return href.startsWith('http')
          ? href
          : `https://www.automart.co.kr${href.startsWith('/') ? '' : '/'}${href}`;
      }
    }

    // Fallback: parse onclick="gfnCarInfo('NOTICE_NO', 'CAR_NO', ...)"
    const onclickLink = await row.$('a[onclick*="gfnCarInfo"]');
    if (onclickLink) {
      const onclick = await onclickLink.getAttribute('onclick');
      if (onclick) {
        const argsMatch = onclick.match(/gfnCarInfo\s*\(\s*'([^']+)'\s*,\s*'([^']+)'/);
        if (argsMatch) {
          const noticeNo = argsMatch[1];
          const carNo = argsMatch[2];
          return `https://www.automart.co.kr/views/pub_auction/Common/CarDetail_in.asp?p_sel=0&bidtype=1&p_NotNo=${noticeNo}&p_Code=1&p_CarNo=${carNo}&window=ok`;
        }
      }
    }
  } catch {
    // URL extraction failed - proceed without detail URL
  }
  return '';
}

/**
 * Parse a vehicle row from Automart listing table
 */
export async function parseVehicleRow(
  row: ElementHandle,
  isCompleted: boolean = false
): Promise<ParsedVehicleData | null> {
  try {
    const cells = await row.$$(':scope > td');
    if (cells.length < 15) return null;

    const noText = await getCellText(cells, 0);
    if (!/^\d+$/.test(noText)) return null;

    // 차량번호 + 연료 + 모델명 (인덱스 2)
    const carInfoText = await getCellText(cells, 2);
    const carInfoLines = carInfoText.split('\n').map(s => s.trim());
    const firstLine = carInfoLines[0] || '';
    const carNumberMatch = firstLine.match(/^([A-Z0-9]+)\s*\(([^)]+)\)/);
    const carNumber = carNumberMatch ? carNumberMatch[1] : firstLine.replace(/\s*\([^)]+\)/, '').trim();
    const fuelType = carNumberMatch ? carNumberMatch[2] : '';
    const modelName = carInfoLines[1] || '';

    // 진행기관 + 보관소 (인덱스 4)
    const orgInfoText = await getCellText(cells, 4);
    const orgInfoLines = orgInfoText.split('\n').map(s => s.trim());
    const organization = orgInfoLines[0] || '';
    const location = orgInfoLines[1] || '';

    // 관리번호 (인덱스 6)
    const mgmtNumber = await getCellText(cells, 6);

    // 연식 + 변속기 (인덱스 8)
    const yearTransText = await getCellText(cells, 8);
    const yearTransLines = yearTransText.split('\n').map(s => s.trim());
    const year = yearTransLines[0] ? parseInt(yearTransLines[0], 10) : null;
    const transmission = yearTransLines[1] || '';

    // 예정가 (인덱스 10)
    const price = parsePrice(await getCellText(cells, 10));

    // 입찰신청 마감일시 (인덱스 12)
    const bidDeadline = (await getCellText(cells, 12)).replace(/\n/g, ' ');

    // 매각발표일 (인덱스 14)
    const resultDate = (await getCellText(cells, 14)).replace(/\n/g, ' ');

    // 상세 페이지 URL (notice number 기반)
    const detailUrl = await extractDetailUrl(row);

    let status = '입찰중';
    let resultStatus: string | undefined;
    let finalPrice: number | undefined;

    if (isCompleted) {
      const statusText = await getCellText(cells, 3);
      if (statusText.includes('유찰')) {
        status = '유찰';
        resultStatus = '유찰';
      } else {
        status = '매각';
        resultStatus = '매각';
        finalPrice = price || undefined;
      }
    }

    return {
      mgmtNumber, carNumber, fuelType, modelName, organization, location,
      year, transmission, price, bidDeadline, resultDate, status, detailUrl,
      finalPrice, resultStatus,
    };
  } catch (e) {
    console.error('Error parsing row:', e);
    return null;
  }
}

/**
 * Convert parsed data to AuctionItem
 */
export function toAuctionItem(data: ParsedVehicleData): AuctionItem {
  const uniqueKey = data.carNumber
    ? `${data.mgmtNumber}:${data.carNumber}`
    : data.mgmtNumber;
  return {
    sourceId: `automart:${uniqueKey}`,
    source: AuctionSource.AUTOMART,
    mgmtNumber: data.mgmtNumber,
    carNumber: data.carNumber,
    modelName: data.modelName,
    fuelType: data.fuelType,
    transmission: data.transmission,
    year: data.year || undefined,
    price: data.price || undefined,
    bidDeadline: data.bidDeadline,
    resultDate: data.resultDate,
    status: data.status,
    location: data.location,
    organization: data.organization,
    detailUrl: data.detailUrl,
    finalPrice: data.finalPrice,
    resultStatus: data.resultStatus,
    scrapedAt: new Date().toISOString(),
  };
}
