import { Navigate } from 'react-router-dom';
import { AdminPage } from '../routes/AdminPage';
import { useAuth } from '../lib/auth';

// Rota protegida para Administração - controle estrutural de acesso
export function AdminRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAdmin) {
    // Redireciona para Tarefas se não for admin
    return <Navigate to="/tarefas" replace />;
  }

  return <AdminPage />;
}
