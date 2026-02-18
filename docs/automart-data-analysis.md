# Automart (automart.co.kr) Data Analysis Report

*Generated: 2026-02-18*
*Based on live site analysis of automart.co.kr vehicle auction platform*

---

## 1. Currently Scraped Data

The existing scraper (`scraper/scrape.ts`) collects the following fields from the listing table at `Search_Main.asp?tmode=1`:

| Field | Source Column | Example | Notes |
|-------|--------------|---------|-------|
| `mgmtNumber` | Column 6 | `2026-6` | Used as unique key |
| `carNumber` | Column 2 (line 1) | `XXX0337` | License plate |
| `fuelType` | Column 2 (parenthetical) | `경유` | Parsed from `XXX0337 (경유)` |
| `modelName` | Column 2 (line 2) | `Q3-35 TDI quattro` | |
| `organization` | Column 4 (line 1) | `폭스바겐파이낸셜` | Institution name |
| `location` | Column 4 (line 2) | `충북` | Storage location (abbreviated) |
| `year` | Column 8 (line 1) | `2021` | Model year |
| `transmission` | Column 8 (line 2) | `자동` | |
| `price` | Column 10 | `9,630,000` | Estimated price (예정가) |
| `bidDeadline` | Column 12 | `02/19 (12:00)` | Bid deadline |
| `resultDate` | Column 14 | `02/19 (14:00)` | Result announcement date |
| `status` | Hardcoded | `입찰중` | Always set to "입찰중" |
| `detailUrl` | Constructed | `Pop_CarInfo.asp?m_No=2026-6` | **BROKEN**: This URL returns 404 |

### Current Limitations

1. **Status is hardcoded**: Always `'입찰중'` - never scrapes completed (매각/유찰) auctions
2. **Detail URL is wrong**: Constructs `Pop_CarInfo.asp?m_No={mgmtNumber}` which returns 404
3. **Only scrapes listing page**: No detail page data (mileage, color, displacement, condition, images)
4. **Only scrapes `tmode=1`**: Active auctions only; past results on other tabs are ignored
5. **Management number pattern**: Regex `/^2026-\d{1,3}$/` is year-specific, will break in 2027

---

## 2. Available But Not Scraped Data

### 2.1 Listing Page Data (Search_Main.asp)

The listing page contains additional data not currently captured:

| Field | Korean | Available | Currently Scraped |
|-------|--------|-----------|-------------------|
| Sequence number | 순번 | Yes (Column 0) | No |
| Vehicle image thumbnail | 사진 | Yes (Column 1) | No |
| Auction notice number | 공고번호 | Yes (in detail link params) | No |
| Mileage | 주행거리 | No (listing only) | No |

**Search/Filter Parameters Available** (can be used to query different result sets):

| Parameter | Korean | Options |
|-----------|--------|---------|
| Auction status | 경매상태 | 예정, 시작오늘, 입찰중, 마감오늘, 발표대기, 발표오늘 |
| Institution | 기관 | 정부/공공기관, 금융사, 경찰청 압류 등 |
| Fuel type | 연료 | 휘발유, 경유, LPG, CNG, 전기, 하이브리드 |
| Transmission | 변속기 | 수동, 자동, 반자동, CVT |
| Storage location | 보관소 | 인천, 부산, 대구, 충북, 경남 등 |
| Price range | 가격범위 | 50만 ~ 1억+ |
| Model year | 연식 | 2004-2026 |
| `tmode` parameter | 탭 모드 | `1` = active, `2`/`3` = completed results |

### 2.2 Detail Page Data (CarDetail_in.asp)

**Priority: HIGH** - This is the richest source of vehicle data.

#### Correct URL Pattern (discovered during analysis)
```
/views/pub_auction/Common/CarDetail_in.asp?p_sel=0&bidtype=1&p_NotNo={NOTICE_NO}&p_Code=1&p_CarNo={VEHICLE_NO}&window=ok
```

