import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { FiCalendar, FiUpload, FiPlus, FiTool, FiCheckCircle, FiClock, FiFileText, FiMapPin, FiUser, FiInfo, FiActivity, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { parseExcelFile } from '../../utils/excelHandler';

export default function MaintenanceTracker() {
    const fileInputRef = useRef(null);
    const [tasks, setTasks] = useState([]);
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
    const [pageSize, setPageSize] = useState(() => {
        const saved = localStorage.getItem('pageSize');
        return saved ? (saved === 'all' ? 'all' : parseInt(saved)) : 20;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [assets, setAssets] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [newTask, setNewTask] = useState({ asset_id: '', technician_id: '', type: 'PM', period: '', scheduled_date: '', completed_date: '', notes: '', status: 'pending' });

    // Import Preview State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [importData, setImportData] = useState({ newRecords: [], duplicateRecords: [], openCount: 0, closedCount: 0 });

    // Status Confirmation State
    const [confirmingStatus, setConfirmingStatus] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const { data: assetData } = await supabase.from('managed_assets').select('id, name, tid').order('name', { ascending: true });
        const { data: techData } = await supabase.from('technicians').select('id, name').order('name', { ascending: true });
        setAssets(assetData || []);
        setTechnicians(techData || []);
        fetchTasks(startDate, endDate, pageSize);
    };

    const fetchTasks = async (start = startDate, end = endDate, limit = pageSize) => {
        setLoading(true);
        let query = supabase
            .from('maintenance_tasks')
            .select(`
                *,
                managed_assets ( name, tid, location ),
                technicians ( name )
            `)
            .gte('scheduled_date', start)
            .lte('scheduled_date', end)
            .order('scheduled_date', { ascending: true });
        
        if (limit !== 'all') {
            query = query.limit(limit);
        } else {
            query = query.limit(1000);
        }
            
        const { data, error } = await query;
        
        if (error) console.error(error);
        else setTasks(data || []);
        setLoading(false);
    };

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await parseExcelFile(file);
            
            // 1. Fetch current month's tasks to check for duplicates
            // We check Asset + Type + Period (YYYY-MM)
            const { data: existingTasks } = await supabase
                .from('maintenance_tasks')
                .select('asset_id, type, period');
            
            // Create a lookup key for "assetId_type_period"
            const existingKeys = new Set(existingTasks?.map(t => `${t.asset_id}_${t.type}_${t.period}`) || []);

            const techMap = {}; // Name -> ID
            technicians.forEach(t => techMap[t.name?.toUpperCase()] = t.id);

            const assetMap = {}; // TID -> ID
            assets.forEach(a => assetMap[a.tid?.toString()?.toUpperCase()] = a.id);

            const newRecords = [];
            const duplicateRecords = [];

            for (const item of data) {
                // Formatting based on FINAL headers: TEKNISI, TID, LOKASI, KANWIL, JADWAL, STATUS, TYPE
                const techNameRaw = item['TEKNISI'] || item['PELAKSANA'] || item['Teknisi'] || item['Pelaksana'];
                const pelaksana = techNameRaw?.toString()?.toUpperCase();
                const tid = item['TID']?.toString()?.toUpperCase();
                
                // Handle split or combined Status/Type columns
                const typeRaw = item['TYPE'] || item['STATUS TYPE'] || item['Type'] || '';
                const type = typeRaw.toString().toUpperCase().includes('CM') ? 'CM' : 'PM';
                
                // JADWAL = scheduled_date
                const rawJadwal = item['JADWAL'] || item['Jadwal'] || item['Tanggal'];
                // STATUS = completed_date (if filled)
                const rawStatus = item['STATUS'] || item['Status'] || '';
                
                if (!rawJadwal) continue;

                // ROBUST DATE PARSING Helper
                const getIsoDate = (raw) => {
                    try {
                        if (!raw) return null;
                        if (raw instanceof Date) return raw.toISOString().slice(0, 10);
                        if (typeof raw === 'string' && raw.includes('/')) {
                            const parts = raw.split('/');
                            if (parts.length === 3) {
                                const day = parts[0].padStart(2, '0');
                                const month = parts[1].padStart(2, '0');
                                const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                                return `${year}-${month}-${day}`;
                            }
                        }
                        return new Date(raw).toISOString().slice(0, 10);
                    } catch (e) {
                        return null;
                    }
                };

                const scheduledDate = getIsoDate(rawJadwal);
                const visitDate = getIsoDate(rawStatus);
                const status = visitDate ? 'completed' : 'pending';

                const assetId = assetMap[tid];
                const techId = techMap[pelaksana];

                if (!assetId || !scheduledDate) continue;

                const taskPeriod = scheduledDate.slice(0, 7);

                const taskData = {
                    asset_id: assetId,
                    technician_id: techId || null,
                    type,
                    scheduled_date: scheduledDate,
                    completed_date: visitDate,
                    period: taskPeriod,
                    status: status,
                    notes: `Imported: ${pelaksana || 'Unknown'}`,
                    // For UI Preview:
                    tid_preview: tid,
                    site_preview: item['LOKASI'] || 'Unknown Site',
                    tech_preview: pelaksana || 'Unassigned'
                };

                const key = `${assetId}_${type}_${taskPeriod}`;
                if (existingKeys.has(key)) {
                    duplicateRecords.push(taskData);
                } else {
                    newRecords.push(taskData);
                }
            }

            setImportData({ 
                newRecords, 
                duplicateRecords,
                openCount: newRecords.filter(r => !r.completed_date).length,
                closedCount: newRecords.filter(r => r.completed_date).length
            });
            setIsPreviewModalOpen(true);
            
        } catch (err) {
            console.error(err);
            alert('Gagal memproses file Excel. Pastikan format kolom sesuai.');
        }
        setLoading(false);
        e.target.value = ''; // Reset input
    };

    const confirmImport = async () => {
        if (importData.newRecords.length === 0) {
            setIsPreviewModalOpen(false);
            return;
        }

        setIsSaving(true);
        // Remove UI-only preview fields
        const uploadData = importData.newRecords.map(({ tid_preview, site_preview, tech_preview, ...rest }) => rest);
        
        const { error } = await supabase.from('maintenance_tasks').insert(uploadData);
        
        if (error) {
            alert(`Gagal menyimpan: ${error.message}`);
        } else {
            alert(`Berhasil! ${importData.newRecords.length} Jadwal baru ditambahkan.`);
            setIsPreviewModalOpen(false);
            fetchInitialData();
        }
        setIsSaving(false);
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        const taskToSave = { 
            ...newTask,
            status: newTask.completed_date ? 'completed' : 'pending',
            period: newTask.scheduled_date ? newTask.scheduled_date.slice(0, 7) : period
        };

        const { error } = await supabase.from('maintenance_tasks').insert([taskToSave]);
        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            setNewTask({ asset_id: '', technician_id: '', type: 'PM', period: '', scheduled_date: '', completed_date: '', notes: '', status: 'pending' });
            setIsModalOpen(false);
            fetchTasks(startDate, endDate, pageSize);
        }
        setIsSaving(false);
    };

    const handleStatusUpdate = async () => {
        if (!confirmingStatus) return;
        const { id, currentStatus } = confirmingStatus;
        
        setIsSaving(true);
        const isCompleting = currentStatus !== 'completed';
        const newStatus = isCompleting ? 'completed' : 'pending';
        const visitDate = isCompleting ? new Date().toISOString().slice(0, 10) : null;
        
        const { error } = await supabase
            .from('maintenance_tasks')
            .update({ 
                status: newStatus,
                completed_date: visitDate
            })
            .eq('id', id);
            
        if (error) {
            alert('Gagal update status.'); 
        } else {
            fetchTasks(startDate, endDate, pageSize);
            setConfirmingStatus(null);
        }
        setIsSaving(false);
    };

    const visitedCount = tasks.filter(t => t.completed_date).length;
    const pendingCount = tasks.length - visitedCount;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-7xl mx-auto">
            <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />

            {/* Header / Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-6 border-b border-slate-200 gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-8 bg-blue-600 rounded-full shadow-sm" />
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">Maintenance Log</h1>
                    </div>
                    <div className="flex items-center gap-6 mt-4 ml-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest min-w-[70px]">Close</span>
                            <div className="bg-green-50 text-green-600 px-3 py-1 rounded-lg border border-green-100 font-black text-sm">{visitedCount}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest min-w-[70px]">Open</span>
                            <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg border border-amber-100 font-black text-sm">{pendingCount}</div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    <button onClick={() => fileInputRef.current.click()} disabled={loading} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] tracking-widest uppercase hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm min-h-[46px]">
                        <FiUpload className="text-lg" /> Standard Import
                    </button>
                    
                    <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-[46px]">
                        <div className="flex items-center px-4 bg-slate-50 border-r border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest gap-2">
                             <FiCalendar /> Dari
                        </div>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => { setStartDate(e.target.value); fetchTasks(e.target.value, endDate, pageSize); }} 
                            className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none w-36 cursor-pointer" 
                        />
                        <div className="flex items-center px-4 bg-slate-50 border-x border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest gap-2">
                             Sampai
                        </div>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => { setEndDate(e.target.value); fetchTasks(startDate, e.target.value, pageSize); }} 
                            className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none w-36 cursor-pointer" 
                        />
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="btn-dongker shadow-lg shadow-blue-200 flex items-center gap-2 h-[46px]">
                        <FiPlus className="text-lg" /> Jadwalkan
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-black border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-5 text-center">Status</th>
                            <th className="px-8 py-5">TID / Asset Name</th>
                            <th className="px-8 py-5 text-center">Category</th>
                            <th className="px-8 py-5 text-center">Jadwal PM/CM</th>
                            <th className="px-8 py-5 text-center">Visit Date</th>
                            <th className="px-8 py-5">Teknisi</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => <tr key={i} className="h-16 animate-pulse"><td colSpan="6" className="px-8"><div className="h-4 bg-slate-50 rounded-full w-full" /></td></tr>)
                        ) : tasks.length === 0 ? (
                            <tr><td colSpan="6" className="py-24 text-center text-slate-400 font-medium italic uppercase tracking-widest text-xs">No tasks found for this period.</td></tr>
                        ) : (
                            tasks.map((task) => (
                                <tr key={task.id} className={`hover:bg-blue-50/20 transition-all ${task.status === 'completed' ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                                    <td className="px-8 py-4 text-center">
                                        <button 
                                            onClick={() => setConfirmingStatus({ id: task.id, currentStatus: task.completed_date ? 'completed' : 'pending' })}
                                            className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all mx-auto ${task.completed_date ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-100' : 'bg-white border-slate-200 text-transparent hover:border-blue-400'}`}
                                        >
                                            <FiCheckCircle className="text-xl" />
                                        </button>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px] uppercase border border-blue-100">{task.managed_assets?.tid || '---'}</span>
                                            <div className="font-black uppercase tracking-tight text-sm text-slate-900">{task.managed_assets?.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase border ${task.type === 'PM' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{task.type}</span>
                                    </td>
                                    <td className="px-8 py-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-tight">{task.scheduled_date || '---'}</td>
                                    <td className="px-8 py-4 text-center">
                                        {task.completed_date ? (
                                            <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-lg text-[10px] font-black border border-green-100">{task.completed_date}</span>
                                        ) : (
                                            <span className="text-slate-300 text-[10px] italic font-medium uppercase tracking-widest">Pending</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-xs border border-slate-100 text-slate-300"><FiUser /></div>
                                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{task.technicians?.name || 'Unassigned'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-slate-100"><FiFileText className="text-lg" /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Manual Modal Refinement logic remains consistent */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white p-10 rounded-[3rem] w-full max-w-xl relative border border-white">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors text-xl font-black">✕</button>
                            <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter uppercase">Jadwalkan Manual</h2>
                            <form onSubmit={handleAddTask} className="space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Site / Asset</label>
                                    <select required value={newTask.asset_id} onChange={(e) => setNewTask({...newTask, asset_id: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold">
                                        <option value="">-- Pilih --</option>
                                        {assets.map(a => <option key={a.id} value={a.id}>[{a.tid}] {a.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Jadwal PM/CM</label>
                                        <input required type="date" value={newTask.scheduled_date} onChange={(e) => setNewTask({...newTask, scheduled_date: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Visit Date (Optional)</label>
                                        <input type="date" value={newTask.completed_date} onChange={(e) => setNewTask({...newTask, completed_date: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold placeholder:text-slate-300" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Type</label>
                                        <select value={newTask.type} onChange={(e) => setNewTask({...newTask, type: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold"><option value="PM">PM</option><option value="CM">CM</option></select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Assign Teknisi</label>
                                        <select required value={newTask.technician_id} onChange={(e) => setNewTask({...newTask, technician_id: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold">
                                            <option value="">-- Pilih --</option>
                                            {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button disabled={isSaving} type="submit" className="btn-dongker w-full py-5 mt-4 text-xs tracking-[0.3em] uppercase">{isSaving ? 'MEMPROSES...' : 'SIMPAN JADWAL'}</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Import Confirmation Preview Modal */}
            <AnimatePresence>
                {isPreviewModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-white">
                            <div className="p-10 border-b border-slate-50 flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-1">Standard Import Preview</h2>
                                    <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Format: TEKNISI, TID, LOKASI, KANWIL, JADWAL, STATUS, TYPE</p>
                                </div>
                                <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors text-2xl font-black">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-5 bg-blue-50 rounded-[2rem] border border-blue-100 text-blue-900">
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Total Rows</div>
                                        <div className="text-3xl font-black tracking-tighter">{importData.newRecords.length + importData.duplicateRecords.length}</div>
                                    </div>
                                    <div className="p-5 bg-green-50 rounded-[2rem] border border-green-100 text-green-900">
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Close (Done)</div>
                                        <div className="text-3xl font-black tracking-tighter">{importData.closedCount || 0}</div>
                                    </div>
                                    <div className="p-5 bg-amber-50 rounded-[2rem] border border-amber-100 text-amber-900">
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Open (Pending)</div>
                                        <div className="text-3xl font-black tracking-tighter">{importData.openCount || 0}</div>
                                    </div>
                                    <div className="p-5 bg-red-50 rounded-[2rem] border border-red-100 text-red-900">
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Sudah Ada</div>
                                        <div className="text-3xl font-black tracking-tighter">{importData.duplicateRecords.length}</div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Review New Schedules</h4>
                                    <div className="bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden max-h-64 overflow-y-auto shadow-inner">
                                        <table className="w-full text-left text-[11px] uppercase tracking-tight">
                                            <thead className="sticky top-0 bg-white border-b border-slate-100 font-black text-slate-400">
                                                <tr>
                                                    <th className="px-6 py-4">TID</th>
                                                    <th className="px-6 py-4">Site</th>
                                                    <th className="px-6 py-4">Jadwal</th>
                                                    <th className="px-6 py-4">Teknisi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-bold">
                                                {importData.newRecords.map((r, i) => (
                                                    <tr key={i} className="hover:bg-green-50/50 transition-colors">
                                                        <td className="px-6 py-3 text-green-600 font-mono">{r.tid_preview}</td>
                                                        <td className="px-6 py-3 text-slate-600">{r.site_preview}</td>
                                                        <td className="px-6 py-3 text-slate-400">{r.scheduled_date}</td>
                                                        <td className="px-6 py-3 text-slate-500">{r.tech_preview}</td>
                                                    </tr>
                                                ))}
                                                {importData.newRecords.length === 0 && <tr><td colSpan="4" className="py-20 text-center italic text-slate-400">Semua data sudah ada di database.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                                <button onClick={() => setIsPreviewModalOpen(false)} className="flex-1 px-8 py-5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-slate-100 transition-all">Batal</button>
                                <button onClick={confirmImport} disabled={isSaving || importData.newRecords.length === 0} className="flex-[2] btn-dongker py-5 text-xs tracking-[0.3em] transition-all disabled:opacity-50 uppercase">
                                    {isSaving ? 'MEMPROSES...' : `Konfirmasi Import ${importData.newRecords.length} Jadwal`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Status Change Confirmation Modal */}
            <AnimatePresence>
                {confirmingStatus && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 text-left">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white">
                            <div className="p-8 text-center">
                                <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-xl ${confirmingStatus.currentStatus === 'completed' ? 'bg-amber-50 text-amber-500 shadow-amber-100' : 'bg-green-50 text-green-500 shadow-green-100'}`}>
                                    <FiAlertCircle />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">Konfirmasi Status</h3>
                                <p className="text-slate-500 font-bold text-xs leading-relaxed px-4">
                                    APAKAH ANDA YAKIN INGIN MENGUBAH STATUS DATA INI MENJADI <span className={confirmingStatus.currentStatus === 'completed' ? 'text-amber-600 font-black' : 'text-green-600 font-black'}>
                                        {confirmingStatus.currentStatus === 'completed' ? 'OPEN' : 'CLOSE'}
                                    </span>?
                                </p>
                            </div>
                            <div className="flex border-t border-slate-100 h-16">
                                <button onClick={() => setConfirmingStatus(null)} className="flex-1 font-black text-[10px] tracking-widest uppercase text-slate-400 hover:bg-slate-50 transition-all">Batal</button>
                                <button onClick={handleStatusUpdate} disabled={isSaving} className={`flex-[1.5] font-black text-[10px] tracking-[0.2em] uppercase text-white transition-all disabled:opacity-50 ${confirmingStatus.currentStatus === 'completed' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}>
                                    {isSaving ? 'MEMPROSES...' : 'YA, UBAH STATUS'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
