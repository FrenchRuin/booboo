# 프로젝트 개요

신혼부부 둘이서만 쓰는 간단한 가계부 웹앱.
목표: 지출 입력, 카테고리별/월별 집계, 서로 실시간으로 확인.
사용자는 정확히 2명 (부부). 복잡한 권한/공유 로직 불필요 — "우리 둘" 고정 전제.

# 기술 스택

- **프레임워크**: Next.js (App Router, TypeScript)
- **스타일링**: Tailwind CSS v4, Pretendard 폰트(self-hosted, `pretendard` 패키지), 다크모드 지원(클래스 기반)
- **아이콘**: `lucide-react` (이모지 대신 통일된 아이콘 사용, 새 아이콘 필요하면 여기서 가져오기)
- **백엔드/DB**: Supabase (Postgres + Auth + Realtime)
- **배포**: Vercel
- PWA로 배포 (홈 화면 추가해서 앱처럼 사용, 앱스토어 배포 안 함)

# 빌드 & 실행 명령어

```bash
npm run dev       # 로컬 개발 서버
npm run build     # 프로덕션 빌드 (커밋 전에 항상 로컬에서 한번 실행해서 확인)
npm run lint       # 린트
```

# 프로젝트 구조

```
/app                 # Next.js App Router 페이지
  /expenses           # 지출 입력/목록
  /assets              # 자산관리 (통장/적금/주식 — 현재 잔액만 수동 관리, 히스토리 없음)
  /stats               # 월별/카테고리별 통계
/components          # 재사용 UI 컴포넌트
/lib
  /supabase.ts        # Supabase 클라이언트 초기화
/types                # 공용 타입 정의 (Expense, Category 등)
```

# 코딩 컨벤션

- 컴포넌트는 함수형 + TypeScript, `export default function` 스타일 유지
- 서버 컴포넌트 기본, 상호작용(입력 폼, 버튼 클릭) 필요한 곳만 `"use client"`
- Supabase 호출은 `/lib/supabase.ts`의 클라이언트를 통해서만, 컴포넌트에 직접 URL/key 하드코딩 금지
- 환경변수는 항상 `.env.local`에 두고 `NEXT_PUBLIC_` 접두사는 클라이언트에 노출되는 값에만 사용
- 날짜/금액 포맷은 `Intl` API 사용 (원화 기준, `ko-KR` 로케일)
- 금액 입력창 콤마 포맷(`formatAmount`)과 "3만7천원" 식 한글 표시(`formatKoreanAmount`)는 `lib/format.ts`에 공용 유틸로 있음 — 새 입력 폼 만들 때 중복 구현하지 말고 여기서 import
- 새 테이블/스키마 변경 시 SQL을 `/supabase/migrations/`에 파일로 남기기 (Supabase 대시보드에서만 클릭으로 바꾸고 끝내지 않기)

# 이 프로젝트에서 항상 지킬 것

- 사용자 인증은 이메일/비밀번호 또는 매직링크로, 딱 2명 계정만 허용 (회원가입 자체를 막거나 초대 코드 방식)
- RLS(Row Level Security)는 항상 켜두고, "우리 부부 데이터만" 접근되도록 정책 작성
- 지출 데이터 삭제는 소프트 삭제(`deleted_at` 컬럼) 선호 — 실수로 지운 내역 복구 가능하게
- 새 기능 추가할 때 과도한 설정 화면/옵션 만들지 않기 (둘만 쓰는 앱이므로 심플하게)
- 커밋 메시지는 한글로 작성 가능, 간결하게

# 하지 말 것

- 서버에 민감정보(Supabase service_role key 등) 클라이언트 코드에 노출 금지
- 불필요한 외부 라이브러리 추가 지양 (가벼운 앱 유지)
- `main` 브랜치에 직접 큰 변경 푸시하지 않기 — 기능 단위로 커밋 나누기

# 과거 삽질 & 주의사항

## Supabase RLS 관련

- **UPDATE 정책에 `WITH CHECK` 명시 필수**: `FOR UPDATE USING (...)` 만 쓰면 PostgreSQL이 `WITH CHECK`를 USING과 동일하게 적용하는데, UPDATE + RETURNING(.select()) 쿼리 시 반환 행이 0개가 되는 문제가 발생할 수 있음. UPDATE 정책엔 항상 `WITH CHECK (true)` 또는 명시적 조건 추가.

