import type { Metadata } from "next";
import { EB_Garamond, Figtree } from "next/font/google";
import { APP_NAME } from "@/lib/brand";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import "./studio.css";

const sans = Figtree({ variable: "--font-sans", subsets: ["latin"] });
const serif = EB_Garamond({ variable: "--font-serif", subsets: ["latin"], style: ["normal", "italic"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: `${APP_NAME}: design systems, see the cost`,
  description: "Sketch a system, set the traffic, and see what it costs and where it breaks.",
};

const THEME_INIT = `try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
