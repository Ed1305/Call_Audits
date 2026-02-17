export enum Disposition {
  SALE = 'SALE',
  CALLBK = 'CALLBACK',
  CC = 'CallCut',
  CNP = 'CNP',
  NI = 'Not Interested',
  DNC = 'Do Not Call',
  DNQ = 'Do Not Qualify',
  TS = 'TroubleShooter',
  LB = 'LanguageBarrier',
  OTHER = 'OTHER'
}

export interface CallAuditResult {
  id: string;
  timestamp: string;
  agentCode: string;
  recordedDisposition: string;
  suggestedDisposition: Disposition;
  confidence: number;
  summary: string;
  detailedNarrative: string;
  failurePoints: string[];
  customerSentiment: 'Positive' | 'Neutral' | 'Negative';
  nextSteps: string;
  duration: string;
  fileName: string;
  scorecard: {
    discoveryPhase: string;
    objectionHandling: string;
    strictAdherence: string;
  };
}

export interface AuditState {
  audits: CallAuditResult[];
  isAnalyzing: boolean;
  error: string | null;
}