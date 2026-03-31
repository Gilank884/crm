import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Header() {
    return (
        <header className="bg-white text-slate-900 px-8 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-50 transition-all duration-300">
            <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-6"
            >
                <div className="flex items-center gap-4 py-2 px-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                    <img src="/Logo/jst.png" alt="JST Logo" className="h-8 object-contain" />
                    <div className="w-[1px] h-6 bg-slate-200" />
                    <img src="/Logo/wahana.png" alt="Wahana Logo" className="h-6 object-contain" />
                </div>
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
                {/* Navigation items removed per request */}
            </motion.nav>
        </header>
    );
}
