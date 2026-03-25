import React from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Grid, 
  List as ListIcon,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Projects: React.FC = () => {
  const projects = [
    { id: 1, name: 'Villa Monolith', client: 'Private Client', location: 'Sintra, PT', status: 'In Progress', progress: 65, type: 'Residential', image: 'arch1' },
    { id: 2, name: 'Urban Nexus', client: 'City Council', location: 'Lisbon, PT', status: 'Design Phase', progress: 40, type: 'Commercial', image: 'arch2' },
    { id: 3, name: 'The Void Pavilion', client: 'Art Museum', location: 'Porto, PT', status: 'Final Review', progress: 90, type: 'Cultural', image: 'arch3' },
    { id: 4, name: 'Brutal Library', client: 'University', location: 'Coimbra, PT', status: 'Construction', progress: 25, type: 'Institutional', image: 'arch4' },
    { id: 5, name: 'Minimal Retreat', client: 'Private Client', location: 'Alentejo, PT', status: 'Concept', progress: 10, type: 'Residential', image: 'arch5' },
    { id: 6, name: 'Glass Tower', client: 'Tech Corp', location: 'Lisbon, PT', status: 'In Progress', progress: 55, type: 'Office', image: 'arch6' },
  ];

  return (
    <div className="space-y-8">
      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Filter projects..." 
              className="w-full bg-surface-low border border-border-dim pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-blue"
            />
          </div>
          <button className="p-2 border border-border-dim text-gray-400 hover:text-white hover:border-brand-blue transition-colors">
            <Filter size={18} />
          </button>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex border border-border-dim p-1">
            <button className="p-1.5 bg-brand-blue text-white"><Grid size={16} /></button>
            <button className="p-1.5 text-gray-500 hover:text-white"><ListIcon size={16} /></button>
          </div>
          <button className="flex-1 md:flex-none px-6 py-2 bg-brand-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project) => (
          <Link 
            key={project.id} 
            to={`/projects/${project.id}`}
            className="group bg-surface-low border border-border-dim overflow-hidden hover:border-brand-blue transition-all duration-300"
          >
            <div className="aspect-[16/10] overflow-hidden relative">
              <img 
                src={`https://picsum.photos/seed/${project.image}/800/500`} 
                alt={project.name} 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4">
                <span className="px-2 py-1 bg-surface/80 backdrop-blur-sm border border-border-dim text-[10px] font-bold uppercase tracking-widest text-white">
                  {project.type}
                </span>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-blue transition-colors tracking-tight uppercase">{project.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">{project.location}</p>
                </div>
                <button className="text-gray-500 hover:text-white">
                  <MoreVertical size={18} />
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-gray-500">{project.status}</span>
                  <span className="text-brand-blue">{project.progress}%</span>
                </div>
                <div className="h-1 bg-surface-high overflow-hidden">
                  <div 
                    className="h-full bg-brand-blue transition-all duration-1000" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border-dim flex justify-between items-center">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 rounded-full border border-surface bg-surface-high flex items-center justify-center text-[8px] font-bold text-gray-400">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="w-6 h-6 rounded-full border border-surface bg-brand-blue flex items-center justify-center text-[8px] font-bold text-white">
                    +2
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors flex items-center gap-1">
                  View Details
                  <ArrowUpRight size={12} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Projects;
