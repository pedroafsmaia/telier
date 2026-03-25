import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Activity,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo & Header */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-16 h-16 bg-brand-blue mx-auto flex items-center justify-center text-3xl font-bold text-white"
          >
            T
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tighter uppercase">Telier Studio</h1>
            <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Architectural Project Management</p>
          </div>
        </div>

        {/* Login Form */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
          className="bg-surface-low border border-border-dim p-8 space-y-6"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Email Address</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-blue transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@studio.arch" 
                  className="w-full bg-surface border border-border-dim pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-blue transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Password</label>
                <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-brand-blue hover:text-blue-400 transition-colors">Forgot?</button>
              </div>
              <div className="relative group">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-blue transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-surface border border-border-dim pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-blue transition-all"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-brand-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 group"
            >
              Access Platform
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="pt-6 border-t border-border-dim flex flex-col gap-4">
            <button className="w-full py-3 border border-border-dim text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-white hover:border-brand-blue transition-colors flex items-center justify-center gap-3">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale group-hover:grayscale-0" />
              Sign in with Google
            </button>
          </div>
        </motion.div>

        {/* Footer Info */}
        <div className="flex justify-between items-center text-[10px] font-mono text-gray-600">
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} />
            Secure Connection
          </div>
          <div className="flex items-center gap-2">
            <Activity size={12} />
            System Status: Optimal
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
