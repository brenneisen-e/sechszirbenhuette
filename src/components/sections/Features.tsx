'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { Mountain, TreePine, Flame, Users, Dog, Star } from 'lucide-react';

const iconMap = {
  altitude: Mountain,
  secluded: TreePine,
  sauna: Flame,
  guests: Users,
  dogs: Dog,
  rating: Star,
};

const featureKeys = ['altitude', 'secluded', 'sauna', 'guests', 'dogs', 'rating'] as const;

export function Features() {
  const { t } = useLanguage();

  return (
    <section id="features" className="py-20 bg-white">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureKeys.map((key, index) => {
            const Icon = iconMap[key];
            const feature = t.features[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center p-6"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-logo-green/10 text-logo-green mb-4">
                  <Icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
