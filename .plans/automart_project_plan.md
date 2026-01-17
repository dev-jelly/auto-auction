# 오토마트 크롤링 및 조회 서비스 구축 계획

## 1. 프로젝트 개요
오토마트(automart.co.kr)의 공매 차량 정보를 주기적으로 수집하여, 사용자가 편리하게 검색하고 필터링할 수 있는 현대적인 웹 서비스를 구축합니다.

## 2. 시스템 아키텍처

### 2.1 기술 스택 (확정)
- **Frontend**: Astro + React Islands, Tailwind CSS
  - 정적 HTML 기본 생성으로 초경량 번들
  - 필터/검색 등 인터랙티브 부분만 React Island로 hydration
  - 빌드 결과물을 Nginx로 서빙 (Node.js 런타임 불필요)
- **Backend**: Go (Golang), Gin Framework
- **Database**: PostgreSQL (클러스터 내 기존 postgres 인스턴스 활용 또는 신규 생성)
- **Scraper**: Playwright (TypeScript/Node.js) - JS 렌더링이 필요한 동적 페이지 대응

### 2.2 인프라 환경 (K3s 클러스터)
| 구성요소 | 현황 |
|---------|------|
| 클러스터 | K3s v1.33.6 (2노드: control-plane + worker) |
| Ingress | Traefik + cert-manager (자동 TLS) |
| GitOps | ArgoCD |
| CI/CD | Tekton Pipelines |
| Registry | registry.2msi.org (Private) |
| Git | Gitea (gitea.octol.ing) |
| Monitoring | Prometheus + Grafana + Loki |

### 2.3 데이터 파이프라인
1. **Collector**: Playwright 스크립트가 오토마트 `Search_Main.asp` 페이지를 순회하며 차량 정보 수집
2. **Parser**: 수집된 HTML에서 차량 세부 정보(모델, 연식, 주행거리, 가격, 입찰 마감일 등) 파싱
3. **Storage**: 파싱된 데이터를 DB에 저장 (중복 확인 및 업데이트)
4. **API**: 프론트엔드 요청에 따라 DB에서 데이터를 조회하여 JSON 응답

## 3. 데이터 모델 (Schema)

```sql
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    mgmt_number VARCHAR(50) UNIQUE,  -- 관리번호 (예: 2026-6)
    car_number VARCHAR(20),          -- 차량번호
    manufacturer VARCHAR(50),        -- 제조사 (현대, 기아 등)
    model_name VARCHAR(100),         -- 모델명
    fuel_type VARCHAR(20),           -- 연료 (휘발유, 경유, 전기 등)
    transmission VARCHAR(20),        -- 변속기 (자동, 수동)
    year INTEGER,                    -- 연식
    mileage INTEGER,                 -- 주행거리 (km)
    price BIGINT,                    -- 예정가/현재가
    min_bid_price BIGINT,            -- 최저 입찰가
    location VARCHAR(100),           -- 보관소
    due_date TIMESTAMP,              -- 입찰 마감일시
    auction_count INTEGER,           -- 공매 회차
    status VARCHAR(20),              -- 상태 (진행중, 마감 등)
    image_urls TEXT[],               -- 차량 이미지 URLs
    detail_url TEXT,                 -- 상세 페이지 URL
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_vehicles_year ON vehicles(year);
CREATE INDEX idx_vehicles_price ON vehicles(price);
CREATE INDEX idx_vehicles_due_date ON vehicles(due_date);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_manufacturer ON vehicles(manufacturer);
CREATE INDEX idx_vehicles_model ON vehicles(model_name);
```

## 4. Kubernetes 배포 아키텍처

### 4.1 네임스페이스 및 리소스 구성
```
Namespace: auto-auction
├── Deployment: auto-auction-api (Go Backend)
├── Deployment: auto-auction-web (Astro Static + Nginx)
├── CronJob: auto-auction-scraper (Playwright Scraper)
├── PVC: postgres-data (PostgreSQL 데이터)
├── Secret: auto-auction-secrets (DB credentials, API keys)
├── ConfigMap: auto-auction-config (환경 설정)
├── Service: auto-auction-api-svc (ClusterIP)
├── Service: auto-auction-web-svc (ClusterIP)
└── Ingress: auto-auction-ingress (auto.2msi.org)
```

