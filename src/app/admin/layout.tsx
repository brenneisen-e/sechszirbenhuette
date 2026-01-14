export const metadata = {
  title: 'Admin | Sechszirbenhütte',
  robots: 'noindex, nofollow',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin uses its own full-page layout defined in page.tsx
  // This layout just wraps children without adding site Header/Footer
  return <>{children}</>;
}
