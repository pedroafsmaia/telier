import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Map, 
  FileText, 
  Activity,
  Settings,
  LogOut
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FolderKanban, label: 'Projects', path: '/projects' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: Map, label: 'Focus Map', path: '/focus' },
    { icon: FileText, label: 'Report', path: '/report' },
    { icon: Activity, label: 'Live', path: '/live' },
  ];

  return (
    <aside className="w-64 h-screen bg-surface-low border-r border-border-dim flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-border-dim flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-blue flex items-center justify-center font-bold text-white">T</div>
        <span className="font-bold tracking-tight text-xl text-white">TELIER</span>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors
              ${isActive 
                ? 'bg-brand-blue text-white' 
                : 'text-gray-400 hover:text-white hover:bg-surface-high'}
            `}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border-dim space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-surface-high transition-colors">
          <Settings size={18} />
          Settings
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-surface-high transition-colors">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
