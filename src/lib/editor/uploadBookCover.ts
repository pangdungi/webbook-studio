export async function uploadBookCover(
  file: File,
  bookId: string,
): Promise<{ path: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bookId", bookId);
  formData.append("purpose", "cover");

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  const data = (await res.json()) as {
    path?: string;
    url?: string | null;
    error?: string;
  };

  if (!res.ok || !data.path || !data.url) {
    throw new Error(data.error ?? "표지 이미지 업로드에 실패했습니다.");
  }

  return { path: data.path, url: data.url };
}
