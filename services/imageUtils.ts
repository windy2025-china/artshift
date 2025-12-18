
import { PosterText, TextStyle, AspectRatio } from "../types";

export interface ImageAdjustments {
  brightness: number; 
  contrast: number;   
  rotation: number;   
  texts?: PosterText[];
  aspectRatio: AspectRatio;
}

const applyTextStyle = (ctx: CanvasRenderingContext2D, style: TextStyle, fontSize: number, canvasWidth: number) => {
  const baseSize = (canvasWidth / 15) * fontSize; // Adjusted base size for better scaling
  
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
      ctx.lineWidth = baseSize / 15;
      break;
    case 'traditional':
      ctx.font = `bold ${baseSize}px "Kaiti", "STKaiti", serif`;
      ctx.fillStyle = '#1a1a1a';
      break;
    case 'brush':
      ctx.font = `bold ${baseSize}px cursive`;
      ctx.fillStyle = '#d63031';
      break;
  }
};

const getTargetDimensions = (srcW: number, srcH: number, ratio: AspectRatio) => {
  if (ratio === 'original') return { width: srcW, height: srcH, cropX: 0, cropY: 0, cropW: srcW, cropH: srcH };

  let targetRatio = 1;
  switch (ratio) {
    case '1:1': targetRatio = 1; break;
    case '16:9': targetRatio = 16/9; break;
    case '9:16': targetRatio = 9/16; break;
    case '4:3': targetRatio = 4/3; break;
    case '3:4': targetRatio = 3/4; break;
  }

  const currentRatio = srcW / srcH;
  let cropW, cropH, cropX, cropY;

  if (currentRatio > targetRatio) {
    // Image is wider than target; crop width
    cropH = srcH;
    cropW = srcH * targetRatio;
    cropY = 0;
    cropX = (srcW - cropW) / 2;
  } else {
    // Image is taller than target; crop height
    cropW = srcW;
    cropH = srcW / targetRatio;
    cropX = 0;
    cropY = (srcH - cropH) / 2;
  }

  return { width: cropW, height: cropH, cropX, cropY, cropW, cropH };
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

      // 1. Calculate Crop based on Aspect Ratio
      const dims = getTargetDimensions(img.width, img.height, adjustments.aspectRatio);

      // 2. Handle Rotation (Swap width/height if vertical)
      const isVertical = adjustments.rotation % 180 !== 0;
      const finalCanvasWidth = isVertical ? dims.height : dims.width;
      const finalCanvasHeight = isVertical ? dims.width : dims.height;

      canvas.width = finalCanvasWidth;
      canvas.height = finalCanvasHeight;

      // 3. Apply Filters
      ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%)`;

      // 4. Draw
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((adjustments.rotation * Math.PI) / 180);
      
      // Draw image using calculated crop coordinates
      // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      ctx.drawImage(
        img, 
        dims.cropX, dims.cropY, dims.cropW, dims.cropH, 
        -dims.width / 2, -dims.height / 2, dims.width, dims.height
      );
      ctx.restore();

      // 5. Apply Texts
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
