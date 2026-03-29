import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routerConfig } from './routerConfig';

const router = createBrowserRouter(routerConfig);

// Router component - apenas exporta componente para react-refresh
export function AppRouter() {
  return <RouterProvider router={router} />;
}