- **SELECT 정책에 `deleted_at IS NULL` 넣지 말 것**: 소프트 삭제 시 `UPDATE SET deleted_at = now()` 가 실행되는데, SELECT 정책이 `deleted_at IS NULL` 이면 업데이트 후 반환 행이 RLS에 막혀 에러 발생. 삭제 필터링은 코드에서 `.is('deleted_at', null)` 로 처리.

- **profiles 테이블은 UPDATE뿐 아니라 INSERT 정책도 필요**: upsert를 쓰거나 트리거가 누락된 유저가 있을 경우 INSERT가 발생함. INSERT 정책 없으면 RLS 에러. → `CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);`

- **Supabase UPDATE가 에러 없이 0행 업데이트**: RLS USING 조건이 맞지 않으면 에러 없이 조용히 실패함 (`error: null`, 변경 없음). 저장 성공처럼 보이지만 DB엔 아무것도 안 됨. 반드시 `.select()` 로 업데이트된 행을 확인하거나 upsert 사용.

- **profiles 행이 존재하지 않을 수 있음**: 회원가입 트리거(`handle_new_user`)가 간혹 실패하거나 트리거 생성 전에 가입한 유저는 profiles 행이 없음. profiles 쓰기는 `update` 대신 `upsert` 사용 권장. 새 유저 추가 시 `004_profiles_fix.sql` 참고.

- **Supabase JOIN 대신 별도 쿼리**: `profiles!paid_by(*)` 같은 암묵적 JOIN은 FK가 `auth.users`를 가리킬 때 동작 안 함. profiles 따로 fetch 후 JS에서 합치는 방식 사용.

- **UPDATE 정책을 등록자 본인(`auth.uid() = paid_by`)으로 좁히면 배우자가 수정/삭제 못함**: "우리 둘만 쓰는 앱"이라도 UPDATE 정책을 등록자 개인으로 제한하면 상대방이 수정·소프트삭제 버튼을 눌러도 RLS에 막혀 조용히 실패함(에러 없이 0행 업데이트). expenses/incomes처럼 부부가 공동으로 관리해야 하는 데이터는 `USING (auth.role() = 'authenticated') WITH CHECK (true)`로 두고, "내 것만 수정 가능" 제약은 애초에 걸지 않기. (`008_shared_edit_delete.sql` 참고)

- **`assets` 테이블은 소프트 삭제 대신 하드 삭제**: expenses/incomes는 "지출 로그"라 실수 복구용 `deleted_at`이 있지만, `assets`(통장/적금/주식)는 "현재 잔액 상태"를 유지하는 테이블이라 로그가 아님 → 삭제는 그냥 `DELETE` (`assets_delete` 정책 참고, `009_assets.sql`). 새 테이블 만들 때 "로그성 데이터인지 상태성 데이터인지"에 따라 소프트/하드 삭제를 구분할 것.

- **"유형"이 필요한 데이터는 처음부터 CHECK 제약 대신 관리 가능한 테이블로 분리**: `assets.type`을 `bank`/`savings`/`stock` CHECK 제약으로 시작했다가, 사용자가 유형을 직접 추가하고 싶어해서 나중에 `asset_categories`(name, color, sort_order, is_active) 테이블 + FK로 마이그레이션함(`010_asset_categories.sql`). `categories`/`income_categories`와 완전히 동일한 모양·RLS 정책(조회/추가/수정은 인증된 유저 전체 허용, 삭제 없이 `is_active` 토글만)이라 `app/settings/categories/CategoriesClient.tsx`에 탭 하나 추가하는 것만으로 관리 UI가 재사용됨. 앞으로 "유형" 개념이 새로 생기면 처음부터 이 패턴(고정 CHECK 아님) 사용.
- **`updated_at`은 DB가 자동 갱신 안 해줌**: `assets.updated_at`은 `DEFAULT now()`라 INSERT 시엔 채워지지만, UPDATE 트리거가 없어서 수정할 때마다 클라이언트 코드에서 직접 `updated_at: new Date().toISOString()`을 payload에 넣어줘야 함. 트리거 안 만들었으면 당연히 안 바뀐다는 것 잊지 말기.

