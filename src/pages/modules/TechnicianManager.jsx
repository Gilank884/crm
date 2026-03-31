import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiUsers, FiUpload, FiPlus, FiPhone, FiBriefcase, FiTrash2, FiEdit3, FiBox, FiShield, FiInfo, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
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

    // Import Preview State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [importData, setImportData] = useState({ newRecords: [], duplicateRecords: [] });

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
            query = query.limit(1000);
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
            
            // Fetch ALL existing technicians to check for duplicates (Name + Kanwil)
            const { data: existingTechs } = await supabase.from('technicians').select('name, kanwil_id');
            const existingKeys = new Set(existingTechs?.map(t => `${t.name?.toUpperCase()}_${t.kanwil_id}`) || []);

            const newRecords = [];
            const duplicateRecords = [];

            for (const item of data) {
                const name = item['Nama'] || item['Name'] || item['nama'];
                const kanwilCode = item['Kode Kanwil'] || item['Kanwil'] || item['kanwil_code'];
                const matchedKanwil = kanwils.find(kw => kw.code === kanwilCode || kw.name === kanwilCode);
                
                if (!name || !matchedKanwil) continue;

                const techData = {
                    name,
                    kanwil_id: matchedKanwil.id,
                    phone: item['Telepon'] || item['Phone'] || item['phone'] || '',
                    specialty: item['Spesialisasi'] || item['Specialty'] || item['specialty'] || 'Generalist',
                    status: 'active',
                    // Supplemental for preview UI
                    kanwil_name: matchedKanwil.name
                };

                const key = `${name.toUpperCase()}_${matchedKanwil.id}`;
                if (existingKeys.has(key)) {
                    duplicateRecords.push(techData);
                } else {
                    newRecords.push(techData);
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
        // Remove preview-only fields
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
            <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />
            
            <div className="flex justify-between items-end mb-10 pb-6 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-8 bg-blue-600 rounded-full shadow-sm shadow-blue-500/20" />
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">Database Teknisi</h1>
                    </div>
                    <p className="text-slate-500 font-bold text-xs tracking-widest pl-4 uppercase">Field Personnel Directory</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        disabled={loading}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs tracking-widest uppercase hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 h-[46px]"
                    >
                        <FiUpload className="text-lg" /> Import Data
                    </button>
                    <select 
                        value={selectedKanwil}
                        onChange={(e) => {
                            setSelectedKanwil(e.target.value);
                            fetchTechnicians(e.target.value);
                        }}
                        className="bg-white border border-slate-200 rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none h-[46px] cursor-pointer"
                    >
                        <option value="all">Seluruh Wilayah</option>
                        {kanwils.map(kw => <option key={kw.id} value={kw.id}>{kw.name}</option>)}
                    </select>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="btn-dongker shadow-lg shadow-blue-200 flex items-center gap-2 h-[46px]"
                    >
                        <FiPlus className="text-lg" /> Tambah Teknisi
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] tracking-widest font-black">
                        <tr>
                            <th className="px-8 py-5">Nama Teknisi</th>
                            <th className="px-8 py-5 text-center">Kanwil</th>
                            <th className="px-8 py-5 text-center">Spesialisasi</th>
                            <th className="px-8 py-5 text-center">Total Kelolaan</th>
                            <th className="px-8 py-5 text-center">Status</th>
                            <th className="px-8 py-5 text-center">No. Telepon</th>
                            <th className="px-8 py-5 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => <tr key={i} className="h-20 animate-pulse"><td colSpan="7" className="px-8"><div className="h-4 bg-slate-50 rounded-full w-full" /></td></tr>)
                        ) : technicians.length === 0 ? (
                            <tr><td colSpan="7" className="py-24 text-center text-slate-400 font-medium italic">Tidak ada data teknisi.</td></tr>
                        ) : (
                            technicians.map((tech) => (
                                <tr key={tech.id} className="hover:bg-blue-50/20 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-lg border border-blue-100 shadow-sm transition-transform group-hover:scale-110">
                                                <FiUsers />
                                            </div>
                                            <div className="font-black text-slate-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{tech.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="font-mono font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg text-[10px] border border-slate-100">{tech.kanwils?.code || '---'}</span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-tight italic">
                                            <FiBriefcase className="text-blue-600" />
                                            {tech.specialty || 'Generalist'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <button onClick={() => navigate(`/assets?pic_id=${tech.id}`)} className="flex items-center justify-center gap-1.5 text-[11px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all mx-auto">
                                            <FiBox />
                                            {tech.managed_assets?.[0]?.count || 0}
                                        </button>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className={`mx-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border w-fit text-[10px] font-black uppercase tracking-widest ${tech.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                                            <FiShield fontSize={12} />
                                            {tech.status}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center text-xs font-bold text-slate-500 font-mono italic">
                                        {tech.phone || 'N/A'}
                                    </td>
                                    <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex justify-end gap-2 text-slate-400">
                                            <button className="p-2.5 bg-slate-50 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-slate-100 shadow-sm"><FiEdit3 /></button>
                                            <button className="p-2.5 bg-slate-50 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-100 shadow-sm"><FiTrash2 /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal: Tambah Teknisi */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white p-10 rounded-[3rem] w-full max-w-md relative border border-white">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors text-xl font-black">✕</button>
                            <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter uppercase">Technician Profile</h2>
                            <form onSubmit={handleAddTech} className="space-y-5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Full Name</label>
                                    <input required type="text" value={newTech.name} onChange={(e) => setNewTech({...newTech, name: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Kanwil</label>
                                    <select required value={newTech.kanwil_id} onChange={(e) => setNewTech({...newTech, kanwil_id: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold">
                                        <option value="">-- Pilih --</option>
                                        {kanwils.map(kw => <option key={kw.id} value={kw.id}>{kw.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Specialty</label>
                                        <input type="text" value={newTech.specialty} onChange={(e) => setNewTech({...newTech, specialty: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">Phone</label>
                                        <input type="text" value={newTech.phone} onChange={(e) => setNewTech({...newTech, phone: e.target.value})} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                                    </div>
                                </div>
                                <button disabled={isSaving} type="submit" className="btn-dongker w-full py-5 mt-4 text-xs tracking-[0.3em] uppercase">{isSaving ? 'MEMPROSES...' : 'SAVE TECHNICIAN'}</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Import Confirmation Preview */}
            <AnimatePresence>
                {isPreviewModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-white">
                            <div className="p-10 border-b border-slate-50 flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-1">Confirm Technician Import</h2>
                                    <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Deduplication: Name + Kanwil ID Check</p>
                                </div>
                                <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors text-2xl font-black">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-8">
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 text-blue-900">
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Total Excel</div>
                                        <div className="text-4xl font-black">{importData.newRecords.length + importData.duplicateRecords.length}</div>
                                    </div>
                                    <div className="p-6 bg-green-50 rounded-3xl border border-green-100 text-green-900">
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Siap Import</div>
                                        <div className="text-4xl font-black">{importData.newRecords.length}</div>
                                    </div>
                                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 text-amber-900">
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Sudah Ada</div>
                                        <div className="text-4xl font-black">{importData.duplicateRecords.length}</div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Review New Records</h4>
                                    <div className="bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden max-h-64 overflow-y-auto">
                                        <table className="w-full text-left text-[11px] uppercase tracking-tight">
                                            <thead className="sticky top-0 bg-white border-b border-slate-100 font-black text-slate-400">
                                                <tr>
                                                    <th className="px-6 py-4">Nama Teknisi</th>
                                                    <th className="px-6 py-4">Kanwil</th>
                                                    <th className="px-6 py-4">Specialty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-bold">
                                                {importData.newRecords.map((r, i) => (
                                                    <tr key={i} className="hover:bg-green-50/30 transition-colors">
                                                        <td className="px-6 py-3 text-slate-900">{r.name}</td>
                                                        <td className="px-6 py-3 text-slate-400">{r.kanwil_name}</td>
                                                        <td className="px-6 py-3 text-blue-600">{r.specialty}</td>
                                                    </tr>
                                                ))}
                                                {importData.newRecords.length === 0 && <tr><td colSpan="3" className="py-16 text-center text-slate-300 italic font-medium">Semua data teknisi sudah terdaftar.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                                <button onClick={() => setIsPreviewModalOpen(false)} className="flex-1 px-8 py-5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-slate-100 transition-all">Batal</button>
                                <button onClick={confirmImport} disabled={isSaving || importData.newRecords.length === 0} className="flex-[2] btn-dongker py-5 text-xs tracking-[0.3em] transition-all disabled:opacity-50 uppercase">
                                    {isSaving ? 'MEMPROSES...' : `Konfirmasi Import ${importData.newRecords.length} Teknisi`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
