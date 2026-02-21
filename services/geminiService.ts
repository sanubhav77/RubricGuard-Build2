import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { AIAnalysis, RubricCriterion, ValidationStatus } from '../types';

/**
 * Utility function to convert a Blob to a Base64 string.
 * Not strictly used for text-based AI, but useful for image/audio input in other Gemini contexts.
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove the data:mime/type;base64, prefix
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to read blob as string."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Utility function to decode Base64 to Uint8Array (for audio/image output).
 * Not strictly used for text-based AI, but useful for image/audio output in other Gemini contexts.
 */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Function to initialize GoogleGenAI. This must be called right before an API request
// to ensure it uses the latest process.env.API_KEY.
const getGenAIClient = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is not set. Please ensure it's available in the environment.");
    // Optionally, open a key selection dialog if in AISTUDIO environment
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      console.warn("Attempting to open API key selection dialog.");
      (window as any).aistudio.openSelectKey();
    }
    throw new Error("Gemini API_KEY is missing.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Validates a professor's rubric score explanation against the submission content
 * using the Gemini API.
 */
export const validateJustification = async (
  submissionContent: string,
  criterion: RubricCriterion,
  score: number,
  explanation: string,
  highlightedText?: string,
): Promise<AIAnalysis> => {
  try {
    const ai = getGenAIClient();
    const model = "gemini-3-flash-preview"; // Best for basic text tasks and JSON output

    const prompt = `You are an AI grading assistant. Your task is to validate a professor's explanation for a given rubric criterion and score against a student's submission content.

Submission Content:
\`\`\`
${submissionContent}
\`\`\`

Rubric Criterion: "${criterion.name}" - ${criterion.description} (Max Score: ${criterion.maxScore})
Assigned Score: ${score}
Professor's Explanation: "${explanation}"
${highlightedText ? `Professor highlighted this text from the submission: "${highlightedText}"` : ''}

Evaluate the professor's explanation based on the submission content and rubric criterion.
1. Determine if the explanation is 'Supported', 'Partial', or 'Not Supported' by the submission content.
2. If the explanation is 'Partial' or 'Not Supported', suggest a refinement to make it more accurate or specific.
3. Identify a direct excerpt from the submission content that best supports the assigned score and explanation, or highlights the area lacking support if 'Not Supported'.

Provide your response in JSON format according to the following schema:
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: "One of 'Supported', 'Partial', or 'Not Supported'.",
          enum: ['Supported', 'Partial', 'Not Supported'],
        },
        referencedExcerpt: {
          type: Type.STRING,
          description: "A short, relevant excerpt from the submission content that either supports or contradicts the explanation, or indicates a key area.",
        },
        suggestedRefinement: {
          type: Type.STRING,
          description: "A suggestion to improve the professor's explanation, if it's 'Partial' or 'Not Supported'. Leave empty if 'Supported'.",
        },
      },
      required: ['status', 'referencedExcerpt'],
      propertyOrdering: ['status', 'referencedExcerpt', 'suggestedRefinement'],
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    let jsonStr = response.text.trim();
    const parsedResponse = JSON.parse(jsonStr);

    let status: ValidationStatus;
    if (parsedResponse.status === 'Supported') {
      status = ValidationStatus.Supported;
    } else if (parsedResponse.status === 'Partial') {
      status = ValidationStatus.Partial;
    } else if (parsedResponse.status === 'Not Supported') {
      status = ValidationStatus.NotSupported;
    } else {
      status = ValidationStatus.Error; // Fallback for unexpected status
    }

    return {
      status: status,
      referencedExcerpt: parsedResponse.referencedExcerpt,
      suggestedRefinement: parsedResponse.suggestedRefinement || undefined,
    };

  } catch (error: any) {
    console.error("Error validating justification with Gemini API:", error);
    // Check for "Requested entity was not found." error specifically for API key issues
    if (error.message && error.message.includes("Requested entity was not found.")) {
        console.error("API Key might be invalid or not selected. Prompting user to select key.");
        if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
            (window as any).aistudio.openSelectKey();
        }
    }
    return { status: ValidationStatus.Error, error: error.message || "An unexpected error occurred." };
  }
};

/**
 * Analyzes the tone of the professor's explanation.
 * This is a simpler text-to-text call without a structured schema for now.
 * Could be expanded with a more detailed schema if needed.
 */
export const analyzeExplanationTone = async (explanation: string): Promise<string> => {
  try {
    const ai = getGenAIClient();
    const model = "gemini-3-flash-preview";

    const prompt = `Analyze the tone of the following explanation provided by a professor for a student's grade. Describe its general sentiment (e.g., constructive, critical, neutral, empathetic, overly harsh, too vague) in a brief sentence.

Explanation: "${explanation}"

Tone Analysis:`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: prompt }] },
    });

    return response.text.trim();

  } catch (error: any) {
    console.error("Error analyzing explanation tone with Gemini API:", error);
    // Check for "Requested entity was not found." error specifically for API key issues
    if (error.message && error.message.includes("Requested entity was not found.")) {
        console.error("API Key might be invalid or not selected. Prompting user to select key.");
        if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
            (window as any).aistudio.openSelectKey();
        }
    }
    return "Could not analyze tone due to an error.";
  }
};

// You can add more Gemini-related functions here if needed, e.g., for generating summary reports.
// The decode function is also exported as a utility, though currently unused in this specific app logic.
export { decode, blobToBase64 };
