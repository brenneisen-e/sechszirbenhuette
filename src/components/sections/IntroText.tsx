'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export function IntroText() {
  const { t } = useLanguage();

  return (
    <section className="py-16 bg-transparent">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Retro Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            data-text-key="introtext_main_heading"
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-logo-green"
            style={{ fontFamily: 'FeelingPassionate, cursive' }}
          >
            {t.introText.mainHeadline}
          </h2>
        </motion.div>

        {/* Section 1: Wandern, Skifahren & Erholung */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 data-text-key="introtext_heading_1" className="text-3xl sm:text-4xl md:text-5xl font-normal text-logo-green mb-4">
            {t.introText.section1Title}
          </h2>
          <p data-text-key="introtext_text_1" className="text-sm sm:text-base text-gray-700 leading-relaxed">
            {t.introText.section1Text}
          </p>
        </motion.div>

        {/* Section 2: Heidi Alm Bergresort */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-12"
        >
          <h2 data-text-key="introtext_heading_2" className="text-3xl sm:text-4xl md:text-5xl font-normal text-logo-green mb-4">
            {t.introText.section2Title}
          </h2>
          <p data-text-key="introtext_text_2" className="text-sm sm:text-base text-gray-700 leading-relaxed">
            {t.introText.section2Text}
          </p>
        </motion.div>

        {/* Section 3: Winterurlaub */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center"
        >
          <h2 data-text-key="introtext_heading_3" className="text-3xl sm:text-4xl md:text-5xl font-normal text-logo-green mb-4">
            {t.introText.section3Title}
          </h2>
          <p data-text-key="introtext_text_3" className="text-sm sm:text-base text-gray-700 leading-relaxed">
            {t.introText.section3Text}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
