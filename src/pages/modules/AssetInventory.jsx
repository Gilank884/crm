import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiUpload, FiPlus, FiUser, FiMapPin, FiBox, FiXCircle, FiCheckCircle, FiInfo, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { parseExcelFile } from '../../utils/excelHandler';

export default function AssetInventory() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fileInputRef = useRef(null);
    const [assets, setAssets] = useState([]);
    const [kanwils, setKanwils] = useState([]);
    const [selectedKanwil, setSelectedKanwil] = useState('all');
    const [loading, setLoading] = useState(true);
    const [pageSize, setPageSize] = useState(() => {
        const saved = localStorage.getItem('pageSize');
        return saved ? (saved === 'all' ? 'all' : parseInt(saved)) : 20;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [technicians, setTechnicians] = useState([]);
    const [newAsset, setNewAsset] = useState({ tid: '', name: '', location: '', kanwil_id: '', pic_id: '', kc_supervisi: '', dk_lk: 'DK' });

    // Import Preview State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [importData, setImportData] = useState({ newRecords: [], duplicateRecords: [] });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const { data: kwData } = await supabase.from('kanwils').select('*').order('name', { ascending: true });
        const { data: techData } = await supabase.from('technicians').select('id, name').order('name', { ascending: true });
        setKanwils(kwData || []);
        setTechnicians(techData || []);
        
        const urlKanwil = searchParams.get('kanwil');
        const urlPicId = searchParams.get('pic_id');
        
        if (urlPicId) {
            fetchAssets('all', pageSize, urlPicId);
        } else if (urlKanwil) {
            setSelectedKanwil(urlKanwil);
            fetchAssets(urlKanwil, pageSize);
        } else {
            fetchAssets(selectedKanwil, pageSize);
        }
    };

    const fetchAssets = async (kanwilId = 'all', limit = pageSize, picId = null) => {
        setLoading(true);
        let query = supabase.from('managed_assets').select(`
            *,
            kanwils(name, code),
            technicians!managed_assets_pic_id_fkey(name)
        `);
        
        if (kanwilId !== 'all') query = query.eq('kanwil_id', kanwilId);
        if (picId) query = query.eq('pic_id', picId);
        
        if (limit !== 'all') {
            query = query.limit(limit);
        } else {
            query = query.limit(1000); // Protection cap
        }
        
        const { data, error } = await query.order('tid', { ascending: true });
        if (error) console.error(error);
        else setAssets(data || []);
        setLoading(false);
    };

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await parseExcelFile(file);
            
            // Fetch ALL existing TIDs for duplicate checking
            const { data: existingAssets } = await supabase.from('managed_assets').select('tid');
            const existingTIDs = new Set(existingAssets?.map(a => a.tid?.toString()) || []);

            const techMap = {}; // name -> id
            technicians.forEach(t => techMap[t.name] = t.id);

            const newRecords = [];
            const duplicateRecords = [];

            for (const item of data) {
                const tid = item['TID']?.toString() || '';
                const kanwilCode = item['KANWIL'] || item['Kanwil'] || item['kanwil_code'];
                const matchedKanwil = kanwils.find(kw => kw.code === kanwilCode || kw.name === kanwilCode);
                
                if (!matchedKanwil || !tid) continue;

                let picId = null;
                const techName = item['Teknisi'] || item['PIC'];
                if (techName && techMap[techName]) picId = techMap[techName];

                const assetData = {
                    tid,
                    name: item['LOKASI'] || item['NAMA SITE'] || 'Unknown Site',
                    location: item['ALAMAT'] || item['LOKASI'] || '',
                    kanwil_id: matchedKanwil.id,
                    pic_id: picId,
                    kc_supervisi: item['KC SUPERVISI'] || '',
                    dk_lk: item['DK-LK'] || 'DK',
                    status: 'operational',
                    // Supplemental data for preview
                    kanwil_name: matchedKanwil.name,
                    tech_name: techName || 'Unassigned'
                };

                if (existingTIDs.has(tid)) {
                    duplicateRecords.push(assetData);
                } else {
                    newRecords.push(assetData);
                }
            }

            setImportData({ newRecords, duplicateRecords });
            setIsPreviewModalOpen(true);
            
        } catch (err) {
            console.error(err);
            alert('Gagal memproses file Excel.');
        }
        setLoading(false);
        // Clear file input
        e.target.value = '';
    };

    const confirmImport = async () => {
        if (importData.newRecords.length === 0) {
            setIsPreviewModalOpen(false);
            return;
        }

        setIsSaving(true);
        // Remove preview-only fields
        const uploadData = importData.newRecords.map(({ kanwil_name, tech_name, ...rest }) => rest);
        
        const { error } = await supabase.from('managed_assets').insert(uploadData);
        
        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            alert(`Berhasil! ${importData.newRecords.length} Asset baru telah ditambahkan.`);
            setIsPreviewModalOpen(false);
            fetchInitialData();
        }
        setIsSaving(false);
    };

    const handleAddAsset = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const { error } = await supabase.from('managed_assets').insert([newAsset]);
        if (error) alert(`Error: ${error.message}`);
        else {
            setNewAsset({ tid: '', name: '', location: '', kanwil_id: '', pic_id: '', kc_supervisi: '', dk_lk: 'DK' });
            setIsModalOpen(false);
            fetchInitialData();
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
            
            {/* Header Section */}
            <div className="flex justify-between items-end mb-10 pb-6 border-b border-slate-200 uppercase">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-8 bg-blue-600 rounded-full shadow-sm shadow-blue-500/20" />
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Master Data</h1>
                    </div>
                    <p className="text-slate-500 font-bold text-xs tracking-widest pl-4">Asset Inventory Management System</p>
                    <div className="flex items-center gap-2 mt-4 ml-4">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest min-w-[100px]">Total Asset</span>
                        <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100 font-black text-sm">{assets.length}</div>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        disabled={loading}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs tracking-widest uppercase hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        <FiUpload className="text-lg" /> Import Data
                    </button>
                    <select 
                        value={selectedKanwil}
                        onChange={(e) => {
                            setSelectedKanwil(e.target.value);
                            navigate('/assets');
                            fetchAssets(e.target.value);
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
                            fetchAssets(selectedKanwil, val);
                        }}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm outline-none cursor-pointer hover:border-slate-300 transition-all"
                    >
                        <option value={20}>20 Rows</option>
                        <option value={50}>50 Rows</option>
                        <option value={100}>100 Rows</option>
                        <option value="all">Show All</option>
                    </select>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="btn-dongker shadow-lg shadow-blue-200 flex items-center gap-2 h-[46px]"
                    >
                        <FiPlus className="text-lg" /> Tambah Asset
                    </button>
                </div>
            </div>

            {/* Assets Table */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-500">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] tracking-widest font-black">
                        <tr>
                            <th className="px-8 py-5">TID</th>
                            <th className="px-8 py-5">Lokasi / Site Name</th>
                            <th className="px-8 py-5">KC Supervisi</th>
                            <th className="px-8 py-5">Status Ops</th>
                            <th className="px-8 py-5">Kanwil</th>
                            <th className="px-8 py-5">PIC Teknisi</th>
                            <th className="px-8 py-5 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700 divide-y divide-slate-50">
                        {loading ? (
                            [1, 2, 3, 4, 5, 6].map(i => <tr key={i} className="h-20 animate-pulse"><td colSpan="7" className="px-8"><div className="h-4 bg-slate-100 rounded-full w-full" /></td></tr>)
                        ) : assets.length === 0 ? (
                            <tr><td colSpan="7" className="py-32 text-center text-slate-400 font-medium italic">Belum ada data asset.</td></tr>
                        ) : (
                            assets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-blue-50/30 transition-all group">
                                    <td className="px-8 py-6 uppercase tracking-tight">
                                        <span className="font-mono font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm border border-blue-100">{asset.tid || '---'}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{asset.name}</div>
                                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{asset.location || 'No Address'}</div>
                                    </td>
                                    <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase tracking-tight italic">{asset.kc_supervisi || '---'}</td>
                                    <td className="px-8 py-6">
                                        <span className={`badge ${asset.dk_lk === 'LK' ? 'badge-yellow' : 'badge-green'}`}>
                                            {asset.dk_lk || 'DK'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-[10px] font-black uppercase text-slate-300 tracking-widest">{asset.kanwils?.code || '---'}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-sm border border-slate-100 shadow-sm font-bold text-slate-300">
                                                <FiUser />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{asset.technicians?.name || 'Unassigned'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className="badge badge-green">Operational</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal: Tambah Asset Manual */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-xl relative border border-white"
                        >
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors text-xl font-black">✕</button>
                            <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter uppercase">Tambah Asset Baru</h2>
                            <form onSubmit={handleAddAsset} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">Terminal ID (TID)</label>
                                        <input required type="text" value={newAsset.tid} onChange={(e) => setNewAsset({...newAsset, tid: e.target.value})} placeholder="e.g., T-1001" className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold shadow-inner" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">Nama Site / Asset</label>
                                        <input required type="text" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g., ATM Center JKT" className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold shadow-inner" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">Alamat Lengkap</label>
                                    <textarea required rows="2" value={newAsset.location} onChange={(e) => setNewAsset({...newAsset, location: e.target.value})} placeholder="Alamat lengkap lokasi asset" className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold shadow-inner" />
                                </div>
                                <button disabled={isSaving} type="submit" className="btn-dongker w-full py-5 mt-6 text-xs tracking-[0.3em] shadow-xl shadow-blue-200 active:scale-[0.98] transition-all uppercase">
                                    {isSaving ? 'MEMPROSES...' : 'KIRIM DATA ASSET'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Import Confirmation Preview */}
            <AnimatePresence>
                {isPreviewModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100"
                        >
                            <div className="p-10 border-b border-slate-50 flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-1">Import Confirmation</h2>
                                    <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Review data sebelum diproses ke sistem</p>
                                </div>
                                <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors text-2xl font-black">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-8">
                                {/* Summary Stats */}
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                                        <div className="flex items-center gap-3 text-blue-600 mb-2">
                                            <FiInfo fontSize={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Total Excel</span>
                                        </div>
                                        <div className="text-4xl font-black text-blue-900">{importData.newRecords.length + importData.duplicateRecords.length}</div>
                                    </div>
                                    <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
                                        <div className="flex items-center gap-3 text-green-600 mb-2">
                                            <FiCheckCircle fontSize={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Siap Import</span>
                                        </div>
                                        <div className="text-4xl font-black text-green-900">{importData.newRecords.length}</div>
                                    </div>
                                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 text-amber-900">
                                        <div className="flex items-center gap-3 text-amber-600 mb-2">
                                            <FiAlertCircle fontSize={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Duplikat (Skip)</span>
                                        </div>
                                        <div className="text-4xl font-black text-amber-900">{importData.duplicateRecords.length}</div>
                                    </div>
                                </div>

                                {/* Preview Data Logic */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-4">Preview New Data</h4>
                                    <div className="bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden max-h-64 overflow-y-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="sticky top-0 bg-white border-b border-slate-100 font-black uppercase text-slate-400">
                                                <tr>
                                                    <th className="px-6 py-4">TID</th>
                                                    <th className="px-6 py-4">Site Name</th>
                                                    <th className="px-6 py-4">Kanwil</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {importData.newRecords.length > 0 ? (
                                                    importData.newRecords.map((r, i) => (
                                                        <tr key={i} className="hover:bg-green-50/50 transition-colors">
                                                            <td className="px-6 py-3 font-mono font-bold text-green-600 uppercase tracking-tight">{r.tid}</td>
                                                            <td className="px-6 py-3 font-bold text-slate-700 uppercase tracking-tight">{r.name}</td>
                                                            <td className="px-6 py-3 text-slate-400 font-bold uppercase tracking-tight">{r.kanwil_name}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan="3" className="px-6 py-10 text-center text-slate-400 italic">Tidak ada data baru untuk diimport.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                {importData.duplicateRecords.length > 0 && (
                                    <div className="p-6 bg-amber-50/50 rounded-[2rem] border border-dashed border-amber-200">
                                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.1em] text-center italic">
                                            Catatan: {importData.duplicateRecords.length} TID sudah terdaftar di database dan akan diabaikan secara otomatis.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                                <button 
                                    onClick={() => setIsPreviewModalOpen(false)}
                                    className="flex-1 px-8 py-5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-slate-100 transition-all active:scale-95"
                                >
                                    Batalkan Import
                                </button>
                                <button 
                                    onClick={confirmImport}
                                    disabled={isSaving || importData.newRecords.length === 0}
                                    className="flex-[2] btn-dongker shadow-xl shadow-blue-200 py-5 text-xs tracking-[0.3em] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'MEMPROSES...' : `KONFIRMASI IMPORT ${importData.newRecords.length} DATA`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
