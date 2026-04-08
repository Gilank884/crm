import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';
import { FiCalendar, FiUpload, FiPlus, FiTool, FiCheckCircle, FiClock, FiFileText, FiMapPin, FiUser, FiInfo, FiActivity, FiAlertCircle, FiDownload, FiSearch, FiFilter, FiChevronRight, FiDatabase, FiBarChart2, FiList, FiTrendingUp, FiShield, FiEdit3, FiTrash2 } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { parseExcelFile, exportToExcel } from '../../utils/excelHandler';

const getIsoDate = (raw) => {
    try {
        if (!raw) return null;

        let dateObj = null;

        // 1. Handle Date object (native from sheetjs if configured)
        if (raw instanceof Date) {
            dateObj = raw;
        } else {
            const str = raw.toString().trim();
            if (!str) return null;

            // 2. Handle DD/MM/YYYY or DD-MM-YYYY
            const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
            if (dmyMatch) {
                const day = parseInt(dmyMatch[1], 10);
                const month = parseInt(dmyMatch[2], 10);
                const year = parseInt(dmyMatch[3], 10);
                if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    dateObj = new Date(year, month - 1, day);
                }
            }

            // 3. Handle YYYY-MM-DD
            if (!dateObj) {
                const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (isoMatch) {
                    dateObj = new Date(str);
                }
            }

            // 4. Handle Excel serial number (Numeric)
            if (!dateObj) {
                const num = Number(str);
                if (!isNaN(num) && num > 30000 && num < 60000) {
                    const excelEpoch = new Date(1899, 11, 30);
                    dateObj = new Date(excelEpoch.getTime() + num * 86400000);
                }
            }

            // 5. Native Fallback
            if (!dateObj) {
                dateObj = new Date(str);
            }
        }

        // Final Validation & Range Check
        if (dateObj && !isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            if (year > 1900 && year < 2100) {
                return dateObj.toISOString().slice(0, 10);
            }
        }

        return null;
    } catch (e) { return null; }
};

