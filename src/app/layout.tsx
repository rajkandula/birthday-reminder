import type { Metadata } from "next";

// Self-hosted fonts: bundled at build time, so builds never depend on reaching Google Fonts.
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Wishly — never miss a birthday", template: "%s · Wishly" },
  description:
    "Save the birthdays of the people you care about. Wishly writes a personal, beautifully designed email and sends it from you on the day.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
