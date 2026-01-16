'use client';

// Flag icon component using flagcdn.com
// Supported widths: 16, 20, 24, 32, 40, 48, 64, 80, 160, 320

interface FlagIconProps {
  code: string;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  round?: boolean;
}

export function FlagIcon({ code, size = 'small', round = false }: FlagIconProps) {
  // Für runde Icons etwas größere Basis verwenden
  const sizeMap = { tiny: 20, small: 24, medium: 32, large: 48 };
  const width = sizeMap[size];
  const lowerCode = code.toLowerCase();

  if (round) {
    // Runde Flagge: quadratisch mit object-cover
    return (
      <img
        src={`https://flagcdn.com/w${width}/${lowerCode}.png`}
        srcSet={`https://flagcdn.com/w${width * 2}/${lowerCode}.png 2x`}
        width={width}
        height={width}
        alt={code}
        className="inline-block rounded-full object-cover border border-gray-300"
        style={{ verticalAlign: 'middle' }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  // Rechteckige Flagge
  const rectSizeMap = { tiny: 16, small: 20, medium: 32, large: 48 };
  const rectWidth = rectSizeMap[size];

  return (
    <img
      src={`https://flagcdn.com/w${rectWidth}/${lowerCode}.png`}
      srcSet={`https://flagcdn.com/w${rectWidth * 2}/${lowerCode}.png 2x`}
      width={rectWidth}
      height={Math.round(rectWidth * 0.75)}
      alt={code}
      className="inline-block rounded-sm shadow-sm"
      style={{ verticalAlign: 'middle' }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

// Component to render multiple flags for nationality
interface NationalityFlagsProps {
  nationality: string | null;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  round?: boolean;
}

export function NationalityFlags({ nationality, size = 'small', round = false }: NationalityFlagsProps) {
  if (!nationality) return null;
  const codes = nationality.split(',').map(c => c.trim()).filter(Boolean);
  if (codes.length === 0) return null;

  return (
    <span className="inline-flex gap-1 items-center">
      {codes.map(code => (
        <FlagIcon key={code} code={code} size={size} round={round} />
      ))}
    </span>
  );
}
