import JSZip from "jszip";

/** 목차(toc.xhtml)를 읽기 순서에서 제외 — 본문부터 시작 */
export async function markTocNonLinear(epubBuffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(epubBuffer);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) return epubBuffer;

  const rootfileMatch = container.match(/full-path="([^"]+)"/);
  const opfPath = rootfileMatch?.[1];
  if (!opfPath) return epubBuffer;

  const opfFile = zip.file(opfPath);
  if (!opfFile) return epubBuffer;

  let opf = await opfFile.async("string");
  opf = opf.replace(
    /<itemref\s+idref="toc"\s*\/>/,
    '<itemref idref="toc" linear="no"/>',
  );

  zip.file(opfPath, opf);
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}
