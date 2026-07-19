# 프로젝트 개요

신혼부부 둘이서만 쓰는 간단한 가계부 웹앱.
목표: 지출 입력, 카테고리별/월별 집계, 서로 실시간으로 확인.
사용자는 정확히 2명 (부부). 복잡한 권한/공유 로직 불필요 — "우리 둘" 고정 전제.

# 기술 스택

- **프레임워크**: Next.js (App Router, TypeScript)
- **스타일링**: Tailwind CSS
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

## Next.js / 데이터 패칭 관련

- **서버 컴포넌트 캐싱 문제**: 탭 이동 후 돌아왔을 때 데이터가 초기화되어 보이는 문제는 서버 컴포넌트 캐싱 때문. 실시간성이 필요한 페이지엔 `export const dynamic = 'force-dynamic'` 추가.

- **클라이언트에서 Supabase 직접 읽기**: 데이터가 항상 최신이어야 하는 클라이언트 컴포넌트는 서버 props에만 의존하지 말고, `useEffect`로 마운트 시 Supabase에서 직접 읽어오는 방식 병행.

- **avatar_url은 DB에 순수 URL만 저장**: 캐시 무효화용 `?t=timestamp`는 DB에 저장하지 말 것. 표시할 때만 URL에 붙여서 사용.

## 환경 & 세팅 관련

- **Next.js 버전**: 현재 **15.3.9** 사용 중. Next.js 16은 Windows에서 Turbopack 실행 시 `0xc0000142` 에러로 크래시 → 다운그레이드 유지.
- **middleware 파일명**: Next.js 15는 `middleware.ts` + `export function middleware`. (Next.js 16은 `proxy.ts`로 바뀌었으나 현재 15 사용 중)
- **`reactCompiler: true`**: Next.js 15 config에서 유효하지 않은 옵션, 넣지 말 것.
