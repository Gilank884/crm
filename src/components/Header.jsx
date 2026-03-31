import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiMap, FiRefreshCw } from 'react-icons/fi';

export default function Header() {
    return (
        <header className="bg-white text-slate-900 px-8 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-50 transition-all duration-300">
            <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-4"
            >
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-200">JST</div>
                <div>
                    <div className="text-lg font-black tracking-tight text-slate-900 leading-none mb-1">CRM JST</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monitoring & Systems</div>
                </div>
            </motion.div>

            <motion.nav
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-4"
            >
                <Link to="/map" className="flex items-center gap-2 px-5 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100 shadow-sm">
                    <FiMap className="text-sm" /> Map
                </Link>
                <button 
                    onClick={() => window.location.reload()}
                    className="btn-dongker shadow-blue-100 flex items-center gap-2"
                >
                    <FiRefreshCw className="text-sm" /> Refresh
                </button>
            </motion.nav>
        </header>
    );
}
