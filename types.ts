
export enum ArtStyle {
  RENAISSANCE = 'renaissance',
  WATERCOLOR = 'watercolor',
  CHINESE = 'chinese',
  COMIC = 'comic',
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
