export async function uploadBookImage(
  file: File,
  bookId: string,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bookId", bookId);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  const data = (await res.json()) as { url?: string | null; error?: string };

  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "이미지 업로드에 실패했습니다.");
  }

  return data.url;
}

export function imageFilesFromDataTransfer(
  dataTransfer: DataTransfer | null | undefined,
): File[] {
  if (!dataTransfer) return [];

  const fromFiles = Array.from(dataTransfer.files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );
  if (fromFiles.length > 0) return fromFiles;

  return Array.from(dataTransfer.items ?? [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file != null);
}

export function dataTransferMayContainImage(
  dataTransfer: DataTransfer | null | undefined,
): boolean {
  if (!dataTransfer) return false;
  if (imageFilesFromDataTransfer(dataTransfer).length > 0) return true;

  const items = Array.from(dataTransfer.items ?? []);
  if (items.some((item) => item.kind === "file" && item.type.startsWith("image/"))) {
    return true;
  }

  return dataTransfer.types.includes("Files");
}
