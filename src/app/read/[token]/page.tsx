import { ReaderPageClient } from "@/components/reader/ReaderPageClient";

type PageProps = { params: Promise<{ token: string }> };

export default async function ReadPage({ params }: PageProps) {
  const { token } = await params;
  return <ReaderPageClient token={token} />;
}
