'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Phone, Mail, MapPin, Instagram } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export function Footer() {
  const t = useTranslations('footer');
  const tNav = useTranslations('navigation');

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="lg:col-span-1">
            <h3 className="text-xl font-bold mb-4">Sechszirbenhütte</h3>
            <p className="text-gray-400 text-sm">
              Premium-Hüttenurlaub auf 1.700 m in den Kärntner Nockbergen.
              Über 250 Jahre alte Berghütte mit Sauna in Alleinlage.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">{t('contact')}</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li className="flex items-start gap-2">
                <MapPin size={18} className="text-wood-400 flex-shrink-0 mt-0.5" />
                <span>
                  {SITE_CONFIG.address.street}<br />
                  {SITE_CONFIG.address.zip} {SITE_CONFIG.address.city}<br />
                  {SITE_CONFIG.address.country}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={18} className="text-wood-400 flex-shrink-0" />
                <a href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`} className="hover:text-white transition-colors">
                  {SITE_CONFIG.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={18} className="text-wood-400 flex-shrink-0" />
                <a href={`mailto:${SITE_CONFIG.email}`} className="hover:text-white transition-colors">
                  {SITE_CONFIG.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">{t('legal')}</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link href="/impressum" className="hover:text-white transition-colors">
                  {tNav('impressum')}
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="hover:text-white transition-colors">
                  {tNav('datenschutz')}
                </Link>
              </li>
              <li>
                <Link href="/agb" className="hover:text-white transition-colors">
                  {tNav('agb')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-4">{t('followUs')}</h4>
            <a
              href={`https://instagram.com/${SITE_CONFIG.social.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <Instagram size={20} />
              <span>{SITE_CONFIG.social.instagram}</span>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p>{t('copyright', { year: currentYear })}</p>
          <p className="mt-2">
            {SITE_CONFIG.owners}
          </p>
        </div>
      </div>
    </footer>
  );
}
