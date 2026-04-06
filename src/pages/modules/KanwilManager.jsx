import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiUpload, FiPlus, FiActivity, FiUsers, FiMapPin, FiBriefcase, FiSearch, FiDatabase, FiLayers } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { parseExcelFile } from '../../utils/excelHandler';

export default function KanwilManager() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [kanwils, setKanwils] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newKanwil, setNewKanwil] = useState({ name: '', code: '' });
    const [isSaving, setIsSaving] = useState(false);

    const filteredKanwils = useMemo(() => {
        const s = searchTerm.toLowerCase();
        if (!s) return kanwils;
        return kanwils.filter(kw => 
            kw.name?.toLowerCase().includes(s) || 
            kw.code?.toLowerCase().includes(s)
        );
    }, [kanwils, searchTerm]);

    useEffect(() => {
        fetchKanwils();
    }, []);

    const fetchKanwils = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('kanwils')
            .select('*')
            .order('code', { ascending: true });
        
        if (error) console.error(error);
        else setKanwils(data || []);
        setLoading(false);
    };

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await parseExcelFile(file);
            const formattedData = data.map(item => ({
                name: item['Nama Kanwil'] || item['Nama'] || item['name'],
                code: item['Kode Kanwil'] || item['Kode'] || item['code']
            })).filter(item => item.name && item.code);

            if (formattedData.length === 0) {
                alert('No valid data found. Please ensure columns: "Nama Kanwil", "Kode Kanwil"');
            } else {
                const { error } = await supabase.from('kanwils').insert(formattedData);
                if (error) alert(`Error: ${error.message}`);
                else {
                    alert(`Successfully imported ${formattedData.length} Kanwils.`);
                    fetchKanwils();
                }
            }
        } catch (err) {
            console.error(err);
            alert('Failed to parse Excel file.');
        }
        setLoading(false);
    };

    const handleAddKanwil = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const { error } = await supabase.from('kanwils').insert([newKanwil]);
        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            setNewKanwil({ name: '', code: '' });
            setIsModalOpen(false);
            fetchKanwils();
        }
        setIsSaving(false);
    };

    return (
        <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className="p-6 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen">
            <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />
            
            {/* ═══ Header ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-8 overflow-hidden">
                {/* Top Row: Title + Stats + Actions */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-5">
                    {/* Brand */}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                            <FiMapPin size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-[950] text-slate-900 leading-none tracking-tight">Regional Hub</h1>
                            <p className="text-[9px] font-bold text-slate-400 tracking-[0.15em] mt-1 uppercase">Infrastructure Mapping Control</p>
                        </div>
                    </div>

                    {/* Stats Chips */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 border-l-[3px] border-rose-400 bg-rose-50/60 pl-4 pr-6 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-rose-600/60 uppercase tracking-wider">Total Regions</div>
                                <div className="text-xl font-[950] text-rose-600 leading-none tabular-nums mt-0.5">{kanwils.length}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-l-[3px] border-slate-300 bg-slate-50 pl-4 pr-6 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Operational Nodes</div>
                                <div className="text-xl font-[950] text-slate-700 leading-none tabular-nums mt-0.5">{kanwils.length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-50 transition-all">
                            <FiSearch size={13} className="text-slate-300" />
                            <input type="text" placeholder="Search Wilayah..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-700 w-48 ml-2 placeholder:text-slate-300" />
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-black text-[9px] tracking-wider uppercase transition-all shadow-sm active:scale-95">
                            <FiPlus size={13} /> Region
                        </button>
                        <button onClick={() => fileInputRef.current.click()} className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-200 transition-all" title="Import Kanwil List">
                            <FiUpload size={14} />
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Status Bar */}
                <div className="flex flex-wrap items-center gap-5 px-6 py-2 bg-slate-50/50 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <FiLayers size={11} className="text-slate-300" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Regional Mapping Protocol Active</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2 font-mono text-[8px] font-black text-rose-500/50 italic tracking-widest">
                        ESTABLISHED NODES: {kanwils.length}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                {loading ? (
                    Array(4).fill(0).map((_, i) => <div key={i} className="h-48 bg-white border border-slate-200 animate-pulse rounded-3xl" />)
                ) : filteredKanwils.length === 0 ? (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200">
                         <div className="text-slate-200 mb-4"><FiMapPin size={48} /></div>
                         <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">No Regional Data Found</div>
                    </div>
                ) : (
                    filteredKanwils.map((kw) => (
                        <div key={kw.id} className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-rose-500/5 hover:-translate-y-1 transition-all duration-500">
                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-all duration-700 -rotate-12 translate-x-4 -translate-y-4">
                                <FiMapPin size={120} className="text-rose-900" />
                            </div>
                            
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 text-xl border border-rose-100 shadow-sm transition-transform group-hover:scale-110">
                                    <FiHome />
                                </div>
                                <div className="font-mono text-[9px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 tracking-[0.2em]">
                                    {kw.code}
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-[950] text-slate-800 group-hover:text-rose-600 transition-colors tracking-tighter uppercase leading-tight mb-8 min-h-[3rem]">{kw.name}</h3>
                            
                            <div className="flex gap-3 relative z-10">
                                <button 
                                    onClick={() => navigate(`/assets?kanwil=${kw.id}`)}
                                    className="flex-1 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all flex items-center justify-center gap-2 group/btn shadow-sm"
                                >
                                    <FiDatabase className="transition-transform group-hover/btn:scale-110" /> Asset
                                </button>
                                <button 
                                    onClick={() => navigate(`/technicians?kanwil=${kw.id}`)}
                                    className="flex-1 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all flex items-center justify-center gap-2 group/btn shadow-sm"
                                >
                                    <FiUsers className="transition-transform group-hover/btn:scale-110" /> Person
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Tambah Kanwil */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md relative border border-slate-100"
                    >
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors text-xl font-black"
                        >
                            ✕
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Tambah Kanwil Baru</h2>
                        <form onSubmit={handleAddKanwil} className="space-y-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Nama Kanwil</label>
                                <input 
                                    required
                                    type="text" 
                                    value={newKanwil.name}
                                    onChange={(e) => setNewKanwil({...newKanwil, name: e.target.value})}
                                    placeholder="e.g., Kanwil Jakarta 3"
                                    className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Kode Kanwil (Unique)</label>
                                <input 
                                    required
                                    type="text" 
                                    value={newKanwil.code}
                                    onChange={(e) => setNewKanwil({...newKanwil, code: e.target.value})}
                                    placeholder="e.g., K-JKT-3"
                                    className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                />
                            </div>
                            <button 
                                disabled={isSaving}
                                type="submit" 
                                className="btn-dongker w-full py-4 mt-4 text-sm tracking-[0.2em] shadow-xl shadow-blue-200 active:scale-[0.98] transition-all"
                            >
                                {isSaving ? 'MEMPROSES...' : 'SIMPAN DATA KANWIL'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
