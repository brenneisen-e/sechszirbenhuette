'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Map,
  Mountain,
  Globe,
  Dog,
  Baby,
  ArrowRight,
} from 'lucide-react';

export function Umgebung() {
  const { t } = useLanguage();
  const { getText, getTextStyle } = useContentTexts();

  return (
    <section id="umgebung" className="py-20 bg-white">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-logo-green/10 text-logo-green mb-6">
            <Map size={32} strokeWidth={1.5} />
          </div>
          <h2
            data-text-key="umgebung_title"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-logo-green mb-4"
            style={{ fontFamily: 'FeelingPassionate, cursive', ...getTextStyle('umgebung_title') }}
          >
            {getText('umgebung_title')}
          </h2>
          <p data-text-key="umgebung_subtitle" className="text-base sm:text-lg md:text-xl text-logo-green font-medium mb-4" style={getTextStyle('umgebung_subtitle')}>
            {getText('umgebung_subtitle')}
          </p>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">
            {t.umgebung.intro}
          </p>
        </motion.div>

        {/* Blog Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <Link href="/blog" className="block group">
            <div className="bg-gradient-to-br from-logo-green to-logo-green/80 rounded-3xl p-8 md:p-12 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4">
                  <Mountain size={120} className="text-white" />
                </div>
                <div className="absolute bottom-4 left-4">
                  <Globe size={80} className="text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  {/* Text Content */}
                  <div className="flex-1">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl text-white font-bold mb-4">
                      {t.blog?.bannerTitle || 'Entdecken Sie mehr in unserem Blog'}
                    </h3>
                    <p className="text-white/90 text-base md:text-lg mb-6 max-w-2xl">
                      {t.blog?.bannerDescription || 'Ausführliche Reisetipps, Wanderrouten und die schönsten Ausflugsziele in den Nockbergen und Kärnten.'}
                    </p>

                    {/* Feature Pills */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <span className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
                        <Mountain size={16} />
                        Nockberge
                      </span>
                      <span className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
                        <Dog size={16} />
                        {t.ui?.withDogs || 'Mit Hunden'}
                      </span>
                      <span className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
                        <Baby size={16} />
                        {t.ui?.withKids || 'Mit Kindern'}
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center gap-2 bg-white text-logo-green px-6 py-3 rounded-xl font-semibold text-base md:text-lg shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                      {t.blog?.ctaButton || 'Zum Blog'}
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
