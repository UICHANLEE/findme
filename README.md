# FIND IT

2026 재건 청년 하계수련회용 실시간 방 입·퇴장 웹앱입니다. 참가자는 최초 한 번 조 이름을 입력한 뒤 앱 안의 카메라로 각 방의 입구·출구 QR을 스캔합니다. 관리자 화면에서는 방 현황, 활동 로그, 달란트와 QR을 확인할 수 있습니다.

## 주요 주소

- 참가자: `/`
- 앱 내 QR 카메라: `/scanner`
- 순수 층별 지도: `/map`
- 참가자 여정·길안내 지도: `/map2`
- 관리자: `/jaegunadmin.html`

## 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev
```

`DATABASE_URL`이 없는 로컬 개발 환경은 Vercel Runtime Cache의 메모리 대체 저장소를 사용합니다. 이 데이터는 개발 서버를 다시 시작하면 사라질 수 있습니다.

## Neon Postgres 연결

운영 환경에서는 Neon Postgres가 필수입니다. 실제 연결 문자열을 저장소에 커밋하지 마세요.

1. Neon에서 프로젝트를 만들고 pooled connection string을 복사합니다.
2. 로컬에서는 `.env.example`을 참고해 `.env.local`에 설정합니다.

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

3. 최초 한 번 스키마를 적용합니다.

```bash
npm run db:migrate
```

마이그레이션은 [migrations/001_find_it.sql](migrations/001_find_it.sql)에 있으며 여러 번 실행해도 안전합니다.

## Vercel 설정

Vercel 프로젝트의 Production, Preview, Development 환경에 각각 `DATABASE_URL`을 등록합니다. Neon의 Vercel 연동을 사용하면 이 변수가 자동으로 추가될 수 있습니다.

```bash
vercel env pull .env.local --yes
npm run db:migrate
```

Vercel에서는 `DATABASE_URL`이 없으면 API가 캐시 저장소로 조용히 전환되지 않고 설정 오류를 반환합니다. 운영 데이터가 임시 캐시에 저장되는 일을 막기 위한 동작입니다.

## 동시 접속 설계

- 입·퇴장, 완료 파츠와 로그를 같은 Postgres 트랜잭션에서 저장합니다.
- 트랜잭션 범위 advisory lock으로 동시 스캔을 직렬화해 마지막 방 자리를 두 조가 동시에 차지하지 못하게 합니다.
- 참가자 화면은 2초마다 상태를 확인합니다.
- 동일한 `/api/status` 응답은 Vercel CDN에서 1초 동안 공유됩니다.
- 관리자 화면은 `fresh=1` 상태를 1초마다 직접 확인합니다.
- 방 체류시간 표시는 기기 내부 타이머이므로 매초 갱신되며 서버 요청을 만들지 않습니다.

## 검증

```bash
npm run lint
npm test
```

150명 부하 시뮬레이션은 별도 실행 중인 테스트 서버를 대상으로 실행합니다. 이 테스트는 대상 서버의 행사 데이터를 초기화하므로 운영 URL에는 실행하지 마세요.

```bash
BASE_URL=http://127.0.0.1:3000 npm run test:load
```

기본 조건은 10개 조, 참가자 150명, 참가자당 2초 폴링입니다. `USERS`와 `POLL_INTERVAL_MS` 환경변수로 조정할 수 있습니다.

실제 Neon 트랜잭션까지 검증할 때는 운영 데이터와 분리된 Neon 브랜치·Vercel Preview를 대상으로 아래처럼 실행하세요. `REQUIRE_NEON=1`은 대상이 임시 캐시일 경우 테스트를 즉시 중단하며, 결과의 `cacheStatuses`에서 Vercel CDN HIT/MISS도 확인할 수 있습니다.

```bash
BASE_URL=https://YOUR-PREVIEW.vercel.app REQUIRE_NEON=1 npm run test:load
```

## 데이터 보존

Neon에서는 다음 정보가 관리자 초기화 전까지 유지됩니다.

- 조별 현재 방과 입장 시각
- 완료한 다섯 방과 마지막 퇴장 정보
- 입·퇴장 활동 로그
- 조별·방별 달란트

관리자 화면의 전체 초기화는 위 데이터를 하나의 트랜잭션으로 삭제합니다. 초기화 전에 필요한 CSV를 내려받으세요.
