import React from 'react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 px-4">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Acesso restrito</h1>
        <p className="text-slate-600">
          Este e-mail não está liberado no GiroCheque. Peça acesso ao administrador.
        </p>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
