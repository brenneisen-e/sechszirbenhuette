'use client';

import { useEffect, useState } from 'react';

// Subtle pine tree/branch background decoration - only visible after hero
export function PineBackground() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('#hero');
      if (heroSection) {
        const heroBottom = heroSection.getBoundingClientRect().bottom;
        setIsVisible(heroBottom < window.innerHeight * 0.5);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-500">
      {/* Left side - Pine tree silhouette */}
      <svg
        className="absolute left-0 top-20 w-48 md:w-64 h-auto opacity-[0.06]"
        viewBox="0 0 200 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#1e5631">
          {/* Pine tree 1 */}
          <path d="M60 100 L100 180 L20 180 Z" />
          <path d="M55 170 L110 270 L10 270 Z" />
          <path d="M50 255 L120 380 L0 380 Z" />
          <rect x="50" y="370" width="20" height="60" />

          {/* Pine tree 2 - smaller, offset */}
          <path d="M130 200 L160 260 L100 260 Z" />
          <path d="M125 250 L170 330 L95 330 Z" />
          <path d="M120 320 L180 420 L85 420 Z" />
          <rect x="120" y="410" width="15" height="45" />

          {/* Pine needles/branches scattered */}
          <ellipse cx="40" cy="450" rx="3" ry="25" transform="rotate(-20 40 450)" />
          <ellipse cx="80" cy="500" rx="3" ry="20" transform="rotate(15 80 500)" />
          <ellipse cx="30" cy="550" rx="3" ry="22" transform="rotate(-10 30 550)" />
          <ellipse cx="100" cy="480" rx="2" ry="18" transform="rotate(25 100 480)" />
          <ellipse cx="150" cy="520" rx="2" ry="16" transform="rotate(-15 150 520)" />
        </g>
      </svg>

      {/* Right side - Pine tree silhouette (mirrored) */}
      <svg
        className="absolute right-0 top-40 w-48 md:w-64 h-auto opacity-[0.06] scale-x-[-1]"
        viewBox="0 0 200 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#1e5631">
          {/* Pine tree 1 */}
          <path d="M70 80 L110 160 L30 160 Z" />
          <path d="M65 150 L120 250 L20 250 Z" />
          <path d="M60 235 L130 360 L10 360 Z" />
          <rect x="55" y="350" width="20" height="55" />

          {/* Pine tree 2 */}
          <path d="M140 180 L170 240 L110 240 Z" />
          <path d="M135 230 L180 310 L105 310 Z" />
          <path d="M130 300 L190 400 L95 400 Z" />
          <rect x="130" y="390" width="15" height="40" />

          {/* Pine needles */}
          <ellipse cx="50" cy="430" rx="3" ry="22" transform="rotate(20 50 430)" />
          <ellipse cx="90" cy="480" rx="3" ry="18" transform="rotate(-15 90 480)" />
          <ellipse cx="40" cy="530" rx="2" ry="20" transform="rotate(10 40 530)" />
          <ellipse cx="110" cy="460" rx="2" ry="16" transform="rotate(-25 110 460)" />
        </g>
      </svg>

      {/* Additional left decorations - lower on page */}
      <svg
        className="absolute left-0 bottom-0 w-40 md:w-56 h-auto opacity-[0.05]"
        viewBox="0 0 180 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#1e5631">
          <path d="M50 50 L85 120 L15 120 Z" />
          <path d="M45 110 L95 200 L5 200 Z" />
          <path d="M40 185 L105 300 L0 300 Z" />
          <rect x="42" y="290" width="18" height="50" />

          <ellipse cx="120" cy="150" rx="2" ry="20" transform="rotate(-25 120 150)" />
          <ellipse cx="140" cy="220" rx="2" ry="18" transform="rotate(15 140 220)" />
          <ellipse cx="100" cy="280" rx="2" ry="22" transform="rotate(-10 100 280)" />
          <ellipse cx="150" cy="320" rx="2" ry="16" transform="rotate(20 150 320)" />
        </g>
      </svg>

      {/* Additional right decorations - lower on page */}
      <svg
        className="absolute right-0 bottom-20 w-40 md:w-56 h-auto opacity-[0.05] scale-x-[-1]"
        viewBox="0 0 180 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#1e5631">
          <path d="M60 30 L95 100 L25 100 Z" />
          <path d="M55 90 L105 180 L15 180 Z" />
          <path d="M50 165 L115 280 L5 280 Z" />
          <rect x="52" y="270" width="16" height="45" />

          <ellipse cx="130" cy="130" rx="2" ry="18" transform="rotate(25 130 130)" />
          <ellipse cx="110" cy="200" rx="2" ry="20" transform="rotate(-15 110 200)" />
          <ellipse cx="145" cy="260" rx="2" ry="16" transform="rotate(10 145 260)" />
        </g>
      </svg>

      {/* Middle decorations - subtle branches */}
      <svg
        className="absolute left-10 top-1/2 w-32 h-auto opacity-[0.04]"
        viewBox="0 0 100 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#1e5631">
          <ellipse cx="30" cy="30" rx="2" ry="25" transform="rotate(-30 30 30)" />
          <ellipse cx="50" cy="80" rx="2" ry="20" transform="rotate(20 50 80)" />
          <ellipse cx="25" cy="130" rx="2" ry="22" transform="rotate(-15 25 130)" />
          <ellipse cx="60" cy="170" rx="2" ry="18" transform="rotate(25 60 170)" />
        </g>
      </svg>

      <svg
        className="absolute right-10 top-1/3 w-32 h-auto opacity-[0.04]"
        viewBox="0 0 100 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#1e5631">
          <ellipse cx="70" cy="40" rx="2" ry="22" transform="rotate(30 70 40)" />
          <ellipse cx="45" cy="90" rx="2" ry="18" transform="rotate(-20 45 90)" />
          <ellipse cx="75" cy="140" rx="2" ry="24" transform="rotate(15 75 140)" />
          <ellipse cx="40" cy="180" rx="2" ry="16" transform="rotate(-25 40 180)" />
        </g>
      </svg>
    </div>
  );
}
