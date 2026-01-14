'use client';

// Subtle pine branch background decoration
export function PineBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Left side pine branches */}
      <svg
        className="absolute left-0 top-1/4 w-64 h-auto opacity-[0.04]"
        viewBox="0 0 200 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#1e5631">
          {/* Pine branch 1 */}
          <path d="M50 50 L60 80 L40 80 Z" />
          <path d="M45 75 L65 120 L35 120 Z" />
          <path d="M40 115 L70 170 L30 170 Z" />
          <path d="M48 10 L52 60 L48 60 Z" />

          {/* Pine branch 2 */}
          <path d="M120 150 L130 180 L110 180 Z" />
          <path d="M115 175 L135 220 L105 220 Z" />
          <path d="M110 215 L140 270 L100 270 Z" />
          <path d="M118 110 L122 160 L118 160 Z" />

          {/* Pine needles scattered */}
          <ellipse cx="30" cy="200" rx="2" ry="15" transform="rotate(-30 30 200)" />
          <ellipse cx="80" cy="250" rx="2" ry="12" transform="rotate(20 80 250)" />
          <ellipse cx="60" cy="300" rx="2" ry="18" transform="rotate(-15 60 300)" />
          <ellipse cx="100" cy="350" rx="2" ry="14" transform="rotate(25 100 350)" />
          <ellipse cx="40" cy="380" rx="2" ry="16" transform="rotate(-10 40 380)" />
        </g>
      </svg>

      {/* Right side pine branches */}
      <svg
        className="absolute right-0 top-1/3 w-64 h-auto opacity-[0.04] scale-x-[-1]"
        viewBox="0 0 200 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#1e5631">
          {/* Pine branch 1 */}
          <path d="M50 80 L60 110 L40 110 Z" />
          <path d="M45 105 L65 150 L35 150 Z" />
          <path d="M40 145 L70 200 L30 200 Z" />
          <path d="M48 40 L52 90 L48 90 Z" />

          {/* Pine branch 2 */}
          <path d="M130 200 L140 230 L120 230 Z" />
          <path d="M125 225 L145 270 L115 270 Z" />
          <path d="M120 265 L150 320 L110 320 Z" />
          <path d="M128 160 L132 210 L128 210 Z" />

          {/* Pine needles scattered */}
          <ellipse cx="40" cy="250" rx="2" ry="14" transform="rotate(30 40 250)" />
          <ellipse cx="90" cy="300" rx="2" ry="16" transform="rotate(-20 90 300)" />
          <ellipse cx="70" cy="350" rx="2" ry="12" transform="rotate(15 70 350)" />
          <ellipse cx="110" cy="380" rx="2" ry="18" transform="rotate(-25 110 380)" />
        </g>
      </svg>

      {/* Additional left decorations - lower */}
      <svg
        className="absolute left-0 bottom-1/4 w-48 h-auto opacity-[0.03]"
        viewBox="0 0 150 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#1e5631">
          <ellipse cx="30" cy="50" rx="2" ry="20" transform="rotate(-25 30 50)" />
          <ellipse cx="60" cy="100" rx="2" ry="16" transform="rotate(15 60 100)" />
          <ellipse cx="45" cy="150" rx="2" ry="22" transform="rotate(-10 45 150)" />
          <ellipse cx="80" cy="200" rx="2" ry="18" transform="rotate(20 80 200)" />
          <ellipse cx="35" cy="250" rx="2" ry="14" transform="rotate(-30 35 250)" />
        </g>
      </svg>

      {/* Additional right decorations - lower */}
      <svg
        className="absolute right-0 bottom-1/3 w-48 h-auto opacity-[0.03]"
        viewBox="0 0 150 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#1e5631">
          <ellipse cx="120" cy="30" rx="2" ry="18" transform="rotate(25 120 30)" />
          <ellipse cx="90" cy="80" rx="2" ry="14" transform="rotate(-15 90 80)" />
          <ellipse cx="105" cy="130" rx="2" ry="20" transform="rotate(10 105 130)" />
          <ellipse cx="70" cy="180" rx="2" ry="16" transform="rotate(-20 70 180)" />
          <ellipse cx="115" cy="230" rx="2" ry="22" transform="rotate(30 115 230)" />
        </g>
      </svg>
    </div>
  );
}
