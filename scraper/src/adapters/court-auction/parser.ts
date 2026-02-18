import type { AuctionItem } from '../../types';
import { AuctionSource } from '../../types';
import { parseKoreanDate } from '../../utils/dates';

export async function parseCourtAuctionRow(row: any): Promise<AuctionItem | null> {
  try {
    const cells = await row.$$(':scope > td');
    if (cells.length < 6) return null;

    const getCellText = async (index: number): Promise<string> => {
      if (index >= cells.length) return '';
      return (await cells[index].innerText()).trim();
    };

    // Court auction tables typically have:
    // 사건번호 | 물건정보 | 감정가/최저가 | 매각기일 | 상태 | 법원
    const caseNumber = await getCellText(0);
    if (!caseNumber || caseNumber === '사건번호') return null;

    const propertyInfo = await getCellText(1);
    const propertyLines = propertyInfo.split('\n').map((s: string) => s.trim());
    const modelName = propertyLines[0] || '';
    const location = propertyLines[1] || '';

    const priceInfo = await getCellText(2);
    const priceLines = priceInfo.split('\n').map((s: string) => s.trim());
    const priceStr = priceLines[0] || '';
    const minPriceStr = priceLines[1] || '';

    const parsePrice = (text: string): number | undefined => {
      const match = text.replace(/,/g, '').match(/(\d+)/);
      return match ? parseInt(match[1], 10) : undefined;
    };

    const saleDateStr = await getCellText(3);
    const statusText = await getCellText(4);
    const courtName = await getCellText(5);

    const sourceId = `court:${caseNumber}`;

    let status = '입찰중';
    let resultStatus: string | undefined;
    let finalPrice: number | undefined;

    if (statusText.includes('매각')) {
      status = '매각';
      resultStatus = '매각';
      // Try to extract final price from status cell
      const fpMatch = statusText.replace(/,/g, '').match(/(\d+)/);
      if (fpMatch) finalPrice = parseInt(fpMatch[1], 10);
    } else if (statusText.includes('유찰')) {
      status = '유찰';
      resultStatus = '유찰';
    } else if (statusText.includes('취하') || statusText.includes('취소')) {
      status = '취소';
    }

    return {
      sourceId,
      source: AuctionSource.COURT_AUCTION,
      mgmtNumber: caseNumber,
      modelName,
      location,
      price: parsePrice(priceStr),
      minBidPrice: parsePrice(minPriceStr),
      bidDeadline: parseKoreanDate(saleDateStr),
      status,
      resultStatus,
      finalPrice,
      caseNumber,
      courtName,
      propertyType: '자동차',
      scrapedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error('Error parsing court auction row:', e);
    return null;
  }
}