### 4.2 CI/CD 파이프라인 (Tekton + ArgoCD)
```
[Git Push] → [Tekton Pipeline]
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
[Build API]   [Build Web]    [Build Scraper]
    │               │               │
    ▼               ▼               ▼
[Push to registry.2msi.org]
                    │
                    ▼
[ArgoCD Sync] → [K8s Deployment]
```

### 4.3 Tekton Pipeline 구성
```yaml
# 파이프라인 Tasks:
1. git-clone: Gitea에서 소스 클론
2. build-api: Go 백엔드 빌드 & 이미지 생성
3. build-web: Astro 프론트엔드 빌드 & 이미지 생성 (Nginx 서빙)
4. build-scraper: Playwright 스크래퍼 빌드 & 이미지 생성
5. push-images: registry.2msi.org에 이미지 푸시
6. update-manifest: Kustomize/Helm 매니페스트 업데이트
```

### 4.4 ArgoCD Application 구성
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: auto-auction
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://gitea.octol.ing/jelly/auto-auction.git
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: auto-auction
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## 5. 구현 단계 (Roadmap)

### Phase 1: 인프라 및 데이터 수집기 (Week 1)
- [ ] Kubernetes 네임스페이스 및 기본 리소스 생성
- [ ] PostgreSQL 데이터베이스 배포 (PVC 포함)
- [ ] 오토마트 사이트 분석 (HTML 구조, 셀렉터 매핑)
- [ ] Playwright 스크래퍼 구현
  - 성공 기준: 전체 차량 목록 수집, 100% 필드 추출
  - 재시도 로직: 3회 exponential backoff
  - 로깅: 실패 페이지 기록
- [ ] 수집 데이터 JSON 저장 및 검증

### Phase 2: 백엔드 API 구축 (Week 2)
- [ ] Go 프로젝트 구조 생성 (Clean Architecture)
- [ ] PostgreSQL 연동 (pgx 드라이버)
- [ ] 데이터 Upsert 로직 구현
- [ ] REST API 엔드포인트 구현
  - `GET /api/vehicles` - 목록 조회 (페이지네이션, 필터, 정렬)
  - `GET /api/vehicles/:id` - 상세 조회
  - `GET /api/stats` - 통계 (총 수량, 평균 가격 등)
- [ ] Dockerfile 작성 및 이미지 빌드

### Phase 3: 프론트엔드 개발 (Week 3)
- [ ] Astro 프로젝트 설정 (React integration, Tailwind CSS)
- [ ] 정적 레이아웃 구성 (Header, Footer, Base Layout)
- [ ] 메인 대시보드 페이지 (Astro 정적 페이지)
- [ ] 차량 카드 그리드 컴포넌트 (React Island - `client:load`)
- [ ] 필터 사이드바 컴포넌트 (React Island - `client:visible`)
- [ ] 차량 상세 모달 (React Island)
- [ ] 반응형 디자인 적용
- [ ] Dockerfile 작성 (빌드 후 Nginx로 정적 파일 서빙)

### Phase 4: CI/CD 및 배포 자동화 (Week 4)
- [ ] Gitea 저장소 생성 및 코드 푸시
- [ ] Tekton Pipeline 구성
- [ ] ArgoCD Application 등록
- [ ] CronJob 스크래퍼 설정 (매 6시간 실행)
- [ ] Ingress 설정 (auto.2msi.org)
- [ ] Grafana 대시보드 구성 (스크래퍼 성공률, API 지연시간)

## 6. Kubernetes 매니페스트 구조

```
k8s/
├── base/
│   ├── namespace.yaml
│   ├── postgres/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── pvc.yaml
│   ├── api/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── web/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── scraper/
│   │   └── cronjob.yaml
│   ├── ingress.yaml
│   ├── secrets.yaml
│   └── kustomization.yaml
└── overlays/
    └── production/
        ├── kustomization.yaml
        └── patches/
```

## 7. 크롤링 자동화 시스템

### 7.1 Kubernetes CronJob 설정
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: auto-auction-scraper
  namespace: auto-auction
