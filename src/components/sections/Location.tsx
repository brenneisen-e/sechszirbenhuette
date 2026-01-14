'use client';

import { useState } from 'react';
import { MapPin, Navigation, Mail, Phone, Hand } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SITE_CONFIG } from '@/lib/constants';

export function Location() {
  const { t, language } = useLanguage();
  const [mapInteractive, setMapInteractive] = useState(false);

  // Sechszirbenhütte coordinates
  const lat = SITE_CONFIG.coordinates.lat;
  const lng = SITE_CONFIG.coordinates.lng;

  return (
    <section id="lage" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-wood-100 rounded-full mb-4">
            <MapPin className="w-8 h-8 text-wood-700" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {language === 'de' ? 'So finden Sie uns' : 'How to Find Us'}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            {language === 'de'
              ? 'Die Sechszirbenhütte liegt auf 1.700 m direkt am Nationalpark Nockberge'
              : 'The Sechszirbenhütte is located at 1,700m right at the Nockberge National Park'}
          </p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-wood-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-wood-700 transition shadow-sm"
          >
            <Navigation className="w-5 h-5" strokeWidth={1.5} />
            {language === 'de' ? 'In Google Maps öffnen' : 'Open in Google Maps'}
          </a>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Map */}
          <div className="rounded-xl overflow-hidden shadow-lg border border-gray-100 h-[400px] lg:h-[500px] relative">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.05}%2C${lat - 0.05}%2C${lng + 0.05}%2C${lat + 0.05}&layer=mapnik&marker=${lat}%2C${lng}`}
              className={`w-full h-full ${mapInteractive ? 'pointer-events-auto' : 'pointer-events-none lg:pointer-events-auto'}`}
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title="Karte zur Sechszirbenhütte"
            />
            {/* Tap to interact overlay - mobile only */}
            {!mapInteractive && (
              <button
                onClick={() => setMapInteractive(true)}
                className="lg:hidden absolute inset-0 bg-black/20 flex flex-col items-center justify-center gap-2 text-white z-20 transition-opacity"
              >
                <Hand className="w-8 h-8" />
                <span className="text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                  {language === 'de' ? 'Tippen zum Navigieren' : 'Tap to navigate'}
                </span>
              </button>
            )}
            {/* Close interaction button - mobile only */}
            {mapInteractive && (
              <button
                onClick={() => setMapInteractive(false)}
                className="lg:hidden absolute top-2 right-2 bg-white/90 text-gray-700 px-3 py-1.5 rounded-full text-xs font-medium shadow-md z-20"
              >
                {language === 'de' ? 'Karte sperren' : 'Lock map'}
              </button>
            )}
          </div>

          {/* Info Cards */}
          <div className="space-y-6">
            {/* Address */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-wood-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-wood-700" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {language === 'de' ? 'Adresse' : 'Address'}
                  </h3>
                  <p className="text-gray-600">
                    {SITE_CONFIG.address.street}<br />
                    {SITE_CONFIG.address.zip} {SITE_CONFIG.address.city}<br />
                    {SITE_CONFIG.address.country}
                  </p>
                </div>
              </div>
            </div>

            {/* Directions */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-wood-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-6 h-6 text-wood-700" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {language === 'de' ? 'Anfahrt' : 'Directions'}
                  </h3>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• {language === 'de' ? 'A10 Tauernautobahn, Abfahrt Spittal/Millstätter See' : 'A10 Tauern motorway, exit Spittal/Millstätter See'}</li>
                    <li>• {language === 'de' ? 'Über Bad Kleinkirchheim Richtung Falkertsee' : 'Via Bad Kleinkirchheim towards Falkertsee'}</li>
                    <li>• {language === 'de' ? 'Der Heidi-Figur folgen (ca. 8 km Bergstraße)' : 'Follow the Heidi figure (approx. 8 km mountain road)'}</li>
                  </ul>
                  <p className="mt-3 text-amber-700 text-sm font-medium">
                    {language === 'de'
                      ? '⚠️ Nov–April: Schneeketten empfohlen'
                      : '⚠️ Nov–April: Snow chains recommended'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-wood-700 text-white rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {language === 'de' ? 'Kontakt' : 'Contact'}
                  </h3>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4" strokeWidth={1.5} />
                      <a href={`mailto:${SITE_CONFIG.email}`} className="hover:text-wood-200 transition">
                        {SITE_CONFIG.email}
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4" strokeWidth={1.5} />
                      <a href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`} className="hover:text-wood-200 transition">
                        {SITE_CONFIG.phone}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
