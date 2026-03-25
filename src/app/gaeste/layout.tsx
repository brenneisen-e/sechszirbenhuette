import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gäste-App · Sechszirbenhütte',
  description: 'Ihre persönliche Gäste-App für Ihren Aufenthalt in der Sechszirbenhütte',
};

export default function GaesteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hide main site header, footer, and floating elements on guest app */}
      <style>{`
        header, footer, [data-booking-button], [data-scroll-progress] {
          display: none !important;
        }
        body > div:first-child {
          display: none !important;
        }
      `}</style>
      <div className="fixed inset-0 z-50 overflow-auto bg-gray-50">
        {children}
      </div>
    </>
  );
}
