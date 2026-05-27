-- 책별 독자 타겟 분석 (기획용)

alter table public.books
  add column if not exists reader_pitch text not null default '',
  add column if not exists reader_analysis jsonb;

comment on column public.books.reader_pitch is '책 내용 요약·기획 메모 (독자 분석 입력)';
comment on column public.books.reader_analysis is 'AI 독자 타겟 분석 리포트 JSON';
