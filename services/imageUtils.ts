
import { PosterText, TextStyle, AspectRatio, Sticker } from "../types";

export interface ImageAdjustments {
  brightness: number; 
  contrast: number;   
  rotation: number;   
  blurIntensity: number; // 0-20
  texts?: PosterText[];
  stickers?: Sticker[];
  aspectRatio: AspectRatio;
}

const applyTextStyle = (ctx: CanvasRenderingContext2D, text: PosterText, canvasWidth: number) => {
  const baseSize = (canvasWidth / 20) * text.fontSize;
  
  // Default values
  let font = text.fontFamily || 'Inter';
  let color = text.color || '#ffffff';
  let shadowColor = text.shadowColor || 'rgba(0,0,0,0.5)';
  let shadowBlur = text.shadowBlur !== undefined ? text.shadowBlur : 4;
  let glowColor = text.glowColor || 'transparent';
  let glowSize = text.glowSize || 0;

  // Preset Overrides (if not custom)
  if (text.style !== 'custom') {
    switch (text.style) {
      case 'neon':
        font = 'Inter';
        color = '#00f2ff';
        shadowColor = '#00f2ff';
        shadowBlur = 20;
        glowColor = '#00f2ff';
        glowSize = 10;
        break;
      case 'elegant':
        font = 'serif';
        color = '#ffffff';
        shadowColor = 'rgba(0,0,0,0.8)';
        shadowBlur = 4;
        break;
      case 'bold':
        font = 'Impact, sans-serif';
        color = '#ffff00';
        shadowColor = '#000000';
        shadowBlur = 0;
        break;
      case 'traditional':
        font = 'Ma Shan Zheng, cursive';
        color = '#1a1a1a';
        shadowBlur = 0;
        break;
      case 'brush':
        font = 'ZCOOL KuaiLe, cursive';
        color = '#d63031';
        shadowColor = '#ffffff';
        shadowBlur = 0;
        break;
    }
  }

  ctx.font = `bold ${baseSize}px "${font}", sans-serif`;
  ctx.fillStyle = color;
  
  // Apply Glow / Shadow
  if (glowSize > 0 && glowColor !== 'transparent') {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowSize;
    ctx.fillText(text.content, 0, 0); // Draw glow layer
    ctx.shadowBlur = 0; // Reset for main text
  }

  // Apply Shadow
  if (shadowBlur > 0 || text.style === 'bold') {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    
    // For bold style, we often want a hard outline
    if (text.style === 'bold') {
       ctx.lineWidth = baseSize / 15;
       ctx.strokeStyle = shadowColor;
       ctx.strokeText(text.content, 0, 0);
    }
  } else {
      ctx.shadowColor = 'transparent';
  }

  ctx.fillText(text.content, 0, 0);
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

      // 1. Calculate Dimensions
      const dims = getTargetDimensions(img.width, img.height, adjustments.aspectRatio);

      // Handle Rotation (Swap width/height if vertical)
      const isVertical = adjustments.rotation % 180 !== 0;
      const finalCanvasWidth = isVertical ? dims.height : dims.width;
      const finalCanvasHeight = isVertical ? dims.width : dims.height;

      canvas.width = finalCanvasWidth;
      canvas.height = finalCanvasHeight;

      // 2. Brightness/Contrast
      // Note: We apply this before blur so blur picks up the colors correctly,
      // but ctx.filter applies to drawing operations.
      const filterString = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%)`;

      // 3. Draw Main Image (Sharp Center)
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((adjustments.rotation * Math.PI) / 180);
      
      // If we have blur, we simulate depth of field
      if (adjustments.blurIntensity > 0) {
        // Step A: Draw Blurred version first (Background)
        ctx.save();
        ctx.filter = `${filterString} blur(${adjustments.blurIntensity}px)`;
        ctx.drawImage(
          img, 
          dims.cropX, dims.cropY, dims.cropW, dims.cropH, 
          -dims.width / 2, -dims.height / 2, dims.width, dims.height
        );
        ctx.restore();

        // Step B: Draw Sharp version with Radial Mask (Subject Focus)
        // We need an offscreen canvas to create the masked sharp image
        const offCanvas = document.createElement('canvas');
        offCanvas.width = dims.width;
        offCanvas.height = dims.height;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
           offCtx.filter = filterString;
           offCtx.drawImage(img, dims.cropX, dims.cropY, dims.cropW, dims.cropH, 0, 0, dims.width, dims.height);
           
           // Create Radial Gradient Mask (Opaque center, Transparent edges)
           // Keep the subject (center) sharp
           offCtx.globalCompositeOperation = 'destination-in';
           const gradient = offCtx.createRadialGradient(
             dims.width / 2, dims.height / 2, dims.width * 0.2, // Start transparent circle
             dims.width / 2, dims.height / 2, dims.width * 0.7  // End
           );
           gradient.addColorStop(0, 'rgba(0,0,0,1)');
           gradient.addColorStop(1, 'rgba(0,0,0,0)');
           offCtx.fillStyle = gradient;
           offCtx.fillRect(0, 0, dims.width, dims.height);
           
           // Composite sharp masked image over blurred background
           ctx.drawImage(offCanvas, -dims.width / 2, -dims.height / 2);
        }

      } else {
        // Standard Drawing without blur
        ctx.filter = filterString;
        ctx.drawImage(
          img, 
          dims.cropX, dims.cropY, dims.cropW, dims.cropH, 
          -dims.width / 2, -dims.height / 2, dims.width, dims.height
        );
      }
      ctx.restore();

      // 4. Draw Stickers
      if (adjustments.stickers) {
        adjustments.stickers.forEach(sticker => {
          ctx.save();
          const x = (sticker.x / 100) * canvas.width;
          const y = (sticker.y / 100) * canvas.height;
          ctx.translate(x, y);
          ctx.rotate((sticker.rotation * Math.PI) / 180);
          ctx.scale(sticker.scale, sticker.scale);
          
          ctx.font = `${canvas.width / 10}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sticker.content, 0, 0);
          ctx.restore();
        });
      }

      // 5. Draw Texts
      if (adjustments.texts && adjustments.texts.length > 0) {
        adjustments.texts.forEach(text => {
          ctx.save();
          const posX = (text.x / 100) * canvas.width;
          const posY = (text.y / 100) * canvas.height;
          ctx.translate(posX, posY);
          
          applyTextStyle(ctx, text, canvas.width);
          ctx.restore();
        });
      }

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = base64;
  });
};
