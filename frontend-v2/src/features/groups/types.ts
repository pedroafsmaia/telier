// Tipos internos do domínio de Grupos
// Nomenclatura normalizada para a nova UI do Telier

import type { GroupStatus } from '../../lib/enums';

// Pessoa vinculada ao grupo
export interface GroupPerson {
  id: string;
  nome: string;
  email?: string;
}

// Grupo normalizado para a nova UI
export interface Group {
  id: string;
  nome: string;
  descricao?: string;
  status: GroupStatus;
  ordem?: number;
  
  // Dono do grupo
  dono: GroupPerson;
  
  // Métricas agregadas
  totalProjetos: number;
  projetosAtrasados: number;
  areaTotalM2?: number;
  totalHoras?: number;
  
  // Permissões
  podeGerenciar: boolean;
  
  // Timestamps
  criadoEm: string;
  atualizadoEm?: string;
}

// Grupo resumido para listas
export interface GroupListItem {
  id: string;
  nome: string;
  descricao?: string;
  status: GroupStatus;
  ordem?: number;
  totalProjetos: number;
  projetosAtrasados: number;
  areaTotalM2?: number;
  totalHoras?: number;
}

// Payload para criar grupo
export interface CreateGroupPayload {
  nome: string;
  descricao?: string;
  status?: GroupStatus;
}

// Payload para atualizar grupo
export interface UpdateGroupPayload {
  nome?: string;
  descricao?: string;
  status?: GroupStatus;
  ordem?: number;
}

// Compartilhamento de grupo
export interface GroupShare {
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  podeGerenciar: boolean;
}
