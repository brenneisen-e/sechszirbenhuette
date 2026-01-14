import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Admin | Sechszirbenhütte',
  robots: 'noindex, nofollow',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-100">
          {/* Admin Header */}
          <header className="bg-wood-800 text-white py-4">
            <div className="container mx-auto px-4 flex items-center justify-between">
              <h1 className="text-xl font-bold">Sechszirbenhütte Admin</h1>
              <nav className="flex gap-4">
                <a href="/admin" className="hover:text-wood-200">Dashboard</a>
                <a href="/admin/media/upload" className="hover:text-wood-200">Medien</a>
              </nav>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
