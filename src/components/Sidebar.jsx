import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiAirplay, FiGrid, FiUsers, FiBox, FiCalendar, FiLogOut } from 'react-icons/fi';

const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: FiAirplay },
    { name: 'Monitor Kanwil', path: '/kanwil', icon: FiGrid },
    { name: 'Database Teknisi', path: '/technicians', icon: FiUsers },
    { name: 'Master Data', path: '/assets', icon: FiBox },
    { name: 'Monthly PM & CM', path: '/maintenance', icon: FiCalendar },
];



export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <aside className="w-72 bg-white h-full sticky top-0 p-6 flex flex-col gap-6 overflow-y-auto border-r border-slate-200 shadow-sm transition-all duration-300">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 px-2">Main Menu</h2>
                <div className="flex flex-col gap-2">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`sidebar-btn w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                                location.pathname === item.path 
                                ? 'active bg-blue-50 text-blue-600 shadow-sm' 
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <span className={`text-xl transition-transform group-hover:scale-110 ${location.pathname === item.path ? 'scale-110' : ''}`}>
                                <item.icon />
                            </span>
                            <span className="text-sm font-semibold tracking-tight">{item.name}</span>
                        </button>
                    ))}
                </div>
            </motion.div>

            <div className="mt-auto flex flex-col gap-4">
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-semibold text-sm group"
                >
                    <FiLogOut className="text-xl transition-transform group-hover:-translate-x-1" />
                    <span>Logout Account</span>
                </button>
                
                <div className="pt-6 border-t border-slate-100 text-[10px] font-bold text-slate-400 px-2 uppercase tracking-tight">
                    Refocused CRM JST v1.0
                </div>
            </div>
        </aside>
    );
}

