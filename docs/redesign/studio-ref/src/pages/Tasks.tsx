import React, { useState } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  MessageSquare, 
  Paperclip,
  Search,
  Filter
} from 'lucide-react';
import { motion, Reorder } from 'motion/react';

interface Task {
  id: string;
  title: string;
  project: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  assignee: string;
  comments: number;
  attachments: number;
}

const initialTasks: Record<string, Task[]> = {
  'To Do': [
    { id: '1', title: 'Update Massing Model', project: 'Villa Monolith', priority: 'high', dueDate: 'Mar 28', assignee: 'PM', comments: 3, attachments: 2 },
    { id: '2', title: 'Material Selection', project: 'Urban Nexus', priority: 'medium', dueDate: 'Apr 02', assignee: 'SS', comments: 1, attachments: 5 },
  ],
  'In Progress': [
    { id: '3', title: 'Site Analysis Report', project: 'The Void Pavilion', priority: 'high', dueDate: 'Mar 26', assignee: 'MR', comments: 8, attachments: 1 },
    { id: '4', title: 'Lighting Simulation', project: 'Brutal Library', priority: 'medium', dueDate: 'Mar 30', assignee: 'EC', comments: 2, attachments: 3 },
  ],
  'Review': [
    { id: '5', title: 'Final Renderings', project: 'Villa Monolith', priority: 'low', dueDate: 'Mar 25', assignee: 'PM', comments: 12, attachments: 8 },
  ],
  'Done': [
    { id: '6', title: 'Client Presentation', project: 'Minimal Retreat', priority: 'medium', dueDate: 'Mar 20', assignee: 'SS', comments: 5, attachments: 12 },
  ]
};

const Tasks: React.FC = () => {
  const [columns, setColumns] = useState(initialTasks);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 border-red-500/20 bg-red-500/5';
      case 'medium': return 'text-brand-blue border-brand-blue/20 bg-brand-blue/5';
      case 'low': return 'text-gray-500 border-gray-500/20 bg-gray-500/5';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              className="w-full bg-surface-low border border-border-dim pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-blue"
            />
          </div>
          <button className="p-2 border border-border-dim text-gray-400 hover:text-white hover:border-brand-blue transition-colors">
            <Filter size={18} />
          </button>
        </div>
        
        <button className="px-6 py-2 bg-brand-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)] overflow-x-auto pb-4">
        {Object.entries(columns).map(([columnName, tasks]) => (
          <div key={columnName} className="flex flex-col min-w-[280px]">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white">{columnName}</h3>
                <span className="text-[10px] font-mono text-gray-500 bg-surface-high px-1.5 py-0.5">{(tasks as Task[]).length}</span>
              </div>
              <button className="text-gray-500 hover:text-white">
                <MoreVertical size={14} />
              </button>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {(tasks as Task[]).map((task) => (
                <motion.div 
                  key={task.id}
                  layoutId={task.id}
                  className="bg-surface-low border border-border-dim p-4 space-y-4 group hover:border-brand-blue transition-colors cursor-grab active:cursor-grabbing"
                >
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">{task.project}</span>
                  </div>
                  
                  <h4 className="text-sm font-medium text-white group-hover:text-brand-blue transition-colors leading-tight">
                    {task.title}
                  </h4>
                  
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono">
                      <div className="flex items-center gap-1">
                        <MessageSquare size={12} />
                        {task.comments}
                      </div>
                      <div className="flex items-center gap-1">
                        <Paperclip size={12} />
                        {task.attachments}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono mr-2">
                        <Clock size={12} />
                        {task.dueDate}
                      </div>
                      <div className="w-6 h-6 bg-surface-high border border-border-dim flex items-center justify-center text-[8px] font-bold text-gray-400">
                        {task.assignee}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              <button className="w-full py-3 border border-dashed border-border-dim text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white hover:border-brand-blue hover:border-solid transition-all flex items-center justify-center gap-2">
                <Plus size={14} />
                Add Task
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tasks;
