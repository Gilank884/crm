import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { FiCalendar, FiUpload, FiPlus, FiTool, FiCheckCircle, FiClock, FiFileText, FiMapPin, FiUser } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { parseExcelFile } from '../../utils/excelHandler';

export default function MaintenanceTracker() {
    const fileInputRef = useRef(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [pageSize, setPageSize] = useState(() => {
        const saved = localStorage.getItem('pageSize');
        return saved ? (saved === 'all' ? 'all' : parseInt(saved)) : 20;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [assets, setAssets] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [newTask, setNewTask] = useState({ asset_id: '', technician_id: '', type: 'PM', period: '', scheduled_date: '', status: 'pending' });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const { data: assetData } = await supabase.from('managed_assets').select('id, name, tid').order('name', { ascending: true });
        const { data: techData } = await supabase.from('technicians').select('id, name').order('name', { ascending: true });
        setAssets(assetData || []);
        setTechnicians(techData || []);
        fetchTasks(period, pageSize);
    };

    const fetchTasks = async (targetPeriod = period, limit = pageSize) => {
        setLoading(true);
        let query = supabase
            .from('maintenance_tasks')
            .select(`
                *,
                managed_assets ( name, tid, location ),
                technicians ( name )
            `)
            .eq('period', targetPeriod)
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
            
            const formattedData = data.map(item => {
                const tid = item['TID'] || item['tid'];
                const techName = item['Nama Teknisi'] || item['Teknisi'] || item['technician'];
                const type = item['Jenis'] || item['Type'] || item['type'] || 'PM';
                const date = item['Tanggal'] || item['Date'] || item['date'];
                
                const matchedAsset = assets.find(a => a.tid === tid);
                const matchedTech = technicians.find(t => t.name === techName);
                
                return {
                    asset_id: matchedAsset ? matchedAsset.id : null,
                    technician_id: matchedTech ? matchedTech.id : null,
                    type: type.toUpperCase() === 'CM' ? 'CM' : 'PM',
                    scheduled_date: date,
                    period: date ? date.toString().slice(0, 7) : period,
                    status: 'pending'
                };
            }).filter(item => item.asset_id && item.scheduled_date);

            if (formattedData.length === 0) {
                alert('No valid data found. Ensure "TID" and "Tanggal" (YYYY-MM-DD) are valid.');
            } else {
                const { error } = await supabase.from('maintenance_tasks').insert(formattedData);
                if (error) alert(`Error: ${error.message}`);
                else {
                    alert(`Successfully imported ${formattedData.length} Tasks.`);
                    fetchTasks();
                }
            }
        } catch (err) {
            console.error(err);
            alert('Failed to parse Excel file.');
        }
        setLoading(false);
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        // Extract period from scheduled_date if not set
        const taskToSave = { ...newTask };
        if (!taskToSave.period && taskToSave.scheduled_date) {
            taskToSave.period = taskToSave.scheduled_date.slice(0, 7);
        }
        const { error } = await supabase.from('maintenance_tasks').insert([taskToSave]);
        if (error) alert(`Error: ${error.message}`);
        else {
            setNewTask({ asset_id: '', technician_id: '', type: 'PM', period: '', scheduled_date: '', status: 'pending' });
            setIsModalOpen(false);
            fetchTasks();
        }
        setIsSaving(false);
    };

    const handleStatusUpdate = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        const { error } = await supabase
            .from('maintenance_tasks')
            .update({ status: newStatus })
            .eq('id', taskId);
        
        if (error) {
            console.error(error);
            alert('Gagal mengupdate status.');
        } else {
            fetchTasks(period, pageSize);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-7xl mx-auto">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleExcelUpload} 
                accept=".xlsx, .xls" 
                className="hidden" 
            />
            <div className="flex justify-between items-end mb-10 pb-6 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-8 bg-blue-600 rounded-full shadow-sm shadow-blue-500/20" />
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Monthly PM & CM</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Monitoring pelaksanaan maintenance rutin dan insidentil.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        disabled={loading}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs tracking-widest uppercase hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        <FiUpload className="text-lg" /> Import Excel
                    </button>
                    <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="flex items-center px-4 bg-slate-50 border-r border-slate-200 text-slate-400">
                            <FiCalendar />
                        </div>
                        <input 
                            type="month"
                            value={period}
                            onChange={(e) => {
                                setPeriod(e.target.value);
                                fetchTasks(e.target.value, pageSize);
                            }}
                            className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 outline-none transition-all cursor-pointer hover:bg-slate-50 w-40"
                        />
                    </div>
                    <select 
                        value={pageSize}
                        onChange={(e) => {
                            const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                            setPageSize(val);
                            localStorage.setItem('pageSize', val);
                            fetchTasks(period, val);
                        }}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer hover:border-slate-300"
                    >
                        <option value={20}>20 Rows</option>
                        <option value={50}>50 Rows</option>
                        <option value={100}>100 Rows</option>
                        <option value="all">Show All</option>
                    </select>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="btn-dongker shadow-lg shadow-blue-200 flex items-center gap-2"
                    >
                        <FiPlus className="text-lg" /> Jadwalkan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-32 bg-white border border-slate-100 animate-pulse rounded-3xl" />)
                ) : tasks.length === 0 ? (
                    <div className="text-center py-32 text-slate-400 font-medium italic bg-white rounded-3xl border border-slate-100 shadow-sm">
                        Tidak ada jadwal maintenance untuk periode {period}.
                    </div>
                ) : (
                    tasks.map((task) => (
                        <div key={task.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 flex items-center gap-8 hover:border-blue-200 transition-all duration-300 group relative">
                            {/* Checkbox Trigger */}
                            <button 
                                onClick={() => handleStatusUpdate(task.id, task.status)}
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${task.status === 'completed' ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200' : 'bg-white border-slate-200 hover:border-blue-400 text-transparent hover:text-blue-100'}`}
                            >
                                <FiCheckCircle className="text-xl" />
                            </button>

                            <div className={`w-24 h-24 rounded-3xl flex flex-col items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${task.status === 'completed' ? 'bg-slate-100 text-slate-400 grayscale' : task.type === 'PM' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-amber-500 text-white shadow-amber-100'}`}>
                                <div className="text-[10px] font-black tracking-[0.2em] uppercase mb-1 opacity-80">{task.type}</div>
                                <FiTool className="text-2xl mb-1" />
                                <div className="text-[10px] font-black uppercase tracking-tight">{task.status === 'completed' ? 'Done' : 'Active'}</div>
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`font-mono font-black border px-3 py-1 rounded-lg text-xs uppercase ${task.status === 'completed' ? 'text-slate-400 bg-slate-50 border-slate-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>{task.managed_assets?.tid || '---'}</span>
                                    <h3 className={`text-xl font-black transition-colors uppercase tracking-tight ${task.status === 'completed' ? 'text-slate-400' : 'text-slate-900 group-hover:text-blue-700'}`}>{task.managed_assets?.name}</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-tight ${task.status === 'completed' ? 'text-slate-300' : 'text-slate-500'}`}>
                                        <FiMapPin className={task.status === 'completed' ? 'text-slate-300' : 'text-blue-600'} /> {task.managed_assets?.location || 'N/A'}
                                    </div>
                                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-tight ${task.status === 'completed' ? 'text-slate-300' : 'text-slate-500'}`}>
                                        <FiUser className={task.status === 'completed' ? 'text-slate-300' : 'text-blue-600'} /> {task.technicians?.name || 'Unassigned'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-3 px-8 border-l border-slate-100">
                                <button 
                                    onClick={() => handleStatusUpdate(task.id, task.status)}
                                    className={`badge cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${task.status === 'completed' ? 'bg-slate-100 text-slate-400 border-slate-200 shadow-none' : task.status === 'in_progress' ? 'badge-blue' : 'badge-yellow'}`}
                                >
                                    {task.status === 'completed' ? <FiCheckCircle className="mr-1 text-green-500" /> : <FiClock className="mr-1" />}
                                    {task.status}
                                </button>
                                <div className={`text-[10px] font-mono font-black uppercase tracking-widest flex items-center gap-1 ${task.status === 'completed' ? 'text-slate-300' : 'text-slate-400'}`}>
                                    <FiCalendar className={task.status === 'completed' ? 'text-slate-300' : 'text-blue-600'} /> {task.scheduled_date || '---'}
                                </div>
                            </div>
                            
                            <button className="p-4 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-slate-100 shadow-sm opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0">
                                <FiFileText className="text-xl" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Jadwalkan Maintenance */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-xl relative border border-slate-100"
                    >
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors text-xl font-black">✕</button>
                        <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Jadwalkan Maintenance</h2>
                        <form onSubmit={handleAddTask} className="space-y-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Pilih Asset / Site</label>
                                <select required value={newTask.asset_id} onChange={(e) => setNewTask({...newTask, asset_id: e.target.value})} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold cursor-pointer">
                                    <option value="">-- Pilih Asset --</option>
                                    {assets.map(a => <option key={a.id} value={a.id} className="bg-white">[{a.tid}] {a.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Jenis Maintenance</label>
                                    <select required value={newTask.type} onChange={(e) => setNewTask({...newTask, type: e.target.value})} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold cursor-pointer">
                                        <option value="PM">PM (Preventive)</option>
                                        <option value="CM">CM (Corrective)</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Tanggal Pelaksanaan</label>
                                    <input required type="date" value={newTask.scheduled_date} onChange={(e) => setNewTask({...newTask, scheduled_date: e.target.value})} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Ditugaskan Kepada (Teknisi)</label>
                                <select required value={newTask.technician_id} onChange={(e) => setNewTask({...newTask, technician_id: e.target.value})} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold cursor-pointer">
                                    <option value="">-- Pilih Teknisi --</option>
                                    {technicians.map(t => <option key={t.id} value={t.id} className="bg-white">{t.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Catatan / Deskripsi</label>
                                <textarea rows="2" value={newTask.notes} onChange={(e) => setNewTask({...newTask, notes: e.target.value})} placeholder="Instruksi khusus atau catatan PM/CM" className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                            </div>
                            <button disabled={isSaving} type="submit" className="btn-dongker w-full py-4 mt-4 text-sm tracking-[0.2em] shadow-xl shadow-blue-200 active:scale-[0.98] transition-all">
                                {isSaving ? 'MENJADWALKAN...' : 'BUAT JADWAL MAINTENANCE'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
