import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 px-4 text-center">
      <div className="bg-white shadow-lg rounded-2xl p-8 border border-slate-200 max-w-md w-full">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">404</h1>
        <p className="text-slate-600 mb-6">La página que buscas no existe.</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};