## Next.js / 데이터 패칭 관련

- **서버 컴포넌트 캐싱 문제**: 탭 이동 후 돌아왔을 때 데이터가 초기화되어 보이는 문제는 서버 컴포넌트 캐싱 때문. 실시간성이 필요한 페이지엔 `export const dynamic = 'force-dynamic'` 추가.

- **클라이언트에서 Supabase 직접 읽기**: 데이터가 항상 최신이어야 하는 클라이언트 컴포넌트는 서버 props에만 의존하지 말고, `useEffect`로 마운트 시 Supabase에서 직접 읽어오는 방식 병행.

- **avatar_url은 DB에 순수 URL만 저장**: 캐시 무효화용 `?t=timestamp`는 DB에 저장하지 말 것. 표시할 때만 URL에 붙여서 사용.

- **`middleware.ts`의 인증 리다이렉트는 `/api/` 경로를 제외해야 함**: 로그인 안 된 상태로 API 라우트를 fetch하면 미들웨어가 `/login`으로 307 리다이렉트를 시켜버려서, 클라이언트는 JSON 대신 로그인 페이지 HTML을 받게 됨. `/api/`로 시작하는 경로는 리다이렉트 대신 `NextResponse.json({ error: ... }, { status: 401 })`로 처리하고, 실제 인증 체크는 각 라우트 핸들러 안에서 `supabase.auth.getUser()`로 따로 함.

## 환경 & 세팅 관련

- **Next.js 버전**: 현재 **15.3.9** 사용 중. Next.js 16은 Windows에서 Turbopack 실행 시 `0xc0000142` 에러로 크래시 → 다운그레이드 유지.
- **middleware 파일명**: Next.js 15는 `middleware.ts` + `export function middleware`. (Next.js 16은 `proxy.ts`로 바뀌었으나 현재 15 사용 중)
- **`reactCompiler: true`**: Next.js 15 config에서 유효하지 않은 옵션, 넣지 말 것.

## Vercel 배포 관련

- **Supabase redirect URL 설정 필수**: Vercel 배포 후 Supabase 대시보드 → Authentication → URL Configuration에서 Site URL과 Redirect URLs를 프로덕션 도메인으로 업데이트해야 함. 안 하면 매직링크 클릭 시 localhost로 리다이렉트됨.
  - Site URL: `https://your-app.vercel.app`
  - Redirect URLs: `https://your-app.vercel.app/**`

- **환경변수는 Vercel에 별도 등록 필요**: `.env.local`은 로컬 전용. Vercel 배포 시 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 Vercel 대시보드 또는 `npx vercel env add`로 추가해야 함. 추가 후 재배포 필요.

- **`git push` → 자동 재배포**: Vercel 프로젝트 연결 후 GitHub push 시 자동으로 재배포됨. 수동 배포 불필요.

## 구글시트 연동 관련 (`lib/google-sheets.ts`)

- **서비스 계정 키 발급이 조직 정책으로 막힐 수 있음**: `iam.disableServiceAccountKeyCreation` 정책 때문에 "서비스 계정 키를 만들 수 없습니다" 에러가 남 (개인 구글 계정이어도 최근 생성된 프로젝트엔 보안 기본값으로 걸려있는 경우가 많음). 조직 정책 관리자 권한 없이는 못 풂. → **서비스 계정 대신 OAuth(클라이언트 ID/보안비밀 + refresh token) 방식 사용.** 시트를 서비스 계정과 공유할 필요도 없어짐 (본인 계정 소유 시트 그대로 사용).

- **OAuth 동의 화면이 "테스트" 상태면 등록된 테스트 사용자만 로그인 가능**: 테스트 사용자로 등록 안 된 계정으로 인증 시도하면 "현재 테스트 중이며 승인된 테스터만 액세스 가능" (`access_denied`) 에러. OAuth 동의 화면 > 테스트 사용자에 실제 로그인할 구글 계정 이메일을 미리 추가해야 함.

