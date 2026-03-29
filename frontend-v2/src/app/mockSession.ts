// Mock de sessão centralizado para Fase 1
// Nas fases seguintes virá do contexto real de autenticação
export const mockSession = {
  user: {
    role: 'member' as 'admin' | 'member' // 'admin' | 'member'
  }
};

export const isAdmin = () => mockSession.user.role === 'admin';