Required parameters:
- `p_NotNo`: Auction notice number (e.g., `GMBM012026A188`)
- `p_CarNo`: Vehicle license plate (e.g., `XXX7655`)

Notice number format: `GM{INSTITUTION_CODE}{YEAR}A{SEQUENCE}`

#### Vehicle Specifications (차량상세정보)

| Field | Korean Label | Example Value | Priority |
|-------|-------------|---------------|----------|
| Sequence number | 차량순번 | 1 | Low |
| License plate | 차량번호 | XXX7655 | Already scraped |
| Vehicle name | 차량명 | BMW 420d Gran Coupe | Already scraped |
| Fuel type | 연료 | Diesel (경유) | Already scraped |
| Model year | 모델연도 | 2015 | Already scraped |
| Transmission | 기어 | Automatic (자동) | Already scraped |
| **Mileage** | **주행거리** | **145,301 km** | **HIGH** |
| **Color** | **색상** | **White (흰색)** | **HIGH** |
| **Engine displacement** | **배기량** | **2143 cc** | **MEDIUM** |
| **First registration date** | **최초등록일** | **2015-07-22** | **HIGH** |
| **Manufacturing date** | **제작연월** | **2015-07** | **MEDIUM** |

#### Auction/Bid Information (공고정보)

| Field | Korean Label | Example Value | Priority |
|-------|-------------|---------------|----------|
| Notice number | 공고번호 | 2026-188 (1차) | HIGH |
| **Auction round** | **회차** | **1차 (1st round)** | **HIGH** |
| Status | 진행상태 | 진행중 | Already scraped (but hardcoded) |
| Estimated price | 예정가 | ₩13,000,000 | Already scraped |
| Bid period | 입찰신청기간 | 2026-02-12 ~ 2026-02-19 12:00 | Partial |
| **Bid start date** | **입찰시작일** | **2026-02-12** | **MEDIUM** |
| Result announcement | 발표일시 | 2026-02-19 14:00 or "2-3일 소요" | Partial |
| Storage location | 보관소 | 오토마트 인천보관소 | Already scraped (abbreviated) |
| Institution | 기관명 | BMW 파이낸셜 서비스 | Already scraped |
| **Winner's commission** | **낙찰자수수료** | **₩110,000 ~ ₩1,100,000** | **MEDIUM** |
| **Lien release fee** | **저당해지비용** | **₩19,300** | **LOW** |
| **Transfer fee** | **이전비용** | **₩80,000 (₩40,000 for dealers)** | **LOW** |
| **Payment deadline** | **매수대금납부기한** | **Same/next day, 16:00-17:00** | **LOW** |

#### Vehicle Condition (차량설명/유의사항)

Free-text field with semi-structured data. Priority: **HIGH**

| Item | Korean | Example | Notes |
|------|--------|---------|-------|
| Lien status | 저당있음/없음 | 저당있음 (저당말소비용 낙찰자부담) | Boolean + cost note |
| Fire extinguisher | 소화기 | 없음 (낙찰자 설치 의무) | Boolean |
| Keys | 스마트키/키 | 2개 | Count |
| Manual | 매뉴얼 | 있음/없음 | Boolean |
| Tax invoice | 세금계산서 | 발행불가 | Availability |
| Cash receipt | 현금영수증 | 불가 | Availability |
| Inspection validity | 검사유효기간 | 2026-03-07 | Date |
| Registration type | 차량유형 | 개인/영업용(렌트) | Type |
| **Specific defects** | **결함사항** | **Coolant deficiency, engine vibration, tire wear, driveshaft cracking** | **Unstructured Korean text** |

#### Images (사진)

| Item | Details | Priority |
|------|---------|----------|
| Image count | 3 per vehicle (Front, Back, Detail/Side) | HIGH |
| CDN URL pattern | `//image.automart.co.kr/Carimages/New/{YEAR}/{CHARGE_CODE}/{YEAR}-{CHARGE_CODE}{SEQ}{SUFFIX}.jpg` | |
| Suffixes | `F` = Front, `B` = Back, `D` = Detail/Side | |
| Image viewer URL | `/views/pub_auction/Common/ImageView_Single.asp?chargecd={}&cifyear={}&cifseqno={}&carno={}` | |
| Params needed | `chargecd`, `cifyear`, `cifseqno` (derived from notice/storage) | |

