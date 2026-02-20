-- Market mappings for manufacturer, fuel type, and model normalization

CREATE TABLE IF NOT EXISTS market_manufacturer_mappings (
  id              SERIAL PRIMARY KEY,
  internal_name   VARCHAR(255) UNIQUE NOT NULL,
  korean_name     VARCHAR(255) NOT NULL,
  is_foreign      BOOLEAN NOT NULL DEFAULT FALSE,
  kcar_code       VARCHAR(10),
  encar_name      VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_fuel_mappings (
  id            SERIAL PRIMARY KEY,
  internal_name VARCHAR(255) UNIQUE NOT NULL,
  encar_name    VARCHAR(255),
  kcar_code     VARCHAR(10),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_model_mappings (
  id                   SERIAL PRIMARY KEY,
  internal_name        VARCHAR(255) NOT NULL,
  manufacturer_korean  VARCHAR(255) NOT NULL,
  encar_model_group    VARCHAR(255),
  kcar_model_code      VARCHAR(50),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(internal_name, manufacturer_korean)
);

-- Seed manufacturer mappings (from hardcoded MANUFACTURER_KO + FOREIGN_KO_NAMES + KCAR_MNUFTR_CODE)
INSERT INTO market_manufacturer_mappings (internal_name, korean_name, is_foreign, kcar_code) VALUES
  ('hyundai',          '현대',       FALSE, '001'),
  ('현대',              '현대',       FALSE, '001'),
  ('kia',              '기아',       FALSE, '002'),
  ('기아',              '기아',       FALSE, '002'),
  ('ssangyong',        'KG모빌리티', FALSE, '006'),
  ('kg모빌리티',        'KG모빌리티', FALSE, '006'),
  ('쌍용',              'KG모빌리티', FALSE, '006'),
  ('KG모빌리티',        'KG모빌리티', FALSE, '006'),
  ('renault',          '르노코리아', FALSE, '004'),
  ('renaultsamsung',   '르노코리아', FALSE, '004'),
  ('르노삼성',          '르노코리아', FALSE, '004'),
  ('르노코리아',        '르노코리아', FALSE, '004'),
  ('chevrolet',        '쉐보레',     FALSE, '003'),
  ('쉐보레',            '쉐보레',     FALSE, '003'),
  ('gm대우',           '쉐보레',     FALSE, '003'),
  ('genesis',          '제네시스',   FALSE, '016'),
  ('제네시스',          '제네시스',   FALSE, '016'),
  ('bmw',              'BMW',        TRUE,  '012'),
  ('BMW',              'BMW',        TRUE,  '012'),
  ('benz',             '벤츠',       TRUE,  '013'),
  ('mercedes',         '벤츠',       TRUE,  '013'),
  ('mercedes-benz',    '벤츠',       TRUE,  '013'),
  ('벤츠',              '벤츠',       TRUE,  '013'),
  ('audi',             '아우디',     TRUE,  '014'),
  ('아우디',            '아우디',     TRUE,  '014'),
  ('volkswagen',       '폭스바겐',   TRUE,  '015'),
  ('폭스바겐',          '폭스바겐',   TRUE,  '015'),
  ('lexus',            '렉서스',     TRUE,  '018'),
  ('렉서스',            '렉서스',     TRUE,  '018'),
  ('toyota',           '토요타',     TRUE,  NULL),
  ('토요타',            '토요타',     TRUE,  NULL),
  ('honda',            '혼다',       TRUE,  NULL),
  ('혼다',              '혼다',       TRUE,  NULL),
  ('volvo',            '볼보',       TRUE,  NULL),
  ('볼보',              '볼보',       TRUE,  NULL),
  ('porsche',          '포르쉐',     TRUE,  NULL),
  ('포르쉐',            '포르쉐',     TRUE,  NULL)
ON CONFLICT (internal_name) DO NOTHING;

-- Seed fuel mappings (from ENCAR_FUEL + KCAR_FUEL_CODE)
INSERT INTO market_fuel_mappings (internal_name, encar_name, kcar_code) VALUES
  ('gasoline',    '가솔린',    '001'),
  ('휘발유',       '가솔린',    '001'),
  ('가솔린',       '가솔린',    '001'),
  ('diesel',      '디젤',      '002'),
  ('경유',         '디젤',      '002'),
  ('디젤',         '디젤',      '002'),
  ('lpg',         'LPG',       '003'),
  ('LPG',         'LPG',       '003'),
  ('hybrid',      '하이브리드', '006'),
  ('하이브리드',   '하이브리드', '006'),
  ('electric',    '전기',      '009'),
  ('전기',         '전기',      '009')
ON CONFLICT (internal_name) DO NOTHING;

-- Seed model mappings for Encar ModelGroup
INSERT INTO market_model_mappings (internal_name, manufacturer_korean, encar_model_group, kcar_model_code) VALUES
  ('E-클래스 (W213)', '벤츠', 'E-클래스', '1716'),
  ('E-Class (W213)', '벤츠', 'E-클래스', '1716'),
  ('E350 4MATIC',    '벤츠', 'E-클래스', '1716'),
  ('쏘나타 (DN8)',    '현대', '쏘나타',    '2154'),
  ('아반떼 (CN7)',    '현대', '아반떼',    '2174'),
  ('그랜저 HG HG240 모', '현대', '그랜저',  '004'),
  ('그랜저(GRANDEUR)',   '현대', '그랜저',  '004'),
  ('SM6 2.0 GDe LE',     '르노코리아', 'SM6', '010'),
  ('카니발',              '기아', '카니발', '036'),
  ('BMW 5시리즈 (F10)',   'BMW',  '5시리즈', '003'),
  ('EQ900',               '제네시스', 'EQ900', '001'),
  ('K5',                  '기아', 'K5', '001'),
  ('포터',                '현대', '포터', '037'),
  ('포터Ⅱ (PORTERⅡ)',     '현대', '포터', '037'),
  ('BMW 5시리즈 GT (F0',  'BMW', '5시리즈', '003')
ON CONFLICT (internal_name, manufacturer_korean) DO NOTHING;
