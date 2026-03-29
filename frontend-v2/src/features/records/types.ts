// Tipos internos do domínio de Registros (Decisões, Pendências, Observações)
// Nomenclatura normalizada para a nova UI do Telier

import type { RecordType, RecordStatus } from '../../lib/enums';

// Pessoa vinculada ao registro
export interface RecordPerson {
  id: string;
  nome: string;
}

// Registro normalizado para a nova UI
// Backend só suporta registros em projetos nesta fase
export interface Record {
  id: string;
  tipo: RecordType;
  conteudo: string;
  status?: RecordStatus; // Apenas para pendências
  
  // Contexto
  projetoId: string;
  projetoNome?: string;
  
  // Autor
  autor: RecordPerson;
  
  // Timestamps
  criadoEm: string;
  atualizadoEm?: string;
}

// Registro resumido para listas
export interface RecordListItem {
  id: string;
  tipo: RecordType;
  conteudo: string;
  status?: RecordStatus;
  projetoId: string;
  autorNome: string;
  criadoEm: string;
}

// Payload para criar registro
export interface CreateRecordPayload {
  tipo: RecordType;
  conteudo: string;
  projetoId: string; // Obrigatório - backend só suporta registros em projetos
}

// Payload para atualizar registro
export interface UpdateRecordPayload {
  conteudo?: string;
  status?: RecordStatus;
}

// Payload para converter registro em tarefa
export interface ConvertRecordToTaskPayload {
  recordId: string;
  projetoId: string; // Obrigatório - backend só converte para tarefas em projetos
  nome?: string; // Se não fornecido, usa o conteúdo do registro
}
