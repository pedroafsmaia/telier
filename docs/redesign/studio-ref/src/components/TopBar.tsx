import React from 'react';
import { Search, Bell, User } from 'lucide-react';

interface TopBarProps {
  title: string;
}

const TopBar: React.FC<TopBarProps> = ({ title }) => {
  return (
    <header className="h-16 bg-surface border-b border-border-dim flex items-center justify-between px-8 sticky top-0 z-40">
      <h1 className="text-lg font-semibold text-white tracking-tight uppercase">{title}</h1>
      
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-blue transition-colors" />
          <input 
            type="text" 
            placeholder="Search projects, tasks..." 
            className="bg-surface-low border border-border-dim pl-10 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-brand-blue w-64 transition-all"
          />
        </div>
        
        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-blue rounded-full border-2 border-surface"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-border-dim">
          <div className="text-right">
            <p className="text-xs font-medium text-white">Pedro Maia</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Principal Architect</p>
          </div>
          <div className="w-8 h-8 bg-surface-high border border-border-dim flex items-center justify-center text-gray-400 overflow-hidden">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
