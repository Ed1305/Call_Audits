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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

TERMINOLOGY RULE: 
- NEVER use the term "Lead Generated" or "Lead". 
- Any positive outcome where a follow-up is required or interest is shown MUST be categorized as "CALLBACK".
- "SALE" is only for definitive closes.

Focus on:
1. MANDATORY DISPOSITION CATEGORIZATION:
   - SALE: Only if definitive closing happens.
   - CALLBACK: MANDATORY for any positive interest, appointment set, or follow-up requested. (Replaces 'Lead').
   - CNP (Customer Not Present): Answering machine, disconnect before greeting, or silence.
   - NI (Not Interested): Direct rejection.
   - CC (Call Cut): Hangup during pitch.

2. SURGICAL BEHAVIORAL ANALYSIS:
   - Empathy Index: Listening vs waiting to speak.
   - Dead Air: Timestamps of silences > 2 seconds.
   - Rebuttal Quality: Usage of Empathize-Pivot-Ask framework.
   - Pitch Energy: Professionalism level.

3. FEEDBACK:
   - 'detailedNarrative': Turn-by-Turn breakdown [MM:SS].
   - 'failurePoints': Specific skill critiques.

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
      throw new Error("Quota Exceeded. System limits reached. Please try again later.");
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