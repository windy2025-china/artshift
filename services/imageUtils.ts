
import { PosterText, TextStyle } from "../types";

export interface ImageAdjustments {
  brightness: number; 
  contrast: number;   
  rotation: number;   
  texts?: PosterText[];
}

const applyTextStyle = (ctx: CanvasRenderingContext2D, style: TextStyle, fontSize: number, canvasWidth: number) => {
  const baseSize = (canvasWidth / 10) * fontSize;
  
  switch (style) {
    case 'neon':
      ctx.font = `bold ${baseSize}px sans-serif`;
      ctx.fillStyle = '#00f2ff';
      ctx.shadowColor = '#00f2ff';
      ctx.shadowBlur = baseSize / 3;
      break;
    case 'elegant':
      ctx.font = `italic ${baseSize}px serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.letterSpacing = "4px";
      break;
    case 'bold':
      ctx.font = `black ${baseSize * 1.2}px "Arial Black", sans-serif`;
      ctx.fillStyle = '#ffff00';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = baseSize / 10;
      break;
    case 'traditional':
      ctx.font = `bold ${baseSize}px "Kaiti", serif`;
      ctx.fillStyle = '#1a1a1a';
      break;
    case 'brush':
      ctx.font = `bold ${baseSize}px cursive`;
      ctx.fillStyle = '#d63031';
      break;
  }
};

export const processImage = (
  base64: string,
  adjustments: ImageAdjustments
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas context not available");

      let sourceWidth = img.width;
      let sourceHeight = img.height;

      const isVertical = adjustments.rotation % 180 !== 0;
      const targetWidth = isVertical ? sourceHeight : sourceWidth;
      const targetHeight = isVertical ? sourceWidth : sourceHeight;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%)`;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((adjustments.rotation * Math.PI) / 180);
      
      ctx.drawImage(
        img, 
        0, 0, sourceWidth, sourceHeight, 
        -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight
      );
      ctx.restore();

      // Draw Added Texts
      if (adjustments.texts && adjustments.texts.length > 0) {
        adjustments.texts.forEach(text => {
          ctx.save();
          applyTextStyle(ctx, text.style, text.fontSize, canvas.width);
          
          const posX = (text.x / 100) * canvas.width;
          const posY = (text.y / 100) * canvas.height;
          
          if (text.style === 'traditional') {
            const chars = text.content.split('');
            const fontSize = parseFloat(ctx.font);
            chars.forEach((char, i) => {
              ctx.fillText(char, posX, posY + (i * fontSize * 1.1));
            });
          } else {
            if (text.style === 'bold') {
              ctx.strokeText(text.content, posX, posY);
            }
            ctx.fillText(text.content, posX, posY);
          }
          ctx.restore();
        });
      }

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = base64;
  });
};
