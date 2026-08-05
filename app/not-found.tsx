import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Сторінку не знайдено — VAcleaner",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="not-found-page">
      <p>404 · VAcleaner</p>
      <h1>Цієї сторінки немає.</h1>
      <Link href="/">Повернутися на головну →</Link>
    </main>
  );
}
