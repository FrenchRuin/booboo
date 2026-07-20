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

## Next.js / 데이터 패칭 관련

- **서버 컴포넌트 캐싱 문제**: 탭 이동 후 돌아왔을 때 데이터가 초기화되어 보이는 문제는 서버 컴포넌트 캐싱 때문. 실시간성이 필요한 페이지엔 `export const dynamic = 'force-dynamic'` 추가.

- **클라이언트에서 Supabase 직접 읽기**: 데이터가 항상 최신이어야 하는 클라이언트 컴포넌트는 서버 props에만 의존하지 말고, `useEffect`로 마운트 시 Supabase에서 직접 읽어오는 방식 병행.

- **avatar_url은 DB에 순수 URL만 저장**: 캐시 무효화용 `?t=timestamp`는 DB에 저장하지 말 것. 표시할 때만 URL에 붙여서 사용.

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

## 개발 중 검증 방법

- **로그인 없이 인증된 페이지의 레이아웃을 시각 검증하려면**: `middleware.ts`의 `isPublicPath`에 임시 경로(예: `/scrolltest`)를 추가하고 `app/` 아래 같은 이름으로 임시 라우트를 만들어 실제 컴포넌트 구조를 재현한 뒤 스크린샷으로 확인. **끝나면 라우트 삭제 + middleware 원복 필수** (커밋에 테스트 코드 남기지 않기). 라우트 폴더명에 `_` 접두사를 쓰면 Next.js가 private folder로 취급해 라우팅에서 제외하니 주의.

- **빌드가 `Cannot find module './xxx.js'` 같은 에러로 실패하면**: `.next` 캐시가 깨진 경우가 많음 (원인 불명, Windows 파일시스템 관련 추정). `rm -rf .next` 후 재시도.

## PWA / Service Worker 관련

- **PWA 아이콘 파일 필수**: `public/icons/icon-192.png`, `public/icons/icon-512.png` 파일이 없으면 404 에러 발생. manifest.json에서 참조하는 아이콘 파일은 반드시 실제로 존재해야 함.

- **Service Worker에서 chrome-extension URL 필터링**: `fetch` 이벤트 핸들러에서 `http`/`https`가 아닌 스킴(chrome-extension 등)을 캐싱하려 하면 TypeError 발생. fetch 핸들러 최상단에 `if (!event.request.url.startsWith('http')) return` 추가 필수.

## UI / UX 패턴 관련

- **바텀시트보다 전체화면 페이지가 UX상 낫다**: 입력 폼처럼 내용이 많은 경우 바텀시트 모달보다 전용 페이지(`/expenses/add`, `/recurring/apply` 등)로 분리하는 게 스크롤 처리나 뒤로가기 UX 면에서 훨씬 자연스러움.

- **`useSearchParams`는 반드시 Suspense로 감싸야 함**: Next.js App Router에서 `useSearchParams()`를 사용하는 클라이언트 컴포넌트는 `<Suspense>`로 감싸지 않으면 빌드/런타임 에러 발생.

- **브라우저 native alert/confirm 금지**: `alert()`, `confirm()`은 모바일 PWA에서 UX가 나쁨. `components/Dialog.tsx`의 `useConfirm` 훅을 사용할 것. Promise 기반으로 `await confirm('메시지')`처럼 사용 가능.

- **라우트 전환 로딩은 `loading.tsx`로**: 각 페이지가 서버 컴포넌트에서 `supabase.auth.getUser()`를 거친 뒤 렌더링되는 구조라, 프리티어 환경에선 탭 이동 시 잠깐 빈 화면처럼 보일 수 있음. 라우트 세그먼트마다 `loading.tsx`를 두면 Next.js가 그 대기 시간 동안 자동으로 보여줌 — 별도 상태 관리 없이 파일만 추가하면 됨. 컴포넌트 내부 데이터 재조회(월 변경, 필터 변경 등) 로딩은 `components/Skeleton.tsx`의 스켈레톤 조각들(`EntryListSkeleton`, `StatsContentSkeleton`, `CardListSkeleton`, `FormSkeleton` 등)로 통일해서 사용.

- **결제자/수취인 등 사람 표시는 `PersonAvatar` 사용**: 이모지나 이니셜을 직접 하드코딩하지 말고 `components/PersonAvatar.tsx` 사용 — `avatar_url` 있으면 사진, 없으면 이름 첫 글자로 자동 fallback.

- **아이콘은 이모지 대신 `lucide-react`**: 메뉴/버튼/빈 상태 아이콘 등 새로 추가할 때 이모지 쓰지 말고 `lucide-react`에서 가져다 쓰기 (`import { Wallet } from 'lucide-react'`). 앱 전체가 이 라이브러리로 통일되어 있음.
