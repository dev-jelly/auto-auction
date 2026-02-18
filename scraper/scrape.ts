import { chromium, Page } from 'playwright';
import fs from 'fs';

interface Vehicle {
  mgmtNumber: string;      // 관리번호 (예: 2026-6)
  carNumber: string;       // 차량번호 (예: XXX0337)
  fuelType: string;        // 연료 (경유, 휘발유, 전기 등)
  modelName: string;       // 모델명
  organization: string;    // 진행기관
  location: string;        // 보관소
  year: number | null;     // 연식
  transmission: string;    // 변속기
  price: number | null;    // 예정가 (원)
  bidDeadline: string;     // 입찰신청 마감일시
  resultDate: string;      // 매각발표일
  status: string;          // 상태
  detailUrl: string;       // 상세 페이지 URL
  scrapedAt: string;       // 수집 시각
}

function parseKoreanDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // Format: "MM/DD (HH:mm)" or "MM/DD(HH:mm)" — no year, infer current
  const shortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s*\((\d{2}):(\d{2})\)/);
  if (shortMatch) {
    const [, mm, dd, hh, mi] = shortMatch;
    const year = new Date().getFullYear();
    // Handle "24:00" as next day "00:00"
    if (hh === '24') {
      const date = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10) + 1);
      const m2 = String(date.getMonth() + 1).padStart(2, '0');
      const d2 = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${m2}-${d2}T00:${mi}:00+09:00`;
    }
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh}:${mi}:00+09:00`;
  }

  // Format: "YYYY.MM.DD HH:mm" or "YYYY-MM-DD" or "YYYY.MM.DD"
  const normalized = trimmed.replace(/\./g, '-');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    const h = hour || '00';
    const m = minute || '00';
    return `${year}-${month}-${day}T${h}:${m}:00+09:00`;
  }

  // Return empty string for unparseable dates to avoid backend errors
  return '';
}

async function submitToAPI(vehicles: Vehicle[], apiUrl: string): Promise<{ submitted: number; failed: number }> {
  let submitted = 0;
  let failed = 0;
  const total = vehicles.length;

  for (const vehicle of vehicles) {
    const payload = {
      mgmt_number: vehicle.mgmtNumber,
      car_number: vehicle.carNumber,
      model_name: vehicle.modelName,
      fuel_type: vehicle.fuelType,
      due_date: parseKoreanDate(vehicle.bidDeadline),
      detail_url: vehicle.detailUrl,
      organization: vehicle.organization,
      location: vehicle.location,
      year: vehicle.year,
      price: vehicle.price,
      transmission: vehicle.transmission,
      status: vehicle.status,
    };

    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(`${apiUrl}/api/vehicles/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        success = true;
        break;
      } catch (err) {
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 500; // 1s, 2s
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`  Failed to submit ${vehicle.mgmtNumber} after 3 attempts:`, err);
        }
      }
    }

    if (success) {
      submitted++;
      console.log(`  Submitted ${submitted}/${total}: ${vehicle.mgmtNumber} - ${vehicle.modelName}`);
    } else {
      failed++;
    }
  }

  return { submitted, failed };
}

async function parseVehicleRow(row: any): Promise<Vehicle | null> {
  try {
    const cells = await row.$$(':scope > td');
    if (cells.length < 15) return null;

    // 셀 텍스트 추출
    const getCellText = async (index: number): Promise<string> => {
      if (index >= cells.length) return '';
      return (await cells[index].innerText()).trim();
    };

    // 순번 확인 (숫자가 아니면 스킵)
    const noText = await getCellText(0);
    if (!/^\d+$/.test(noText)) return null;

    // 차량번호 + 연료 + 모델명 파싱 (인덱스 2)
    const carInfoText = await getCellText(2);
    const carInfoLines = carInfoText.split('\n').map(s => s.trim());

    // 첫 줄: "XXX0337 (경유)" 형태
    const firstLine = carInfoLines[0] || '';
    const carNumberMatch = firstLine.match(/^([A-Z0-9]+)\s*\(([^)]+)\)/);
    const carNumber = carNumberMatch ? carNumberMatch[1] : firstLine.replace(/\s*\([^)]+\)/, '').trim();
    const fuelType = carNumberMatch ? carNumberMatch[2] : '';

    // 둘째 줄: 모델명
    const modelName = carInfoLines[1] || '';

    // 진행기관 + 보관소 (인덱스 4)
    const orgInfoText = await getCellText(4);
    const orgInfoLines = orgInfoText.split('\n').map(s => s.trim());
    const organization = orgInfoLines[0] || '';
    const location = orgInfoLines[1] || '';

    // 관리번호 (인덱스 6)
    const mgmtNumber = await getCellText(6);

    // 연식 + 변속기 (인덱스 8)
    const yearTransText = await getCellText(8);
    const yearTransLines = yearTransText.split('\n').map(s => s.trim());
    const yearStr = yearTransLines[0] || '';
    const year = yearStr ? parseInt(yearStr, 10) : null;
    const transmission = yearTransLines[1] || '';

    // 예정가 (인덱스 10)
    const priceText = await getCellText(10);
    const priceMatch = priceText.replace(/,/g, '').match(/(\d+)/);
    const price = priceMatch ? parseInt(priceMatch[1], 10) : null;

    // 입찰신청 마감일시 (인덱스 12)
    const bidDeadline = (await getCellText(12)).replace(/\n/g, ' ');

    // 매각발표일 (인덱스 14)
    const resultDate = (await getCellText(14)).replace(/\n/g, ' ');

    // 상세 페이지 URL 추출 시도
    let detailUrl = '';
    try {
      const linkElement = await row.$('a[href*="gfnCarInfo"], a[onclick*="gfnCarInfo"]');
      if (linkElement) {
        const onclick = await linkElement.getAttribute('onclick');
        if (onclick) {
          // onclick="gfnCarInfo('2026-6')" 형태에서 추출
          detailUrl = `https://www.automart.co.kr/views/pub_auction/Pop_CarInfo.asp?m_No=${mgmtNumber}`;
        }
      }
    } catch (e) {
      // URL 추출 실패해도 계속 진행
    }

    return {
      mgmtNumber,
      carNumber,
      fuelType,
      modelName,
      organization,
      location,
      year,
      transmission,
      price,
      bidDeadline,
      resultDate,
      status: '입찰중',
      detailUrl,
      scrapedAt: new Date().toISOString()
    };
  } catch (e) {
    console.error('Error parsing row:', e);
    return null;
  }
}

