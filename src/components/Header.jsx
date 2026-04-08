import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiLogOut, FiUser } from 'react-icons/fi';

export default function Header() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

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

            <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-6"
            >
                {user && (
                    <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
                        <div className="text-right">
                            <div className="text-[11px] font-black text-slate-900 uppercase leading-none mb-1">{user.name || 'User'}</div>
                            <div className="text-[9px] font-bold text-slate-400 tracking-wider">NPP: {user.no_npp}</div>
                        </div>
                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm group relative overflow-hidden">
                            <FiUser fontSize={18} />
                            <motion.button 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleLogout}
                                className="absolute inset-0 bg-rose-500 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300"
                                title="Logout Session"
                            >
                                <FiLogOut fontSize={18} />
                            </motion.button>
                        </div>
                    </div>
                )}
            </motion.div>
        </header>
    );
}
