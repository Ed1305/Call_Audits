import React, { useState, useRef, useEffect } from 'react';
import { analyzeCallAudio, fileToBase64 } from './services/geminiService';
import { CallAuditResult, AuditState } from './types';
import AuditCard from './components/AuditCard';

const STORAGE_KEY = 'voxaudit_pro_v3_final';

// Accurate SVG reconstruction of the provided "Au" file logo
const LogoAu = () => (
  <svg width="42" height="42" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Main document body */}
    <path d="M416 112V472C416 489.673 401.673 504 384 504H128C110.327 504 96 489.673 96 472V40C96 22.3269 110.327 8 128 8H312L416 112Z" fill="#000044" stroke="#8888FF" strokeWidth="12"/>
    {/* Corner fold */}
    <path d="M416 112H312V8L416 112Z" fill="#8888FF" stroke="#8888FF" strokeWidth="4"/>
    {/* Top lines */}
    <rect x="140" y="100" width="140" height="18" rx="9" fill="#8888FF"/>
    <rect x="140" y="145" width="230" height="18" rx="9" fill="#8888FF"/>
    <rect x="140" y="190" width="230" height="18" rx="9" fill="#8888FF"/>
    {/* Central "Au" Banner */}
    <rect x="56" y="240" width="400" height="190" rx="40" fill="#000044" stroke="#8888FF" strokeWidth="12"/>
    <text x="50%" y="375" textAnchor="middle" fill="#8888FF" fontSize="165" fontWeight="900" style={{ fontFamily: 'Calibri, sans-serif' }}>Au</text>
  </svg>
);

