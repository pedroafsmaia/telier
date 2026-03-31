import { Navigate } from 'react-router-dom';
import { TasksPage } from '../routes/TasksPage';
import { ProjectsPage } from '../routes/ProjectsPage';
import { ProjectPage } from '../routes/ProjectPage';
import { GroupsPage } from '../routes/GroupsPage';
import { GroupPage } from '../routes/GroupPage';
import { LoginPage } from '../routes/LoginPage';
import { AdminRoute } from './AdminRoute';
import { RequireAuth } from './RequireAuth';

// Constante de configuracao do router separada para evitar erro do react-refresh
export const routerConfig = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/login/setup',
    element: <LoginPage technicalEntry />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <TasksPage />,
      },
      {
        path: '/tarefas',
        element: <TasksPage />,
      },
      {
        path: '/projetos',
        element: <ProjectsPage />,
      },
      {
        path: '/projetos/:projectId',
        element: <ProjectPage />,
      },
      {
        path: '/grupos',
        element: <GroupsPage />,
      },
      {
        path: '/grupos/:groupId',
        element: <GroupPage />,
      },
      {
        path: '/admin',
        element: <AdminRoute />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

