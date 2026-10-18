import type { CSSProperties, ReactNode } from 'react';

// Kopf eines Abschnitts der Startseite: kleine Marke, Überschrift, Einleitung
// linksbündig; rechts optional eine Handlung (ab Tablet daneben, mobil darunter).

interface Props {
  id: string;
  label?: string;
  title: ReactNode;
  intro?: ReactNode;
  action?: ReactNode;
  titleKey?: string;
  titleStyle?: CSSProperties;
  introKey?: string;
  introStyle?: CSSProperties;
  className?: string;
}

export function SectionHeader({
  id,
  label,
  title,
  intro,
  action,
  titleKey,
  titleStyle,
  introKey,
  introStyle,
  className = '',
}: Props) {
  return (
    <div
      className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8 ${className}`}
    >
      <div className="max-w-3xl">
        {label && <p className="brand-label text-zirbe">{label}</p>}
        <h2
          id={id}
          data-text-key={titleKey}
          className={`brand-h2 text-zirbe ${label ? 'mt-3' : ''}`}
          style={titleStyle}
        >
          {title}
        </h2>
        {intro && (
          <p data-text-key={introKey} className="brand-intro mt-3 text-rinde" style={introStyle}>
            {intro}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
