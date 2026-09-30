import React from 'react';
import { Github, AlertCircle } from 'lucide-react';
import { useStore } from '../store';

export default function Header() {
  const { activeFaults } = useStore();
  const hasFault = activeFaults.length > 0;

  return (
    <header className="h-12 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-accent font-display font-bold tracking-wide text-[clamp(14px,1.2vw,18px)] flex items-center gap-2">
          Aero-Piston Engine Digital Twin
        </h1>
        <a 
          href="https://github.com/MilindLate/A_twin.git" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors text-[clamp(10px,0.8vw,12px)] font-mono border border-border bg-bg px-2 py-1 rounded"
        >
          <Github size={12} />
          <span>github.com/MilindLate/A_twin.git</span>
        </a>
      </div>

      <div className="flex items-center gap-6">
        {hasFault && (
          <div className="animate-pulse flex items-center gap-2 bg-critical/10 border border-critical text-critical px-3 py-1 rounded">
            <AlertCircle size={14} />
            <span className="font-mono text-[clamp(10px,0.8vw,12px)] font-bold tracking-wider">SYSTEM FAULT DETECTED</span>
          </div>
        )}
        
        {/* DRDO Logo Placeholder */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center bg-bg border border-[#0ea5e9]/30 rounded px-3 py-1">
            <span className="font-display font-black text-[#f97316] text-[clamp(12px,1vw,16px)] tracking-wider">DR</span>
            <span className="font-display font-black text-[#0ea5e9] text-[clamp(12px,1vw,16px)] tracking-wider">DO</span>
          </div>
        </div>
      </div>
    </header>
  );
}
