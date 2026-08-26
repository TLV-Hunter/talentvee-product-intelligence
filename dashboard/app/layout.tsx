import type { Metadata } from "next";
import "./globals.css";
import "./connector-controls.css";
import "./backup-controls.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://talentvee-product-intelligence.voxelhavenlofi.chatgpt.site"),
  title: "TalentVee Product Intelligence",
  description: "แดชบอร์ดวิเคราะห์และจัดอันดับสินค้า Shopee Affiliate จากข้อมูลที่บัญชีของคุณมองเห็นจริง",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "TalentVee Product Intelligence",
    description: "จัดอันดับสินค้าโตไว ขายดี สินค้าใหม่ และโอกาสค่าคอมจากข้อมูล Shopee Affiliate ของคุณ",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "TalentVee Product Intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TalentVee Product Intelligence",
    description: "Shopee Affiliate product analytics and ranking dashboard",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
