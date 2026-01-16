export interface ImageRecord {
  id: string;
  image_url: string;
  image_key: string;
  alt_text: string;
  category: string;
  display_order: number;
  is_hero: number;
  created_at: string;
  hash?: string;
}

export interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error' | 'duplicate' | 'analyzing';
  progress: number;
  error?: string;
  compressedSize?: number;
  hash?: string;
  duplicateOf?: string;
  altText?: string;
  isAnalyzing?: boolean;
  suggestedCategory?: string;
  isHeroCandidate?: boolean;
}

export interface DuplicateGroup {
  hash: string;
  images: ImageRecord[];
}

export interface ImageManagerProps {
  adminPassword: string;
}

export interface CategoryOption {
  value: string;
  label: string;
}

export interface SeasonImageReplacement {
  season: 'summer' | 'winter';
  index: number;
  existingImage: ImageRecord | null;
}
