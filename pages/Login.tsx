import React, { useState } from 'react';
import { Lock, Users } from 'lucide-react';

interface LoginProps {
  onLogin: (pass: string) => boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(password);
    if (!success) {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 z-0 shadow-lg transform -skew-y-3 origin-top-left scale-110"></div>
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-orange-100 relative">
        <div className="bg-white p-8 pb-0 text-center">
          <div className="w-40 h-40 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-white overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800">Bienvenido</h2>
          <p className="text-orange-600 font-semibold text-sm uppercase tracking-wider mt-1">Familias Unidas A.C.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 pt-6">
          <div className="mb-6">
            <label className="block text-slate-600 text-xs font-bold mb-2 uppercase">
              Contraseña de Acceso
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-orange-400" size={18} />
                </div>
                <input
                type="password"
                className="w-full pl-10 pr-3 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                }}
                />
            </div>
            {error && (
              <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1">
                 Contraseña incorrecta..
              </p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-orange-200 transform active:scale-95 flex justify-center items-center gap-2"
          >
            Ingresar al Sistema
          </button>
        </form>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
            <p className="text-xs text-slate-400">Sistema de Gestión de Credenciales v3.0</p>
        </div>
      </div>
    </div>
  );
};
