import type { Metadata, Viewport } from "next";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { bookEditorCss } from "@/lib/typography/bookStyles";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webbook Studio",
  description: "웹북 작성·출판·리더 플랫폼",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&family=Noto+Serif+KR:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full min-h-full bg-stone-50 font-sans antialiased">
        <style dangerouslySetInnerHTML={{ __html: bookEditorCss() }} />
        <SupabaseProvider url={supabaseUrl} anonKey={supabaseAnonKey}>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
