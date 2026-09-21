import { applyPdfPagination } from "@/lib/pdf/applyPdfPagination";
import {
  BOOK_EDITOR_PAGE_HEIGHT_PX,
  BOOK_EDITOR_PAGE_WIDTH_PX,
  PDF_A4_PRINT_SCALE,
} from "@/lib/pdf/bookPdfLayout";

const PDF_RENDER_TIMEOUT_MS = 60_000;
const PDF_FONT_READY_MS = 12_000;

async function waitForFonts(page: import("playwright").Page) {
  await Promise.race([
    page.evaluate(() => document.fonts.ready),
    new Promise((resolve) => setTimeout(resolve, PDF_FONT_READY_MS)),
  ]);
}

/** Playwright로 HTML → PDF (편집기 672×950 레이아웃 → A4 비율 확대) */
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
      viewport: {
        width: BOOK_EDITOR_PAGE_WIDTH_PX,
        height: BOOK_EDITOR_PAGE_HEIGHT_PX,
      },
      deviceScaleFactor: 1,
    });
    /* print 미디어는 calc/mm·font-size를 깨뜨릴 수 있음 — 편집기와 동일한 screen 레이아웃 */
    await page.emulateMedia({ media: "screen" });
    await page.setContent(html, {
      waitUntil: "load",
      timeout: PDF_RENDER_TIMEOUT_MS,
    });
    await waitForFonts(page);
    await applyPdfPagination(page);
    const bytes = await Promise.race([
      page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: false,
        scale: PDF_A4_PRINT_SCALE,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("PDF 렌더 시간 초과")),
          PDF_RENDER_TIMEOUT_MS,
        ),
      ),
    ]);
    return Buffer.from(bytes);
  } finally {
    await browser.close();
  }
}
