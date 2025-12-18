
import { ArtStyle, StyleOption } from './types';

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: ArtStyle.RENAISSANCE,
    label: '文艺复兴',
    icon: '🏛️',
    description: '古典油画，戏剧性的光影，真实的纹理',
    prompt: 'Transform this image into a classic Renaissance oil painting style. Use dramatic chiaroscuro (light and shadow), rich earthy textures, and realistic human features reminiscent of Leonardo da Vinci or Raphael. Preserve the original composition.'
  },
  {
    id: ArtStyle.WATERCOLOR,
    label: '水彩艺术',
    icon: '🎨',
    description: '柔和的边缘，晕染的色彩，艺术感十足',
    prompt: 'Transform this image into a beautiful watercolor painting. Use soft edges, delicate color bleeds, visible paper texture, and artistic brush strokes. The colors should feel vibrant yet translucent.'
  },
  {
    id: ArtStyle.CHINESE,
    label: '水墨国画',
    icon: '🏮',
    description: '传统水墨，写意线条，禅意留白',
    prompt: 'Transform this image into a traditional Chinese ink wash painting (Shuimo) style. Use expressive black ink brushstrokes, varying ink density, elegant compositions, and soft parchment paper texture.'
  },
  {
    id: ArtStyle.COMIC,
    label: '美漫风格',
    icon: '💥',
    description: '美式英雄漫画，粗旷线条，明亮色彩',
    prompt: 'Reimagine this image as a classic American superhero comic book illustration. Use heavy black line work, dramatic shadows, Ben-Day dots or halftone patterns, and a vibrant primary color palette. The style should be bold, energetic, and high-contrast.'
  },
  {
    id: ArtStyle.PHOTOGRAPHY,
    label: '摄影大片',
    icon: '📸',
    description: '专业摄影，电影光感，极致细节',
    prompt: 'Transform this image into a high-end professional photographic masterpiece. Enhance details to look like a National Geographic or editorial fashion shoot. Use shallow depth of field with beautiful background bokeh, expert studio lighting or golden hour natural light, and sophisticated color grading.'
  },
  {
    id: ArtStyle.CYBERPUNK,
    label: '赛博朋克',
    icon: '🌃',
    description: '霓虹灯光，未来感，高科技氛围',
    prompt: 'Redesign this image in a cyberpunk aesthetic. Add glowing neon lights in pink, blue, and purple. Incorporate high-tech interface elements, a futuristic urban atmosphere, and a dark, moody high-contrast color palette.'
  },
  {
    id: ArtStyle.ANIME,
    label: '唯美动漫',
    icon: '🌸',
    description: '新海诚风格，明亮色彩，治愈感',
    prompt: 'Convert this into a high-quality modern anime style, similar to Makoto Shinkai movies. Use bright vibrant colors, detailed sky and backgrounds, clean line art, and a cinematic emotional atmosphere.'
  },
  {
    id: ArtStyle.MANGA,
    label: '二次元',
    icon: '✨',
    description: '日漫风格，平铺上色，动感线条',
    prompt: 'Redraw this in a clean 2D manga/illustration style. Use bold outlines, cel-shaded coloring, and characteristic anime eyes and expressions. The result should look like a professional character illustration.'
  },
  {
    id: ArtStyle.THREE_D,
    label: '3D 渲染',
    icon: '🧊',
    description: '皮克斯风格，软萌建模，柔和光照',
    prompt: 'Convert this image into a 3D Pixar-style or high-end Unreal Engine 5 render. Features should be slightly stylized and cute with rounded edges, soft global illumination, and realistic material textures like fabric or plastic.'
  }
];
