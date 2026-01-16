'use client';

import { motion } from 'framer-motion';

export function IntroText() {
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
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-logo-green"
            style={{ fontFamily: 'RetroSignature, cursive' }}
          >
            Uriges Ferienhaus am Falkert - mit Sauna und Ruheraum
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal text-logo-green mb-4">
            Wandern, Skifahren & Erholung in den Nockbergen, Kärnten
          </h2>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            Entdecken Sie die Sechszirbenhütte, Ihre traumhafte Unterkunft auf 1.700 m Höhe im Herzen der Nockberge in Kärnten, Österreich. Gelegen an der malerischen Alpensüdseite in Falkertsee, bietet unsere Hütte ein ganzjähriges Urlaubsparadies für Familien und Naturliebhaber
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal text-logo-green mb-4">
            Heidi Alm Bergresort: Dem Himmel nahe, dem Alltag fern
          </h2>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            Erleben Sie einen unvergesslichen Urlaub im Heidi Alm Bergresort, umgeben von gesunder Luft, kristallklarem Gebirgswasser und einer farbenfrohen Natur. Genießen Sie die alpine Flora wie Enzian, Almrausch und Edelweiß und beobachten Sie mit etwas Glück Murmeltiere in ihrer natürlichen Umgebung.
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal text-logo-green mb-4">
            Winterurlaub in der Heidi-Alm: Familiäres Skigebiet & vielfältige Aktivitäten
          </h2>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            Das familiäre Skigebiet der Heidi-Alm bietet drei Lifte, einen Zauberteppich und abwechslungsreiche Pisten für Anfänger bis Fortgeschrittene. Freuen Sie sich auf entspanntes Skifahren ohne Warteschlangen an den Liften, Langlaufen, Eislaufen auf dem See oder geführte Schneeschuhwanderungen. In Peters Skischule werden Kinder und Erwachsene geduldig und spielerisch im Skifahren und Snowboarden unterrichtet. Zudem runden Ski-Touren und Fackelwanderungen das Winterprogramm ab. Erleben Sie die Sechszirbenhütte: Wandern, Skifahren & Erholung in Kärntens Nockbergen. Buchen Sie jetzt Ihren unvergesslichen Urlaub inmitten der atemberaubenden Naturkulisse.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
