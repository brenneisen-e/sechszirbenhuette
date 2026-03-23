'use client';

import { motion } from 'framer-motion';
import { Instagram as InstagramIcon, ExternalLink } from 'lucide-react';

const INSTAGRAM_URL = 'https://www.instagram.com/sechszirbenhuette/';
const LOGO_GREEN = '#1e5631';

export function Instagram() {
  return (
    <section className="pt-10 pb-6 bg-white">
      <div className="container mx-auto px-4">
        <motion.a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="block max-w-4xl mx-auto group"
        >
          <div
            className="relative overflow-hidden rounded-2xl p-8 sm:p-10 md:p-12 text-white transition-transform duration-300 group-hover:scale-[1.01]"
            style={{
              background: `linear-gradient(135deg, ${LOGO_GREEN} 0%, #2d7a4a 50%, #1a4028 100%)`,
            }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

            <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              {/* Instagram icon */}
              <div className="shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/25 transition-colors">
                  <InstagramIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
              </div>

              {/* Text */}
              <div className="text-center sm:text-left flex-1">
                <h3 className="text-2xl sm:text-3xl font-bold mb-2">
                  Folgen Sie uns auf Instagram
                </h3>
                <p className="text-white/80 text-sm sm:text-base mb-3">
                  Entdecken Sie aktuelle Bilder und Reels aus der Sechszirbenhütte und den Nockbergen
                </p>
                <span className="inline-flex items-center gap-2 text-white/90 font-medium text-sm group-hover:text-white transition-colors">
                  @sechszirbenhuette
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </div>
        </motion.a>
      </div>
    </section>
  );
}
