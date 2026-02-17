import { GoogleGenAI, Type } from "@google/genai";
import { Disposition, CallAuditResult } from "../types";

const extractAgentCode = (fileName: string): string => {
  const match = fileName.match(/IN\d+/i);
  return match ? match[0].toUpperCase() : "AGENT_UNIDENTIFIED";
};

/**
 * Analyzes call audio using Gemini with elite-level behavioral QA protocols.
 * Optimized for gemini-3-flash-preview.
 */
export const analyzeCallAudio = async (
  audioBase64: string,
  mimeType: string,
  fileName: string
): Promise<CallAuditResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API Key must be set when running in a browser environment. Please use the 'Initialize Secure Key' function.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const agentCode = extractAgentCode(fileName);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType,
            },
          },
          {
            text: `AUDIT PROTOCOL: Agent Code: ${agentCode}. 
You are an Elite Behavioral QA Director. Your analysis must be surgical, critical, and granular. 

TERMINOLOGY RULES (STRICT ADHERENCE REQUIRED): 
- NEVER use the term "Lead Generated" or "Lead" in any field. 
- Any positive outcome where a follow-up is required or interest is shown MUST be categorized as "CALLBACK".
- "SALE" is exclusively for definitive closed deals.
- All non-sale interest-based outcomes = CALLBACK.

Focus on:
1. MANDATORY DISPOSITION CATEGORIZATION:
   - SALE: Only if definitive closing happens.
   - CALLBACK: MANDATORY for any positive interest, appointment set, or follow-up requested. (REPLACES ALL LEAD TERMINOLOGY).
   - CNP (Customer Not Present): Answering machine, disconnect before greeting, or silence.
   - NI (Not Interested): Direct rejection.
   - CC (Call Cut): Hangup during pitch.

2. SURGICAL BEHAVIORAL ANALYSIS:
   - Empathy Index: Listening vs waiting to speak.
   - Dead Air: Timestamps of silences > 2 seconds.
   - Rebuttal Quality: Usage of Empathize-Pivot-Ask framework. Folded early?
   - Pitch Energy: Professionalism level.

3. FEEDBACK FIELDS:
   - 'detailedNarrative': Turn-by-Turn breakdown with timestamps [MM:SS].
   - 'failurePoints': Specific behavioral critiques.

Output strictly valid JSON.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recordedDisposition: { type: Type.STRING },
            suggestedDisposition: { type: Type.STRING, enum: Object.values(Disposition) },
            confidence: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            detailedNarrative: { type: Type.STRING },
            failurePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            customerSentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] },
            nextSteps: { type: Type.STRING },
            duration: { type: Type.STRING },
            scorecard: {
              type: Type.OBJECT,
              properties: {
                discoveryPhase: { type: Type.STRING },
                objectionHandling: { type: Type.STRING },
                strictAdherence: { type: Type.STRING }
              },
              required: ["discoveryPhase", "objectionHandling", "strictAdherence"]
            }
          },
          required: [
            "recordedDisposition", 
            "suggestedDisposition", 
            "summary", 
            "detailedNarrative", 
            "failurePoints", 
            "customerSentiment", 
            "nextSteps", 
            "scorecard", 
            "duration"
          ]
        },
      },
    });

    const resultData = JSON.parse(response.text || "{}");

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      fileName,
      agentCode,
      ...resultData,
    };
  } catch (error: any) {
    console.error("QA Analysis Terminal Error:", error);
    if (error.message?.toLowerCase().includes("quota") || error.status === 429) {
      throw new Error("Analysis Quota Exceeded. Please try again shortly.");
    }
    // Forward the specific SDK error for key selection to the UI
    if (error.message?.includes("API Key")) {
      throw new Error("An API Key must be set when running in a browser environment.");
    }
    throw new Error(error.message || "Surgical analysis failed. Audio stream may be unreadable.");
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      if (!result || !result.includes(",")) {
        reject(new Error("Audio decoding failed."));
        return;
      }
      const base64String = result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = () => reject(new Error("Browser file access error."));
  });
};