import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { motion, AnimatePresence } from 'motion/react';

const Layout: React.FC = () => {
  const location = useLocation();
  
  const getTitle = (path: string) => {
    switch (path) {
      case '/': return 'Dashboard';
      case '/projects': return 'Projects';
      case '/tasks': return 'Tasks';
      case '/focus': return 'Focus Map';
      case '/report': return 'Report';
      case '/live': return 'Live View';
      default: return 'Studio';
    }
  };

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col">
        <TopBar title={getTitle(location.pathname)} />
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Layout;
