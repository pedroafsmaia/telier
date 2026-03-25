import React from 'react';
import { 
  Download, 
  Filter, 
  Calendar, 
  Clock, 
  DollarSign, 
  BarChart3,
  ArrowUpRight,
  MoreVertical
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const data = [
  { name: 'Jan', billable: 120, nonBillable: 40 },
  { name: 'Feb', billable: 150, nonBillable: 30 },
  { name: 'Mar', billable: 180, nonBillable: 50 },
  { name: 'Apr', billable: 140, nonBillable: 60 },
  { name: 'May', billable: 200, nonBillable: 20 },
  { name: 'Jun', billable: 170, nonBillable: 40 },
];

const Report: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Report Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">Studio Report</h2>
          <p className="text-xs text-gray-500 font-mono">Performance analysis and billable hours for Q1 2026.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-6 py-2.5 border border-border-dim text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-white hover:border-brand-blue transition-colors flex items-center justify-center gap-2">
            <Filter size={16} />
            Filters
          </button>
          <button className="flex-1 md:flex-none px-6 py-2.5 bg-brand-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Billable', value: '$142,500', icon: DollarSign, trend: '+12% vs last month' },
          { label: 'Average Rate', value: '$120/hr', icon: Clock, trend: 'Standard studio rate' },
          { label: 'Utilization', value: '84%', icon: BarChart3, trend: 'Target: 80%' },
          { label: 'Active Clients', value: '18', icon: Calendar, trend: '3 new this quarter' },
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

      {/* Main Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface-low border border-border-dim p-6">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Billable vs Non-Billable Hours</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-brand-blue"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Billable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-border-dim"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Non-Billable</span>
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorBillable" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0055FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0055FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                  contentStyle={{ 
                    backgroundColor: '#131313', 
                    border: '1px solid #2A2A2A', 
                    borderRadius: '0',
                    fontSize: '12px',
                    fontFamily: 'DM Mono',
                    color: '#fff'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="billable" 
                  stroke="#0055FF" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorBillable)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="nonBillable" 
                  stroke="#2A2A2A" 
                  strokeWidth={2}
                  fillOpacity={0} 
                  fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Breakdown */}
        <div className="bg-surface-low border border-border-dim p-6 flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-8">Project Breakdown</h3>
          <div className="space-y-8 flex-1">
            {[
              { name: 'Villa Monolith', hours: 420, revenue: '$50,400', progress: 85 },
              { name: 'Urban Nexus', hours: 280, revenue: '$33,600', progress: 60 },
              { name: 'The Void Pavilion', hours: 150, revenue: '$18,000', progress: 40 },
              { name: 'Brutal Library', hours: 90, revenue: '$10,800', progress: 20 },
            ].map((project, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h4 className="text-xs font-medium text-white group-hover:text-brand-blue transition-colors">{project.name}</h4>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{project.hours} hrs logged</p>
                  </div>
                  <span className="text-[10px] font-mono text-white">{project.revenue}</span>
                </div>
                <div className="h-1 bg-surface-high overflow-hidden">
                  <div 
                    className="h-full bg-brand-blue transition-all duration-1000" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          <button className="mt-8 w-full py-2.5 border border-border-dim text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:border-brand-blue transition-colors flex items-center justify-center gap-2">
            View Full Audit
            <ArrowUpRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Report;