spec:
  schedule: "0 */6 * * *"  # 매 6시간마다 실행 (00:00, 06:00, 12:00, 18:00)
  concurrencyPolicy: Forbid  # 이전 작업 완료 전 새 작업 시작 금지
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 3  # 실패 시 3회 재시도
      activeDeadlineSeconds: 1800  # 30분 타임아웃
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: scraper
            image: registry.2msi.org/auto-auction/scraper:latest
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: auto-auction-secrets
                  key: database-url
            - name: SCRAPE_MAX_PAGES
              value: "20"
            resources:
              requests:
                memory: "512Mi"
                cpu: "250m"
              limits:
                memory: "1Gi"
                cpu: "500m"
```

### 7.2 스크래퍼 실행 흐름
```
[CronJob 트리거] → [Scraper Pod 생성]
        │
        ▼
[오토마트 사이트 접속] → [페이지별 차량 데이터 수집]
        │
        ▼
[데이터 파싱 및 검증] → [PostgreSQL Upsert]
        │
        ▼
[Prometheus 메트릭 Push] → [Pod 종료]
```

### 7.3 자동화 실행 옵션
| 트리거 방식 | 설명 | 사용 시점 |
|------------|------|----------|
| CronJob (기본) | 6시간마다 자동 실행 | 정기 데이터 수집 |
| Manual Job | `kubectl create job --from=cronjob/auto-auction-scraper manual-scrape-$(date +%s)` | 즉시 수집 필요 시 |
| Webhook Trigger | Tekton EventListener로 외부 요청 시 실행 | API 연동 시 |

### 7.4 스크래퍼 실패 처리
1. **자동 재시도**: `backoffLimit: 3`으로 최대 3회 재시도
2. **알림 발송**: 3회 연속 실패 시 Alertmanager → Discord/Slack 알림
3. **수동 개입**: 파싱 실패 패턴 분석 후 셀렉터 업데이트
4. **롤백**: 이전 데이터 보존 (새 데이터 추가/수정만 수행)

### 7.5 데이터 동기화 전략
- **Upsert 방식**: 관리번호(mgmt_number) 기준으로 INSERT ON CONFLICT UPDATE
- **상태 관리**: 마감된 차량은 status를 '마감'으로 업데이트
- **히스토리**: 가격 변동 이력 별도 테이블에 기록 (선택사항)

## 8. 모니터링 및 알림

### 8.1 Prometheus 메트릭
- `scraper_runs_total` - 스크래퍼 실행 횟수
- `scraper_vehicles_collected` - 수집된 차량 수
- `scraper_errors_total` - 스크래핑 에러 수
- `api_request_duration_seconds` - API 응답 시간
- `api_requests_total` - API 요청 수

### 8.2 Grafana 대시보드
- 스크래퍼 상태 (성공/실패, 수집 차량 수)
- API 성능 (요청량, 지연시간, 에러율)
- 차량 데이터 통계 (총 수량, 신규/마감 추이)

### 8.3 Alertmanager 알림
- 스크래퍼 3회 연속 실패 시 알림
- API 응답 시간 > 500ms 지속 시 알림
- 데이터베이스 연결 실패 시 알림

## 8. 성능 요구사항 (SLA)

| 항목 | 목표값 |
|------|--------|
| 스크래퍼 전체 수집 | < 30분 |
| 데이터 신선도 | < 6시간 |
| API p95 응답시간 | < 200ms |
| 동시 사용자 | 50명 |
| 웹 FCP | < 1.5초 |

## 9. 리스크 및 완화 방안

| 리스크 | 확률 | 영향 | 완화 방안 |
|--------|------|------|----------|
| 사이트 스크래핑 차단 | 중 | 높음 | 적절한 rate limiting (5초 간격), User-Agent 로테이션 |
| 사이트 구조 변경 | 중 | 높음 | 셀렉터 모니터링, 파싱 실패 시 즉시 알림 |
| DB 용량 초과 | 낮음 | 중 | 90일 이상 마감 데이터 아카이빙 |

## 10. UI/UX 디자인 컨셉
- **카드형 레이아웃**: 차량 사진(있을 경우), 모델명, 가격을 강조한 카드 UI
- **고급 필터**: 슬라이더를 이용한 가격 범위 설정, 체크박스를 이용한 제조사/연료 필터
- **반응형**: 모바일에서도 쉽게 조회 가능하도록 설계
- **다크 모드**: 시스템 설정 연동

---
작성일: 2026-01-17
수정일: 2026-01-17
작성자: Pi (AI Assistant)
