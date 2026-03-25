import React from 'react';
import { 
  Users, 
  Calendar, 
  MapPin, 
  Layers, 
  Share2, 
  MoreVertical,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';

const ProjectDetail: React.FC = () => {
  const collaborators = [
    { name: 'Pedro Maia', role: 'Principal Architect', initial: 'PM' },
    { name: 'Sofia Silva', role: 'Senior Designer', initial: 'SS' },
    { name: 'Marco Rossi', role: 'Structural Engineer', initial: 'MR' },
    { name: 'Elena Costa', role: 'Landscape Architect', initial: 'EC' },
  ];

  const phases = [
    { name: 'Concept Design', status: 'Completed', progress: 100 },
    { name: 'Schematic Design', status: 'In Progress', progress: 65 },
    { name: 'Design Development', status: 'Pending', progress: 0 },
    { name: 'Construction Docs', status: 'Pending', progress: 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
            <button className="hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft size={12} />
              Projects
            </button>
            <span>/</span>
            <span className="text-brand-blue">Villa Monolith</span>
          </div>
          <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">Villa Monolith</h2>
          <div className="flex items-center gap-6 text-xs text-gray-500 font-mono">
            <div className="flex items-center gap-2">
              <MapPin size={14} />
              Sintra, Portugal
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              Est. Completion: Dec 2026
            </div>
            <div className="flex items-center gap-2">
              <Layers size={14} />
              1,240 m²
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button className="p-2.5 border border-border-dim text-gray-400 hover:text-white hover:border-brand-blue transition-colors">
            <Share2 size={18} />
          </button>
          <button className="px-6 py-2.5 bg-brand-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors">
            Edit Project
          </button>
          <button className="p-2.5 border border-border-dim text-gray-400 hover:text-white hover:border-brand-blue transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Visuals */}
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video bg-surface-low border border-border-dim overflow-hidden relative group">
            <img 
              src="https://picsum.photos/seed/arch1/1200/800" 
              alt="Main Render" 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-6 left-6 bg-surface/80 backdrop-blur-sm border border-border-dim p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Primary View</p>
              <h4 className="text-sm font-medium text-white mt-1">South Elevation - Massing Study</h4>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="aspect-square bg-surface-low border border-border-dim overflow-hidden relative group">
              <img 
                src="https://picsum.photos/seed/arch2/800/800" 
                alt="Detail 1" 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <p className="text-xs text-white font-medium">Material Palette - Concrete & Glass</p>
              </div>
            </div>
            <div className="aspect-square bg-surface-low border border-border-dim overflow-hidden relative group">
              <img 
                src="https://picsum.photos/seed/arch3/800/800" 
                alt="Detail 2" 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <p className="text-xs text-white font-medium">Interior Lighting Study</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Info & Team */}
        <div className="space-y-8">
          {/* Project Phases */}
          <div className="bg-surface-low border border-border-dim p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Project Progress</h3>
            <div className="space-y-6">
              {phases.map((phase, i) => (
                <div key={i} className="relative pl-6 border-l border-border-dim last:border-0 pb-6 last:pb-0">
                  <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${phase.status === 'Completed' ? 'bg-brand-blue' : phase.status === 'In Progress' ? 'bg-white' : 'bg-border-dim'}`}></div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className={`text-xs font-medium ${phase.status === 'Pending' ? 'text-gray-500' : 'text-white'}`}>{phase.name}</h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{phase.status}</p>
                    </div>
                    {phase.progress > 0 && <span className="text-[10px] font-mono text-gray-400">{phase.progress}%</span>}
                  </div>
                  {phase.status === 'In Progress' && (
                    <div className="h-0.5 bg-surface-high w-full mt-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${phase.progress}%` }}
                        className="h-full bg-brand-blue"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Collaborators */}
          <div className="bg-surface-low border border-border-dim p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Collaborators</h3>
              <button className="p-1.5 border border-border-dim text-gray-400 hover:text-brand-blue hover:border-brand-blue transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-4">
              {collaborators.map((person, i) => (
                <div key={i} className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-8 h-8 bg-surface-high border border-border-dim flex items-center justify-center text-[10px] font-bold text-gray-400 group-hover:border-brand-blue group-hover:text-brand-blue transition-colors">
                    {person.initial}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-white group-hover:text-brand-blue transition-colors">{person.name}</h4>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{person.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
