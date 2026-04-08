import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiHome, FiUsers, FiBox, FiCalendar, FiArrowRight, FiActivity } from 'react-icons/fi';
import { supabase } from '../supabaseClient';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    Legend
} from 'recharts';

const moduleConfig = [
    { name: 'Monitor Kanwil', path: '/kanwil', icon: FiHome, desc: 'Daftar Kantor Wilayah operasional', table: 'kanwils' },
    { name: 'Database Teknisi', path: '/technicians', icon: FiUsers, desc: 'Data personil per Kanwil', table: 'technicians' },
    { name: 'Master Data', path: '/assets', icon: FiBox, desc: 'Daftar site & aset tetap', table: 'managed_assets' },
    { name: 'Monthly PM & CM', path: '/maintenance', icon: FiCalendar, desc: 'Tracking maintenance bulanan', table: 'maintenance_tasks' },
];

export default function Dashboard() {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({});
    const [chartData, setChartData] = useState([]);
    const [openTasks, setOpenTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Date Range State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    });

    useEffect(() => {
        const fetchAllStats = async () => {
            setLoading(true);
            
            try {
                // 1. Parallelize Module Counts
                const countPromises = moduleConfig.map(mod => 
                    supabase.from(mod.table).select('*', { count: 'exact', head: true })
                );

                // 2. Parallelize Maintenance Data (Charts + Queue)
                const maintenancePromise = supabase
                    .from('maintenance_tasks')
                    .select(`
                        scheduled_date,
                        completed_date,
                        target_date,
                        managed_assets ( kanwils ( name ) )
                    `)
                    .gte('scheduled_date', startDate)
                    .lte('scheduled_date', endDate)
                    .limit(2000);

                const queuePromise = supabase
                    .from('maintenance_tasks')
                    .select(`
                        id, type, scheduled_date, target_date,
                        managed_assets ( name, tid, location )
                    `)
                    .gte('scheduled_date', startDate)
                    .lte('scheduled_date', endDate)
                    .is('completed_date', null)
                    .order('target_date', { ascending: true })
                    .order('scheduled_date', { ascending: true })
                    .limit(10);

                // Execute ALL in parallel
                const [countResults, mResponse, queueResponse] = await Promise.all([
                    Promise.all(countPromises),
                    maintenancePromise,
                    queuePromise
                ]);

                // 3. Process Counts
                const results = {};
                moduleConfig.forEach((mod, idx) => {
                    results[mod.name] = countResults[idx].error ? 0 : countResults[idx].count;
                });
                setCounts(results);

                // 4. Process Chart Data (SLA Logic)
                const mData = mResponse.data || [];
                const regionalMap = {};
                mData.forEach(task => {
                    const kanwilName = task.managed_assets?.kanwils?.name || 'Unknown';
                    if (!regionalMap[kanwilName]) {
                        regionalMap[kanwilName] = { name: kanwilName, meet: 0, miss: 0, pending: 0 };
                    }
                    
                    if (!task.scheduled_date || !task.completed_date) {
                        regionalMap[kanwilName].pending++;
                    } else {
                        const scheduled = new Date(task.scheduled_date);
                        const completed = new Date(task.completed_date);
                        let status = 'MISS';
                        if (task.target_date) {
                            status = completed <= new Date(task.target_date) ? 'MEET' : 'MISS';
                        } else {
                            const diff = Math.floor(Math.abs(completed - scheduled) / (1000 * 60 * 60 * 24));
                            status = diff <= 7 ? 'MEET' : 'MISS';
                        }
                        status === 'MEET' ? regionalMap[kanwilName].meet++ : regionalMap[kanwilName].miss++;
                    }
                });
                setChartData(Object.values(regionalMap).sort((a, b) => b.meet - a.meet));

                // 5. Update Queue
                setOpenTasks(queueResponse.data || []);
            } catch (err) {
                console.error("Dashboard Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllStats();
    }, [startDate, endDate]);


    return (
        <div className="p-6 max-w-6xl mx-auto selection:bg-blue-100">
            {/* COMPACT HEADER */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="mb-8 border-b border-slate-100 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6"
            >
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase leading-none">Dashboard Overview</h1>
                    </div>
                </div>

                <div className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-[46px] group hover:border-blue-500 transition-all">
                    <div className="flex items-center px-4 bg-slate-50 border-r border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest gap-2 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                         <FiCalendar /> Dari
                    </div>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none w-36 cursor-pointer" 
                    />
                    <div className="flex items-center px-4 bg-slate-50 border-x border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest gap-2 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                         Sampai
                    </div>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none w-36 cursor-pointer" 
                    />
                </div>
            </motion.div>

            {/* COMPACT MODULE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {moduleConfig.map((mod, idx) => (
                    <motion.button
                        key={mod.path}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => navigate(mod.path)}
                        className="group relative p-6 bg-white border border-slate-100 rounded-3xl hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 text-left shadow-sm flex flex-col gap-4 overflow-hidden h-full active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                            <mod.icon />
                        </div>
                        
                        <div>
                            <h3 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-tight">{mod.name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold leading-tight mb-4">{mod.desc}</p>
                            
                            <div className="flex items-center justify-between mt-auto">
                                {loading ? (
                                    <div className="w-12 h-5 bg-slate-50 animate-pulse rounded-lg" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-black text-blue-600">{counts[mod.name] || 0}</span>
                                        <span className="text-[8px] text-slate-300 uppercase font-black tracking-widest">Records</span>
                                    </div>
                                )}
                                <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-blue-600 transition-colors">
                                    <FiArrowRight fontSize={14} />
                                </div>
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>

            {/* PERFORMANCE DIAGRAM */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3 }}
                className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm"
            >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
                            <FiActivity fontSize={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">Regional Performance Metrics</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">SLA Compliance & Visit Progress By Kanwil</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-2 flex flex-col items-center">
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Grand Total IN SLA</span>
                            <span className="text-lg font-black text-emerald-700 leading-none">{chartData.reduce((acc, curr) => acc + curr.meet, 0)}</span>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl px-5 py-2 flex flex-col items-center">
                            <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-0.5">Grand Total OUT SLA</span>
                            <span className="text-lg font-black text-rose-700 leading-none">{chartData.reduce((acc, curr) => acc + curr.miss, 0)}</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-2 flex flex-col items-center">
                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Grand Total Pending</span>
                            <span className="text-lg font-black text-amber-700 leading-none">{chartData.reduce((acc, curr) => acc + curr.pending, 0)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* CHART LEFT */}
                    <div className="flex-1 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                barGap={8}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis 
                                    type="number"
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                />
                                <YAxis 
                                    dataKey="name" 
                                    type="category"
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={100}
                                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Legend 
                                    verticalAlign="top" 
                                    align="right" 
                                    iconType="circle"
                                    wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                />
                                <Bar 
                                    dataKey="meet" 
                                    name="IN SLA (Meet)" 
                                    fill="#10b981" 
                                    radius={[0, 4, 4, 0]} 
                                    barSize={12}
                                />
                                <Bar 
                                    dataKey="miss" 
                                    name="OUT SLA (Miss)" 
                                    fill="#f43f5e" 
                                    radius={[0, 4, 4, 0]} 
                                    barSize={12}
                                />
                                <Bar 
                                    dataKey="pending" 
                                    name="In Progress" 
                                    fill="#f59e0b" 
                                    radius={[0, 4, 4, 0]} 
                                    barSize={12}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* SUMMARY TABLE RIGHT */}
                    <div className="lg:w-80 bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-2">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Regional Summary</div>
                            <div className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">{chartData.length} REGIONS</div>
                        </div>
                        <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                            {chartData.map((reg, i) => (
                                <div key={i} className="flex flex-col gap-2 p-3 bg-white rounded-2xl border border-slate-200/50 shadow-sm">
                                    <div className="text-[11px] font-black text-slate-900 uppercase truncate">{reg.name}</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span className="text-[9px] font-black text-emerald-600">{reg.meet} MEET</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            <span className="text-[9px] font-black text-rose-600">{reg.miss} MISS</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 col-span-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <span className="text-[9px] font-black text-amber-600">{reg.pending} PENDING</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-8 mt-10 pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">In SLA Mastery</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Out SLA Warning</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progressing Visit</span>
                    </div>
                </div>
            </motion.div>
            
            {/* OPEN TASKS LIST */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.4 }}
                className="mt-10 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm"
            >
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                             <div className="w-2 h-6 bg-blue-600 rounded-full" /> Prioritas Pengerjaan (Target Terdekat)
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pending schedules requiring field visit</p>
                    </div>
                    <button 
                        onClick={() => navigate('/maintenance')}
                        className="px-6 py-2 bg-slate-50 text-slate-500 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                        View Tracker
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] tracking-widest font-black border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Asset ID</th>
                                <th className="px-6 py-4">Site Name</th>
                                <th className="px-6 py-4 text-center">Category</th>
                                <th className="px-6 py-4 text-center text-blue-600">Target Date</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold">
                            {loading ? (
                                [1,2,3].map(i => <tr key={i} className="animate-pulse h-12 text-slate-100"><td colSpan="5" className="px-6 font-mono text-[9px]">LOADING...</td></tr>)
                            ) : openTasks.length === 0 ? (
                                <tr><td colSpan="5" className="py-12 text-center text-slate-300 text-[10px] uppercase font-black tracking-widest italic">All set! No pending tasks found.</td></tr>
                            ) : (
                                openTasks.map(task => (
                                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px] uppercase border border-blue-100">{task.managed_assets?.tid || '---'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-slate-900 tracking-tight">{task.managed_assets?.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest uppercase border ${task.type === 'PM' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{task.type}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] text-blue-600 font-black">
                                                {task.target_date ? (() => {
                                                    const d = new Date(task.target_date);
                                                    const day = d.getDate().toString().padStart(2, '0');
                                                    const month = (d.getMonth() + 1).toString().padStart(2, '0');
                                                    const year = d.getFullYear();
                                                    return `${day}/${month}/${year}`;
                                                })() : 'NO TARGET'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => navigate('/maintenance')}
                                                className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"
                                            >
                                                <FiArrowRight fontSize={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
