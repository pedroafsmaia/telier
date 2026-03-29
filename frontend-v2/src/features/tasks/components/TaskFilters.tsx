import React from 'react';
import { Select, SearchField, Button } from '../../../design/primitives';
import { RotateCcw } from 'lucide-react';
import { Priority, Ease } from '../../../lib/enums';

interface Project {
  id: string;
  nome: string;
}

interface TaskFiltersProps {
  projects: Project[];
  searchQuery: string;
  selectedProject: string;
  selectedPriority: string;
  selectedEase: string;
  onSearchChange: (query: string) => void;
  onProjectChange: (projectId: string) => void;
  onPriorityChange: (priority: string) => void;
  onEaseChange: (ease: string) => void;
  onClearFilters: () => void;
  className?: string;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  projects,
  searchQuery,
  selectedProject,
  selectedPriority,
  selectedEase,
  onSearchChange,
  onProjectChange,
  onPriorityChange,
  onEaseChange,
  onClearFilters,
  className = '',
}) => {
  const hasActiveFilters = selectedProject || selectedPriority || selectedEase || searchQuery;
  const projectOptions = [
    { value: '', label: 'Todos os projetos' },
    ...projects.map((project) => ({ value: project.id, label: project.nome })),
  ];
  const priorityOptions = [
    { value: '', label: 'Todas as prioridades' },
    { value: Priority.URGENT, label: 'Urgente' },
    { value: Priority.HIGH, label: 'Alta' },
    { value: Priority.MEDIUM, label: 'Média' },
    { value: Priority.LOW, label: 'Baixa' },
  ];
  const easeOptions = [
    { value: '', label: 'Todas as facilidades' },
    { value: Ease.VERY_EASY, label: 'Muito fácil' },
    { value: Ease.EASY, label: 'Fácil' },
    { value: Ease.MEDIUM, label: 'Médio' },
    { value: Ease.HARD, label: 'Difícil' },
    { value: Ease.VERY_HARD, label: 'Muito difícil' },
  ];

  return (
    <div className={`flex flex-col lg:flex-row gap-4 items-start lg:items-center ${className}`}>
      {/* Busca */}
      <div className="flex-1 min-w-[200px]">
        <SearchField
          placeholder="Buscar tarefas..."
          value={searchQuery}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value)}
          onClear={() => onSearchChange('')}
          className="w-full"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Filtro Projeto */}
        <Select
          options={projectOptions}
          value={selectedProject}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onProjectChange(e.target.value)}
          className="min-w-[150px]"
        />

        {/* Filtro Prioridade */}
        <Select
          options={priorityOptions}
          value={selectedPriority}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPriorityChange(e.target.value)}
          className="min-w-[140px]"
        />

        {/* Filtro Facilidade */}
        <Select
          options={easeOptions}
          value={selectedEase}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onEaseChange(e.target.value)}
          className="min-w-[140px]"
        />

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={onClearFilters}
          >
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
};
