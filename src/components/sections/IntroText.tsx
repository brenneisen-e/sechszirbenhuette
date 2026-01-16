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
          className="text-center"
        >
          <h2
            data-text-key="introtext_main_heading"
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-logo-green"
            style={{ fontFamily: 'FeelingPassionate, cursive', ...getTextStyle('introtext_main_heading') }}
          >
            {getText('introtext_main_heading')}
          </h2>
        </motion.div>
      </div>
    </section>
  );
}
