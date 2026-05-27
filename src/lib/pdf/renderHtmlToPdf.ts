const PDF_RENDER_TIMEOUT_MS = 90_000;

/** A4 @ 96dpi — Playwright가 축소하지 않도록 뷰포트를 용지와 맞춤 */
const A4_WIDTH_PX = Math.round((210 / 25.4) * 96);
const A4_HEIGHT_PX = Math.round((297 / 25.4) * 96);

/** Playwright로 HTML → PDF (서버에 Chromium 필요) */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(
      "PDF 생성 모듈(playwright)을 불러올 수 없습니다. npm install 후 npx playwright install chromium 을 실행해 주세요.",
    );
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: A4_WIDTH_PX, height: A4_HEIGHT_PX },
    });
    await page.emulateMedia({ media: "print" });
    await page.setContent(html, {
      waitUntil: "networkidle",
      timeout: PDF_RENDER_TIMEOUT_MS,
    });
    await page.evaluate(() => document.fonts.ready);
    const bytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      scale: 1,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(bytes);
  } finally {
    await browser.close();
  }
}
