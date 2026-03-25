import React from 'react';
import { 
  Target, 
  Zap, 
  Clock, 
  Calendar,
  ChevronRight,
  ArrowUpRight,
  MoreVertical,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';

const FocusMap: React.FC = () => {
  const priorities = [
    { 
      id: 1, 
      title: 'Villa Monolith - Massing Study', 
      description: 'Refine the south elevation to maximize natural light while maintaining privacy.',
      time: '2h 15m',
      status: 'In Progress',
      priority: 'High',
      color: '#0055FF'
    },
    { 
      id: 2, 
      title: 'Urban Nexus - Material Palette', 
      description: 'Select sustainable concrete alternatives for the main structure.',
      time: '45m',
      status: 'Pending',
      priority: 'Medium',
      color: '#0055FF'
    },
    { 
      id: 3, 
      title: 'The Void Pavilion - Lighting Simulation', 
      description: 'Test the interaction between the central void and the afternoon sun.',
      time: '1h 30m',
      status: 'In Progress',
      priority: 'High',
      color: '#0055FF'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Focus Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">Focus Map</h2>
          <p className="text-xs text-gray-500 font-mono">Current priorities and time allocation for today, Mar 25.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Focus Time</p>
            <p className="text-2xl font-mono font-medium text-white">04:30:00</p>
          </div>
          <button className="px-6 py-2.5 bg-brand-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center gap-2">
            <Zap size={16} />
            Start Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Priority List */}
        <div className="lg:col-span-2 space-y-6">
          {priorities.map((item, i) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-surface-low border border-border-dim p-6 flex gap-6 group hover:border-brand-blue transition-colors cursor-pointer"
            >
              <div className="w-1 bg-brand-blue/20 group-hover:bg-brand-blue transition-colors"></div>
              
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-blue">{item.priority} Priority</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.status}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-brand-blue transition-colors uppercase">{item.title}</h3>
                  </div>
                  <button className="text-gray-500 hover:text-white">
                    <MoreVertical size={18} />
                  </button>
                </div>
                
                <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">
                  {item.description}
                </p>
                
                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Clock size={14} />
                    {item.time}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Target size={14} />
                    Goal: Finalize Concept
                  </div>
                  <button className="ml-auto text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors flex items-center gap-1">
                    View Project
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          
          <button className="w-full py-6 border border-dashed border-border-dim text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white hover:border-brand-blue hover:border-solid transition-all flex items-center justify-center gap-2">
            <Plus size={16} />
            Add Focus Item
          </button>
        </div>

        {/* Focus Stats */}
        <div className="space-y-8">
          <div className="bg-surface-low border border-border-dim p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Weekly Distribution</h3>
            <div className="space-y-6">
              {[
                { label: 'Design', value: 65, color: '#0055FF' },
                { label: 'Technical', value: 25, color: '#0055FF' },
                { label: 'Admin', value: 10, color: '#0055FF' },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                    <span className="text-gray-500">{stat.label}</span>
                    <span className="text-white">{stat.value}%</span>
                  </div>
                  <div className="h-1 bg-surface-high overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.value}%` }}
                      className="h-full bg-brand-blue"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-low border border-border-dim p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Upcoming Deadlines</h3>
            <div className="space-y-4">
              {[
                { title: 'Villa Monolith Review', date: 'Mar 28', urgent: true },
                { title: 'Urban Nexus Submission', date: 'Apr 02', urgent: false },
                { title: 'Void Pavilion Meeting', date: 'Apr 05', urgent: false },
              ].map((deadline, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-border-dim hover:border-brand-blue transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${deadline.urgent ? 'bg-red-500' : 'bg-brand-blue'}`}></div>
                    <span className="text-xs font-medium text-white group-hover:text-brand-blue transition-colors">{deadline.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500">{deadline.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusMap;
