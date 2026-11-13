import React from 'react';
import { Activity, Gauge, Globe, Cpu, Wrench } from 'lucide-react';

export type TabType = 'dashboard' | 'speed' | 'ip' | 'mac' | 'tools';

interface AndroidNavBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  accentColor: string;
}

export const AndroidNavBar: React.FC<AndroidNavBarProps> = ({
  activeTab,
  onSelectTab,
  accentColor,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'speed', label: 'Speed', icon: Gauge },
    { id: 'ip', label: 'IP Track', icon: Globe },
    { id: 'mac', label: 'MAC/HW', icon: Cpu },
    { id: 'tools', label: 'Tools', icon: Wrench },
  ] as const;

  return (
    <nav className="relative z-30 shrink-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-1.5 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="grid grid-cols-5 items-center max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="flex flex-col items-center justify-center min-h-[48px] py-1 text-center transition-all group active:scale-95 cursor-pointer"
            >
              <div
                className={`flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-500/20 text-teal-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 group-hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105 stroke-[2.2]' : 'stroke-[1.8]'}`} />
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5 transition-colors ${
                  isActive ? 'text-teal-400 font-semibold' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Android System Gesture Navigation Handle Pill */}
      <div className="hidden md:flex justify-center pt-1.5 pb-0.5">
        <div className="w-28 h-1 rounded-full bg-slate-600/50 hover:bg-slate-400/60 transition-colors" />
      </div>
    </nav>
  );
};
