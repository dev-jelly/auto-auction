import type { Page } from 'playwright';
import type { InspectionReportData } from '../../types';

const AUTOMART_BASE = 'https://www.automart.co.kr/views/pub_auction/Common';

/**
 * Extract inspection report URL from the detail page.
 * Looks for onclick handlers calling pop_on50('Inspect','GmSpec_Report_us.asp?...',800,800)
 */
export async function extractInspectionUrl(page: Page): Promise<string | null> {
  try {
    const url = await page.evaluate(() => {
      const allElements = document.querySelectorAll('[onclick]');
      for (const el of allElements) {
        const onclick = el.getAttribute('onclick') || '';
        const match = onclick.match(/pop_on50\s*\(\s*'[^']*'\s*,\s*'(GmSpec_Report_us\.asp\?[^']+)'/);
        if (match && match[1]) {
          return match[1];
        }
      }
      // Also check href attributes
      const links = document.querySelectorAll('a[href]');
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        if (href.includes('GmSpec_Report_us.asp')) {
          return href;
        }
      }
      return null;
    });

    if (!url) return null;

    if (url.startsWith('http')) return url;
    return `${AUTOMART_BASE}/${url}`;
  } catch (e) {
    console.log('    Failed to extract inspection URL:', e);
    return null;
  }
}

// Korean part names for body diagram parts A-Q
const BODY_PART_NAMES: Record<string, string> = {
  'A': '후드',
  'B': '프론트 펜더(좌)',
  'C': '프론트 펜더(우)',
  'D': '프론트 도어(좌)',
  'E': '프론트 도어(우)',
  'F': '리어 도어(좌)',
  'G': '리어 도어(우)',
  'H': '사이드 패널(좌)',
  'I': '사이드 패널(우)',
  'J': '트렁크 리드',
  'K': '라디에이터 서포트',
  'L': '루프 패널',
  'M': '플로어',
  'N': '프론트 범퍼',
  'O': '리어 범퍼',
  'P': '프론트 휠(좌)',
  'Q': '프론트 휠(우)',
};

// Condition code mapping from Korean to English keys
const CONDITION_MAP: Record<string, string> = {
  '정상': 'normal',
  '흠집': 'scratch',
  '수리': 'repair',
  '교환': 'replace',
  '도색': 'paint',
};

/**
 * Parse the inspection report page (server-rendered HTML with table layout).
 * Uses page.evaluate() for bulk DOM extraction.
 * All keys use snake_case to match frontend expectations.
 */
export async function parseInspectionReport(page: Page): Promise<InspectionReportData> {
  // Use page.evaluate with a string to avoid esbuild __name injection issues
  // (esbuild injects __name helpers for TS type annotations which don't exist in browser context)
  const rawData = await page.evaluate(`(() => {
    var result = {};

    var findLabelValue = (labelText) => {
      var allCells = document.querySelectorAll('th, td');
      for (var cell of allCells) {
        var text = cell.textContent ? cell.textContent.trim() : '';
        if (text.includes(labelText)) {
          var next = cell.nextElementSibling;
          if (next) return next.textContent ? next.textContent.trim() : '';
        }
      }
      return '';
    };

    // Basic info
    try {
      result.basic_info = {
        manufacturer: findLabelValue('제조사') || findLabelValue('메이커') || undefined,
        model: findLabelValue('차량명') || findLabelValue('차명') || undefined,
        vin: findLabelValue('차대번호') || findLabelValue('VIN') || undefined,
        displacement: findLabelValue('배기량') || undefined,
        color: findLabelValue('색상') || undefined,
        drive_type: findLabelValue('구동방식') || findLabelValue('구동') || undefined,
        year: findLabelValue('연식') || findLabelValue('년식') || undefined,
        mileage: findLabelValue('주행거리') || findLabelValue('주행') || undefined,
        fuel_type: findLabelValue('연료') || findLabelValue('사용연료') || undefined,
        transmission: findLabelValue('변속기') || findLabelValue('변속') || undefined,
        vehicle_type: findLabelValue('차종') || findLabelValue('용도') || undefined,
      };
    } catch (e) {}

    // Accessories
    try {
      var accessories = {};
      var accCells = document.querySelectorAll('td');
      for (var cell of accCells) {
        var text = cell.textContent ? cell.textContent.trim() : '';
        var matches = text.matchAll(/([■□])\\s*([^\\s■□,]+)/g);
        for (var m of matches) {
          var equipped = m[1] === '■';
          var name = m[2].trim();
          if (name && name.length > 0 && name.length < 20) {
            accessories[name] = equipped;
          }
        }
      }
      if (Object.keys(accessories).length > 0) {
        result.accessories = accessories;
      }
    } catch (e) {}

    // Fluid conditions
    try {
      var fluids = {};
      var fluidLabels = [
        ['배터리', 'battery'],
        ['엔진오일', 'engine_oil'],
        ['냉각수', 'coolant'],
        ['파워스티어링오일', 'power_steering_oil'],
        ['파워스티어링', 'power_steering_oil'],
        ['브레이크액', 'brake_fluid'],
        ['워셔액', 'washer_fluid'],
        ['변속기오일', 'transmission_oil'],
        ['변속기 오일', 'transmission_oil'],
      ];
      var fluidCells = document.querySelectorAll('th, td');
      for (var cell of fluidCells) {
        var text = cell.textContent ? cell.textContent.trim() : '';
        for (var pair of fluidLabels) {
          if (text.includes(pair[0])) {
            var next = cell.nextElementSibling;
            var val = next && next.textContent ? next.textContent.trim() : '';
            if (val === '상' || val === '중' || val === '하') {
              fluids[pair[1]] = val;
            }
          }
        }
      }
      if (Object.keys(fluids).length > 0) {
        result.fluid_conditions = fluids;
      }
    } catch (e) {}

    // Mechanical inspection
    try {
      var mechanical = {};
      var categoryLabels = ['엔진', '변속기', '조향', '제동', '전기', '현가장치'];
      var rows = document.querySelectorAll('tr');
      var currentCategory = '';

      for (var row of rows) {
        var cells = row.querySelectorAll('th, td');
        if (cells.length < 2) continue;

        var firstText = cells[0] && cells[0].textContent ? cells[0].textContent.trim() : '';
        for (var cat of categoryLabels) {
          if (firstText.includes(cat)) {
            currentCategory = cat;
            if (!mechanical[currentCategory]) {
              mechanical[currentCategory] = {};
            }
            break;
          }
        }

        if (currentCategory && cells.length >= 2) {
          for (var i = 0; i < cells.length - 1; i++) {
            var label = cells[i] && cells[i].textContent ? cells[i].textContent.trim() : '';
            var value = cells[i + 1] && cells[i + 1].textContent ? cells[i + 1].textContent.trim() : '';
            if ((value === '상' || value === '중' || value === '하') && label.length > 0 && label.length < 30) {
              mechanical[currentCategory][label] = value;
            }
          }
        }
      }

      if (Object.keys(mechanical).length > 0) {
        result.mechanical_inspection = mechanical;
      }
    } catch (e) {}

    // Body diagram
    try {
      var body = {};
      var bodyRows = document.querySelectorAll('tr');
      for (var row of bodyRows) {
        var cells = row.querySelectorAll('td');
        for (var i = 0; i < cells.length - 1; i++) {
          var label = cells[i] && cells[i].textContent ? cells[i].textContent.trim() : '';
          var value = cells[i + 1] && cells[i + 1].textContent ? cells[i + 1].textContent.trim() : '';
          if (/^[A-Q]$/.test(label) && value.length > 0 && value.length < 10) {
            body[label] = value;
          }
        }
      }
      var bodyCells = document.querySelectorAll('td');
      for (var cell of bodyCells) {
        var text = cell.textContent ? cell.textContent.trim() : '';
        var partMatch = text.match(/^([A-Q])$/);
        if (partMatch) {
          var next = cell.nextElementSibling;
          var val = next && next.textContent ? next.textContent.trim() : '';
          if (val.length > 0 && val.length < 10 && !body[partMatch[1]]) {
            body[partMatch[1]] = val;
          }
        }
      }
      if (Object.keys(body).length > 0) {
        result.body_diagram_raw = body;
      }
    } catch (e) {}

    // Text sections
    try {
      var textLabels = [
        ['특이사항', 'special_notes'],
        ['수리', 'repair_recommendations'],
      ];

      var textCells = document.querySelectorAll('th, td');
      for (var cell of textCells) {
        var text = cell.textContent ? cell.textContent.trim() : '';
        for (var pair of textLabels) {
          if (text.includes(pair[0])) {
            var next = cell.nextElementSibling;
            var val = next && next.textContent ? next.textContent.trim() : '';
            if (val.length > 0 && val.length < 2000) {
              result[pair[1]] = val;
            }
            var parentRow = cell.closest('tr');
            if (parentRow) {
              var tds = parentRow.querySelectorAll('td');
              for (var td of tds) {
                var tdText = td.textContent ? td.textContent.trim() : '';
                if (tdText.length > val.length && tdText.length < 2000) {
                  result[pair[1]] = tdText;
                }
              }
            }
          }
        }
      }

      // Exterior/interior combined assessment
      for (var cell of textCells) {
        var text = cell.textContent ? cell.textContent.trim() : '';
        if ((text.includes('외장') || text.includes('내장')) && text.includes('소견')) {
          var next = cell.nextElementSibling;
          var val = next && next.textContent ? next.textContent.trim() : '';
          if (val.length > 0 && val.length < 2000) {
            result.exterior_interior_assessment = val;
          }
          var parentRow = cell.closest('tr');
          if (parentRow) {
            var tds = parentRow.querySelectorAll('td');
            for (var td of tds) {
              var tdText = td.textContent ? td.textContent.trim() : '';
              if (tdText.length > (result.exterior_interior_assessment ? result.exterior_interior_assessment.length : 0) && tdText.length < 2000) {
                result.exterior_interior_assessment = tdText;
              }
            }
          }
        }
      }
    } catch (e) {}

    return result;
  })()`) as any;

  // Post-process body_diagram_raw into { part, condition } objects
  const result: InspectionReportData = {
    ...rawData,
  };

  if ((rawData as any).body_diagram_raw) {
    const bodyRaw = (rawData as any).body_diagram_raw as Record<string, string>;
    const bodyDiagram: Record<string, { part: string; condition: string }> = {};
    for (const [letter, conditionKr] of Object.entries(bodyRaw)) {
      const partName = BODY_PART_NAMES[letter] || letter;
      const condition = CONDITION_MAP[conditionKr] || conditionKr;
      bodyDiagram[letter] = { part: partName, condition };
    }
    result.body_diagram = bodyDiagram;
    delete (result as any).body_diagram_raw;
  }

  return result;
}
