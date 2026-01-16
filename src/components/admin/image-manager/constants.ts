import { CategoryOption } from './types';

export const MAX_FILE_SIZE = 15 * 1024 * 1024;
export const COMPRESSED_MAX_SIZE = 2 * 1024 * 1024;
export const MAX_WIDTH = 1920;
export const MAX_HEIGHT = 1080;
export const HASH_SIZE = 16;

export const CATEGORIES: CategoryOption[] = [
  { value: 'hero', label: 'Hero Slider' },
  { value: 'exterior', label: 'Außenansichten' },
  { value: 'living', label: 'Wohnbereich' },
  { value: 'bedrooms', label: 'Schlafzimmer' },
  { value: 'kitchen', label: 'Küche' },
  { value: 'bathroom', label: 'Badezimmer' },
  { value: 'wellness', label: 'Sauna & Wellness' },
  { value: 'surroundings', label: 'Umgebung' },
  { value: 'summer', label: 'Sommer' },
  { value: 'winter', label: 'Winter' },
  { value: 'extras', label: 'Extras' },
  { value: 'hosts', label: 'Gastgeber' },
  { value: 'gallery', label: 'Galerie' },
];

export const SUMMER_ACTIVITY_NAMES = [
  'Badeseen',
  'Wandern',
  'Nordic Walking',
  'Golf',
  'Nockbike',
  'Heidialm Falkert',
];

export const WINTER_ACTIVITY_NAMES = [
  'Skigebiet Falkert',
  'Turracher Höhe',
  'Bad Kleinkirchheim',
  'Langlauf',
  'Rodeln',
  'Winterwandern',
];
