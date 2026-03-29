// Adapters do domínio de Registros
// Escondem confusões de nomenclatura do backend legado

import { RecordType, RecordStatus } from '../../lib/enums';
import type { Record, RecordListItem, RecordPerson } from './types';

// Tipos do payload cru do backend (legado)
// Backend usa "decisoes" como endpoint mas armazena todos os tipos
interface RawRecord {
  id: number | string;
  tipo?: string;
  conteudo?: string;
  texto?: string; // Alias legado para conteudo
  status?: string;
  
  projeto_id?: number | string;
  projeto_nome?: string;
  grupo_id?: number | string;
  grupo_nome?: string;
  
  autor_id?: number | string;
  autor_nome?: string;
  usuario_id?: number | string; // Alias legado
  usuario_nome?: string; // Alias legado
  
  criado_em?: string;
  atualizado_em?: string;
}

// Mapeia tipo do backend para enum interno
function mapType(raw?: string): RecordType {
  const normalized = (raw || '').toLowerCase().trim();
  
  if (normalized === 'decisão' || normalized === 'decisao') return RecordType.DECISION;
  if (normalized === 'pendência' || normalized === 'pendencia') return RecordType.PENDING;
  if (normalized === 'observação' || normalized === 'observacao') return RecordType.NOTE;
  
  return RecordType.NOTE;
}

// Mapeia status do backend para enum interno
function mapStatus(raw?: string): RecordStatus | undefined {
  const normalized = (raw || '').toLowerCase().trim();
  
  if (normalized === 'aberta' || normalized === 'open') return RecordStatus.OPEN;
  if (normalized === 'concluída' || normalized === 'concluida' || normalized === 'done') return RecordStatus.DONE;
  
  return undefined;
}

// Mapeia tipo da UI para backend
export function mapTypeToBackend(type: RecordType): string {
  switch (type) {
    case RecordType.DECISION:
      return 'Decisão';
    case RecordType.PENDING:
      return 'Pendência';
    case RecordType.NOTE:
      return 'Observação';
    default:
      return 'Observação';
  }
}

// Mapeia status da UI para backend
export function mapStatusToBackend(status: RecordStatus): string {
  switch (status) {
    case RecordStatus.OPEN:
      return 'Aberta';
    case RecordStatus.DONE:
      return 'Concluída';
    default:
      return 'Aberta';
  }
}

// Adapta registro cru do backend para tipo interno
export function adaptRecord(raw: RawRecord): Record {
  const autor: RecordPerson = {
    id: String(raw.autor_id || raw.usuario_id || ''),
    nome: raw.autor_nome || raw.usuario_nome || 'Desconhecido',
  };

  const tipo = mapType(raw.tipo);

  return {
    id: String(raw.id),
    tipo,
    conteudo: raw.conteudo || raw.texto || '',
    status: tipo === RecordType.PENDING ? mapStatus(raw.status) : undefined,
    projetoId: String(raw.projeto_id || ''),
    projetoNome: raw.projeto_nome,
    autor,
    criadoEm: raw.criado_em || new Date().toISOString(),
    atualizadoEm: raw.atualizado_em,
  };
}

// Adapta registro para item de lista (mais leve)
export function adaptRecordListItem(raw: RawRecord): RecordListItem {
  const tipo = mapType(raw.tipo);
  
  return {
    id: String(raw.id),
    tipo,
    conteudo: raw.conteudo || raw.texto || '',
    status: tipo === RecordType.PENDING ? mapStatus(raw.status) : undefined,
    projetoId: String(raw.projeto_id || ''),
    autorNome: raw.autor_nome || raw.usuario_nome || 'Desconhecido',
    criadoEm: raw.criado_em || new Date().toISOString(),
  };
}

// Adapta lista de registros
export function adaptRecordList(rawList: RawRecord[]): RecordListItem[] {
  return rawList.map(adaptRecordListItem);
}

// Ordena registros: pendências abertas primeiro, depois por data
export function sortRecords(records: RecordListItem[]): RecordListItem[] {
  return [...records].sort((a, b) => {
    // Pendências abertas primeiro
    if (a.tipo === RecordType.PENDING && a.status === RecordStatus.OPEN) {
      if (b.tipo !== RecordType.PENDING || b.status !== RecordStatus.OPEN) return -1;
    }
    if (b.tipo === RecordType.PENDING && b.status === RecordStatus.OPEN) {
      if (a.tipo !== RecordType.PENDING || a.status !== RecordStatus.OPEN) return 1;
    }
    
    // Concluídas por último
    if (a.status === RecordStatus.DONE && b.status !== RecordStatus.DONE) return 1;
    if (b.status === RecordStatus.DONE && a.status !== RecordStatus.DONE) return -1;
    
    // Por data (mais recentes primeiro)
    return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
  });
}
