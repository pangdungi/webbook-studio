# Webbook Studio

관리자 전용 웹북 작성·출판 CMS와 매직링크 EPUB 리더 플랫폼입니다.

## 기능

- **관리자 작성 모드**: TipTap 리치 에디터, 목차(챕터) 관리, 이미지 업로드, 자동 저장
- **맞춤법 검사**: OpenAI/Anthropic 또는 로컬 규칙 기반 교정
- **출판**: EPUB 3 생성 후 Supabase Storage 저장
- **독자 리더**: `/read/[token]` — 스크롤/페이지 모드, 목차, 반응형
- **매직링크**: 책별 접근 토큰 생성·폐기, Edge Function으로 외부 발급

## 시작하기

### 1. Supabase 프로젝트

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/20260526100000_initial_schema.sql` 실행
3. Storage에서 버킷 생성 (Private):
   - `book-assets` — 이미지·표지
   - `book-epubs` — 출판 EPUB
4. Auth에서 관리자 계정 생성 후, SQL로 역할 부여:

```sql
update public.profiles set role = 'admin' where id = 'YOUR_USER_UUID';
```

### 2. 환경 변수

```bash
cp .env.example .env.local
```

`.env.local`에 Supabase URL/키, `NEXT_PUBLIC_SITE_URL`, (선택) `OPENAI_API_KEY` 설정.

### 3. 실행

```bash
npm install --cache ./.npm-cache
npm run dev
```

## Edge Function: 독자 링크 발급 (자사몰 연동용)

```bash
supabase functions deploy issue-book-access
```

**요청**

```http
POST /functions/v1/issue-book-access
Content-Type: application/json
x-issue-secret: YOUR_SECRET

{
  "book_id": "uuid",
  "email": "buyer@example.com",
  "order_id": "ORDER-123",
  "expires_in_days": 365
}
```

**응답**

```json
{
  "token": "...",
  "url": "https://your-site.com/read/...",
  "expires_at": null,
  "book_id": "uuid"
}
```

## 라우트

| 경로 | 설명 |
|------|------|
| `/` | 홈 — 관리자: 책 목록 / 비관리자: 안내 |
| `/login` | 관리자 로그인 |
| `/admin/books/[id]/edit` | 작성 모드 |
| `/read/[token]` | 독자 EPUB 리더 |

## 기술 스택

Next.js 16 · Supabase · TipTap · epub-gen-memory · react-reader (EPUB.js)
