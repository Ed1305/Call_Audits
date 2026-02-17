import React, { useState } from 'react';
import { CallAuditResult, Disposition } from '../types';
import DispositionBadge from './DispositionBadge';

interface Props {
  audit: CallAuditResult;
}

const AuditCard: React.FC<Props> = ({ audit }) => {
  const [showFullNarrative, setShowFullNarrative] = useState(false);
  
  const isDiscrepancy = audit.recordedDisposition.toUpperCase().trim() !== audit.suggestedDisposition.toUpperCase().trim();
  const hasFailures = audit.failurePoints && audit.failurePoints.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8 font-['Calibri']">
      {/* Alert Header */}
      <div className={`px-6 py-2.5 flex items-center justify-between text-white ${isDiscrepancy ? 'bg-red-600 shadow-inner' : 'bg-[#1e293b]'}`}>
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
          <i className={isDiscrepancy ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-check-circle"}></i>
          {isDiscrepancy ? 'DISCREPANCY DETECTED' : 'COMPLIANCE AUDIT PASSED'}
        </div>
        <div className="text-xs font-bold opacity-70">REF: {audit.id.split('-')[0].toUpperCase()}</div>
      </div>

      <div className="p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">AGENT: {audit.agentCode}</h3>
            <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-400 uppercase tracking-widest">
              <span>{audit.fileName}</span>
              <span className="flex items-center gap-1.5"><i className="fa-regular fa-clock"></i> {audit.duration}</span>
              <span className="flex items-center gap-1.5"><i className="fa-regular fa-calendar"></i> {new Date(audit.timestamp).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-slate-50 px-6 py-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Agent Log</span>
              <div className="text-sm font-bold text-slate-600 uppercase bg-white px-3 py-1 rounded border border-slate-200">{audit.recordedDisposition}</div>
            </div>
            <i className="fa-solid fa-arrow-right text-slate-300 text-lg"></i>
            <div className="text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">QA Verdict</span>
              <DispositionBadge disposition={audit.suggestedDisposition} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-100">
              <h4 className="text-sm font-black text-indigo-500 uppercase tracking-widest mb-3">Executive Summary</h4>
              <p className="text-base text-slate-800 leading-relaxed">
                {audit.summary}
              </p>
            </div>

            {hasFailures && (
              <div className="bg-rose-50/50 rounded-xl p-6 border border-rose-100">
                <h4 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-3">Behavioral Critiques</h4>
                <ul className="space-y-2.5">
                  {audit.failurePoints.map((point, idx) => (
                    <li key={idx} className="text-base text-rose-800 flex gap-3">
                      <span className="text-rose-300 mt-1 font-black text-lg">•</span> {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Turn-by-Turn Narrative</h4>
                <button onClick={() => setShowFullNarrative(!showFullNarrative)} className="text-sm font-bold uppercase text-indigo-600 hover:text-indigo-800 transition-colors">
                  {showFullNarrative ? 'Collapse' : 'Expand Details'}
                </button>
              </div>
              <div className={`text-base text-slate-600 leading-relaxed whitespace-pre-wrap ${showFullNarrative ? '' : 'line-clamp-3 opacity-60'}`}>
                {audit.detailedNarrative}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-[#0f172a] rounded-2xl p-6 text-white shadow-xl h-full border border-slate-800">
              <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
                 <i className="fa-solid fa-clipboard-check"></i> QA Scorecard
              </h4>
              <div className="space-y-6">
                <ScoreBox title="Discovery Phase" content={audit.scorecard.discoveryPhase} />
                <ScoreBox title="Rebuttal Quality" content={audit.scorecard.objectionHandling} />
                <ScoreBox title="Strict Adherence" content={audit.scorecard.strictAdherence} />
              </div>
              <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="text-right w-full flex justify-between items-center">
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Sentiment</span>
                    <span className={`text-base font-black ${audit.customerSentiment === 'Negative' ? 'text-rose-400' : audit.customerSentiment === 'Positive' ? 'text-emerald-400' : 'text-amber-400'}`}>{audit.customerSentiment}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">AI Confidence</span>
                    <span className="text-3xl font-black text-white tracking-tighter">{(audit.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ScoreBox: React.FC<{ title: string; content: string }> = ({ title, content }) => (
  <div className="space-y-2">
    <span className="text-xs font-black text-indigo-300/70 uppercase tracking-widest">{title}</span>
    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-sm text-slate-300 leading-normal italic">
      "{content || "No data provided."}"
    </div>
  </div>
);

export default AuditCard;