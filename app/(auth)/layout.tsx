import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-fs-bg px-6 py-16">
      {children}
    </div>
  );
}
