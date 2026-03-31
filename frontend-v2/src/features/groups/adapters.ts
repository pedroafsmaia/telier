// Adapters do domínio de Grupos
// Escondem confusões de nomenclatura do backend legado

import { GroupStatus } from '../../lib/enums';
import type { Group, GroupListItem, GroupPerson, GroupShare } from './types';

// Tipos do payload cru do backend (legado)
interface RawGroup {
  id: number | string;
  nome?: string;
  descricao?: string;
  status?: string;
  ordem?: number;
  
  dono_id?: number | string;
  dono_nome?: string;
  dono_email?: string;
  
  total_projetos?: number;
  projetos_atrasados?: number;
  area_total_m2?: number;
  total_horas?: number;
  
  pode_gerenciar?: boolean | number;
  
  criado_em?: string;
  atualizado_em?: string;
}

interface RawGroupShare {
  usuario_id: number | string;
  usuario_nome?: string;
  usuario_email?: string;
  pode_gerenciar?: boolean | number;
}

// Mapeia status do backend para enum interno
function mapStatus(raw?: string): GroupStatus {
  const normalized = (raw || '').toLowerCase().trim();
  
  if (normalized === 'ativo' || normalized === 'active') return GroupStatus.ACTIVE;
  if (normalized === 'pausado' || normalized === 'paused') return GroupStatus.PAUSED;
  if (normalized === 'arquivado' || normalized === 'archived') return GroupStatus.ARCHIVED;
  
  return GroupStatus.ACTIVE;
}

// Mapeia status da UI para backend
export function mapStatusToBackend(status: GroupStatus): string {
  switch (status) {
    case GroupStatus.ACTIVE:
      return 'Ativo';
    case GroupStatus.PAUSED:
      return 'Pausado';
    case GroupStatus.ARCHIVED:
      return 'Arquivado';
    default:
      return 'Ativo';
  }
}

// Adapta grupo cru do backend para tipo interno
export function adaptGroup(raw: RawGroup): Group {
  const dono: GroupPerson = {
    id: String(raw.dono_id || ''),
    nome: raw.dono_nome || 'Desconhecido',
    email: raw.dono_email,
  };

  return {
    id: String(raw.id),
    nome: raw.nome || 'Grupo sem nome',
    descricao: raw.descricao,
    status: mapStatus(raw.status),
    ordem: raw.ordem,
    dono,
    totalProjetos: raw.total_projetos || 0,
    projetosAtrasados: raw.projetos_atrasados || 0,
    areaTotalM2: raw.area_total_m2,
    totalHoras: raw.total_horas,
    podeGerenciar: Boolean(raw.pode_gerenciar),
    criadoEm: raw.criado_em || new Date().toISOString(),
    atualizadoEm: raw.atualizado_em,
  };
}

// Adapta grupo para item de lista (mais leve)
export function adaptGroupListItem(raw: RawGroup): GroupListItem {
  return {
    id: String(raw.id),
    nome: raw.nome || 'Grupo sem nome',
    descricao: raw.descricao,
    status: mapStatus(raw.status),
    ordem: raw.ordem,
    dono: {
      id: String(raw.dono_id || ''),
      nome: raw.dono_nome || 'Desconhecido',
      email: raw.dono_email,
    },
    totalProjetos: raw.total_projetos || 0,
    projetosAtrasados: raw.projetos_atrasados || 0,
    areaTotalM2: raw.area_total_m2,
    totalHoras: raw.total_horas,
  };
}

// Adapta lista de grupos
export function adaptGroupList(rawList: RawGroup[]): GroupListItem[] {
  return rawList.map(adaptGroupListItem);
}

// Adapta compartilhamento de grupo
export function adaptGroupShare(raw: RawGroupShare): GroupShare {
  return {
    usuarioId: String(raw.usuario_id),
    usuarioNome: raw.usuario_nome || 'Usuário',
    usuarioEmail: raw.usuario_email || '',
    podeGerenciar: Boolean(raw.pode_gerenciar),
  };
}
