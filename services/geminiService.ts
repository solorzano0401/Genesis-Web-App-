import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface SeoResult {
  description: string;
  primary: string[];
  attributes: string[];
  seoTitles: string[];
}

/**
 * Converts a File object to a Base64 string.
 */
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Generates a list of creative filenames based on the image content using Gemini.
 */
export const generateFilenamesFromImage = async (file: File, count: number = 10): Promise<string[]> => {
  try {
    if (!API_KEY) {
      console.warn("API Key is missing. Skipping AI generation.");
      return ["FALTA_API_KEY_REVISA_ENV"];
    }

    const imagePart = await fileToGenerativePart(file);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          imagePart,
          {
            text: `Analiza esta imagen y genera una lista de ${count} nombres de archivo distintos, descriptivos y altamente releventas y optimizados para SEO.
            Devuelve SOLO la lista de nombres (sin extensiones de archivo).
            Los nombres deben estar en ESPAÑOL.
            Usa guiones o guiones bajos en lugar de espacios.
            No incluyas numeración ni viñetas.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const jsonString = response.text;
    if (!jsonString) return [];

    const names = JSON.parse(jsonString);
    return Array.isArray(names) ? names : [];

  } catch (error) {
    console.error("Error generating filenames:", error);
    throw error;
  }
};

/**
 * Generates structured SEO Keywords based on text and optional image with deep logical reasoning for e-commerce.
 */
export const generateSeoKeywords = async (inputText: string, imageFile?: File): Promise<SeoResult> => {
  try {
    if (!API_KEY) throw new Error("API Key Missing");

    const parts: any[] = [];
    
    if (imageFile) {
      const imagePart = await fileToGenerativePart(imageFile);
      parts.push(imagePart);
    }

    if (inputText) {
      parts.push({ text: `Contexto del producto/contenido: "${inputText}"` });
    }

    const prompt = `
      Actúa como un Especialista Master en SEO Técnico avanzado para E-commerce.
      Realiza un análisis lógico exhaustivo de la imagen y/o texto proporcionado para generar una ESTRATEGIA DE PALABRAS CLAVE ESTRUCTURADA y una DESCRIPCIÓN TÉCNICA optimizada para ficha de producto.
      
      OBJETIVO: Optimización On-Page para sitios web (Fichas de producto, Categorías, Filtros).
      ESTRICTAMENTE PROHIBIDO: Hashtags, copy emocional ("increíble", "bonito"), términos de redes sociales, preguntas frecuentes tipo blog.

      PASOS DE RAZONAMIENTO:
      1.  **Identificación Core**: ¿Qué es exactamente? (Categoría, Tipo de producto, Nombre técnico).
      2.  **Desglose de Atributos**: Analiza visualmente o por texto: Materiales, Colores, Dimensiones, Compatibilidad, Tecnología, Estilo, Marca, Modelo. Busca propiedades físicas concretas.
      3.  **Títulos SEO de Alto Impacto**: Genera 3 Títulos SEO optimizados. Deben ser atractivos, sin palabras de relleno, accio o irrelevantes y tener estrictamente MENOS DE 70 CARACTERES.
      4.  **Descripción del Producto**: Genera un texto descriptivo detallado resaltando las características técnicas y beneficios funcionales.

      FORMATO DE SALIDA (JSON):
      - "description": Un párrafo completo (50-80 palabras) describiendo el producto, sus características técnicas, uso y beneficios principales. Tono profesional y directo.
      - "primary": 10-15 Términos principales de alto volumen (Nombre del producto, Categoría principal, Sinónimos directos, comunmente conocido).
      - "attributes": 15 Keywords de atributo/especificación (Color, material, tamaño, marca, modelo, tecnología, SKU-style).
      - "seoTitles": 3 Títulos SEO optimizados (<70 caracteres) sin detalles irrelevantes o de relleno libres de separadores.)

      Idioma: ESPAÑOL NEUTRO/TÉCNICO.
    `;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            primary: { type: Type.ARRAY, items: { type: Type.STRING } },
            attributes: { type: Type.ARRAY, items: { type: Type.STRING } },
            seoTitles: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["description", "primary", "attributes", "seoTitles"]
        }
      }
    });

    const jsonString = response.text;
    if (!jsonString) throw new Error("Empty response");
    
    const result = JSON.parse(jsonString);
    return result as SeoResult;

  } catch (error) {
    console.error("Error generating keywords:", error);
    throw error;
  }
};
