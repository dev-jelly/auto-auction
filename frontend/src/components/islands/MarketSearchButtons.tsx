import type { Vehicle, MarketMappings } from '../../types/vehicle';

// Korean name normalization (English/Korean aliases → canonical Korean)
const MANUFACTURER_KO: Record<string, string> = {
  hyundai: '현대', '현대': '현대',
  kia: '기아', '기아': '기아',
  ssangyong: 'KG모빌리티', 'kg모빌리티': 'KG모빌리티', '쌍용': 'KG모빌리티',
  renault: '르노코리아', renaultsamsung: '르노코리아', '르노삼성': '르노코리아', '르노코리아': '르노코리아',
  chevrolet: '쉐보레', '쉐보레': '쉐보레', 'gm대우': '쉐보레',
  bmw: 'BMW',
  benz: '벤츠', mercedes: '벤츠', 'mercedes-benz': '벤츠', '벤츠': '벤츠',
  audi: '아우디', '아우디': '아우디',
  volkswagen: '폭스바겐', '폭스바겐': '폭스바겐',
  genesis: '제네시스', '제네시스': '제네시스',
  lexus: '렉서스', '렉서스': '렉서스',
  toyota: '토요타', '토요타': '토요타',
  honda: '혼다', '혼다': '혼다',
  volvo: '볼보', '볼보': '볼보',
  porsche: '포르쉐', '포르쉐': '포르쉐',
};

// Manufacturers NOT from Korea → Encar CarType = 'N' (foreign)
const FOREIGN_KO_NAMES = new Set([
  'BMW', '벤츠', '아우디', '폭스바겐', '렉서스', '토요타', '혼다', '닛산',
  '인피니티', '포르쉐', '볼보', '캐딜락', '링컨', '푸조', '시트로엥',
  '피아트', '알파로메오', '마세라티', '페라리', '람보르기니', '재규어', '랜드로버',
]);

// K-Car manufacturer codes
const KCAR_MNUFTR_CODE: Record<string, string> = {
  '현대': '001', '기아': '002', '쉐보레': '003', '르노코리아': '004',
  'KG모빌리티': '006', 'BMW': '012', '벤츠': '013', '아우디': '014',
  '폭스바겐': '015', '제네시스': '016', '렉서스': '018',
};

const ENCAR_FUEL: Record<string, string> = {
  gasoline: '가솔린', 휘발유: '가솔린', 가솔린: '가솔린',
  diesel: '디젤', 경유: '디젤', 디젤: '디젤',
  lpg: 'LPG', LPG: 'LPG',
  hybrid: '하이브리드', 하이브리드: '하이브리드',
  electric: '전기', 전기: '전기',
};

const KCAR_FUEL_CODE: Record<string, string[]> = {
  gasoline: ['001'], 휘발유: ['001'], 가솔린: ['001'],
  diesel: ['002'], 경유: ['002'], 디젤: ['002'],
  lpg: ['003'], LPG: ['003'],
  hybrid: ['006'], 하이브리드: ['006'],
  electric: ['009'], 전기: ['009'],
};

function normalizeManufacturer(mfr?: string, mappings?: MarketMappings | null): string {
  if (!mfr) return '';
  if (mappings) {
    const found = mappings.manufacturers.find(
      (m) => m.internal_name === mfr || m.internal_name === mfr.toLowerCase()
    );
    if (found) return found.korean_name;
  }
  return MANUFACTURER_KO[mfr.toLowerCase()] || MANUFACTURER_KO[mfr] || mfr;
}

