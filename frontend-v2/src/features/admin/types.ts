// Tipos internos do domínio de Administração
// Reflete payload real do backend

import type { UserRole } from '../../lib/enums';

// Usuário do sistema
export interface User {
  id: string;
  nome: string;
  login: string;
  role: UserRole;
  ativo: boolean;
  criadoEm: string;
  ultimoAcesso?: string;
}

// Usuário resumido para listas
export interface UserListItem {
  id: string;
  nome: string;
  login: string;
  role: UserRole;
  ativo: boolean;
}

// Sessão do usuário atual (payload real de /auth/me)
export interface CurrentSession {
  userId: string;
  nome: string;
  login: string;
  role: UserRole;
  isAdmin: boolean;
  deveTrocarSenha: boolean;
}

// Payload para criar usuário - REMOVIDO (endpoint não existe)
// Payload para atualizar usuário - REMOVIDO (endpoint não existe)
// Estatísticas do sistema - REMOVIDO (endpoint não existe)