#### Inspection Report (차량점검서)

| Item | Details | Priority |
|------|---------|----------|
| Inspection report | Button: "차량점검서 보기" | HIGH |
| Video inspection | `/views/InspectionFree/inspect_mov.asp?p_CarNo={}&p_NotNo={}` | MEDIUM |
| **Access restriction** | **Requires authenticated session (login)** | Blocker |

#### Financing Information (할부)

| Item | Details | Priority |
|------|---------|----------|
| Loan provider | Hana Capital (하나캐피탈) | LOW |
| Interest rate | 6.9% ~ 19.9% fixed | LOW |
| Loan terms | 24, 36, 48, 60 months | LOW |
| Min loan amount | ₩2,000,000 ~ ₩7,000,000 | LOW |
| Vehicle age limit | Under 10-12 years | LOW |
| Info page | `/views/Pub_Halbu/Pub_Halbu.asp` | LOW |

### 2.3 Commission Structure (varies by institution)

| Institution | Commission Type | Amount |
|-------------|----------------|--------|
| BMW Financial | Percentage (2.2%) | ₩110,000-₩440,000 |
| MB Mobility Korea | Fixed | ₩627,000 |
| Hana Capital | Fixed | ₩880,000-₩1,100,000 |
| KB국민카드 | Percentage (2.2%) | ₩110,000-₩330,000 |
| Shinhan Card | Varies | Varies |
| Mirae Finance | Varies | Varies |

---

## 3. Site Structure Map

```
automart.co.kr/
├── views/
│   ├── pub_auction/
│   │   ├── Search_Main.asp              # Main listing page
│   │   │   ├── ?tmode=1                 # Active auctions (입찰중)
│   │   │   ├── ?tmode=2                 # Past results (매각/유찰) [needs verification]
│   │   │   └── ?window=ok               # Required param
│   │   ├── Common/
│   │   │   ├── CarDetail_in.asp         # Vehicle detail page ✓ (CORRECT URL)
│   │   │   │   ├── ?p_NotNo={notice}    # Notice number (required)
│   │   │   │   ├── ?p_CarNo={plate}     # Vehicle plate (required)
│   │   │   │   ├── ?p_sel=0             # Selection param
│   │   │   │   ├── ?bidtype=1           # Bid type
│   │   │   │   ├── ?p_Code=1            # Code param
│   │   │   │   └── ?window=ok           # Window param
│   │   │   └── ImageView_Single.asp     # Image popup viewer
│   │   │       ├── ?chargecd={code}     # Storage/charge code
│   │   │       ├── ?cifyear={year}      # Image year
│   │   │       ├── ?cifseqno={seq}      # Image sequence number
│   │   │       └── ?carno={plate}       # Vehicle plate
│   │   └── Pop_CarInfo.asp              # ✗ DOES NOT WORK (returns 404)
│   ├── InspectionFree/
│   │   └── inspect_mov.asp              # Inspection video viewer (auth required)
│   │       ├── ?p_CarNo={plate}
│   │       └── ?p_NotNo={notice}
│   ├── Pub_Halbu/
│   │   └── Pub_Halbu.asp               # Financing options page
│   └── member_info/
│       ├── mem_login.asp                # Login endpoint (POST)
│       └── mem_logOut.asp               # Logout endpoint (POST)
├── common/
│   └── Api/
│       ├── api_vodidCheck.asp           # Session/login validation (AJAX)
│       └── api_zzimRegister.asp         # Bookmark/wishlist toggle (AJAX)
└── [CDN] image.automart.co.kr/
    └── Carimages/New/{YEAR}/{CHARGE_CODE}/
        └── {YEAR}-{CHARGE_CODE}{SEQ}{F|B|D}.jpg
```

