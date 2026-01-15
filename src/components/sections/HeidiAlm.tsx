'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { Mountain, Snowflake } from 'lucide-react';

export function HeidiAlm() {
  const { t } = useLanguage();

  const winterActivities = [
    'skiing',
    'crossCountry',
    'skating',
    'snowshoe',
    'skiSchool',
    'tours',
  ] as const;

  return (
    <section id="heidiAlm" className="py-20 bg-transparent scroll-mt-20">
      <div className="container">
        {/* Heidi Alm Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-20"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-700 mb-6">
            <Mountain size={32} strokeWidth={1.5} />
          </div>
          <h2
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-logo-green mb-6"
            style={{ fontFamily: 'RetroSignature, cursive' }}
          >
            {t.heidiAlm.title}
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
            {t.heidiAlm.description}
          </p>
        </motion.div>

        {/* Winter Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-8 md:p-12 shadow-sm"
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-100 text-sky-600 mb-6">
              <Snowflake size={32} strokeWidth={1.5} />
            </div>
            <h2
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-logo-green mb-4"
              style={{ fontFamily: 'RetroSignature, cursive' }}
            >
              {t.winter.title}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
              {t.winter.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {winterActivities.map((activity, index) => (
              <motion.div
                key={activity}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-logo-green" />
                <span className="text-gray-700">
                  {t.winter.activities[activity]}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
