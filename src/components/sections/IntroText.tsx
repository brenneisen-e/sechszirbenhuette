'use client';

import { motion } from 'framer-motion';
import { useContentTexts } from '@/contexts/ContentTextsContext';

export function IntroText() {
  const { getText, getTextStyle } = useContentTexts();

  return (
    <section id="introtext" className="py-16 bg-transparent">
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
            style={{ fontFamily: 'FeelingPassionate, cursive', ...getTextStyle('introtext_main_heading') }}
          >
            {getText('introtext_main_heading')}
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
          <h2 data-text-key="introtext_heading_1" className="text-3xl sm:text-4xl md:text-5xl font-normal text-logo-green mb-4" style={getTextStyle('introtext_heading_1')}>
            {getText('introtext_heading_1')}
          </h2>
          <p data-text-key="introtext_text_1" className="text-sm sm:text-base text-gray-700 leading-relaxed" style={getTextStyle('introtext_text_1')}>
            {getText('introtext_text_1')}
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
          <h2 data-text-key="introtext_heading_2" className="text-3xl sm:text-4xl md:text-5xl font-normal text-logo-green mb-4" style={getTextStyle('introtext_heading_2')}>
            {getText('introtext_heading_2')}
          </h2>
          <p data-text-key="introtext_text_2" className="text-sm sm:text-base text-gray-700 leading-relaxed" style={getTextStyle('introtext_text_2')}>
            {getText('introtext_text_2')}
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
          <h2 data-text-key="introtext_heading_3" className="text-3xl sm:text-4xl md:text-5xl font-normal text-logo-green mb-4" style={getTextStyle('introtext_heading_3')}>
            {getText('introtext_heading_3')}
          </h2>
          <p data-text-key="introtext_text_3" className="text-sm sm:text-base text-gray-700 leading-relaxed" style={getTextStyle('introtext_text_3')}>
            {getText('introtext_text_3')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