### JavaScript Functions (Detail Page)

| Function | Purpose | Authentication |
|----------|---------|----------------|
| `login_submit()` | Form login with 60-day cookie | N/A |
| `logOut_submit()` | Logout | Requires login |
| `validateFreeCheck()` | Check auth for inspection video | Requires login |
| `validateZzimCheck()` | Check auth for bookmark | Requires login |
| `apiZzimCarSet_ajax_post()` | AJAX bookmark add/remove | Requires login |
| `ShowImg()` | Single image popup | Public |
| `ShowImgTot()` | Full gallery popup | Public |
| `setCookie()`/`getCookie()` | ID persistence (60-day) | N/A |
| `gfnpagemove()` | Listing page pagination | Public |
| `search_form()` | Listing search with filters | Public |

### Session/Auth Mechanism

- Login form: `mem_login.asp` with `MemId` + `MemPwd` fields
- Session validation: AJAX POST to `api_vodidCheck.asp`
- Response: `data[0].Validatechk` = `'1'` (logged in) or `'0'` (not logged in)
- Cookie: `idHoldCheck` for ID persistence (60 days)
- Auth-gated features: Inspection reports, video inspection, bookmarks

---

## 4. Implementation Recommendations

### Priority 1: Fix Detail URL & Add Mileage/Color/Displacement (HIGH)

**Impact**: Most valuable missing data for users.

1. **Fix `detailUrl` construction** in scraper
   - Current (broken): `Pop_CarInfo.asp?m_No={mgmtNumber}`
   - Correct: `Common/CarDetail_in.asp?p_sel=0&bidtype=1&p_NotNo={noticeNo}&p_Code=1&p_CarNo={carNumber}&window=ok`
   - Requires extracting `p_NotNo` (notice number) from listing page link params

2. **Scrape detail pages** for each vehicle to get:
   - Mileage (주행거리)
   - Color (색상)
   - Engine displacement (배기량)
   - First registration date (최초등록일)
   - Auction round number (회차)
   - Condition notes (유의사항)

3. **Extract image URLs** from detail page
   - Pattern: `//image.automart.co.kr/Carimages/New/{YEAR}/{CHARGE_CODE}/{SEQ}{F|B|D}.jpg`
   - 3 images per vehicle (front, back, side)

### Priority 2: Scrape Completed Auctions (HIGH)

**Impact**: Historical data for price analysis and trend tracking.

1. **Navigate to results tab** (`tmode=2` or similar) on listing page
2. **Parse actual status** from the result page (매각/유찰) instead of hardcoding
3. **Extract final sale price** (낙찰가) for sold vehicles
4. **Track auction rounds** to build history

### Priority 3: Extract Notice Numbers from Listing Page (HIGH)

**Impact**: Required for detail page access and proper data linking.

1. The listing page links contain notice numbers in `onclick` handlers or `href` attributes
2. Pattern: `CarDetail_in.asp?...p_NotNo=GMBM012026A188...`
3. Notice number format: `GM{INSTITUTION_CODE}{YEAR}A{SEQUENCE}`
4. This is essential for constructing valid detail page URLs

### Priority 4: Parse Condition Notes (MEDIUM)

**Impact**: Valuable for vehicle quality assessment.

1. Condition data is **free-text in Korean**, not structured
2. Common patterns to parse:
   - `저당있음/없음` → lien status (boolean)
   - `소화기 없음` → fire extinguisher (boolean)
   - `키 N개` → key count (number)
   - `검사유효기간 YYYY-MM-DD` → inspection validity (date)
3. Defect descriptions require NLP or keyword matching (coolant, vibration, tire wear, etc.)

### Priority 5: Commission Data (LOW)

**Impact**: Useful for total cost calculation.

1. Commission varies by institution - some percentage-based, some fixed
2. Would need to scrape per-vehicle from detail page
3. Consider adding a `commission` or `fees` field to the data model

### Priority 6: Inspection Reports (LOW - Auth Blocked)

