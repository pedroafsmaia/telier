import React from 'react';
import { Select, Button } from '../../../design/primitives';
import { RotateCcw } from 'lucide-react';
import { Priority, Ease } from '../../../lib/enums';

interface Project {
  id: string;
  nome: string;
}

interface TaskFiltersProps {
  projects: Project[];
  selectedProject: string;
  selectedPriority: string;
  selectedEase: string;
  onProjectChange: (projectId: string) => void;
  onPriorityChange: (priority: string) => void;
  onEaseChange: (ease: string) => void;
  onClearFilters: () => void;
  className?: string;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  projects,
  selectedProject,
  selectedPriority,
  selectedEase,
  onProjectChange,
  onPriorityChange,
  onEaseChange,
  onClearFilters,
  className = '',
}) => {
  const hasActiveFilters = selectedProject || selectedPriority || selectedEase;
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
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Select
        aria-label="Filtrar por projeto"
        options={projectOptions}
        value={selectedProject}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onProjectChange(e.target.value)}
        className="min-w-0 w-full sm:min-w-[180px] sm:w-auto bg-surface-primary text-sm"
      />

      <Select
        aria-label="Filtrar por prioridade"
        options={priorityOptions}
        value={selectedPriority}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPriorityChange(e.target.value)}
        className="min-w-0 w-full sm:min-w-[170px] sm:w-auto bg-surface-primary text-sm"
      />

      <Select
        aria-label="Filtrar por facilidade"
        options={easeOptions}
        value={selectedEase}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onEaseChange(e.target.value)}
        className="min-w-0 w-full sm:min-w-[170px] sm:w-auto bg-surface-primary text-sm"
      />

      {hasActiveFilters ? (
        <Button
          variant="ghost"
          size="sm"
          icon={RotateCcw}
          onClick={onClearFilters}
        >
          Limpar filtros
        </Button>
      ) : null}
    </div>
  );
};
