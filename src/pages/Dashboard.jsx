import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiHome, FiUsers, FiBox, FiCalendar, FiArrowRight, FiActivity, FiTool, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../supabaseClient';
import { gsap } from 'gsap';
import { useRef } from 'react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    Legend,
    PieChart,
    Pie,
    Tooltip as RechartsTooltip
} from 'recharts';

const moduleConfig = [
    { name: 'Monitor Kanwil', path: '/kanwil', icon: FiHome, desc: 'Daftar Kantor Wilayah operasional', table: 'kanwils' },
    { name: 'Database Teknisi', path: '/technicians', icon: FiUsers, desc: 'Data personil per Kanwil', table: 'technicians' },
    { name: 'Master Data', path: '/assets', icon: FiBox, desc: 'Daftar site & aset tetap', table: 'managed_assets' },
    { name: 'Monthly PM', path: '/maintenance/pm', icon: FiCalendar, desc: 'Tracking Preventive Maintenance', table: 'maintenance_tasks' },
    { name: 'Corrective Log', path: '/maintenance/cm', icon: FiTool, desc: 'Detailed repair logs & tickets', table: 'corrective_maintenance' },
];

/**
 * Animated Number Counter using GSAP
 */
const AnimatedCount = ({ value, duration = 1.5 }) => {
    const countRef = useRef(null);
    const displayedValue = useRef(0);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.to(displayedValue, {
                current: value,
                duration: duration,
                ease: "power3.out",
                onUpdate: () => {
                    if (countRef.current) {
                        countRef.current.innerText = Math.round(displayedValue.current);
                    }
                }
            });
        });
        return () => ctx.revert();
    }, [value, duration]);

    return <span ref={countRef}>0</span>;
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({});
    const [chartData, setChartData] = useState([]);
    const [openTasks, setOpenTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalStats, setGlobalStats] = useState({ meet: 0, miss: 0, pending: 0 });
    
    // GSAP Refs
    const gridRef = useRef(null);
    const headerRef = useRef(null);
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
                
                const globalTotals = Object.values(regionalMap).reduce((acc, curr) => ({
                    meet: acc.meet + curr.meet,
                    miss: acc.miss + curr.miss,
                    pending: acc.pending + curr.pending
                }), { meet: 0, miss: 0, pending: 0 });
                
                setGlobalStats(globalTotals);
                setChartData(Object.values(regionalMap).sort((a, b) => b.meet - a.meet));

                setOpenTasks(queueResponse.data || []);

                // 6. Fetch Strict Current Month for Top Chart (as per user request: "Bulan ini saja")
                const d = new Date();
                const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
                const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
                
                const { data: thisMonthData } = await supabase
                    .from('maintenance_tasks')
                    .select('scheduled_date, completed_date, target_date')
                    .gte('scheduled_date', firstDay)
                    .lte('scheduled_date', lastDay);

                const stats = { meet: 0, miss: 0, pending: 0 };
                (thisMonthData || []).forEach(task => {
                    if (!task.scheduled_date || !task.completed_date) {
                        stats.pending++;
                    } else {
                        const scheduled = new Date(task.scheduled_date);
                        const completed = new Date(task.completed_date);
                        let isMeet = false;
                        if (task.target_date) {
                            isMeet = completed <= new Date(task.target_date);
                        } else {
                            const diff = Math.floor(Math.abs(completed - scheduled) / (1000 * 60 * 60 * 24));
                            isMeet = diff <= 7;
                        }
                        isMeet ? stats.meet++ : stats.miss++;
                    }
                });
                setGlobalStats(stats);

                // Start GSAP Entrance
                gsap.fromTo(".dash-card", 
                    { opacity: 0, y: 30, scale: 0.95 }, 
                    { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.1, ease: "back.out(1.7)", delay: 0.2 }
                );

            } catch (err) {
                console.error("Dashboard Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllStats();
    }, [startDate, endDate]);


    return (
        <div className="relative min-h-screen bg-slate-50 selection:bg-blue-100 overflow-hidden font-inter">
            {/* REALISTIC BACKGROUND AESTHETICS */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-emerald-100/20 to-transparent rounded-full blur-[100px] pointer-events-none" />

            <div className="relative p-6 max-w-6xl mx-auto z-10">
                {/* COMPACT HEADER */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="mb-8 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-8 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,_99,_235,_0.3)] transition-all" />
                            <h1 className="text-3xl font-[1000] tracking-tight text-slate-900 uppercase leading-none">Dashboard Overview</h1>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-5">Central Command / Real-time Intelligence</p>
                    </div>

                    <div className="flex bg-white/70 backdrop-blur-xl border border-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[50px] group hover:border-blue-400 transition-all">
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

            {/* MONTHLY PERFORMANCE DISTRIBUTION CHART (FIXED TO CURRENT MONTH) */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] p-10 mb-8 shadow-[0_20px_60px_rgba(0,0,0,0.03)] relative overflow-hidden group/chart"
            >
                {/* Visual Label for Fixed Period - Azure Edition */}
                <div className="absolute top-0 right-0 px-8 py-3 bg-blue-600/10 backdrop-blur-md text-blue-600 text-[9px] font-[1000] uppercase tracking-[0.4em] rounded-bl-3xl border-l border-b border-blue-50">
                    PERIOD: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex flex-col lg:flex-row items-center gap-12">
                    {/* Left: Chart */}
                    <div className="relative w-full lg:w-72 h-72 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'IN SLA', value: globalStats.meet, color: '#10b981' },
                                        { name: 'OUT SLA', value: globalStats.miss, color: '#f43f5e' },
                                        { name: 'PENDING', value: globalStats.pending, color: '#f59e0b' }
                                    ]}
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {[
                                        { color: '#10b981' },
                                        { color: '#f43f5e' },
                                        { color: '#f59e0b' }
                                    ].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Global Stats</span>
                            <span className="text-3xl font-[1000] text-slate-900 leading-none mt-1">
                                <AnimatedCount value={globalStats.meet + globalStats.miss + globalStats.pending} />
                            </span>
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Total Tasks</span>
                        </div>
                    </div>

                    {/* Right: Breakdown Details */}
                    <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        <div 
                            onClick={() => navigate('/maintenance/pm')}
                            className="p-6 bg-emerald-50/30 border border-emerald-100 rounded-3xl hover:bg-emerald-50 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">IN SLA Mastery</span>
                            </div>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-[1000] text-emerald-900 leading-none">
                                    <AnimatedCount value={globalStats.meet} />
                                </span>
                                <div className="text-right">
                                    <div className="text-[14px] font-black text-emerald-600">
                                        <AnimatedCount value={Math.round((globalStats.meet / (globalStats.meet + globalStats.miss + globalStats.pending || 1)) * 100)} duration={2} />%
                                    </div>
                                    <div className="text-[8px] font-bold text-emerald-400 uppercase tracking-tight">Success Rate</div>
                                </div>
                            </div>
                        </div>

                        <div 
                            onClick={() => navigate('/maintenance/pm')}
                            className="p-6 bg-rose-50/30 border border-rose-100 rounded-3xl hover:bg-rose-50 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">OUT SLA Warning</span>
                            </div>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-[1000] text-rose-900 leading-none">
                                    <AnimatedCount value={globalStats.miss} />
                                </span>
                                <div className="text-right">
                                    <div className="text-[14px] font-black text-rose-600">
                                        <AnimatedCount value={Math.round((globalStats.miss / (globalStats.meet + globalStats.miss + globalStats.pending || 1)) * 100)} duration={2} />%
                                    </div>
                                    <div className="text-[8px] font-bold text-rose-400 uppercase tracking-tight">Violation Rate</div>
                                </div>
                            </div>
                        </div>

                        <div 
                            onClick={() => navigate('/maintenance/pm')}
                            className="p-6 bg-amber-50/30 border border-amber-100 rounded-3xl hover:bg-amber-50 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">In Progress</span>
                            </div>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-[1000] text-amber-900 leading-none">
                                    <AnimatedCount value={globalStats.pending} />
                                </span>
                                <div className="text-right">
                                    <div className="text-[14px] font-black text-amber-600">
                                        <AnimatedCount value={Math.round((globalStats.pending / (globalStats.meet + globalStats.miss + globalStats.pending || 1)) * 100)} duration={2} />%
                                    </div>
                                    <div className="text-[8px] font-bold text-amber-400 uppercase tracking-tight">Active Queue</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* COMPACT MODULE GRID */}
            <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
                {moduleConfig.map((mod, idx) => (
                    <motion.button
                        key={mod.path}
                        onClick={() => navigate(mod.path)}
                        className="dash-card group relative p-6 bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] hover:border-blue-400 hover:shadow-[0_20px_50px_rgba(8,112,184,0.08)] transition-all duration-500 text-left shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col gap-5 overflow-hidden h-full active:scale-[0.98]"
                    >
                        {mod.name === 'Monthly PM' && (
                            <div className="absolute top-4 right-4 text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                TRACKING
                            </div>
                        )}
                        
                        <div className="w-14 h-14 bg-slate-50/50 backdrop-blur-md rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 text-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-6">
                            <mod.icon />
                        </div>
                        
                        <div>
                            <h3 className="text-[13px] font-[1000] text-slate-900 mb-1 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{mod.name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold leading-tight mb-4 h-8 overflow-hidden">{mod.desc}</p>
                            
                            <div className="flex items-center justify-between mt-auto">
                                {loading ? (
                                    <div className="w-16 h-6 bg-slate-50 animate-pulse rounded-xl" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-[1000] text-slate-900 group-hover:text-blue-600 transition-colors">
                                            <AnimatedCount value={counts[mod.name] || 0} />
                                        </span>
                                        <span className="text-[9px] text-slate-300 uppercase font-black tracking-widest">Items</span>
                                    </div>
                                )}
                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1 shadow-sm">
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
                className="bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] p-10 mb-8 shadow-[0_20px_60px_rgba(0,0,0,0.03)]"
            >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-50/50 backdrop-blur-md text-blue-600 rounded-[1.5rem] shadow-sm border border-blue-100/50">
                            <FiActivity fontSize={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-[1000] text-slate-900 uppercase tracking-tight leading-tight">Regional Performance Metrics</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-1.5">SLA Compliance & Visit Progress By Kanwil</p>
                        </div>
                    </div>

                    <div className="flex gap-4 flex-wrap">
                        <div className="bg-emerald-50/50 backdrop-blur-md border border-emerald-100 rounded-2xl px-6 py-3 flex flex-col items-center shadow-sm">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Grand IN SLA</span>
                            <span className="text-2xl font-[1000] text-emerald-700 leading-none">
                                <AnimatedCount value={chartData.reduce((acc, curr) => acc + curr.meet, 0)} />
                            </span>
                        </div>
                        <div className="bg-rose-50/50 backdrop-blur-md border border-rose-100 rounded-2xl px-6 py-3 flex flex-col items-center shadow-sm">
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-[0.2em] mb-1">Grand OUT SLA</span>
                            <span className="text-2xl font-[1000] text-rose-700 leading-none">
                                <AnimatedCount value={chartData.reduce((acc, curr) => acc + curr.miss, 0)} />
                            </span>
                        </div>
                        <div className="bg-amber-50/50 backdrop-blur-md border border-amber-100 rounded-2xl px-6 py-3 flex flex-col items-center shadow-sm">
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1">Grand Pending</span>
                            <span className="text-2xl font-[1000] text-amber-700 leading-none">
                                <AnimatedCount value={chartData.reduce((acc, curr) => acc + curr.pending, 0)} />
                            </span>
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
                className="mt-8 bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] p-10 shadow-[0_20px_60px_rgba(0,0,0,0.03)]"
            >
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-[1000] text-slate-900 uppercase tracking-tight flex items-center gap-3">
                             <div className="w-2 h-8 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,_99,_235,_0.2)]" /> Prioritas Pengerjaan
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 ml-5">Pending schedules requiring immediate field visit</p>
                    </div>
                    <button 
                        onClick={() => navigate('/maintenance')}
                        className="px-8 py-3 bg-blue-50 text-blue-600 rounded-2xl font-[1000] text-[10px] tracking-[0.2em] uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100/50 active:scale-95"
                    >
                        Enter Tracker
                    </button>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 backdrop-blur-md text-slate-400 uppercase text-[9px] tracking-[0.3em] font-[1000] border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5">Asset Intelligence</th>
                                <th className="px-8 py-5">Site Visibility</th>
                                <th className="px-8 py-5 text-center">Category</th>
                                <th className="px-8 py-5 text-center text-blue-600">Strategic Target</th>
                                <th className="px-8 py-5 text-right font-inter">View</th>
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
                                        <td className="px-8 py-5 text-right font-inter">
                                            <button 
                                                onClick={() => navigate('/maintenance')}
                                                className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm active:scale-90"
                                            >
                                                <FiArrowRight fontSize={16} />
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
        </div>
    );
}
