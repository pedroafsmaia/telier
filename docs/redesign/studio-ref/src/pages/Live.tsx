import React from 'react';
import { 
  Activity, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight,
  MoreVertical,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';

const Live: React.FC = () => {
  const activeUsers = [
    { name: 'Pedro Maia', task: 'Villa Monolith - Massing Study', time: '02:15:42', status: 'Focusing', color: '#0055FF' },
    { name: 'Sofia Silva', task: 'Urban Nexus - Material Palette', time: '00:45:12', status: 'Researching', color: '#0055FF' },
    { name: 'Marco Rossi', task: 'The Void Pavilion - Structural Review', time: '01:30:05', status: 'Reviewing', color: '#0055FF' },
    { name: 'Elena Costa', task: 'Brutal Library - Landscape Design', time: '00:20:18', status: 'Drawing', color: '#0055FF' },
  ];

  const recentEvents = [
    { user: 'PM', action: 'Uploaded new render', project: 'Villa Monolith', time: '5m ago' },
    { user: 'SS', action: 'Completed task: Material Selection', project: 'Urban Nexus', time: '12m ago' },
    { user: 'MR', action: 'Commented on structural review', project: 'The Void Pavilion', time: '25m ago' },
    { user: 'EC', action: 'Started new focus session', project: 'Brutal Library', time: '40m ago' },
  ];

  return (
    <div className="space-y-8">
      {/* Live Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">Live Studio</h2>
          </div>
          <p className="text-xs text-gray-500 font-mono">Real-time activity and collaboration across the practice.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Active Collaborators</p>
            <p className="text-2xl font-mono font-medium text-white">04</p>
          </div>
          <button className="px-6 py-2.5 bg-brand-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center gap-2">
            <Users size={16} />
            Join Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Users List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeUsers.map((user, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-surface-low border border-border-dim p-6 space-y-6 group hover:border-brand-blue transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface-high border border-border-dim flex items-center justify-center text-xs font-bold text-gray-400 group-hover:border-brand-blue group-hover:text-brand-blue transition-colors">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight uppercase">{user.name}</h4>
                      <p className="text-[10px] text-brand-blue font-bold uppercase tracking-widest">{user.status}</p>
                    </div>
                  </div>
                  <button className="text-gray-500 hover:text-white">
                    <MoreVertical size={16} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Current Task</p>
                  <p className="text-xs text-white font-medium leading-tight">{user.task}</p>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-border-dim">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Clock size={14} />
                    {user.time}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Live</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Studio Feed */}
          <div className="bg-surface-low border border-border-dim p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Studio Feed</h3>
            <div className="space-y-6">
              {recentEvents.map((event, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-8 h-8 bg-surface-high border border-border-dim flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:border-brand-blue group-hover:text-brand-blue transition-colors shrink-0">
                    {event.user}
                  </div>
                  <div className="flex-1 border-b border-border-dim pb-4 group-last:border-0 group-last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-white">
                          <span className="font-bold">{event.user}</span> {event.action}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{event.project}</p>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500">{event.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Studio Stats */}
        <div className="space-y-8">
          <div className="bg-surface-low border border-border-dim p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Studio Load</h3>
            <div className="h-[200px] flex items-end justify-between gap-2">
              {[40, 65, 80, 55, 90, 75, 60, 85, 45, 70].map((h, i) => (
                <div key={i} className="flex-1 bg-surface-high relative group">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className="absolute bottom-0 left-0 right-0 bg-brand-blue/20 group-hover:bg-brand-blue transition-colors"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-mono text-gray-500">
              <span>08:00</span>
              <span>12:00</span>
              <span>18:00</span>
            </div>
          </div>

          <div className="bg-surface-low border border-border-dim p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Active Tools</h3>
            <div className="space-y-4">
              {[
                { name: 'Revit Server', status: 'Stable', load: '45%' },
                { name: 'Enscape Live', status: 'High Load', load: '82%' },
                { name: 'Rhino Compute', status: 'Stable', load: '28%' },
                { name: 'Telier Cloud', status: 'Stable', load: '12%' },
              ].map((tool, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-border-dim group hover:border-brand-blue transition-colors">
                  <div>
                    <h4 className="text-xs font-medium text-white group-hover:text-brand-blue transition-colors">{tool.name}</h4>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{tool.status}</p>
                  </div>
                  <span className="text-[10px] font-mono text-white">{tool.load}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Live;
