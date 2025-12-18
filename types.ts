
export enum ArtStyle {
  RENAISSANCE = 'renaissance',
  WATERCOLOR = 'watercolor',
  CHINESE = 'chinese',
  CHINESE_ILLUSTRATION = 'chinese_illustration',
  COMIC = 'comic',
  WEBTOON = 'webtoon',
  SKETCH = 'sketch',
  PHOTOGRAPHY = 'photography',
  CYBERPUNK = 'cyberpunk',
  ANIME = 'anime',
  MANGA = 'manga',
  THREE_D = '3d',
  CUSTOM = 'custom'
}

export interface StyleOption {
  id: ArtStyle;
  label: string;
  icon: string;
  description: string;
  prompt: string;
}

export interface TextReplacement {
  original: string;
  replacement: string;
}

export interface EntityModification {
  entity: string;
  instruction: string;
}

export interface TransformationResult {
  originalUrl: string;
  transformedUrl: string;
  style: ArtStyle;
  timestamp: number;
}

export type TextStyle = 'neon' | 'elegant' | 'bold' | 'traditional' | 'brush';

export interface PosterText {
  id: string;
  content: string;
  style: TextStyle;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize: number; // scale factor
}

export type AspectRatio = 'original' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface HistoryItem {
  id: string;
  imageUrl: string;
  style: string;
  date: number;
}
