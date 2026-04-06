import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiUsers, FiUpload, FiPlus, FiPhone, FiBriefcase, FiTrash2, FiEdit3, FiBox, FiShield, FiInfo, FiCheckCircle, FiAlertCircle, FiSearch, FiList, FiTrendingUp, FiSettings, FiActivity, FiMapPin } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { parseExcelFile } from '../../utils/excelHandler';

export default function TechnicianManager() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fileInputRef = useRef(null);
    const [technicians, setTechnicians] = useState([]);
    const [kanwils, setKanwils] = useState([]);
    const [selectedKanwil, setSelectedKanwil] = useState('all');
    const [loading, setLoading] = useState(true);
    const [pageSize, setPageSize] = useState(() => {
        const saved = localStorage.getItem('pageSize');
        return saved ? (saved === 'all' ? 'all' : parseInt(saved)) : 20;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('all');
    const [newTech, setNewTech] = useState({ name: '', kanwil_id: '', phone: '', specialty: 'Generalist' });

    // Performance Yield State
    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'performance'
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [performanceData, setPerformanceData] = useState([]);

    const getPerformanceStatus = (task) => {
        if (!task.scheduled_date) return 'PENDING';
        const scheduled = new Date(task.scheduled_date);
        const completed = task.completed_date ? new Date(task.completed_date) : null;
        const now = new Date();
        const taskMonthYear = scheduled.getFullYear() * 12 + scheduled.getMonth();
        const currentMonthYear = now.getFullYear() * 12 + now.getMonth();
        if (!completed) return (taskMonthYear < currentMonthYear) ? 'MISS' : 'PENDING';
        const diffInDays = Math.floor(Math.abs(completed - scheduled) / (1000 * 60 * 60 * 24));
        const completedMonthYear = completed.getFullYear() * 12 + completed.getMonth();
        if (completedMonthYear > taskMonthYear) return 'MISS';
        return diffInDays <= 7 ? 'MEET' : 'MISS';
    };

    // Import Preview State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [importData, setImportData] = useState({ newRecords: [], duplicateRecords: [] });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const { data: kwData } = await supabase.from('kanwils').select('*').order('name', { ascending: true });
        setKanwils(kwData || []);
        
        if (activeTab === 'performance') {
            fetchPerformanceStats(selectedMonth);
        } else {
            const urlKanwil = searchParams.get('kanwil');
            if (urlKanwil) {
                setSelectedKanwil(urlKanwil);
                fetchTechnicians(urlKanwil, pageSize);
            } else {
                fetchTechnicians(selectedKanwil, pageSize);
            }
        }
    };

    const fetchPerformanceStats = async (period) => {
        setLoading(true);
        try {
            const { data: tasks, error: tErr } = await supabase
                .from('maintenance_tasks')
                .select('technician_id, type, scheduled_date, completed_date')
                .eq('period', period);
            
            if (tErr) throw tErr;

            const { data: techs, error: techErr } = await supabase
                .from('technicians')
                .select('id, name, kanwil_id, kanwils(name)');
            
            if (techErr) throw techErr;

            const stats = techs.map(tech => {
                const techTasks = tasks?.filter(t => t.technician_id === tech.id) || [];
                const pmTasks = techTasks.filter(t => t.type === 'PM');
                const cmTasks = techTasks.filter(t => t.type === 'CM');

                const pmMeet = pmTasks.filter(t => getPerformanceStatus(t) === 'MEET').length;
                const pmMiss = pmTasks.filter(t => getPerformanceStatus(t) === 'MISS').length;
                const cmMeet = cmTasks.filter(t => getPerformanceStatus(t) === 'MEET').length;
                const cmMiss = cmTasks.filter(t => getPerformanceStatus(t) === 'MISS').length;

                const totalIn = pmMeet + cmMeet;
                const totalOut = pmMiss + cmMiss;
                const totalTasks = pmTasks.length + cmTasks.length;
                const outPercent = totalTasks > 0 ? Math.round((totalOut / totalTasks) * 100) : 0;

                return {
                    id: tech.id,
                    name: tech.name,
                    kanwil: tech.kanwils?.name || 'Unknown',
                    pmMeet, pmMiss, cmMeet, cmMiss,
                    totalIn, totalOut, outPercent
                };
            }).filter(s => (s.pmMeet + s.pmMiss + s.cmMeet + s.cmMiss) > 0);

            setPerformanceData(stats.sort((a, b) => b.outPercent - a.outPercent));
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'performance') {
            fetchPerformanceStats(selectedMonth);
        }
    }, [selectedMonth, activeTab]);

    const fetchTechnicians = async (kanwilId = selectedKanwil, limit = pageSize) => {
        setLoading(true);
        let query = supabase.from('technicians').select(`
            *, 
            kanwils(name, code),
            managed_assets(count)
        `);
        
        if (kanwilId !== 'all') query = query.eq('kanwil_id', kanwilId);
        
        if (limit !== 'all') {
            query = query.limit(limit);
        } else {
            query = query.limit(1000);
        }
        
        const { data, error } = await query.order('name', { ascending: true });
        if (error) console.error(error);
        else setTechnicians(data || []);
        setLoading(false);
    };

    const filteredTechnicians = useMemo(() => {
        const s = searchTerm.toLowerCase();
        let result = technicians;
        
        if (selectedSpecialty !== 'all') {
            result = result.filter(t => t.specialty === selectedSpecialty);
        }
        
        if (!s) return result;
        return result.filter(t => 
            t.name?.toLowerCase().includes(s) || 
            t.phone?.toLowerCase().includes(s) || 
            t.specialty?.toLowerCase().includes(s) ||
            t.kanwils?.name?.toLowerCase().includes(s) ||
            t.kanwils?.code?.toLowerCase().includes(s)
        );
    }, [technicians, searchTerm, selectedSpecialty]);

    const specialties = useMemo(() => {
        const set = new Set(technicians.map(t => t.specialty).filter(Boolean));
        return Array.from(set);
    }, [technicians]);

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await parseExcelFile(file);
            const { data: existingTechs } = await supabase.from('technicians').select('name, kanwil_id');
            const existingKeys = new Set(existingTechs?.map(t => `${t.name?.toUpperCase().trim()}_${t.kanwil_id}`) || []);

            const newRecords = [];
            const duplicateRecords = [];

            for (const item of data) {
                const rawName = item['Nama'] || item['Name'] || item['nama'];
                const name = rawName?.toString().trim();
                const kanwilCode = item['Kode Kanwil'] || item['Kanwil'] || item['kanwil_code']?.toString().trim();
                const matchedKanwil = kanwils.find(kw => kw.code === kanwilCode || kw.name === kanwilCode);
                
                if (!name || !matchedKanwil) continue;

                const techData = {
                    name,
                    kanwil_id: matchedKanwil.id,
                    phone: item['Telepon'] || item['Phone'] || item['phone']?.toString() || '',
                    specialty: item['Spesialisasi'] || item['Specialty'] || item['specialty'] || 'Generalist',
                    status: 'active',
                    kanwil_name: matchedKanwil.name
                };

                const key = `${name.toUpperCase()}_${matchedKanwil.id}`;
                if (existingKeys.has(key)) {
                    duplicateRecords.push(techData);
                } else {
                    newRecords.push(techData);
                    existingKeys.add(key);
                }
            }

            setImportData({ newRecords, duplicateRecords });
            setIsPreviewModalOpen(true);
        } catch (err) {
            console.error(err);
            alert('Gagal memproses file Excel.');
        }
        setLoading(false);
        e.target.value = '';
    };

    const confirmImport = async () => {
        if (importData.newRecords.length === 0) {
            setIsPreviewModalOpen(false);
            return;
        }

        setIsSaving(true);
        const uploadData = importData.newRecords.map(({ kanwil_name, ...rest }) => rest);
        const { error } = await supabase.from('technicians').insert(uploadData);
        
        if (error) {
            alert(`Gagal menyimpan: ${error.message}`);
        } else {
            alert(`Berhasil! ${importData.newRecords.length} Teknisi baru telah ditambahkan.`);
            setIsPreviewModalOpen(false);
            fetchInitialData();
        }
        setIsSaving(false);
    };

    const handleAddTech = async (e) => {
        e.preventDefault();
        const isDuplicate = technicians.some(t => 
            t.name?.toLowerCase().trim() === newTech.name?.toLowerCase().trim() && 
            t.kanwil_id === newTech.kanwil_id
        );

        if (isDuplicate) {
            alert(`Peringatan: Teknisi "${newTech.name}" sudah terdaftar di wilayah ini.`);
            return;
        }

        setIsSaving(true);
        const { error } = await supabase.from('technicians').insert([newTech]);
        if (error) alert(`Error: ${error.message}`);
        else {
            setNewTech({ name: '', kanwil_id: '', phone: '', specialty: 'Generalist' });
            setIsModalOpen(false);
            fetchTechnicians(selectedKanwil);
        }
        setIsSaving(false);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen">
            <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />
            
            {/* ═══ Header ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-5">
                    {/* Brand & Tabs */}
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                <FiUsers size={20} />
                            </div>
                            <div>
                                <h1 className="text-lg font-[950] text-slate-900 leading-none tracking-tight">Personnel Hub</h1>
                                <p className="text-[9px] font-bold text-slate-400 tracking-[0.15em] mt-1.5 uppercase">Technician Management</p>
                            </div>
                        </div>

                        {/* Custom Tab Switcher */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 items-center">
                            <button 
                                onClick={() => setActiveTab('list')}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <FiList size={14} /> LIST
                            </button>
                            <button 
                                onClick={() => setActiveTab('performance')}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all flex items-center gap-2 ${activeTab === 'performance' ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <FiTrendingUp size={14} /> YIELD ANALYSIS
                            </button>
                        </div>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-3">
                        {activeTab === 'list' ? (
                            <>
                                <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black tracking-widest transition-all">
                                    <FiUpload size={14} /> IMPORT
                                </button>
                                <button onClick={() => { setNewTech({ name: '', kanwil_id: '', phone: '', specialty: 'Generalist' }); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10px] font-black tracking-widest shadow-lg shadow-indigo-200 transition-all">
                                    <FiPlus size={14} /> ADD PERSONNEL
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Audit Period</span>
                                <input 
                                    type="month" 
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[12px] font-black text-indigo-600 uppercase tabular-nums cursor-pointer px-1"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Search & Global Filter Row (Only for List) */}
                {activeTab === 'list' && (
                    <div className="flex flex-col lg:flex-row gap-4 px-6 py-4 bg-slate-50/50 border-t border-slate-100 items-center">
                        <div className="relative flex-1 group">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                            <input 
                                type="text" 
                                placeholder="SEARCH PERSONNEL, PHONE, OR SPECIALTY..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white pl-12 pr-6 py-3 rounded-xl border border-slate-200 text-[10px] font-bold tracking-wider outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300" 
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <FiMapPin size={16} className="text-slate-400" />
                            <select value={selectedKanwil} onChange={(e) => setSelectedKanwil(e.target.value)} className="bg-white px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black text-slate-600 outline-none focus:border-indigo-500 min-w-[160px]">
                                <option value="all">ALL REGIONS</option>
                                {kanwils.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                            </select>
                            <div className="w-px h-6 bg-slate-200 mx-1" />
                            <FiBriefcase size={16} className="text-slate-400" />
                            <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)} className="bg-white px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black text-slate-600 outline-none focus:border-indigo-500">
                                <option value="all">ALL SPECIALTIES</option>
                                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ Main Content View ═══ */}
            {activeTab === 'list' ? (
                /* Personnel List View */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] uppercase tracking-tight">
                            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-black">
                                <tr>
                                    <th className="px-8 py-5">Personnel Identification</th>
                                    <th className="px-8 py-5 text-center">Managed Assets</th>
                                    <th className="px-8 py-5 text-center">Status</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => <tr key={i} className="h-16 animate-pulse"><td colSpan="4" className="px-8"><div className="h-2 bg-slate-100 rounded w-full opacity-60" /></td></tr>)
                                ) : filteredTechnicians.length === 0 ? (
                                    <tr><td colSpan="4" className="py-24 text-center text-[10px] font-black text-slate-200 uppercase tracking-[0.5em] italic">No Personnel Records</td></tr>
                                ) : (
                                    filteredTechnicians.map((tech) => (
                                        <tr key={tech.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-lg border border-slate-200 transition-transform group-hover:scale-105 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                                        <FiUsers size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-[950] text-slate-900 tracking-tight">{tech.name}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[8px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{tech.kanwils?.name || 'GENERIC'}</span>
                                                            <span className="text-[8px] font-bold text-slate-300 italic">{tech.specialty}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <button onClick={() => navigate(`/assets?pic_id=${tech.id}`)} className="flex items-center justify-center gap-1.5 mx-auto bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all text-[9px] font-black shadow-sm group/btn">
                                                    <FiBox size={12} /> {tech.managed_assets?.[0]?.count || 0} Assets
                                                </button>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <div className={`mx-auto flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border w-fit text-[8px] font-black tracking-widest ${tech.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-300 border-slate-200'}`}>
                                                    <FiShield size={10} /> {tech.status.toUpperCase()}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex justify-end gap-2">
                                                    <button className="p-2.5 bg-white hover:bg-indigo-50 rounded-lg transition-all border border-slate-200 text-slate-400 hover:text-indigo-600 shadow-sm"><FiEdit3 size={14} /></button>
                                                    <button className="p-2.5 bg-white hover:bg-rose-50 rounded-lg transition-all border border-slate-200 text-slate-400 hover:text-rose-500 shadow-sm"><FiTrash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-8 py-4 border-t border-slate-100 text-[9px] font-black text-slate-400 flex items-center justify-between bg-slate-50/50">
                        <span>SHOWING {filteredTechnicians.length} OPERATIONAL NODES</span>
                    </div>
                </div>
            ) : (
                /* Performance Yield Analysis View */
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[9px] font-bold uppercase tracking-tight border-collapse">
                            {/* High-Density Light Mode Header */}
                            <thead className="bg-slate-100/80 text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th rowSpan={2} className="px-5 py-4 bg-slate-50 text-slate-900 min-w-[200px] border-r border-slate-200 font-black">PERSONNEL / PETUGAS</th>
                                    <th rowSpan={2} className="px-5 py-4 bg-slate-50 text-slate-900 min-w-[120px] border-r border-slate-200 font-black">KANWIL</th>
                                    <th colSpan={2} className="px-4 py-2 border-r border-slate-200 border-b border-slate-200 text-center text-blue-600 bg-blue-50/50 tracking-[0.1em] font-black">PREVENTIVE (PM)</th>
                                    <th colSpan={2} className="px-4 py-2 border-r border-slate-200 border-b border-slate-200 text-center text-amber-600 bg-amber-50/50 tracking-[0.1em] font-black">CORRECTIVE (CM)</th>
                                    <th colSpan={2} className="px-4 py-2 border-r border-slate-200 border-b border-slate-200 text-center text-slate-600 bg-slate-100/50 tracking-[0.1em] font-black uppercase">JUMLAH</th>
                                    <th rowSpan={2} className="px-8 py-4 bg-rose-50 text-rose-600 text-center tracking-[0.15em] font-black">OUT SLA %</th>
                                </tr>
                                <tr className="bg-slate-50/50 border-b border-slate-200 text-[8px]">
                                    <th className="px-4 py-3 text-center border-r border-slate-200 text-blue-500/70 font-black">IN SLA</th>
                                    <th className="px-4 py-3 text-center border-r border-slate-200 text-rose-500/70 font-black">OUT SLA</th>
                                    <th className="px-4 py-3 text-center border-r border-slate-200 text-amber-500/70 font-black">IN SLA</th>
                                    <th className="px-4 py-3 text-center border-r border-slate-200 text-rose-500/70 font-black">OUT SLA</th>
                                    <th className="px-4 py-3 text-center border-r border-slate-200 uppercase text-slate-500/70">IN SLA</th>
                                    <th className="px-4 py-3 text-center border-r border-slate-200 uppercase text-rose-500/70">OUT SLA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">Aggregating Performance Hub...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : performanceData.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-32 text-center">
                                            <div className="flex flex-col items-center opacity-20">
                                                <FiActivity size={48} />
                                                <span className="text-[10px] font-black uppercase tracking-[0.5em] mt-4 text-slate-900">Zero Maintenance Logs Found</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    performanceData.map(d => (
                                        <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-5 py-3 border-r border-slate-100">
                                                <div className="text-[11px] font-black text-slate-900 tracking-tight">{d.name}</div>
                                            </td>
                                            <td className="px-5 py-3 border-r border-slate-100">
                                                <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 tracking-wider inline-block">{d.kanwil}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center border-r border-slate-100 bg-blue-50/20 transition-colors group-hover:bg-blue-50/40 font-black text-[11px] tabular-nums text-blue-600">{d.pmMeet}</td>
                                            <td className="px-4 py-3 text-center border-r border-slate-100 font-bold text-[11px] tabular-nums text-rose-400/80">{d.pmMiss}</td>
                                            <td className="px-4 py-3 text-center border-r border-slate-100 bg-amber-50/20 transition-colors group-hover:bg-amber-50/40 font-black text-[11px] tabular-nums text-amber-600">{d.cmMeet}</td>
                                            <td className="px-4 py-3 text-center border-r border-slate-100 font-bold text-[11px] tabular-nums text-rose-400/80">{d.cmMiss}</td>
                                            <td className="px-4 py-3 text-center border-r border-slate-100 bg-slate-50/30 font-black text-[11px] tabular-nums text-slate-700">{d.totalIn}</td>
                                            <td className="px-4 py-3 text-center border-r border-slate-100 bg-slate-50/30 font-black text-[11px] tabular-nums text-rose-600">{d.totalOut}</td>
                                            <td className={`px-8 py-3 text-center ${d.outPercent > 15 ? 'bg-rose-50/30' : d.outPercent > 5 ? 'bg-amber-50/30' : 'bg-emerald-50/30'} transition-colors`}>
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-[12px] font-black tabular-nums leading-none ${d.outPercent > 15 ? 'text-rose-600' : d.outPercent > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                        {d.outPercent}%
                                                    </span>
                                                    <div className="w-10 h-1 bg-slate-200/50 rounded-full mt-1.5 overflow-hidden flex">
                                                        <div className={`h-full ${d.outPercent > 15 ? 'bg-rose-500' : d.outPercent > 5 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${100 - d.outPercent}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Tambah Teknisi */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white p-10 rounded-none w-full max-w-md relative border border-white shadow-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors text-xl font-black">✕</button>
                            <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter uppercase leading-none">Personnel Profile</h2>
                            <form onSubmit={handleAddTech} className="space-y-5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Full Identity</label>
                                    <input required type="text" value={newTech.name} onChange={(e) => setNewTech({...newTech, name: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-[13px] transition-all" placeholder="Enter Full Name..." />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Operational Region</label>
                                    <select required value={newTech.kanwil_id} onChange={(e) => setNewTech({...newTech, kanwil_id: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-[13px] transition-all">
                                        <option value="">SELECT REGION...</option>
                                        {kanwils.map(kw => <option key={kw.id} value={kw.id}>{kw.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Specialization</label>
                                        <input type="text" value={newTech.specialty} onChange={(e) => setNewTech({...newTech, specialty: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-[13px] transition-all" placeholder="e.g. Mechanical" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Contact Phone</label>
                                        <input type="text" value={newTech.phone} onChange={(e) => setNewTech({...newTech, phone: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-[13px] transition-all" placeholder="0812..." />
                                    </div>
                                </div>
                                <button disabled={isSaving} type="submit" className="w-full py-6 mt-6 bg-slate-900 border border-slate-800 text-white rounded-3xl font-[1000] text-[11px] tracking-[0.4em] uppercase shadow-2xl shadow-indigo-100 hover:bg-black hover:-translate-y-1 active:scale-95 transition-all">
                                    {isSaving ? 'REGISTERING...' : 'COMMIT PROFILE'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Import Preview Modal */}
            <AnimatePresence>
                {isPreviewModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[105] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-none w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-white shadow-2xl">
                            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                                        <h2 className="text-2xl font-[950] text-slate-900 tracking-tighter uppercase leading-none">Personnel Audit</h2>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">Technician Entry Verification</p>
                                </div>
                                <button onClick={() => setIsPreviewModalOpen(false)} className="w-10 h-10 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all border border-slate-100">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-8">
                                <div className="grid grid-cols-3 gap-6">
                                    {[
                                        { label: 'Total Scanned', val: importData.newRecords.length + importData.duplicateRecords.length, c: 'indigo' },
                                        { label: 'Authorized New', val: importData.newRecords.length, c: 'emerald' },
                                        { label: 'Already Registered', val: importData.duplicateRecords.length, c: 'rose' }
                                    ].map(s => (
                                        <div key={s.label} className={`p-8 bg-white border border-slate-200 rounded-[2rem] relative overflow-hidden group shadow-sm`}>
                                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{s.label}</div>
                                            <div className={`text-4xl font-[950] text-slate-900 tracking-tighter`}>{s.val}</div>
                                            <div className={`absolute bottom-0 left-0 w-full h-1.5 ${s.c === 'indigo' ? 'bg-indigo-500' : s.c === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                                    <div className="max-h-[500px] overflow-y-auto">
                                        <table className="w-full text-left text-[11px] uppercase tracking-tight">
                                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 font-black text-slate-400 z-10">
                                                <tr>
                                                    <th className="px-10 py-6">Technician Name</th>
                                                    <th className="px-10 py-6 text-center">Kanwil Node</th>
                                                    <th className="px-10 py-6 text-right">Primary Specialty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-bold bg-white">
                                                {importData.newRecords.map((r, i) => (
                                                    <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                                                        <td className="px-10 py-5 text-slate-900 font-[900]">{r.name}</td>
                                                        <td className="px-10 py-5 text-center text-slate-500 font-black">
                                                            <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{r.kanwil_name}</span>
                                                        </td>
                                                        <td className="px-10 py-5 text-right text-indigo-600 italic font-black">{r.specialty}</td>
                                                    </tr>
                                                ))}
                                                {importData.newRecords.length === 0 && <tr><td colSpan="3" className="py-32 text-center text-slate-300 font-black tracking-widest italic opacity-50">No Authorized Personnel to Batch</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 bg-slate-50/80 backdrop-blur-xl border-t border-slate-100 flex gap-4">
                                <button onClick={() => setIsPreviewModalOpen(false)} className="flex-1 py-6 bg-white border border-slate-200 text-slate-400 rounded-3xl font-black text-[12px] tracking-[0.2em] uppercase hover:bg-slate-100 transition-all">Abort Sync</button>
                                <button onClick={confirmImport} disabled={isSaving || importData.newRecords.length === 0} className="flex-[2] py-6 bg-indigo-600 text-white rounded-3xl font-[1000] text-[12px] tracking-[0.4em] uppercase shadow-2xl shadow-indigo-200 transition-all disabled:opacity-50 hover:bg-indigo-700">
                                    Commit {importData.newRecords.length} Nodes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
