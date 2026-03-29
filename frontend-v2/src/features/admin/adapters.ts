// Adapters do domínio de Administração
// Reflete payload real do backend

import { UserRole } from '../../lib/enums';
import type { User, UserListItem, CurrentSession } from './types';

// Tipos do payload cru do backend
interface RawUser {
  id: number | string;
  nome?: string;
  login?: string;
  papel?: string;
  ativo?: boolean | number;
  criado_em?: string;
  ultimo_acesso?: string;
}

interface RawSession {
  id: number | string;
  nome?: string;
  usuario_login?: string;
  papel?: string;
  deve_trocar_senha?: number;
}

// Mapeia papel do backend para enum interno
function mapRole(raw?: string): UserRole {
  const normalized = (raw || '').toLowerCase().trim();
  
  if (normalized === 'admin') return UserRole.ADMIN;
  if (normalized === 'membro' || normalized === 'member') return UserRole.MEMBER;
  
  return UserRole.MEMBER;
}

// Mapeia role da UI para backend
export function mapRoleToBackend(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return 'admin';
    case UserRole.MEMBER:
      return 'membro';
    default:
      return 'membro';
  }
}

// Adapta usuário cru do backend para tipo interno
export function adaptUser(raw: RawUser): User {
  return {
    id: String(raw.id),
    nome: raw.nome || 'Usuário',
    login: raw.login || '',
    role: mapRole(raw.papel),
    ativo: Boolean(raw.ativo),
    criadoEm: raw.criado_em || new Date().toISOString(),
    ultimoAcesso: raw.ultimo_acesso,
  };
}

// Adapta usuário para item de lista
export function adaptUserListItem(raw: RawUser): UserListItem {
  return {
    id: String(raw.id),
    nome: raw.nome || 'Usuário',
    login: raw.login || '',
    role: mapRole(raw.papel),
    ativo: Boolean(raw.ativo),
  };
}

// Adapta lista de usuários
export function adaptUserList(rawList: RawUser[]): UserListItem[] {
  return rawList.map(adaptUserListItem);
}

// Adapta sessão atual (payload real de /auth/me)
export function adaptCurrentSession(raw: RawSession): CurrentSession {
  const role = mapRole(raw.papel);
  return {
    userId: String(raw.id),
    nome: raw.nome || 'Usuário',
    login: raw.usuario_login || '',
    role,
    isAdmin: role === UserRole.ADMIN,
    deveTrocarSenha: Boolean(raw.deve_trocar_senha),
  };
}
