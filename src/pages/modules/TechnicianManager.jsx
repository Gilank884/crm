import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiUsers, FiUpload, FiPlus, FiPhone, FiBriefcase, FiTrash2, FiEdit3, FiBox } from 'react-icons/fi';
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
    const [newTech, setNewTech] = useState({ name: '', kanwil_id: '', phone: '', specialty: 'Generalist' });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const { data: kwData } = await supabase.from('kanwils').select('*').order('name', { ascending: true });
        setKanwils(kwData || []);
        
        const urlKanwil = searchParams.get('kanwil');
        if (urlKanwil) {
            setSelectedKanwil(urlKanwil);
            fetchTechnicians(urlKanwil, pageSize);
        } else {
            fetchTechnicians(selectedKanwil, pageSize);
        }
    };

    const fetchTechnicians = async (kanwilId = 'all', limit = pageSize) => {
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
            query = query.limit(1000); // Protection cap
        }
        
        const { data, error } = await query.order('name', { ascending: true });
        if (error) console.error(error);
        else setTechnicians(data || []);
        setLoading(false);
    };

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await parseExcelFile(file);
            
            const formattedData = data.map(item => {
                const kanwilCode = item['Kode Kanwil'] || item['Kanwil'] || item['kanwil_code'];
                const matchedKanwil = kanwils.find(kw => kw.code === kanwilCode || kw.name === kanwilCode);
                
                return {
                    name: item['Nama'] || item['Name'] || item['nama'],
                    kanwil_id: matchedKanwil ? matchedKanwil.id : null,
                    phone: item['Telepon'] || item['Phone'] || item['phone'] || '',
                    specialty: item['Spesialisasi'] || item['Specialty'] || item['specialty'] || 'Generalist',
                    status: 'active'
                };
            }).filter(item => item.name && item.kanwil_id);

            if (formattedData.length === 0) {
                alert('No valid data found. Ensure "Nama" and valid "Kode Kanwil" present.');
            } else {
                const { error } = await supabase.from('technicians').insert(formattedData);
                if (error) alert(`Error: ${error.message}`);
                else {
                    alert(`Successfully imported ${formattedData.length} Technicians.`);
                    fetchTechnicians(selectedKanwil);
                }
            }
        } catch (err) {
            console.error(err);
            alert('Failed to parse Excel file.');
        }
        setLoading(false);
    };

    const handleAddTech = async (e) => {
        e.preventDefault();
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
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Database Teknisi</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Data personil lapangan terintegrasi per wilayah.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        disabled={loading}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs tracking-widest uppercase hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        <FiUpload className="text-lg" /> Import Excel
                    </button>
                    <select 
                        value={selectedKanwil}
                        onChange={(e) => {
                            setSelectedKanwil(e.target.value);
                            fetchTechnicians(e.target.value);
                        }}
                        className="bg-white border border-slate-200 rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer hover:border-slate-300"
                    >
                        <option value="all">Seluruh Wilayah</option>
                        {kanwils.map(kw => <option key={kw.id} value={kw.id}>{kw.name}</option>)}
                    </select>
                    <select 
                        value={pageSize}
                        onChange={(e) => {
                            const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                            setPageSize(val);
                            localStorage.setItem('pageSize', val);
                            fetchTechnicians(selectedKanwil, val);
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
                        <FiPlus className="text-lg" /> Tambah Teknisi
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-500">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] tracking-widest font-black">
                        <tr>
                            <th className="px-8 py-5">Nama Teknisi</th>
                            <th className="px-8 py-5 text-center">Kanwil</th>
                            <th className="px-8 py-5 text-center">Spesialisasi</th>
                            <th className="px-8 py-5 text-center">Total Kelolaan</th>
                            <th className="px-8 py-5 text-center">No. Telepon</th>
                            <th className="px-8 py-5 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700 divide-y divide-slate-50">
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => <tr key={i} className="h-20 animate-pulse"><td colSpan="5" className="px-8"><div className="h-4 bg-slate-100 rounded-full w-full" /></td></tr>)
                        ) : technicians.length === 0 ? (
                            <tr><td colSpan="5" className="py-32 text-center text-slate-400 font-medium italic">Tidak ada teknisi ditemukan.</td></tr>
                        ) : (
                            technicians.map((tech) => (
                                <tr key={tech.id} className="hover:bg-blue-50/30 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-lg border border-blue-100 shadow-sm transition-transform group-hover:scale-110">
                                                <FiUsers />
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{tech.name}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Technician Active</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="font-mono font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg text-[10px] border border-slate-100">{tech.kanwils?.code || '---'}</span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                            <FiBriefcase className="text-blue-600" />
                                            {tech.specialty || 'Generalist'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <button 
                                            onClick={() => navigate(`/assets?pic_id=${tech.id}`)}
                                            className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-tight hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-100 transition-all cursor-pointer mx-auto"
                                            title="Click to view all assets for this technician"
                                        >
                                            <FiBox />
                                            <span className="font-black underline decoration-blue-200 underline-offset-4">{tech.managed_assets?.[0]?.count || 0}</span>
                                        </button>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex items-center justify-center gap-1.5 font-mono text-xs font-bold text-blue-600/70">
                                            <FiPhone />
                                            {tech.phone || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-100 shadow-sm">
                                                <FiEdit3 />
                                            </button>
                                            <button className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-slate-100 shadow-sm">
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Tambah Teknisi */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md relative border border-slate-100"
                    >
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors text-xl font-black">✕</button>
                        <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Tambah Teknisi Baru</h2>
                        <form onSubmit={handleAddTech} className="space-y-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Nama Lengkap</label>
                                <input required type="text" value={newTech.name} onChange={(e) => setNewTech({...newTech, name: e.target.value})} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Pilih Kanwil</label>
                                <select required value={newTech.kanwil_id} onChange={(e) => setNewTech({...newTech, kanwil_id: e.target.value})} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold cursor-pointer">
                                    <option value="">-- Pilih Kanwil --</option>
                                    {kanwils.map(kw => <option key={kw.id} value={kw.id}>{kw.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Spesialisasi</label>
                                <input type="text" value={newTech.specialty} onChange={(e) => setNewTech({...newTech, specialty: e.target.value})} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">No. Telepon</label>
                                <input type="text" value={newTech.phone} onChange={(e) => setNewTech({...newTech, phone: e.target.value})} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                            </div>
                            <button disabled={isSaving} type="submit" className="btn-dongker w-full py-4 mt-4 text-sm tracking-[0.2em] shadow-xl shadow-blue-200 active:scale-[0.98] transition-all">
                                {isSaving ? 'MEMPROSES...' : 'SIMPAN DATA TEKNISI'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
