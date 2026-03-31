import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiHome, FiUsers, FiBox, FiCalendar, FiArrowRight } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const moduleConfig = [
    { name: 'Monitor Kanwil', path: '/kanwil', icon: FiHome, desc: 'Daftar Kantor Wilayah operasional', table: 'kanwils' },
    { name: 'Database Teknisi', path: '/technicians', icon: FiUsers, desc: 'Data personil per Kanwil', table: 'technicians' },
    { name: 'Kelolaan Pasti', path: '/assets', icon: FiBox, desc: 'Daftar site & aset tetap', table: 'managed_assets' },
    { name: 'Monthly PM & CM', path: '/maintenance', icon: FiCalendar, desc: 'Tracking maintenance bulanan', table: 'maintenance_tasks' },
];

export default function Dashboard() {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({});
    const [maintStats, setMaintStats] = useState({ pm: { total: 0, done: 0 }, cm: { total: 0, done: 0 } });
    const [loading, setLoading] = useState(true);
    const currentPeriod = new Date().toISOString().slice(0, 7);

    useEffect(() => {
        const fetchAllStats = async () => {
            setLoading(true);
            
            // 1. Fetch Module Counts
            const results = {};
            for (const mod of moduleConfig) {
                const { count, error } = await supabase
                    .from(mod.table)
                    .select('*', { count: 'exact', head: true });
                results[mod.name] = error ? 0 : count;
            }
            setCounts(results);

            // 2. Fetch Maintenance Stats for Current Period
            const { data: mData, error: mError } = await supabase
                .from('maintenance_tasks')
                .select('type, status')
                .eq('period', currentPeriod);
            
            if (!mError && mData) {
                const stats = { pm: { total: 0, done: 0 }, cm: { total: 0, done: 0 } };
                mData.forEach(task => {
                    const typeKey = task.type.toLowerCase(); // pm or cm
                    if (stats[typeKey]) {
                        stats[typeKey].total++;
                        if (task.status === 'completed') stats[typeKey].done++;
                    }
                });
                setMaintStats(stats);
            }

            setLoading(false);
        };
        fetchAllStats();
    }, []);

    return (
        <div className="p-10 max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-14 border-b border-slate-200 pb-10">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-3 h-10 bg-blue-600 rounded-full shadow-lg shadow-blue-500/20" />
                    <h1 className="text-5xl font-black tracking-tight text-slate-900">Operational Dashboard</h1>
                </div>
                <p className="text-slate-500 text-lg font-medium">Selamat datang kembali. Kelola operasional JST dengan presisi dan transparansi.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-16">
                {moduleConfig.map((mod, idx) => (
                    /* ... (Keep existing navigation cards) ... */
                    <motion.button
                        key={mod.path}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => navigate(mod.path)}
                        className="group relative p-10 bg-white border border-slate-200 rounded-[3rem] hover:border-blue-600 transition-all duration-500 text-left shadow-xl shadow-slate-200/50 flex flex-col gap-8 overflow-hidden h-full hover:-translate-y-2 active:scale-95"
                    >
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 text-3xl group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-blue-200 transition-all duration-500">
                            <mod.icon />
                        </div>
                        
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-blue-700 transition-colors uppercase tracking-tight leading-tight">{mod.name}</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">{mod.desc}</p>
                            
                            <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100">
                                {loading ? (
                                    <div className="w-16 h-6 bg-slate-100 animate-pulse rounded-full" />
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100">{counts[mod.name] || 0}</span>
                                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Records</span>
                                    </div>
                                )}
                                <div className="p-3 bg-slate-50 rounded-full text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-2">
                                    <FiArrowRight fontSize={20} />
                                </div>
                            </div>
                        </div>

                        <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-10 transition-opacity">
                            <span className="text-[10rem] font-black leading-none">{idx + 1}</span>
                        </div>
                    </motion.button>
                ))}
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Maintenance Performance <span className="text-slate-400 text-sm font-bold ml-2">({currentPeriod})</span></h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {['PM', 'CM'].map(type => {
                        const stats = maintStats[type.toLowerCase()];
                        const percent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
                        
                        // Explicit classes for Tailwind JIT
                        const theme = type === 'PM' 
                            ? { text: 'text-blue-600', bg: 'bg-blue-600', shadow: 'shadow-blue-400/30' }
                            : { text: 'text-amber-600', bg: 'bg-amber-600', shadow: 'shadow-amber-400/30' };
                        
                        return (
                            <div key={type} className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl shadow-slate-200/50">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{type} Mastery</h3>
                                        <p className="text-sm font-medium text-slate-400">Pencapaian target maintenance rutin {type === 'PM' ? 'bulanan' : 'perbaikan'}.</p>
                                    </div>
                                    <div className={`text-4xl font-black ${theme.text}`}>{percent}%</div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-slate-500">
                                        <span>Completion Status</span>
                                        <span>{stats.done} / {stats.total} Tasks</span>
                                    </div>
                                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${percent}%` }}
                                            transition={{ duration: 1, ease: 'easeOut' }}
                                            className={`h-full ${theme.bg} rounded-full shadow-lg ${theme.shadow}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}

