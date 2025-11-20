import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, ShieldCheck, LayoutDashboard, Users } from 'lucide-react';

interface NavbarProps {
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const location = useLocation();
  const isPublicView = location.pathname.startsWith('/member/');

  if (isPublicView) return null;

  return (
    <nav className="bg-white text-slate-800 shadow-md no-print sticky top-0 z-40 border-b-4 border-orange-500">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between h-20 items-center">
          <Link to="/admin" className="flex items-center gap-3 font-bold text-xl group">
            <div className="bg-orange-100 p-2 rounded-full group-hover:bg-orange-200 transition-colors">
                <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded-full object-cover shadow-inner" />
            </div>
            <div className="flex flex-col leading-tight">
                <span className="text-orange-600 font-extrabold tracking-tight">FAMILIAS UNIDAS</span>
                <span className="text-sky-600 text-xs font-semibold tracking-wider">POR LA COLONIA PRESA DE LOS REYES</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
              <Link to="/admin" className="flex items-center gap-1 hover:text-orange-600 transition-colors">
                 <LayoutDashboard size={18} /> Panel General
              </Link>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            <button 
              onClick={onLogout}
              className="bg-white hover:bg-slate-50 text-slate-600 hover:text-red-600 px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-all border border-slate-200 shadow-sm hover:shadow"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
