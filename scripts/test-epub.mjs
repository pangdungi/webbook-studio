import { buildEpubBuffer } from "../src/lib/epub/builder";

async function main() {
  const buffer = await buildEpubBuffer(
    {
      title: "샘플 웹북",
      subtitle: "E2E 테스트",
      writing_mode: "horizontal-tb",
      cover_path: null,
    },
    [
      {
        title: "1장. 시작",
        content_html:
          "<h1>시작</h1><p>이것은 가로쓰기 샘플 챕터입니다. 모바일과 데스크탑에서 읽기 좋게 리플로우됩니다.</p>",
      },
      {
        title: "2장. 세로쓰기 예시",
        content_html:
          "<h2>세로쓰기</h2><p>출판 시 writing_mode를 vertical-rl로 설정하면 세로쓰기 EPUB이 생성됩니다.</p>",
      },
    ],
  );

  if (buffer.length < 1000) {
    throw new Error("EPUB buffer too small");
  }

  console.log(`EPUB generated: ${buffer.length} bytes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
