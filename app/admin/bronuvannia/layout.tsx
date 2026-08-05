import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VAcleaner Manager",
  description: "Календар техніки та керування бронюваннями VAcleaner",
  robots: { index: false, follow: false },
};

export default function BookingAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
