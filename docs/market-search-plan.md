# Market Search Buttons — Implementation Plan

## Goal

Add "Search on Encar" and "Search on K-Car" buttons to the vehicle detail page.
Each button opens the external site pre-filtered by manufacturer, model, year, and fuel type.

---

## Verified URL Templates

### Encar

```
https://car.encar.com/list/car?q=(And.Manufacturer.현대._.ModelGroup.쏘나타._.Year.range(2020..2023)._.FuelType.가솔린.)
```

DSL syntax rules:
- Each filter clause: `FilterName.Value.`
- Joined with `._. ` between clauses
- Whole expression wrapped in `(And. ... )`
- Optional clauses can be omitted if data is unavailable

### K-Car

```
https://www.kcar.com/bc/search?searchCond=<URL-encoded JSON>
```

JSON parameters:
| Key | Value type | Example | Description |
|-----|-----------|---------|-------------|
| `wr_eq_mnuftr_cd` | string | `"001"` | Manufacturer code |
| `wr_eq_model_grp_cd` | string | `"22"` | Model group code (optional — requires API lookup) |
| `wr_gt_mfg_dt` | string | `"202001"` | Min manufacture date (YYYYMM) |
| `wr_lt_mfg_dt` | string | `"202312"` | Max manufacture date (YYYYMM) |
| `wr_in_fuel_cd` | string[] | `["001"]` | Fuel type codes (array) |

K-Car public lookup APIs (for future model code lookup):
- `POST https://api.kcar.com/bc/search/group/mnuftr` → manufacturer list + codes
- `POST https://api.kcar.com/bc/search/group/modelGrp` → model group codes

---

## Data Mappings

### Fuel Type

| Stored value | Encar | K-Car code |
|-------------|-------|-----------|
| gasoline / 휘발유 / 가솔린 | 가솔린 | 001 |
| diesel / 경유 | 디젤 | 002 |
| lpg / LPG | LPG | 003 |
| hybrid / 하이브리드 | 하이브리드 | 006 |
| electric / 전기 | 전기 | 009 |

### Manufacturer (K-Car codes)

| Korean name | K-Car code |
|------------|-----------|
| 현대 | 001 |
| 기아 | 002 |
| 쉐보레 / GM대우 | 003 |
| 르노삼성 / 르노코리아 | 004 |
| 쌍용 / KG모빌리티 | 006 |
| BMW | 012 |
| 벤츠 | 013 |
| 아우디 | 014 |
| 폭스바겐 | 015 |

### Manufacturer name normalization (English → Korean for Encar)

| Stored value | Korean display |
|-------------|---------------|
| hyundai | 현대 |
| kia | 기아 |
| ssangyong | KG모빌리티 |
| renault / renaultsamsug | 르노코리아 |
| chevrolet | 쉐보레 |
| bmw | BMW |
| benz / mercedes | 벤츠 |
| audi | 아우디 |
| volkswagen | 폭스바겐 |

---

## Year Range Strategy

Use `vehicle.year ± 1` for a 3-year window:
- Encar: `Year.range(${year-1}..${year+1})`
- K-Car: `wr_gt_mfg_dt: "${year-1}01"`, `wr_lt_mfg_dt: "${year+1}12"`

---

## Implementation Steps

### 1. Create `MarketSearchButtons.tsx`

File: `frontend/src/components/islands/MarketSearchButtons.tsx`

- Pure functional component (no state needed)
- Accepts `vehicle: Vehicle` prop
- Exports two `<a>` elements styled as secondary buttons
- Builds Encar URL: `(And.{Manufacturer}.{ModelGroup}.Year.range.FuelType.)`
- Builds K-Car URL: JSON searchCond with year range + fuel + manufacturer code

### 2. Modify `VehicleDetail.tsx`

Import `MarketSearchButtons` and add after `CopyToLLMButton` in the button row (line ~476).

---

## Encar URL Construction Logic

```typescript
function buildEncarUrl(vehicle: Vehicle): string {
  const clauses: string[] = [];
  const mfr = normalizeManufacturer(vehicle.manufacturer);
  if (mfr) clauses.push(`Manufacturer.${mfr}.`);
  const model = extractModelName(vehicle.model_name);
  if (model) clauses.push(`ModelGroup.${model}.`);
  if (vehicle.year) {
    clauses.push(`Year.range(${vehicle.year - 1}..${vehicle.year + 1}).`);
  }
  const fuel = fuelToEncar(vehicle.fuel_type);
  if (fuel) clauses.push(`FuelType.${fuel}.`);
  const q = `(And.${clauses.join('_.')})`;
  return `https://car.encar.com/list/car?q=${encodeURIComponent(q)}`;
}
```

## K-Car URL Construction Logic

```typescript
function buildKcarUrl(vehicle: Vehicle): string {
  const cond: Record<string, any> = {};
  const mfrCode = manufacturerToKcarCode(vehicle.manufacturer);
  if (mfrCode) cond.wr_eq_mnuftr_cd = mfrCode;
  if (vehicle.year) {
    cond.wr_gt_mfg_dt = `${vehicle.year - 1}01`;
    cond.wr_lt_mfg_dt = `${vehicle.year + 1}12`;
  }
  const fuelCodes = fuelToKcarCodes(vehicle.fuel_type);
  if (fuelCodes.length) cond.wr_in_fuel_cd = fuelCodes;
  return `https://www.kcar.com/bc/search?searchCond=${encodeURIComponent(JSON.stringify(cond))}`;
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `frontend/src/components/islands/MarketSearchButtons.tsx` | Create |
| `frontend/src/components/islands/VehicleDetail.tsx` | Modify (add import + usage) |
