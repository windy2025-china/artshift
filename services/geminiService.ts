
import { GoogleGenAI, Type } from "@google/genai";
import { ArtStyle, StyleOption, TextReplacement, EntityModification } from "../types";

const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TEXT_MODEL = 'gemini-3-flash-preview';

export const detectTextInImage = async (base64Image: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Please extract all visible text strings from this image. Return them as a simple JSON array of strings. Only return the JSON array, nothing else.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return [];
  } catch (error) {
    console.error("Text Detection Error:", error);
    return [];
  }
};

export const detectEntitiesInImage = async (base64Image: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Identify the main subjects in this image (e.g., 'Person', 'Background', 'Building', 'Dog'). Focus on 2-3 most prominent elements. Return them as a simple JSON array of strings. Only return the JSON array.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return [];
  } catch (error) {
    console.error("Entity Detection Error:", error);
    return ["Person", "Background"];
  }
};

export const transformImage = async (
  base64Image: string,
  style: StyleOption,
  customPrompt: string = "",
  textReplacements: TextReplacement[] = [],
  entityModifications: EntityModification[] = []
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';

  let finalPrompt = style.id === ArtStyle.CUSTOM ? customPrompt : style.prompt;
  
  if (textReplacements.length > 0) {
    const replacementInstructions = textReplacements
      .filter(tr => tr.original.trim() !== "" && tr.replacement.trim() !== "" && tr.original !== tr.replacement)
      .map(tr => `Change the text that says "${tr.original}" to "${tr.replacement}".`)
      .join(" ");
    
    if (replacementInstructions) {
      finalPrompt += ` IMPORTANT: ${replacementInstructions} Ensure the new text is rendered clearly and integrated naturally.`;
    }
  }

  if (entityModifications.length > 0) {
    const modInstructions = entityModifications
      .filter(em => em.instruction.trim() !== "")
      .map(em => `Modify the ${em.entity}: ${em.instruction}.`)
      .join(" ");
    
    if (modInstructions) {
      finalPrompt += ` SUBJECT MODIFICATIONS: ${modInstructions}`;
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: finalPrompt,
          },
        ],
      },
    });

    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
    }

    throw new Error("No image data returned from AI");
  } catch (error) {
    console.error("Gemini Transformation Error:", error);
    throw error;
  }
};
