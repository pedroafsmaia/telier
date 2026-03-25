import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight,
  Plus,
  FolderKanban
} from 'lucide-react';
import { motion } from 'motion/react';

const data = [
  { name: 'Mon', hours: 45 },
  { name: 'Tue', hours: 52 },
  { name: 'Wed', hours: 38 },
  { name: 'Thu', hours: 65 },
  { name: 'Fri', hours: 48 },
  { name: 'Sat', hours: 24 },
  { name: 'Sun', hours: 12 },
];

const projects = [
  { id: 1, name: 'Villa Monolith', client: 'Private Client', progress: 65, status: 'In Progress', color: '#0055FF' },
  { id: 2, name: 'Urban Nexus', client: 'City Council', progress: 40, status: 'Design Phase', color: '#0055FF' },
  { id: 3, name: 'The Void Pavilion', client: 'Art Museum', progress: 90, status: 'Final Review', color: '#0055FF' },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Projects', value: '12', icon: FolderKanban, trend: '+2 this month' },
          { label: 'Total Hours', value: '1,284', icon: Clock, trend: '84% billable' },
          { label: 'Tasks Completed', value: '482', icon: CheckCircle2, trend: '92% on time' },
          { label: 'Pending Reviews', value: '7', icon: AlertCircle, trend: '3 urgent' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface-low border border-border-dim p-6 flex flex-col justify-between group hover:border-brand-blue transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{stat.label}</span>
              <stat.icon size={16} className="text-gray-500 group-hover:text-brand-blue" />
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-mono font-medium text-white">{stat.value}</h3>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-surface-low border border-border-dim p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Studio Productivity</h3>
              <p className="text-xs text-gray-500 mt-1">Hours logged across all projects this week</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-[10px] font-bold uppercase border border-border-dim text-gray-400 hover:text-white hover:border-brand-blue transition-colors">Week</button>
              <button className="px-3 py-1 text-[10px] font-bold uppercase border border-brand-blue text-white bg-brand-blue/10">Month</button>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#666', fontSize: 10, fontFamily: 'DM Mono' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#666', fontSize: 10, fontFamily: 'DM Mono' }}
                />
                <Tooltip 
                  cursor={{ fill: '#1f2020' }}
                  contentStyle={{ 
                    backgroundColor: '#131313', 
                    border: '1px solid #2A2A2A', 
                    borderRadius: '0',
                    fontSize: '12px',
                    fontFamily: 'DM Mono',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="hours" radius={[0, 0, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 3 ? '#0055FF' : '#2A2A2A'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-surface-low border border-border-dim p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Active Projects</h3>
            <button className="p-1.5 border border-border-dim text-gray-400 hover:text-brand-blue hover:border-brand-blue transition-colors">
              <Plus size={14} />
            </button>
          </div>
          
          <div className="space-y-4 flex-1">
            {projects.map((project) => (
              <div key={project.id} className="group cursor-pointer">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-white group-hover:text-brand-blue transition-colors">{project.name}</h4>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{project.client}</p>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">{project.progress}%</span>
                </div>
                <div className="h-1 bg-surface-high overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-brand-blue"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <button className="mt-6 w-full py-2.5 border border-border-dim text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:border-brand-blue transition-colors flex items-center justify-center gap-2">
            View All Projects
            <ArrowUpRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
