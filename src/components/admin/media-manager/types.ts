// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface MediaRecord {
  id: string;
  file_key: string;
  url: string;
  alt_text: string;
  title: string;
  category: string;
  categories?: string[]; // Additional categories from junction table
  media_type: 'image' | 'video';
  display_order: number;
  created_at: string;
}
