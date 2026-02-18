import { AuctionItem, InspectionReport } from '../types';
import { parseKoreanDate } from './dates';

export interface SubmitResult {
  submitted: number;
  failed: number;
}

export async function submitToAPI(items: AuctionItem[], apiUrl: string): Promise<SubmitResult> {
  let submitted = 0;
  let failed = 0;
  const total = items.length;

  for (const item of items) {
    const payload = {
      mgmt_number: item.mgmtNumber || item.sourceId,
      car_number: item.carNumber,
      model_name: item.modelName,
      fuel_type: item.fuelType,
      transmission: item.transmission,
      year: item.year,
      mileage: item.mileage,
      price: item.price,
      min_bid_price: item.minBidPrice,
      due_date: item.bidDeadline ? parseKoreanDate(item.bidDeadline) : undefined,
      auction_count: item.auctionCount,
      status: item.status,
      image_urls: item.imageUrls,
      detail_url: item.detailUrl,
      organization: item.organization,
      location: item.location,
      source: item.source,
      source_id: item.sourceId,
      final_price: item.finalPrice,
      result_status: item.resultStatus,
      result_date: item.resultDate ? parseKoreanDate(item.resultDate) : undefined,
      case_number: item.caseNumber,
      court_name: item.courtName,
      property_type: item.propertyType,
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
          console.error(`  Failed to submit ${item.sourceId} after 3 attempts:`, err);
        }
      }
    }

    if (success) {
      submitted++;
      const displayName = item.modelName || item.mgmtNumber || item.sourceId;
      console.log(`  Submitted ${submitted}/${total}: ${item.sourceId} - ${displayName}`);
    } else {
      failed++;
    }
  }

  return { submitted, failed };
}

export async function submitInspectionReports(reports: InspectionReport[], apiUrl: string): Promise<SubmitResult> {
  let submitted = 0;
  let failed = 0;
  const total = reports.length;

  for (const report of reports) {
    const payload = {
      vehicle_source_id: report.vehicleSourceId,
      report_url: report.reportUrl,
      report_data: report.data,
    };

    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(`${apiUrl}/api/vehicles/inspection/upsert`, {
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
          const delay = Math.pow(2, attempt) * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`  Failed to submit inspection for ${report.mgmtNumber} after 3 attempts:`, err);
        }
      }
    }

    if (success) {
      submitted++;
      console.log(`  Submitted inspection ${submitted}/${total}: ${report.mgmtNumber}`);
    } else {
      failed++;
    }
  }

  return { submitted, failed };
}
