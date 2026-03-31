import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiUpload, FiPlus, FiActivity, FiUsers, FiMapPin, FiBriefcase } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { parseExcelFile } from '../../utils/excelHandler';

export default function KanwilManager() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [kanwils, setKanwils] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newKanwil, setNewKanwil] = useState({ name: '', code: '' });
    const [isSaving, setIsSaving] = useState(false);

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
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Monitor Kanwil</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Daftar Kantor Wilayah dan mapping operasional.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        disabled={loading}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs tracking-widest uppercase hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        <FiUpload className="text-lg" /> Import Excel
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="btn-dongker shadow-lg shadow-blue-200 flex items-center gap-2"
                    >
                        <FiPlus className="text-lg" /> Tambah Kanwil
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-100 animate-pulse rounded-3xl" />)
                ) : kanwils.length === 0 ? (
                    <div className="col-span-full text-center py-32 text-slate-400 font-medium italic bg-white rounded-3xl border border-slate-100 shadow-sm">
                        Belum ada data Kanwil ditemukan.
                    </div>
                ) : (
                    kanwils.map((kw) => (
                        <div key={kw.id} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:border-blue-200 transition-all duration-300">
                            <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                                <FiMapPin className="text-blue-200 text-4xl translate-x-3 translate-y-3" />
                            </div>
                            
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-200">
                                    <FiHome />
                                </div>
                                <div className="font-mono text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 tracking-widest">
                                    {kw.code}
                                </div>
                            </div>
                            
                            <h3 className="text-2xl font-black text-slate-900 mb-8 group-hover:text-blue-700 transition-colors tracking-tight uppercase">{kw.name}</h3>
                            
                            <div className="flex gap-4 relative z-10">
                                <button 
                                    onClick={() => navigate(`/assets?kanwil=${kw.id}`)}
                                    className="flex-1 py-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <FiActivity className="text-lg" /> Kelolaan
                                </button>
                                <button 
                                    onClick={() => navigate(`/technicians?kanwil=${kw.id}`)}
                                    className="flex-1 py-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <FiUsers className="text-lg" /> Teknisi
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
