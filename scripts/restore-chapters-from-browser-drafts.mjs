/**
 * 로컬 편집기(localhost)에서보낸 브라우저 백업 JSON → Supabase 장 복구
 *
 * 1) localhost 편집기에서 F12 → 콘솔 → scripts/export-browser-drafts-console.js 내용 실행
 * 2) 다운로드된 drafts-....json 을 이 스크립트에 전달
 *
 * RECOVER_BOOK_ID=536f7e23-... DRAFTS_JSON=./drafts.json node scripts/restore-chapters-from-browser-drafts.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1).replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOOK_ID = process.env.RECOVER_BOOK_ID;
const DRAFTS_JSON = process.env.DRAFTS_JSON;

if (!SUPABASE_URL || !SERVICE_KEY || !BOOK_ID || !DRAFTS_JSON) {
  console.error(
    "Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECOVER_BOOK_ID, DRAFTS_JSON",
  );
  process.exit(1);
}

const drafts = JSON.parse(readFileSync(DRAFTS_JSON, "utf8"));
if (!Array.isArray(drafts)) {
  console.error("DRAFTS_JSON must be an array of chapter draft backups");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

let restored = 0;
for (const draft of drafts) {
  if (draft.bookId !== BOOK_ID || !draft.chapterId || !draft.contentJson) {
    console.warn("Skip invalid draft", draft.chapterId);
    continue;
  }

  const pages = draft.contentJson?.pages;
  if (!Array.isArray(pages)) {
    console.warn("Skip — no pages", draft.chapterId);
    continue;
  }

  const contentHtml = typeof draft.contentHtml === "string" ? draft.contentHtml : "";

  const { data, error } = await sb
    .from("chapters")
    .update({
      content_json: draft.contentJson,
      content_html: contentHtml,
    })
    .eq("id", draft.chapterId)
    .eq("book_id", BOOK_ID)
    .select("id, title")
    .single();

  if (error) {
    console.error("Failed", draft.chapterId, error.message);
    continue;
  }

  const subs = pages
    .filter((p) => p.kind === "content")
    .map((p) => p.title || "(부제목 없음)");
  console.log("OK", data.title, "부제목:", subs.join(" | "));
  restored += 1;
}

console.log(`\n복구 완료: ${restored}개 장. localhost 편집기 새로고침 후 확인.`);