- **refresh token은 OAuth Playground(https://developers.google.com/oauthplayground)로 발급받는 게 제일 간단함**: 별도 스크립트 없이, 설정에서 "Use your own OAuth credentials" 체크 후 클라이언트 ID/보안비밀 입력 → Sheets 스코프(`.../auth/spreadsheets`) 선택해서 Authorize → "Exchange authorization code for tokens"로 refresh token 획득. OAuth 클라이언트는 "웹 애플리케이션" 타입으로 만들고 승인된 리디렉션 URI에 OAuth Playground 주소를 등록해둬야 함.

- **⚠️ "테스트" 상태에서 발급한 refresh token은 7일 뒤 만료됨**: OAuth 동의 화면 발행 상태를 Testing → **In production**으로 바꾸면(실제 구글 검증 심사 아님, 그냥 발행 상태 전환) 이 7일 제한이 사라짐. 둘만 쓰는 앱이라 "확인되지 않은 앱" 경고가 떠도 무시하고 진행하면 됨. **발행 상태를 바꾼 뒤에는 refresh token을 다시 발급받아서 교체하는 게 안전.**

- **탭(시트) 이름 = "YYYY년 M월"로 관리**: `exportMonthToGoogleSheet`가 같은 이름의 탭이 있으면 지우고 다시 쓰고, 없으면 새로 만듦. 같은 달을 여러 번 내보내도 중복 탭이 안 생기는 구조.

- **환경변수 4개 필요, 로컬/Vercel 둘 다 등록**: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_SHEET_ID`. `.env.local.example`엔 플레이스홀더만 두고 실제 값은 절대 넣지 않기 (실수로 넣었던 적 있음 — 다행히 이 파일은 `.gitignore`(`​.env*`)에 걸려 커밋된 적 없지만, "example" 파일에 진짜 시크릿을 두는 습관은 위험하니 주의).

## Supabase 인증 관련

- **매직링크 이메일 rate limit**: Supabase 무료 플랜은 OTP/매직링크 이메일 발송에 시간당 횟수 제한이 있음. 짧은 시간에 여러 번 요청하면 429 에러 발생. 비밀번호 로그인을 함께 지원하는 것이 좋음 (`signInWithPassword`). 현재 로그인 페이지는 비밀번호/매직링크 탭 전환 방식으로 구현되어 있음.

## 다크모드 관련

- **Tailwind v4에서 클래스 기반 다크모드는 `@custom-variant` 등록 필요**: 기본값은 `prefers-color-scheme` 미디어쿼리 기반이라 설정 화면에서 수동 토글이 안 먹힘. `globals.css`에 `@custom-variant dark (&:where(.dark, .dark *));` 추가하고, `<html>`에 `.dark` 클래스를 붙였다 뗐다 하는 방식으로 전환 (`lib/theme.ts` 참고). 깜빡임(FOUC) 방지를 위해 `layout.tsx`에 `strategy="beforeInteractive"` 스크립트로 페인트 전에 클래스를 미리 적용해야 함.

- **Tailwind 색상에 opacity 접미사(`/50` 등)가 붙은 클래스는 일괄 치환 스크립트가 깨뜨리기 쉬움**: 예를 들어 `bg-blue-50/50`에 자동으로 `dark:` 변형을 삽입하는 정규식이 `/50`을 못 알아보고 중간에 끼어들면 `bg-blue-50 dark:bg-blue-500/10/50`처럼 무효한 클래스가 생기고, Tailwind가 이를 조용히 무시해버려서 라이트모드용 배경이 다크모드에도 그대로 남는 버그가 생김(글씨가 안 보이는 등). Tailwind 클래스를 스크립트로 일괄 수정할 땐 `/\d+` opacity 접미사가 붙은 클래스가 있는지 먼저 확인할 것.

- **"검정 배경 + 흰 글씨" 버튼(`bg-gray-900 text-white`)은 다크모드에서 단순히 dark: 색만 얹으면 안 되고 반전시켜야 함**: 로그인 버튼, 결제자 선택 필 같은 요소는 다크모드에서 `dark:bg-gray-100 dark:text-gray-900`처럼 밝은 배경+어두운 글씨로 뒤집어야 배경(다크 카드와 거의 같은 색)에 묻히지 않음. `text-white`가 다른 조건부 분기(예: 초록 버튼)와 공유되는 경우 자동 치환이 위험하므로 이런 곳은 수동으로 확인.

- **탭 안의 "선택된 필"(`bg-white shadow-sm`)은 트랙(`bg-gray-100`)보다 밝은 다크 색을 써야 함**: 둘 다 기계적으로 `dark:bg-gray-900`를 넣으면 트랙(`dark:bg-gray-800`)보다 필이 더 어두워져서 오목하게 들어가 보임. 필은 `dark:bg-gray-700`처럼 트랙보다 한 단계 밝게.

## 레이아웃 / 스크롤 관련

- **`flex flex-col h-full` 안의 스크롤 영역(`<main overflow-y-auto>`)에는 반드시 `min-h-0` 필요**: 없으면 flex 아이템 기본값(`min-height: auto`) 때문에 내용이 길어질 때 `<main>`이 자기 콘텐츠 크기만큼 커져버려서, `<main>` 내부가 아니라 페이지 전체(헤더 포함)가 스크롤됨 — "스크롤하면 위 영역을 넘어서는 느낌"의 원인이었음.

- **`<header>`가 `<nav>`(`position: fixed`)처럼 콘텐츠가 뒤로 지나가는 느낌을 내려면 `sticky`를 쓰고, 반드시 스크롤 컨테이너의 자손이어야 함**: header를 `<main>`의 형제로 두면 sticky가 동작할 스크롤 컨테이너가 없어서 아무 효과가 없음. `<main>` 안의 첫 자식으로 넣고 `sticky top-0`을 줘야 함.

- **하단 고정 네비게이션의 안전영역은 실제 CSS로 확보해야 함**: `safe-area-inset-bottom`이라는 이름의 클래스를 그냥 쓰면 아무 정의가 없는 죽은 클래스라 효과가 없음(존재하지 않는 유틸리티는 조용히 무시됨). `pb-[env(safe-area-inset-bottom)]`처럼 실제 CSS 환경변수를 써야 노치/홈 인디케이터 기기에서 제대로 여백이 생김. 스크롤 영역 하단 패딩도 `pb-24` 같은 고정값 대신 `pb-[calc(6rem+env(safe-area-inset-bottom))]`처럼 안전영역을 더해서 기기별로 자동 대응. 헤더 위쪽도 동일하게 `pt-[calc(3rem+env(safe-area-inset-top))]`.

- **가로 방향도 `flex-1` 요소에 `min-w-0` 필요 — 특히 `<input>`**: `min-h-0` 세로 버전과 똑같은 원리로, `<input className="flex-1">`이 옆에 버튼이 있는 `flex` 줄 안에 있으면 기본값(`min-width: auto`) 때문에 좁은 화면에서 안 줄어들고 버튼을 화면 밖으로 밀어냄 (설정 페이지 닉네임 저장 버튼이 잘려서 가로 스크롤해야 했던 원인). input엔 `min-w-0`, 옆의 고정 크기여야 하는 버튼엔 `flex-shrink-0`을 짝으로 넣기.

- **버튼이 여러 개 있는 헤더 줄은 실제 데이터(큰 금액 등)로 넘칠 수 있음**: 소득/지출 금액 + 아이콘 버튼 여러 개를 한 줄(`flex justify-between`)에 다 넣으면, 개발 중엔 0원이라 안 보이다가 실제 금액(백만 단위 이상)이 들어가면 줄이 넘쳐서 페이지 전체가 가로로 밀림. 버튼이 3개 이상이거나 숫자 길이가 가변적인 줄은 애초에 줄을 나누거나(소득/지출 줄 + 버튼 줄) `overflow-x-auto`로 개별 스크롤 처리.

## 개발 중 검증 방법

- **로그인 없이 인증된 페이지의 레이아웃을 시각 검증하려면**: `middleware.ts`의 `isPublicPath`에 임시 경로(예: `/scrolltest`)를 추가하고 `app/` 아래 같은 이름으로 임시 라우트를 만들어 실제 컴포넌트 구조를 재현한 뒤 스크린샷으로 확인. **끝나면 라우트 삭제 + middleware 원복 필수** (커밋에 테스트 코드 남기지 않기). 라우트 폴더명에 `_` 접두사를 쓰면 Next.js가 private folder로 취급해 라우팅에서 제외하니 주의.

- **레이아웃 검증은 0/빈 값이 아니라 실제 크기의 데이터로 해야 함**: 금액 0원, 짧은 이름 등 빈 상태로 테스트하면 넘침 버그가 안 보임. 백만 원 단위 금액, 20자에 가까운 닉네임처럼 실제로 나올 수 있는 최대치로 테스트하고, 좁은 화면(360px)부터 확인. `document.querySelectorAll('*')`로 각 요소의 `scrollWidth > clientWidth` 비교해서 넘치는 요소를 바로 찾아낼 수 있음.

- **빌드가 `Cannot find module './xxx.js'` 같은 에러로 실패하면**: `.next` 캐시가 깨진 경우가 많음 (원인 불명, Windows 파일시스템 관련 추정). `rm -rf .next` 후 재시도. 방금 `rm -rf .next` 하고 새로 빌드했는데도 또 깨지는 경우도 있었음 — 그럴 땐 그냥 한 번 더 `rm -rf .next` + 재빌드하면 통과됨.

- **`npm run dev`를 백그라운드로 띄우고 PID로 `taskkill` 해도 포트가 안 풀릴 때가 있음**: Windows에서 `npm run dev &`로 띄운 프로세스를 종료해도 자식 프로세스가 남아 포트(3000)를 계속 점유하는 경우 있었음 — 다음 `npm run dev`가 "Port 3000 is in use"로 3001로 자동 전환됨. 개발 서버 껐다고 생각했으면 `netstat -ano | grep :3000` 으로 실제로 안 떠 있는지 확인할 것.

- **UI 변경 후 Chrome 브라우저 자동화로 시각 검증하지 않기**: 사용자가 직접 폰/브라우저로 확인함 (Chrome 자동화 검증이 느려서 원치 않음). 코드 수정 후에는 `npm run build`/`npm run lint`까지만 확인하고, 실제 화면 확인은 사용자에게 맡길 것.

## PWA / Service Worker 관련

- **PWA 아이콘 파일 필수**: `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`(아이폰 홈 화면용, `layout.tsx`의 `metadata.icons.apple`에서 참조) 파일이 없으면 404 에러 발생. manifest.json/layout.tsx에서 참조하는 아이콘 파일은 반드시 실제로 존재해야 함 — `apple-touch-icon.png`는 한동안 코드에서 참조만 하고 실제 파일이 없던 적 있었음.

- **아이콘 파일을 교체해도 이미 홈 화면에 설치된 앱은 자동으로 안 바뀜**: PWA 아이콘은 설치 시점에 기기에 캐시됨. 새 아이콘을 반영하려면 기존 홈 화면 아이콘을 삭제하고 다시 추가해야 함 — 배포만으로는 갱신 안 됨.

- **아이콘류를 코드로 생성할 땐 `sharp` 사용 가능**: `node_modules`에 이미 설치돼 있음(Next.js 이미지 최적화 의존성). SVG 문자열을 만들어 `sharp(Buffer.from(svg)).resize(size).png().toFile(path)`로 래스터화하면 별도 디자인 툴 없이 아이콘 생성 가능. 로그인 페이지 하트 배지와 동일한 아이콘을 만들 때 lucide `Heart`의 실제 path data(`node_modules/lucide-react/dist/esm/icons/heart.mjs`)를 그대로 가져다 씀.

- **Service Worker에서 chrome-extension URL 필터링**: `fetch` 이벤트 핸들러에서 `http`/`https`가 아닌 스킴(chrome-extension 등)을 캐싱하려 하면 TypeError 발생. fetch 핸들러 최상단에 `if (!event.request.url.startsWith('http')) return` 추가 필수.

## UI / UX 패턴 관련

- **바텀시트보다 전체화면 페이지가 UX상 낫다**: 입력 폼처럼 내용이 많은 경우 바텀시트 모달보다 전용 페이지(`/expenses/add`, `/recurring/apply` 등)로 분리하는 게 스크롤 처리나 뒤로가기 UX 면에서 훨씬 자연스러움.

- **`useSearchParams`는 반드시 Suspense로 감싸야 함**: Next.js App Router에서 `useSearchParams()`를 사용하는 클라이언트 컴포넌트는 `<Suspense>`로 감싸지 않으면 빌드/런타임 에러 발생.

- **브라우저 native alert/confirm 금지**: `alert()`, `confirm()`은 모바일 PWA에서 UX가 나쁨. `components/Dialog.tsx`의 `useConfirm` 훅을 사용할 것. Promise 기반으로 `await confirm('메시지')`처럼 사용 가능.

- **라우트 전환 로딩은 `loading.tsx`로**: 각 페이지가 서버 컴포넌트에서 `supabase.auth.getUser()`를 거친 뒤 렌더링되는 구조라, 프리티어 환경에선 탭 이동 시 잠깐 빈 화면처럼 보일 수 있음. 라우트 세그먼트마다 `loading.tsx`를 두면 Next.js가 그 대기 시간 동안 자동으로 보여줌 — 별도 상태 관리 없이 파일만 추가하면 됨. 컴포넌트 내부 데이터 재조회(월 변경, 필터 변경 등) 로딩은 `components/Skeleton.tsx`의 스켈레톤 조각들(`EntryListSkeleton`, `StatsContentSkeleton`, `CardListSkeleton`, `FormSkeleton` 등)로 통일해서 사용.

- **결제자/수취인 등 사람 표시는 `PersonAvatar` 사용**: 이모지나 이니셜을 직접 하드코딩하지 말고 `components/PersonAvatar.tsx` 사용 — `avatar_url` 있으면 사진, 없으면 이름 첫 글자로 자동 fallback.

- **아이콘은 이모지 대신 `lucide-react`**: 메뉴/버튼/빈 상태 아이콘 등 새로 추가할 때 이모지 쓰지 말고 `lucide-react`에서 가져다 쓰기 (`import { Wallet } from 'lucide-react'`). 앱 전체가 이 라이브러리로 통일되어 있음.

- **하단 네비(`components/BottomNav.tsx`)는 가운데 FAB 없이 5개 탭 균등폭 구조**: 원래 4탭 + 가운데 `+` FAB이었는데, 탭이 하나 늘면서(자산관리 추가) 자리가 없어 FAB을 없앰. 탭 순서는 **가계부 → 고정비 → 자산 → 통계 → 설정**.
- **각 화면 상단 헤더는 "제목 + 오른쪽 `+ 추가` 버튼" 한 줄로 통일**: 가계부/고정비/자산관리 전부 동일한 패턴(`text-lg font-bold` 제목 + `text-sm text-blue-500 ... bg-blue-50` 스타일의 `+ 추가` 버튼). 가계부는 한때 우하단 `fixed` FAB으로 추가 버튼을 따로 뒀었지만, 다른 화면과의 일관성을 위해 제거하고 헤더 버튼 하나로 통일함 — 새 목록형 화면 추가 시 이 패턴 유지.
- **연/월 선택은 `components/YearMonthPicker.tsx` 재사용**: 가계부/통계 헤더의 "‹ 2026년 7월 ›" 가운데 텍스트를 탭하면 뜨는 바텀시트형 모달 — prev/next 화살표를 여러 번 눌러 1년 전으로 이동하는 대신, 연도를 넘기면서 원하는 월을 바로 탭해서 이동 가능. `month` prop을 생략하면 연도만 고르는 모드로 동작(통계의 "연별" 보기에서 사용). 새로운 날짜 네비게이션이 필요하면 이 컴포넌트부터 재사용할 것.
- **리스트 항목의 수정/삭제는 연필/휴지통 아이콘 버튼 쌍으로 통일**: `w-7 h-7 rounded-lg` 크기에 수정은 `hover:bg-gray-100`, 삭제는 `hover:bg-red-50 hover:text-red-500` 스타일 (자산관리 리스트가 기준, 가계부/고정비 리스트도 동일하게 맞춤). 가계부 리스트는 예전엔 행 전체를 눌러도 수정 페이지로 이동했는데, 수정 버튼이 따로 생기면서 행 클릭 이동은 제거함 — 수정은 항상 연필 버튼으로만.