const formatDate = (iso) => {
    if (!iso) return '---';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function CorrectiveMaintenance() {
    const fileInputRef = useRef(null);
    const [tasks, setTasks] = useState([]);
    const [totalDbCount, setTotalDbCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [rowLimit, setRowLimit] = useState(100);
    const [showAllDates, setShowAllDates] = useState(false);

    // Relational Data
    const [kanwils, setKanwils] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [assets, setAssets] = useState([]);

    // Filter Stats
    const [startMonth, setStartMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [endMonth, setEndMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [newTask, setNewTask] = useState({
        ticket_date: '', bit_ticket_number: '', 
        asset_id: '', technician_id: '', kanwil_id: '',
        supervisor_kc: '', problem_part: '', ticket_status: 'OPEN', 
        action: '', pic_uker: '', ticket_link: '', work_status: 'OPEN', 
        notes: '', schedule: '', reference: '', approval: 'PENDING', finished_at: null
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [startMonth, endMonth, rowLimit, showAllDates]);

    const fetchInitialData = async () => {
        const [kw, tech, ast] = await Promise.all([
            supabase.from('kanwils').select('id, name').order('name'),
            supabase.from('technicians').select('id, name').order('name'),
            supabase.from('managed_assets').select('id, tid, name, kc_supervisi').order('tid')
        ]);
        setKanwils(kw.data || []);
        setTechnicians(tech.data || []);
        setAssets(ast.data || []);
    };

    const fetchTasks = async () => {
        setLoading(true);
        
        // Fetch Total DB Count for diagnostic
        const { count } = await supabase.from('corrective_maintenance').select('*', { count: 'exact', head: true });
        setTotalDbCount(count || 0);

        let query = supabase
            .from('corrective_maintenance')
            .select(`
                *,
                managed_assets(tid, name, kc_supervisi),
                technicians(name),
                kanwils(name)
            `);

        if (!showAllDates) {
            const start = `${startMonth}-01`;
            const end = new Date(endMonth.split('-')[0], endMonth.split('-')[1], 0).toISOString().slice(0, 10);
            query = query.gte('ticket_date', start).lte('ticket_date', end);
        }

        query = query.order('ticket_date', { ascending: false, nullsFirst: false });

        if (rowLimit !== 'all') {
            query = query.limit(rowLimit);
        }

        const { data, error } = await query;
        if (error) {
            console.error(error);
            alert("Gagal mengambil data dari database: " + error.message);
        } else {
            setTasks(data || []);
        }
        setLoading(false);
    };

    const handleRefresh = () => {
        fetchInitialData();
        fetchTasks();
    };

    const filteredTasks = useMemo(() => {
        const s = searchTerm.toLowerCase();
        if (!s) return tasks;
        return tasks.filter(t => 
            t.managed_assets?.tid?.toLowerCase().includes(s) ||
            t.managed_assets?.name?.toLowerCase().includes(s) ||
            t.bit_ticket_number?.toLowerCase().includes(s) ||
            t.technicians?.name?.toLowerCase().includes(s) ||
            t.kanwils?.name?.toLowerCase().includes(s)
        );
    }, [tasks, searchTerm]);

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            const data = await parseExcelFile(file);
            console.log("Raw Excel Data:", data);

            // Normalize Key Function (Safe against spaces and formatting)
            const nK = (k) => k?.toString().trim().toUpperCase();
            
            // Lookups
            const assetMap = {}; assets.forEach(a => assetMap[nK(a.tid)] = a.id);
            const techMap = {}; technicians.forEach(t => techMap[nK(t.name)] = t.id);
            const kwMap = {}; kanwils.forEach(k => kwMap[nK(k.name)] = k.id);

            const mapping = data.map(item => {
                // Normalize Item Keys
                const norm = {};
                Object.keys(item).forEach(k => norm[nK(k)] = item[k]);

                const tid = nK(norm['TID']);
                const techName = nK(norm['PELAKSANA'] || norm['TEKNISI']);
                const kwName = nK(norm['KANWIIL'] || norm['KANWIL']);
                const t_date = getIsoDate(norm['TANGGAL TIKET'] || norm['TANGGAL'] || norm['DATE']);

                // Validation: Skip if TID and Date are both missing (likely empty row)
                if (!tid && !t_date) return null;

                return {
                    ticket_date: t_date,
                    bit_ticket_number: norm['NOMOR TIKET BIT'] || norm['TIKET BIT'] || '',
                    asset_id: assetMap[tid] || null,
                    technician_id: techMap[techName] || null,
                    kanwil_id: kwMap[kwName] || null,
                    supervisor_kc: norm['KC SUPERVISI'] || '',
                    problem_part: norm['PROBLEM PART'] || '',
                    ticket_status: norm['STATUS (TICKET)'] || norm['TICKET STATUS'] || 'OPEN',
                    action: norm['TINDAKAN'] || '',
                    pic_uker: norm['PIC UKER'] || '',
                    ticket_link: norm['TIKET'] || '',
                    work_status: norm['STATUS (WORK)'] || norm['STATUS'] || 'OPEN',
                    notes: norm['KETERANGAN'] || '',
                    schedule: getIsoDate(norm['JADWAL']),
                    reference: norm['REFERENSI'] || '',
                    approval: norm['APPROVAL'] || 'PENDING',
                    finished_at: getIsoDate(norm['SELESAI'])
                };
            }).filter(Boolean); // Remote null/skipped rows

            console.log("Mapped Data for DB:", mapping);

            if (mapping.length === 0) {
                alert("Gagal Impor: Tidak ada data valid yang ditemukan dalam file Excel. Pastikan header kolom sudah sesuai (TID, TANGGAL TIKET, dsb).");
                setLoading(false);
                return;
            }

            const { error } = await supabase.from('corrective_maintenance').insert(mapping);
            if (error) throw error;
            alert(`Sukes mengimpor ${mapping.length} data CM.`);
            fetchTasks();
        } catch (err) {
            console.error(err);
            alert('Gagal impor Excel: ' + err.message);
        }
        setLoading(false);
    };

    const handleAddCM = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const { error } = await supabase.from('corrective_maintenance').insert([newTask]);
        if (error) {
            alert(error.message);
        } else {
            setIsModalOpen(false);
            fetchTasks();
            setNewTask({
                ticket_date: '', bit_ticket_number: '', 
                asset_id: '', technician_id: '', kanwil_id: '',
                supervisor_kc: '', problem_part: '', ticket_status: 'OPEN', 
                action: '', pic_uker: '', ticket_link: '', work_status: 'OPEN', 
                notes: '', schedule: '', reference: '', approval: 'PENDING', finished_at: null
            });
        }
        setIsSaving(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-full mx-auto min-h-screen bg-slate-50">
            <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />

            {/* Header Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-5">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                            <FiTool size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-[950] text-slate-900 leading-none tracking-tight uppercase">Corrective Maintenance</h1>
                            <p className="text-[9px] font-bold text-slate-400 tracking-[0.15em] mt-1.5 grayscale uppercase opacity-70">Logistics & Service Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-50 transition-all">
                            <FiSearch size={13} className="text-slate-300" />
                            <input type="text" placeholder="Search TID, Site, Ticket..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-700 w-40 ml-2 placeholder:text-slate-300" />
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-black text-[9px] tracking-wider uppercase transition-all shadow-sm active:scale-95">
                            <FiPlus size={13} /> ADD CM TICKET
                        </button>
                        <button onClick={() => fileInputRef.current.click()} className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 transition-all">
                            <FiUpload size={14} />
                        </button>
                        <button
                            onClick={async () => {
                                const exportData = filteredTasks.map(t => ({
                                    'TANGGAL TIKET': formatDate(t.ticket_date),
                                    'NOMOR TIKET BIT': t.bit_ticket_number,
                                    'TID': t.managed_assets?.tid || 'N/A',
                                    'LOKASI': t.managed_assets?.name || 'Unknown',
                                    'KC SUPERVISI': t.supervisor_kc,
                                    'KANWIIL': t.kanwils?.name || 'Induk',
                                    'PROBLEM PART': t.problem_part,
                                    'TINDAKAN': t.action,
                                    'PELAKSANA': t.technicians?.name || 'Unassigned',
                                    'STATUS (TICKET)': t.ticket_status,
                                    'STATUS (WORK)': t.work_status,
                                    'JADWAL': formatDate(t.schedule)
                                }));
                                await exportToExcel(exportData, `Corrective_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);
                            }}
                            className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 transition-all"
                        >
                            <FiDownload size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 px-6 py-3 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <FiCalendar size={12} className="text-slate-300" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Periode</span>
                        <div className={`flex items-center transition-opacity ${showAllDates ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                            <div className="flex items-center bg-white rounded-lg border border-slate-200 overflow-hidden">
                                <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="bg-transparent border-none px-3 py-1.5 text-[9px] font-bold text-slate-600 outline-none w-32" />
                                <div className="w-px h-4 bg-slate-200" />
                                <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="bg-transparent border-none px-3 py-1.5 text-[9px] font-bold text-slate-600 outline-none w-32" />
                            </div>
                        </div>
                        <button onClick={() => setShowAllDates(!showAllDates)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${showAllDates ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>
                           {showAllDates ? 'Show filtered' : 'Show All Dates'}
                        </button>
                    </div>
                    
                    <div className="ml-auto flex items-center gap-4">
                        <div className="flex flex-col items-end">
                           <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{tasks.length} / {totalDbCount} Records</div>
                           <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Showing Current View / Global Total</div>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-2" />
                        <select value={rowLimit} onChange={(e) => setRowLimit(e.target.value)} className="bg-transparent border-none text-[9px] font-bold text-slate-600 outline-none cursor-pointer uppercase tracking-widest">
                            <option value={50}>Limit 50</option>
                            <option value={100}>Limit 100</option>
                            <option value="all">Unlimited</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* High-Density CM Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed min-w-[2400px]">
                        <thead className="bg-slate-100/50 text-slate-400 border-b border-slate-200">
                            <tr className="text-[9px] font-black tracking-widest uppercase align-middle">
                                <th className="px-3 py-3 border-r border-slate-200 w-12 text-center bg-slate-200/20">#</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-32">TANGGAL TIKET</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-44">NOMOR TIKET BIT</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-24">TID</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-56">LOKASI</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-44">KC SUPERVISI</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-44">KANWIIL</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-56">PROBLEM PART</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-32 text-center">STATUS</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-56">TINDAKAN</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-44">PELAKSANA</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-44">PIC UKER</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-44">TIKET</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-32 text-center">STATUS</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-56">KETERANGAN</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-32 text-center">JADWAL</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-44">REFERENSI</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-32 text-center">APPROVAL</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-44">CREATE</th>
                                <th className="px-3 py-3 w-44">SELESAI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                Array(10).fill(0).map((_, i) => <tr key={i} className="h-10 animate-pulse"><td colSpan="20" className="px-3"><div className="h-2 bg-slate-50 rounded w-full opacity-60" /></td></tr>)
                            ) : filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan="20" className="py-32 text-center">
                                       <div className="flex flex-col items-center gap-2">
                                          <div className="text-[10px] font-black text-slate-200 uppercase tracking-[0.5em] italic">Zero CM Data Found</div>
                                          {totalDbCount > 0 && <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-4 py-1 rounded-full">Pro Tip: Check "Show All Dates" button as some data might be outside current filter period</div>}
                                       </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((task, idx) => (
                                    <tr key={task.id} className="text-[10px] uppercase font-bold hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2 border-r border-slate-100 text-center bg-slate-100/10 text-slate-300 font-mono text-[9px]">{idx + 1}</td>
                                        <td className={`px-3 py-2 border-r border-slate-100 font-mono ${task.ticket_date ? 'text-slate-600' : 'text-rose-300 bg-rose-50/30'}`}>{formatDate(task.ticket_date)}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-blue-600">{task.bit_ticket_number}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 font-mono text-rose-500">{task.managed_assets?.tid || '---'}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 truncate text-slate-800 tracking-tight">{task.managed_assets?.name || '---'}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-slate-400">{task.supervisor_kc}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-slate-400">{task.kanwils?.name || '---'}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-slate-600 tracking-tight">{task.problem_part}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${task.ticket_status?.toUpperCase() === 'OPEN' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>{task.ticket_status}</span>
                                        </td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-slate-600">{task.action}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-slate-800">{task.technicians?.name || '---'}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-slate-400">{task.pic_uker}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-blue-500">{task.ticket_link}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${task.work_status?.toUpperCase() === 'FINISH' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{task.work_status}</span>
                                        </td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-slate-600 italic">{task.notes}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-center font-mono text-slate-400">{formatDate(task.schedule)}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-slate-400">{task.reference}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black ${task.approval === 'APPROVED' ? 'text-emerald-500' : 'text-slate-300'}`}>{task.approval}</span>
                                        </td>
                                        <td className="px-3 py-2 border-r border-slate-100 font-mono text-slate-300 text-[8px]">{new Date(task.created_at).toLocaleString('id-ID')}</td>
                                        <td className="px-3 py-2 font-mono text-slate-500">{formatDate(task.finished_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Entry Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white p-8 rounded-none w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border border-white shadow-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors text-xl font-black">✕</button>
                            <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tighter uppercase leading-none border-b border-slate-100 pb-4">New CM Ticket Injection</h2>
                            <form onSubmit={handleAddCM} className="grid grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Tanggal Tiket</label>
                                    <input required type="date" value={newTask.ticket_date} onChange={(e) => setNewTask({...newTask, ticket_date: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Nomor Tiket BIT</label>
                                    <input type="text" value={newTask.bit_ticket_number} onChange={(e) => setNewTask({...newTask, bit_ticket_number: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" placeholder="BIT/XXXX/..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">TID Asset</label>
                                    <select required value={newTask.asset_id} onChange={(e) => {
                                        const asset = assets.find(a => a.id === e.target.value);
                                        setNewTask({...newTask, asset_id: e.target.value, supervisor_kc: asset?.kc_supervisi || ''});
                                    }} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]">
                                        <option value="">Select TID...</option>
                                        {assets.map(a => <option key={a.id} value={a.id}>[{a.tid}] {a.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">KC Supervisi</label>
                                    <input type="text" value={newTask.supervisor_kc} onChange={(e) => setNewTask({...newTask, supervisor_kc: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Kanwil Region</label>
                                    <select required value={newTask.kanwil_id} onChange={(e) => setNewTask({...newTask, kanwil_id: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]">
                                        <option value="">Select Kanwil...</option>
                                        {kanwils.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Pelaksana / Teknisi</label>
                                    <select required value={newTask.technician_id} onChange={(e) => setNewTask({...newTask, technician_id: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]">
                                        <option value="">Select Technician...</option>
                                        {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-3 space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Problem Part</label>
                                    <input type="text" value={newTask.problem_part} onChange={(e) => setNewTask({...newTask, problem_part: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" placeholder="Card Reader, PC, etc..." />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Tindakan / Action</label>
                                    <input type="text" value={newTask.action} onChange={(e) => setNewTask({...newTask, action: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" placeholder="Describe the repair action taken..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">PIC Uker</label>
                                    <input type="text" value={newTask.pic_uker} onChange={(e) => setNewTask({...newTask, pic_uker: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Tiket Link</label>
                                    <input type="text" value={newTask.ticket_link} onChange={(e) => setNewTask({...newTask, ticket_link: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Keterangan Tambahan</label>
                                    <input type="text" value={newTask.notes} onChange={(e) => setNewTask({...newTask, notes: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Jadwal Visit</label>
                                    <input type="date" value={newTask.schedule} onChange={(e) => setNewTask({...newTask, schedule: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Status Tiket</label>
                                    <select value={newTask.ticket_status} onChange={(e) => setNewTask({...newTask, ticket_status: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]">
                                        <option value="OPEN">OPEN</option>
                                        <option value="CLOSED">CLOSED</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Status Kerja</label>
                                    <select value={newTask.work_status} onChange={(e) => setNewTask({...newTask, work_status: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]">
                                        <option value="OPEN">OPEN</option>
                                        <option value="FINISH">FINISH</option>
                                    </select>
                                </div>
                                <div className="col-span-3 pt-6">
                                    <button disabled={isSaving} type="submit" className="w-full py-6 bg-slate-900 border border-slate-800 text-white rounded-[2rem] font-[1000] text-[11px] tracking-[0.4em] uppercase shadow-2xl hover:bg-black hover:-translate-y-1 active:scale-95 transition-all">
                                        {isSaving ? 'INJECTING...' : 'COMMIT CM RECORD'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
