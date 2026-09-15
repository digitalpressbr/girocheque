import { useNavigate } from 'react-router-dom';

export default function PageNotFound() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-7xl font-light text-slate-300">404</h1>
                    <div className="h-0.5 w-16 bg-slate-200 mx-auto"></div>
                </div>
                <div className="space-y-3">
                    <h2 className="text-2xl font-medium text-slate-800">Página não encontrada</h2>
                    <p className="text-slate-600 leading-relaxed">Esse endereço não existe no GiroCheque.</p>
                </div>
                <div className="pt-6">
                    <button
                        onClick={() => navigate('/', { replace: true })}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        Voltar ao início
                    </button>
                </div>
            </div>
        </div>
    );
}
