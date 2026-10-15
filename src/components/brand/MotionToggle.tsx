'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useMotion } from '@/contexts/MotionContext';

// Dezenter Schalter „Bewegung reduzieren“ im Footer. Eine reduzierte
// Systemeinstellung hat Vorrang und wird hier nicht aufgehoben.

export function MotionToggle() {
  const { t } = useLanguage();
  const { systemReduced, localReduced, setLocalReduced } = useMotion();

  if (systemReduced) {
    return <p className="text-sm text-leinen/80">{t.brand.motionSystem}</p>;
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={localReduced}
      onClick={() => setLocalReduced(!localReduced)}
      className="inline-flex items-center gap-3 rounded-[4px] py-2 text-sm text-leinen"
    >
      <span
        aria-hidden="true"
        className={`relative inline-block h-5 w-9 rounded-full border-2 border-leinen ${
          localReduced ? 'bg-leinen' : 'bg-transparent'
        }`}
      >
        <span
          className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${
            localReduced ? 'right-0.5 bg-zirbe' : 'left-0.5 bg-leinen'
          }`}
        />
      </span>
      {t.brand.reduceMotion}
    </button>
  );
}
