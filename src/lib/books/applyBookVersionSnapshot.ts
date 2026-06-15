import type { BookVersionSnapshot } from "@/lib/books/bookVersionSnapshot";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 스냅샷을 DB 책·장에 반영 (복원) */
export async function applyBookVersionSnapshot(
  supabase: SupabaseClient,
  bookId: string,
  snapshot: BookVersionSnapshot,
) {
  const { error: bookError } = await supabase
    .from("books")
    .update({
      title: snapshot.book.title,
      subtitle: snapshot.book.subtitle,
      cover_path: snapshot.book.cover_path ?? null,
      cover_bg_color: snapshot.book.cover_bg_color,
      cover_title_color: snapshot.book.cover_title_color,
      heading_fonts: snapshot.book.heading_fonts,
      reader_pitch: snapshot.book.reader_pitch,
      reader_analysis: snapshot.book.reader_analysis,
    })
    .eq("id", bookId);

  if (bookError) throw new Error(bookError.message);

  const { data: existing } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId);

  const snapshotIds = new Set(snapshot.chapters.map((c) => c.id));
  const toDelete = (existing ?? [])
    .map((r) => r.id)
    .filter((id) => !snapshotIds.has(id));

  if (toDelete.length > 0) {
    const { error: delError } = await supabase
      .from("chapters")
      .delete()
      .in("id", toDelete);
    if (delError) throw new Error(delError.message);
  }

  for (const ch of snapshot.chapters) {
    const { error } = await supabase.from("chapters").upsert(
      {
        id: ch.id,
        book_id: bookId,
        title: ch.title,
        sort_order: ch.sort_order,
        content_json: ch.content_json,
        content_html: ch.content_html,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
  }
}
