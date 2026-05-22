export const metadata = {
  title: "商家後台",
  robots: { index: false, follow: false },
};

import { AuthSessionProvider } from "@/providers/session-provider";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}
