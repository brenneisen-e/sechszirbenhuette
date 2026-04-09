export const SITE_CONFIG = {
  name: 'Sechszirbenhütte',
  url: 'https://sechszirbenhuette.com',
  email: 'info@sechszirbenhuette.com',
  phone: '+49 (0)176 600 30 373',
  address: {
    street: 'Falkertsee 36',
    zip: '9564',
    city: 'Patergassen',
    country: 'Österreich',
  },
  addressGermany: {
    street: 'Ohlendorffs Tannen 12',
    zip: '22359',
    city: 'Hamburg',
  },
  coordinates: {
    lat: 46.8567077,
    lng: 13.8461029,
  },
  social: {
    instagram: '@sechszirbenhuette',
  },
  owners: 'Malte + Mareike Brenneisen',
};

export const DESKLINE_CONFIG = {
  widgetId: 'bb1aac18-a855-4fce-b506-324d5503e60d',
  scriptUrl: 'https://web5.deskline.net/start/ACCOKTN/bb1aac18-a855-4fce-b506-324d5503e60d/index.js',
};

export const FEATURES = [
  {
    key: 'altitude',
    icon: 'Mountain',
  },
  {
    key: 'secluded',
    icon: 'TreePine',
  },
  {
    key: 'sauna',
    icon: 'Flame',
  },
  {
    key: 'guests',
    icon: 'Users',
  },
  {
    key: 'dogs',
    icon: 'Dog',
  },
  {
    key: 'rating',
    icon: 'Star',
  },
] as const;

export const NAV_ITEMS = [
  { key: 'home', href: '/' },
  { key: 'ferienhaus', href: '/ferienhaus' },
  { key: 'umgebung', href: '/umgebung' },
  { key: 'buchung', href: '/buchung' },
  { key: 'bewertungen', href: '/bewertungen' },
] as const;

export const FOOTER_LEGAL = [
  { key: 'impressum', href: '/impressum' },
  { key: 'datenschutz', href: '/datenschutz' },
  { key: 'agb', href: '/agb' },
] as const;