const App: React.FC = () => {
  const [state, setState] = useState<AuditState>({
    audits: [],
    isAnalyzing: false,
    error: null,
  });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setState(prev => ({ ...prev, audits: parsed }));
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (state.audits.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.audits));
    }
  }, [state.audits]);

  const handleKeySetup = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setState(prev => ({ ...prev, error: null }));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const base64 = await fileToBase64(file);
      const result = await analyzeCallAudio(base64, file.type, file.name);
      
      setState(prev => ({
        ...prev,
        audits: [result, ...prev.audits],
        isAnalyzing: false
      }));
    } catch (err: any) {
      console.error("Audit failure:", err);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: err.message || "An unexpected error occurred during analysis."
      }));
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadPDF = () => {
    if (state.audits.length === 0) {
      alert("No audit records found to export.");
      return;
    }

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const margin = 15;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("CALL AUDIT REPORT: MASTER LOG", margin, y);
    
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, y);
    doc.text(`Total Records: ${state.audits.length}`, margin, y + 5);
    
    y += 20;

    state.audits.forEach((audit, index) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229);
      doc.text(`AUDIT #${state.audits.length - index}: AGENT ${audit.agentCode}`, margin, y);
      
      y += 7;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`File: ${audit.fileName} | Duration: ${audit.duration} | Date: ${new Date(audit.timestamp).toLocaleDateString()}`, margin, y);
      
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text(`Agent Log: ${audit.recordedDisposition} | Verdict: ${audit.suggestedDisposition}`, margin, y);

      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      const summaryText = doc.splitTextToSize(`Summary: ${audit.summary}`, 180);
      doc.text(summaryText, margin, y);
      y += (summaryText.length * 5);

      if (audit.failurePoints.length > 0) {
        y += 2;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(225, 29, 72);
        doc.text("Behavioral Critiques:", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        audit.failurePoints.forEach(point => {
          const pointText = doc.splitTextToSize(`• ${point}`, 175);
          doc.text(pointText, margin + 5, y);
          y += (pointText.length * 5);
        });
      }

      y += 10;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, 210 - margin, y);
      y += 15;
    });

    doc.save(`CallAudit_Report_${Date.now()}.pdf`);
  };

  const clearEverything = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
      setState({
        audits: [],
        isAnalyzing: false,
        error: null,
      });
      setIsResetModalOpen(false);
    } catch (error) {
      console.error("Purge failure:", error);
      alert("Failed to execute purge.");
    }
  };

  return (
    <div className="min-h-screen pb-10 bg-[#f4f7f9] text-slate-800 antialiased font-['Calibri'] relative">
      <header className="bg-[#0f172a] text-white sticky top-0 z-50 shadow-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LogoAu />
            <div className="flex flex-col">
              <h1 className="text-xl font-black uppercase leading-none tracking-tight">CALL AUDITS <span className="font-light text-indigo-400">ANALYSIS</span></h1>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em]">INTELLIGENT ANALYSIS</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 lg:gap-6">
            {state.audits.length > 0 && (
              <>
                <button 
                  onClick={handleDownloadPDF} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-base font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                >
                  <i className="fa-solid fa-file-pdf"></i>
                  Export PDF
                </button>
                <button
                  onClick={() => setIsResetModalOpen(true)}
                  className="text-red-400/30 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-all px-2 py-1 border border-red-500/10 hover:border-red-500/30 rounded"
                >
                  ☢ PURGE ALL
                </button>
              </>
            )}
            <div className="bg-[#1e293b] px-4 py-1.5 rounded-full border border-slate-700 shadow-inner hidden md:block">
               <span className="text-base font-bold text-indigo-400 uppercase">
                {state.audits.length} Records
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          <div className="lg:col-span-3">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-microphone"></i> Analysis Intake
              </h2>
              
              <div 
                onClick={() => !state.isAnalyzing && fileInputRef.current?.click()}
                className={`group cursor-pointer border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-all ${
                  state.isAnalyzing ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-indigo-600 hover:bg-slate-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="audio/*" 
                />
                {state.isAnalyzing ? (
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full mb-4 mx-auto"></div>
                    <p className="text-sm font-bold text-indigo-700 uppercase">Auditing...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <i className="fa-solid fa-cloud-arrow-up text-4xl text-slate-300 group-hover:text-indigo-600 mb-3 transition-colors"></i>
                    <p className="text-base font-bold text-slate-700 uppercase">Upload Audio</p>
                  </div>
                )}
              </div>

              {state.error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm font-bold flex flex-col gap-3 shadow-sm">
                  <div className="flex gap-2">
                    <i className="fa-solid fa-warning mt-0.5"></i>
                    <span className="leading-tight">
                      {state.error.includes("API Key") ? "Secure Analysis Environment Not Initialized." : state.error}
                    </span>
                  </div>
                  {state.error.toLowerCase().includes("api key") && window.aistudio && (
                    <button 
                      onClick={handleKeySetup}
                      className="w-full py-2 bg-red-600 text-white rounded font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-key"></i>
                      Initialize Secure Key
                    </button>
                  )}
                  {state.error.toLowerCase().includes("api key") && !window.aistudio && (
                    <p className="text-[10px] text-red-600/70 italic uppercase tracking-tighter">
                      Bridge not detected. Ensure environment variables are configured.
                    </p>
                  )}
                </div>
              )}
              
              <div className="mt-8 pt-8 border-t border-slate-100">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-2">Instructions</p>
                <p className="text-xs text-slate-500 leading-normal">
                  Upload MP3/WAV files. Agent code (e.g., IN123) must be in the filename for tracking.
                </p>
                <p className="text-[9px] text-slate-400 mt-4 leading-tight">
                  <i className="fa-solid fa-circle-info"></i> Using <strong className="text-indigo-400">gemini-3-flash-preview</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-9">
            {state.audits.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-48 flex flex-col items-center justify-center text-slate-300 shadow-sm">
                <i className="fa-solid fa-chart-line text-7xl opacity-10 mb-6"></i>
                <p className="font-bold uppercase tracking-[0.4em] text-base text-slate-400">Environment Ready</p>
                <p className="text-sm font-medium text-slate-300 mt-2 uppercase tracking-widest">Awaiting Audio Ingestion</p>
              </div>
            ) : (
              <div className="space-y-8">
                {state.audits.map((audit) => (
                  <AuditCard key={audit.id} audit={audit} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Purge Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0f172a] rounded-2xl w-full max-w-sm p-10 text-center space-y-6 border border-red-500/30 shadow-2xl shadow-red-500/10">
            <div className="w-16 h-16 bg-red-500/15 text-red-500 rounded-2xl flex items-center justify-center mx-auto text-3xl animate-pulse">⚡</div>
            <div className="space-y-2">
              <h3 className="font-black text-white uppercase italic text-[14px] tracking-widest">PURGE PROTOCOL</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed font-bold italic uppercase tracking-tighter">
                Eradicate all vaulted audit intelligence?
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 px-5 py-2.5 bg-white/5 text-slate-400 font-black uppercase rounded-xl text-[10px] border border-white/5 transition-all hover:bg-white/10"
              >
                Abort
              </button>
              <button
                onClick={clearEverything}
                className="flex-1 px-5 py-2.5 bg-red-700 text-white font-black uppercase rounded-xl text-[10px] shadow-lg active:scale-95 transition-all hover:bg-red-600"
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;