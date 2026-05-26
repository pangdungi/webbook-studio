import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { bookEditorCss } from "@/lib/typography/bookStyles";
import "./globals.css";

const notoSerif = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
});

const notoSans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sans-kr",
});

export const metadata: Metadata = {
  title: "Webbook Studio",
  description: "웹북 작성·출판·리더 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSerif.variable} ${notoSans.variable} h-full`}>
      <body className="h-full min-h-full bg-stone-50 font-sans antialiased">
        <style dangerouslySetInnerHTML={{ __html: bookEditorCss() }} />
        {children}
      </body>
    </html>
  );
}