function buildEncarUrl(vehicle: Vehicle, mappings?: MarketMappings | null): string {
  const koMfr = normalizeManufacturer(vehicle.manufacturer, mappings);
  
  let modelGroup: string | undefined;
  if (mappings && vehicle.model_name) {
    const modelMapping = mappings.models.find(
      (m) => m.internal_name === vehicle.model_name && m.manufacturer_korean === koMfr
    );
    modelGroup = modelMapping?.encar_model_group;
  }

  let carType: string;
  if (mappings) {
    const mfrMapping = mappings.manufacturers.find((m) => m.korean_name === koMfr);
    carType = mfrMapping?.is_foreign ? 'N' : (FOREIGN_KO_NAMES.has(koMfr) ? 'N' : 'Y');
  } else {
    carType = FOREIGN_KO_NAMES.has(koMfr) ? 'N' : 'Y';
  }

  const clauses: string[] = [`CarType.${carType}.`];
  if (koMfr) clauses.push(`Manufacturer.${koMfr}.`);
  if (modelGroup) clauses.push(`ModelGroup.${modelGroup}.`);

  if (vehicle.year) {
    clauses.push(`Year.range(${vehicle.year - 1}00..${vehicle.year + 1}99).`);
  }
  let encarFuel: string | undefined;
  if (mappings && vehicle.fuel_type) {
    const fuelMapping = mappings.fuel_types.find(
      (f) => f.internal_name === vehicle.fuel_type || f.internal_name === vehicle.fuel_type?.toLowerCase()
    );
    encarFuel = fuelMapping?.encar_name || ENCAR_FUEL[vehicle.fuel_type] || ENCAR_FUEL[vehicle.fuel_type?.toLowerCase()];
  } else {
    encarFuel = ENCAR_FUEL[vehicle.fuel_type] || ENCAR_FUEL[vehicle.fuel_type?.toLowerCase()];
  }
  if (encarFuel) clauses.push(`FuelType.${encarFuel}.`);

  const action = `(And.Hidden.N._.MultiView2Hidden.N._.${clauses.join('_.')})`;


  const searchObj = {
    type: 'car',
    action,
    toggle: {},
    layer: '',
    sort: 'MobileModifiedDate',
    searchQuery: vehicle.model_name?.replace(/\s*\(.*?\)\s*$/g, '').trim() || '',
  };

  return `https://car.encar.com/list/car?page=1&search=${encodeURIComponent(JSON.stringify(searchObj))}`;
}

function buildKcarUrl(vehicle: Vehicle, mappings?: MarketMappings | null): string {
  const cond: Record<string, unknown> = {};

  const koMfr = normalizeManufacturer(vehicle.manufacturer, mappings);
  let mfrCode: string | undefined;
  if (mappings) {
    const mfrMapping = mappings.manufacturers.find((m) => m.korean_name === koMfr && m.kcar_code);
    mfrCode = mfrMapping?.kcar_code || KCAR_MNUFTR_CODE[koMfr];
  } else {
    mfrCode = KCAR_MNUFTR_CODE[koMfr];
  }
  if (mfrCode) cond.wr_eq_mnuftr_cd = mfrCode;

  if (mappings && vehicle.model_name) {
    const modelMapping = mappings.models.find(
      (m) => m.internal_name === vehicle.model_name && m.manufacturer_korean === koMfr
    );
    if (modelMapping?.kcar_model_code) {
      cond.wr_eq_model_grp_cd = modelMapping.kcar_model_code;
    }
  }

  if (vehicle.year) {
    cond.wr_gt_mfg_dt = `${vehicle.year - 1}01`;
    cond.wr_lt_mfg_dt = `${vehicle.year + 1}12`;
  }

  if (vehicle.model_name) {
    let cleanModel = vehicle.model_name.replace(/\s*\(.*?\)\s*$/g, '').trim();
    const koMfr = normalizeManufacturer(vehicle.manufacturer, mappings);
    if (koMfr && cleanModel.includes(koMfr)) {
      cleanModel = cleanModel.replace(koMfr, '').trim();
    }
    if (cleanModel) {
      cond.wr_sh_keyword = cleanModel;
    }
  }

  let fuelCodes: string[] | undefined;
  if (mappings && vehicle.fuel_type) {
    const fuelMapping = mappings.fuel_types.find(
      (f) => f.internal_name === vehicle.fuel_type || f.internal_name === vehicle.fuel_type?.toLowerCase()
    );
    fuelCodes = fuelMapping?.kcar_code ? [fuelMapping.kcar_code] : (KCAR_FUEL_CODE[vehicle.fuel_type] || KCAR_FUEL_CODE[vehicle.fuel_type?.toLowerCase()]);
  } else {
    fuelCodes = KCAR_FUEL_CODE[vehicle.fuel_type] || KCAR_FUEL_CODE[vehicle.fuel_type?.toLowerCase()];
  }
  if (fuelCodes?.length) cond.wr_in_fuel_cd = fuelCodes;

  return `https://www.kcar.com/bc/search?searchCond=${encodeURIComponent(JSON.stringify(cond))}`;
}

export default function MarketSearchButtons({ vehicle, mappings }: { vehicle: Vehicle; mappings?: MarketMappings | null }) {
  const encarUrl = buildEncarUrl(vehicle, mappings);
  const kcarUrl = buildKcarUrl(vehicle, mappings);

  return (
    <>
      <a
        href={encarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary inline-flex items-center gap-2"
        title="엔카에서 유사 차량 검색"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        엔카 검색
      </a>
      <a
        href={kcarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary inline-flex items-center gap-2"
        title="케이카에서 유사 차량 검색"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        케이카 검색
      </a>
    </>
  );
}
