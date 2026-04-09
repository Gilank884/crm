import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiAirplay, FiGrid, FiUsers, FiBox, FiCalendar, FiLogOut, FiTool, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: FiAirplay },
    { name: 'Monitor Kanwil', path: '/kanwil', icon: FiGrid },
    { name: 'Database Teknisi', path: '/technicians', icon: FiUsers },
    { name: 'Master Data', path: '/assets', icon: FiBox },
    { name: 'Monthly PM', path: '/maintenance/pm', icon: FiCalendar },
    { name: 'Monthly CM', path: '/maintenance/cm', icon: FiTool },
];

export default function Sidebar({ isCollapsed, onToggle }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-72'} bg-white h-full sticky top-0 flex flex-col gap-6 border-r border-slate-200 shadow-sm transition-all duration-500 ease-in-out z-[100] overflow-visible`}>
            {/* TOGGLE BUTTON */}
            <div className="absolute right-[-14px] top-6 z-[110]">
                <button 
                    onClick={onToggle}
                    className="w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all hover:scale-110 active:scale-90"
                >
                    {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </button>
            </div>

            <div className="p-6 flex flex-col gap-8 h-full overflow-y-auto no-scrollbar">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                    {!isCollapsed && (
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 px-2 whitespace-nowrap overflow-hidden text-ellipsis">Main Menu</h2>
                    )}
                    <div className="flex flex-col gap-2">
                        {navItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`sidebar-btn w-full flex items-center gap-4 transition-all duration-300 group ${isCollapsed ? 'px-2 justify-center' : 'px-4'} py-3 rounded-xl ${location.pathname === item.path
                                    ? 'active bg-blue-50 text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                                title={isCollapsed ? item.name : ''}
                            >
                                <span className={`text-xl transition-transform group-hover:scale-110 ${location.pathname === item.path ? 'scale-110' : ''}`}>
                                    <item.icon />
                                </span>
                                {!isCollapsed && (
                                    <span className="text-sm font-semibold tracking-tight whitespace-nowrap opacity-100 transition-opacity duration-300">{item.name}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </motion.div>

                <div className="mt-auto flex flex-col gap-4">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-4 transition-all group ${isCollapsed ? 'px-2 justify-center' : 'px-4'} py-3 rounded-xl text-red-500 hover:bg-red-50 font-semibold text-sm`}
                        title={isCollapsed ? 'Logout Account' : ''}
                    >
                        <FiLogOut className={`text-xl transition-transform ${!isCollapsed ? 'group-hover:-translate-x-1' : ''}`} />
                        {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Logout Account</span>}
                    </button>

                    {!isCollapsed && (
                        <div className="pt-6 border-t border-slate-100 text-[10px] font-bold text-slate-400 px-2 uppercase tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                            Refocused CRM JST v1.0
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