**Impact**: Most detailed vehicle condition data, but access-restricted.

1. Requires authenticated session to view
2. Would need login credentials for the scraper
3. Contains detailed part-by-part condition assessment
4. Video inspection also available for some vehicles
5. **Recommendation**: Defer until account-based scraping is implemented

---

## 5. Data Model Gap Analysis

### Fields to Add to `Vehicle` Interface

```typescript
// High priority - available on detail page
mileage: number;              // 주행거리 (km)
color: string;                // 색상
displacement: number;         // 배기량 (cc)
first_registration: string;   // 최초등록일 (ISO date)
manufacturing_date: string;   // 제작연월
auction_round: number;        // 회차 (1차, 2차, ...)
notice_number: string;        // 공고번호 (e.g., GMBM012026A188)
condition_notes: string;      // 유의사항 (free text)
image_urls: string[];         // CDN image URLs (3 per vehicle)

// Medium priority - available on detail page
commission_amount: number;    // 낙찰자수수료
lien_status: boolean;         // 저당여부
key_count: number;            // 키 개수
inspection_valid_until: string; // 검사유효기간

// For completed auctions
final_price: number;          // 낙찰가
result_status: string;        // 매각/유찰/취소
```

### Current vs Available Data Comparison

| Data Point | Currently Scraped | Available on Site | Gap |
|------------|------------------|-------------------|-----|
| Basic vehicle info | Yes (6 fields) | Yes | - |
| Mileage | No | Yes (detail page) | **Gap** |
| Color | No | Yes (detail page) | **Gap** |
| Displacement | No | Yes (detail page) | **Gap** |
| Registration date | No | Yes (detail page) | **Gap** |
| Condition notes | No | Yes (detail page, free text) | **Gap** |
| Images | No | Yes (3 per vehicle, CDN) | **Gap** |
| Auction round | No | Yes (detail page) | **Gap** |
| Notice number | No | Yes (listing page links) | **Gap** |
| Commission | No | Yes (detail page) | **Gap** |
| Correct detail URL | No (broken) | Yes | **Bug** |
| Completed auction results | No | Yes (different tmode) | **Gap** |
| Final sale price | No | Yes (results page) | **Gap** |
| Inspection report | No | Yes (auth required) | **Blocked** |
| Financing info | No | Yes (static page) | Low priority |

---

## 6. Technical Considerations for Scraper Enhancement

### Rate Limiting
- Each detail page is a separate HTTP request
- With ~40 active vehicles, that's 40 additional requests per scrape cycle
- Recommend 2-3 second delay between detail page fetches
- Total additional time: ~2-3 minutes per scrape cycle

### Notice Number Extraction
The listing page contains JavaScript `onclick` handlers with the notice number:
```javascript
// Pattern in listing page:
onclick="gfnCarInfo('GMBM012026A188', 'XXX7655', ...)"
// Or in href:
href="/views/pub_auction/Common/CarDetail_in.asp?p_NotNo=GMBM012026A188&p_CarNo=XXX7655..."
```
The scraper needs to extract these from the listing page rows to construct detail URLs.

### Image CDN
- Images are served from `image.automart.co.kr` (separate CDN)
- No authentication required for image access
- URL pattern: `//image.automart.co.kr/Carimages/New/{YEAR}/{CHARGE_CODE}/{YEAR}-{CHARGE_CODE}{SEQ}{SUFFIX}.jpg`
- Can be stored as URLs in the database rather than downloading

### Condition Notes Parsing
The condition notes are semi-structured Korean text. Recommended approach:
1. Store raw text in `condition_notes` field
2. Optionally parse common boolean flags (lien, fire extinguisher, manual)
3. Use keyword detection for defect categories
4. Do NOT attempt full NLP - diminishing returns

### Management Number Pattern
Current regex `/^2026-\d{1,3}$/` is year-specific. Should be generalized to:
```typescript
/^\d{4}-\d{1,4}$/  // Matches YYYY-N format
```