async function scrapeVehicles(page: Page, maxPages: number = 10): Promise<Vehicle[]> {
  const vehicles: Vehicle[] = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    console.log(`Processing page ${pageNum}...`);

    if (pageNum > 1) {
      try {
        // 페이지 이동 함수 호출
        await page.evaluate((pn) => {
          // @ts-ignore
          if (typeof gfnpagemove === 'function') {
            // @ts-ignore
            gfnpagemove(pn.toString());
          }
        }, pageNum);

        // 페이지 로딩 대기
        await page.waitForTimeout(2000);
        await page.waitForLoadState('domcontentloaded');
      } catch (e) {
        console.log(`Error navigating to page ${pageNum}:`, e);
        break;
      }
    }

    // 관리번호 패턴으로 차량 행 찾기
    const mgmtCells = await page.$$('td');
    const processedRows = new Set<string>();

    for (const cell of mgmtCells) {
      const text = await cell.innerText();
      const trimmedText = text.trim();

      // 관리번호 패턴 확인 (2026-숫자)
      if (!/^2026-\d{1,3}$/.test(trimmedText)) continue;
      if (processedRows.has(trimmedText)) continue;

      // 부모 TR 찾기
      let row = await cell.evaluateHandle((el) => {
        let current = el.parentElement;
        while (current && current.tagName !== 'TR') {
          current = current.parentElement;
        }
        return current;
      });

      if (row) {
        const vehicle = await parseVehicleRow(row);
        if (vehicle && vehicle.mgmtNumber) {
          vehicles.push(vehicle);
          processedRows.add(vehicle.mgmtNumber);
          console.log(`  Found: ${vehicle.mgmtNumber} - ${vehicle.modelName} (${vehicle.price?.toLocaleString()}원)`);
        }
      }
    }

    console.log(`Page ${pageNum}: ${processedRows.size} vehicles found`);

    // 다음 페이지가 없으면 종료
    if (processedRows.size === 0) {
      console.log('No more vehicles found, stopping.');
      break;
    }
  }

  return vehicles;
}

async function main() {
  const apiUrl = process.env.API_URL || 'http://auto-auction-api:8080';
  const maxPages = parseInt(process.env.SCRAPE_MAX_PAGES || '10', 10);

  console.log('Starting Automart scraper...');
  console.log(`API URL: ${apiUrl}`);
  console.log(`Max pages: ${maxPages}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ko-KR'
  });
  const page = await context.newPage();

  try {
    // 초기 페이지 로드
    console.log('Loading initial page...');
    await page.goto('https://www.automart.co.kr/views/pub_auction/Search_Main.asp?tmode=1&window=ok', {
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);

    // 차량 수집
    const vehicles = await scrapeVehicles(page, maxPages);

    // 중복 제거
    const uniqueVehicles = Array.from(
      new Map(vehicles.map(v => [v.mgmtNumber, v])).values()
    );

    // 결과 저장 (backup)
    const outputPath = 'vehicles.json';
    fs.writeFileSync(outputPath, JSON.stringify(uniqueVehicles, null, 2));
    console.log(`\nTotal: ${uniqueVehicles.length} unique vehicles saved to ${outputPath}`);

    // API로 제출
    console.log(`\nSubmitting ${uniqueVehicles.length} vehicles to API at ${apiUrl}...`);
    const { submitted, failed } = await submitToAPI(uniqueVehicles, apiUrl);

    console.log(`\nCompleted: ${uniqueVehicles.length} scraped, ${submitted} submitted, ${failed} failed`);

    if (uniqueVehicles.length > 0 && submitted === 0) {
      console.error('All submissions failed');
      process.exit(1);
    }

  } catch (e) {
    console.error('Scraper error:', e);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
