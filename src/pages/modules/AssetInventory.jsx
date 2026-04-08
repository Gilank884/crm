import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiUpload, FiPlus, FiUser, FiMapPin, FiBox, FiXCircle, FiCheckCircle, FiInfo, FiAlertCircle, FiDatabase, FiSearch, FiList, FiActivity, FiTool } from 'react-icons/fi';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [technicians, setTechnicians] = useState([]);
    const [newAsset, setNewAsset] = useState({ tid: '', name: '', location: '', kanwil_id: '', pic_id: '', kc_supervisi: '', dk_lk: 'DK' });

    // Import Preview State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [importData, setImportData] = useState({ newRecords: [], duplicateRecords: [] });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Parallel fetch for static lookups
            const [kwRes, techRes] = await Promise.all([
                supabase.from('kanwils').select('id, name, code').order('name'),
                supabase.from('technicians').select('id, name').order('name')
            ]);
            
            setKanwils(kwRes.data || []);
            setTechnicians(techRes.data || []);
            
            const urlKanwil = searchParams.get('kanwil');
            const urlPicId = searchParams.get('pic_id');
            
            // Initiate asset fetch immediately
            const initialKanwil = urlKanwil || selectedKanwil;
            await fetchAssets(initialKanwil, pageSize, urlPicId);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssets = async (kanwilId = selectedKanwil, limit = pageSize, picId = null) => {
        setLoading(true);
        let query = supabase.from('managed_assets').select(`
            id, tid, name, location, kanwil_id, pic_id, kc_supervisi, dk_lk, status,
            kanwils ( name, code ),
            technicians!managed_assets_pic_id_fkey ( name )
        `);
        
        if (kanwilId !== 'all') query = query.eq('kanwil_id', kanwilId);
        if (picId) query = query.eq('pic_id', picId);
        
        query = query.order('tid', { ascending: true })
            .limit(limit === 'all' ? 2000 : limit);
        
        const { data, error } = await query;
        if (error) console.error(error);
        else setAssets(data || []);
        setLoading(false);
    };

    const filteredAssets = useMemo(() => {
        const s = searchTerm.toLowerCase();
        if (!s) return assets;
        return assets.filter(a => 
            a.tid?.toString().toLowerCase().includes(s) || 
            a.name?.toLowerCase().includes(s) || 
            a.location?.toLowerCase().includes(s) ||
            a.technicians?.name?.toLowerCase().includes(s) ||
            a.kc_supervisi?.toLowerCase().includes(s)
        );
    }, [assets, searchTerm]);

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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen">
            <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />
            
            {/* ═══ Header ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
                {/* Top Row: Title + Stats + Actions */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-5">
                    {/* Brand */}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <FiDatabase size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-[950] text-slate-900 leading-none tracking-tight">Master Asset Hub</h1>
                            <p className="text-[9px] font-bold text-slate-400 tracking-[0.15em] mt-1 uppercase">Centralized Inventory Control</p>
                        </div>
                    </div>

                    {/* Stats Chips */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 border-l-[3px] border-indigo-400 bg-indigo-50/60 pl-3 pr-4 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-indigo-600/60 uppercase tracking-wider">Total Assets</div>
                                <div className="text-xl font-[950] text-indigo-600 leading-none tabular-nums mt-0.5">{assets.length}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-l-[3px] border-emerald-400 bg-emerald-50/60 pl-3 pr-4 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-emerald-600/60 uppercase tracking-wider">Operational</div>
                                <div className="text-xl font-[950] text-emerald-600 leading-none tabular-nums mt-0.5">{assets.filter(a => a.status === 'operational').length}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-l-[3px] border-slate-300 bg-slate-50 pl-3 pr-4 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Monitoring</div>
                                <div className="text-xl font-[950] text-slate-700 leading-none tabular-nums mt-0.5">{assets.filter(a => a.dk_lk === 'LK').length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                            <FiSearch size={13} className="text-slate-300" />
                            <input type="text" placeholder="Search TID, Site, Technician..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-700 w-48 ml-2 placeholder:text-slate-300" />
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-[9px] tracking-wider uppercase transition-all shadow-sm active:scale-95">
                            <FiPlus size={13} /> Asset
                        </button>
                        <button onClick={() => fileInputRef.current.click()} className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all" title="Import Data">
                            <FiUpload size={14} />
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Filters Bar */}
                <div className="flex flex-wrap items-center gap-5 px-6 py-2.5 bg-slate-50/50 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <FiMapPin size={12} className="text-slate-300" />
                        <select value={selectedKanwil} onChange={(e) => { setSelectedKanwil(e.target.value); navigate('/assets'); fetchAssets(e.target.value, pageSize); }} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-600 outline-none cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all">
                            <option value="all">Seluruh Wilayah</option>
                            {kanwils.map(kw => <option key={kw.id} value={kw.id}>{kw.name}</option>)}
                        </select>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <FiList size={12} className="text-slate-300" />
                        <select value={pageSize} onChange={(e) => { 
                            const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                            setPageSize(val);
                            localStorage.setItem('pageSize', val);
                            fetchAssets(selectedKanwil, val);
                        }} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-600 outline-none cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all">
                            <option value={50}>Limit 50 Rows</option>
                            <option value={100}>Limit 100 Rows</option>
                            <option value={200}>Limit 200 Rows</option>
                            <option value="all">Unlimited View</option>
                        </select>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">Database Live Sync</span>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200" />
                    </div>
                </div>
            </div>

            {/* Assets Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead className="bg-slate-100/50 text-slate-400 border-b border-slate-200">
                            <tr className="text-[9px] font-black tracking-widest uppercase align-middle">
                                <th className="px-3 py-3 border-r border-slate-200 text-center w-12 bg-slate-200/20">#</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-24">TID</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-64">SITE INFORMATION</th>
                                <th className="px-3 py-3 border-r border-slate-200 text-center w-24">SUPERVISI</th>
                                <th className="px-3 py-3 border-r border-slate-200 text-center w-20">LOC</th>
                                <th className="px-3 py-3 border-r border-slate-200 w-28">KANWIL</th>
                                <th className="px-4 py-3 border-r border-slate-200 w-44">PIC TECHNICIAN</th>
                                <th className="px-3 py-3 text-center w-24 font-black">STATUS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                Array(10).fill(0).map((_, i) => <tr key={i} className="h-10 animate-pulse"><td colSpan="8" className="px-3"><div className="h-2 bg-slate-50 rounded w-full opacity-60" /></td></tr>)
                            ) : filteredAssets.length === 0 ? (
                                <tr><td colSpan="8" className="py-32 text-center text-[10px] font-black text-slate-200 uppercase tracking-[0.5em] italic">Zero Assets Found</td></tr>
                            ) : (
                                filteredAssets.map((asset, idx) => (
                                    <tr key={asset.id} className="text-[10px] uppercase font-bold hover:bg-slate-50 transition-colors group">
                                        <td className="px-3 py-2 border-r border-slate-100 text-center bg-slate-100/10 text-slate-300 font-mono text-[9px]">{idx + 1}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 font-mono text-indigo-500 bg-indigo-50/10 text-[9px]">{asset.tid || '---'}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 truncate pr-4">
                                            <div className="text-slate-800 tracking-tight">{asset.name}</div>
                                            <div className="text-[7px] text-slate-300 lowercase italic truncate mt-0.5">{asset.location || 'No physical address found'}</div>
                                        </td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-400 text-[8px] italic">{asset.kc_supervisi || '---'}</td>
                                        <td className="px-3 py-2 border-r border-slate-100 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${asset.dk_lk === 'LK' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>{asset.dk_lk || 'DK'}</span>
                                        </td>
                                        <td className="px-3 py-2 border-r border-slate-100 font-black text-slate-300 tracking-widest text-[8px]">{asset.kanwils?.code || '---'}</td>
                                        <td className="px-4 py-2 border-r border-slate-100 pr-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 text-[8px] font-black">{asset.technicians?.name?.[0] || '?'}</div>
                                                <span className="truncate text-slate-600">{asset.technicians?.name || 'UNASSIGNED'}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center align-middle">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-[8px] font-black shadow-lg shadow-emerald-200">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> ACTIVE
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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

            <AnimatePresence>
                {isPreviewModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-white">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                                        <h2 className="text-2xl font-[950] text-slate-900 tracking-tighter uppercase leading-none">Integrity Analysis</h2>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">Asset Database Synchronization</p>
                                </div>
                                <button onClick={() => setIsPreviewModalOpen(false)} className="w-10 h-10 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all border border-slate-100">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Total Scanned', val: importData.newRecords.length + importData.duplicateRecords.length, c: 'blue' },
                                        { label: 'Authorized New', val: importData.newRecords.length, c: 'emerald' },
                                        { label: 'Already Registered', val: importData.duplicateRecords.length, c: 'rose' }
                                    ].map(s => (
                                        <div key={s.label} className={`p-6 bg-${s.c}-50/30 border border-${s.c}-100 rounded-xl relative overflow-hidden group`}>
                                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{s.label}</div>
                                            <div className={`text-3xl font-[950] text-${s.c}-600 tracking-tighter`}>{s.val}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm font-bold">
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-left text-[11px] uppercase tracking-tight">
                                            <thead className="sticky top-0 bg-white border-b border-slate-100 font-black text-slate-300 z-10">
                                                <tr>
                                                    <th className="px-10 py-6">Asset Descriptor</th>
                                                    <th className="px-10 py-6 text-center">Kanwil Node</th>
                                                    <th className="px-10 py-6 text-right">Identifier (TID)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-bold bg-white/40">
                                                {importData.newRecords.map((r, i) => (
                                                    <tr key={i} className="hover:bg-emerald-50/20 transition-all">
                                                        <td className="px-10 py-4 text-slate-900">{r.name}</td>
                                                        <td className="px-10 py-4 text-center text-slate-400">{r.kanwil_name}</td>
                                                        <td className="px-10 py-4 text-right text-blue-600 font-mono tracking-tighter">{r.tid}</td>
                                                    </tr>
                                                ))}
                                                {importData.newRecords.length === 0 && <tr><td colSpan="3" className="py-20 text-center text-slate-300 font-black tracking-widest italic opacity-50">No Authorized Assets to Batch</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50/80 backdrop-blur-xl border-t border-slate-100 flex gap-4">
                                <button onClick={() => setIsPreviewModalOpen(false)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-400 rounded-xl font-black text-[12px] tracking-[0.2em] uppercase hover:bg-slate-100 transition-all">Abort Sync</button>
                                <button onClick={confirmImport} disabled={isSaving || importData.newRecords.length === 0} className="flex-[2] bg-blue-600 text-white rounded-xl font-black text-[12px] tracking-[0.4em] uppercase shadow-lg shadow-blue-200 transition-all disabled:opacity-50">
                                    Commit {importData.newRecords.length} Assets
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
