export function bookPdfDownloadFilename(title: string) {
  const base =
    title
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "webbook";
  return `${base}.pdf`;
}
