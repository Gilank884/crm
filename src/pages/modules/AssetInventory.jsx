import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiUpload, FiPlus, FiUser, FiMapPin, FiActivity } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { parseExcelFile } from '../../utils/excelHandler';

export default function AssetInventory() {
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

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const { data: kwData } = await supabase.from('kanwils').select('*').order('name', { ascending: true });
        const { data: techData } = await supabase.from('technicians').select('id, name').order('name', { ascending: true });
        setKanwils(kwData || []);
        setTechnicians(techData || []);
        
        const urlKanwil = searchParams.get('kanwil');
        if (urlKanwil) {
            setSelectedKanwil(urlKanwil);
            fetchAssets(urlKanwil, pageSize);
        } else {
            fetchAssets(selectedKanwil, pageSize);
        }
    };

    const fetchAssets = async (kanwilId = 'all', limit = pageSize) => {
        setLoading(true);
        let query = supabase.from('managed_assets').select(`
            *,
            kanwils(name, code),
            technicians!managed_assets_pic_id_fkey(name)
        `);
        
        if (kanwilId !== 'all') query = query.eq('kanwil_id', kanwilId);
        
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
            console.log('✅ Excel Parsed Data:', data);
            
            // Step 1: Pre-process Technicians (Ensure they exist)
            const techMap = {}; // name -> id
            technicians.forEach(t => techMap[t.name] = t.id);

            const finalAssets = [];
            for (const item of data) {
                const kanwilCode = item['KANWIL'] || item['Kanwil'] || item['kanwil_code'];
                const matchedKanwil = kanwils.find(kw => kw.code === kanwilCode || kw.name === kanwilCode);
                
                if (!matchedKanwil) {
                    console.warn(`⚠️ Kanwil not found for code: ${kanwilCode}`, item);
                    continue; 
                }

                let picId = null;
                const techName = item['Teknisi'] || item['PIC'];
                
                if (techName) {
                    if (techMap[techName]) {
                        picId = techMap[techName];
                    } else {
                        console.log(`👤 Creating new technician: ${techName} in ${matchedKanwil.name}`);
                        // Create NEW Technician
                        const { data: newTech, error: techErr } = await supabase.from('technicians').insert([{
                            name: techName,
                            kanwil_id: matchedKanwil.id,
                            status: item['Status'] || 'active',
                            specialty: 'Generalist'
                        }]).select().single();
                        
                        if (!techErr && newTech) {
                            picId = newTech.id;
                            techMap[techName] = picId;
                        } else {
                            console.error('❌ Tech creation error:', techErr);
                        }
                    }
                }

                finalAssets.push({
                    tid: item['TID']?.toString() || '',
                    name: item['LOKASI'] || 'Unknown Site',
                    location: item['LOKASI'] || '',
                    kanwil_id: matchedKanwil.id,
                    pic_id: picId,
                    kc_supervisi: item['KC SUPERVISI'] || '',
                    dk_lk: item['DK-LK'] || 'DK',
                    status: 'operational'
                });
            }

            console.log('🚀 Final Assets for Upsert:', finalAssets);

            if (finalAssets.length === 0) {
                alert('No valid records found after mapping. Check console for warnings.');
            } else {
                const { error } = await supabase.from('managed_assets').upsert(finalAssets, { onConflict: 'tid' });
                if (error) {
                    console.error('❌ Upsert Error:', error);
                    alert(`Error: ${error.message}`);
                } else {
                    alert(`Import Success: ${finalAssets.length} Assets processed.`);
                    fetchInitialData(); // Refresh both techs and assets
                }
            }
        } catch (err) {
            console.error('🔥 Critical Import Error:', err);
            alert('Failed to parse Excel file.');
        }
        setLoading(false);
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
            <div className="flex justify-between items-end mb-10 pb-6 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-8 bg-blue-600 rounded-full shadow-sm shadow-blue-500/20" />
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Kelolaan Pasti</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Inventori asset dan pemetaan operasional seluruh wilayah.</p>
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
                        <FiPlus className="text-lg" /> Tambah Asset
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-500">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] tracking-widest font-black">
                        <tr>
                            <th className="px-8 py-5">TID</th>
                            <th className="px-8 py-5">Lokasi / Site</th>
                            <th className="px-8 py-5">KC Supervisi</th>
                            <th className="px-8 py-5">DK/LK</th>
                            <th className="px-8 py-5">Kanwil</th>
                            <th className="px-8 py-5">PIC / Pelaksana</th>
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
                                    <td className="px-8 py-6">
                                        <span className="font-mono font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm border border-blue-100">{asset.tid || '---'}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-900 group-hover:text-blue-700 transition-colors">{asset.name}</div>
                                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{asset.location || 'No Address'}</div>
                                    </td>
                                    <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase tracking-tight italic">{asset.kc_supervisi || '---'}</td>
                                    <td className="px-8 py-6">
                                        <span className={`badge ${asset.dk_lk === 'LK' ? 'badge-yellow' : 'badge-green'}`}>
                                            {asset.dk_lk || 'DK'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">{asset.kanwils?.code || '---'}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm border border-slate-200 shadow-sm font-bold text-slate-400">
                                                <FiUser />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600">{asset.technicians?.name || 'Unassigned'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className={`badge ${asset.status === 'operational' ? 'badge-green' : 'badge-green'}`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Tambah Asset */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-xl relative border border-slate-100"
                    >
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors text-xl font-black">✕</button>
                        <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Tambah Asset Baru</h2>
                        <form onSubmit={handleAddAsset} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Terminal ID (TID)</label>
                                    <input required type="text" value={newAsset.tid} onChange={(e) => setNewAsset({...newAsset, tid: e.target.value})} placeholder="e.g., T-1001" className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Nama Site / Asset</label>
                                    <input required type="text" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g., ATM Center JKT" className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Lokasi / Alamat</label>
                                <textarea required rows="2" value={newAsset.location} onChange={(e) => setNewAsset({...newAsset, location: e.target.value})} placeholder="Alamat lengkap lokasi asset" className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">KC Supervisi</label>
                                    <input type="text" value={newAsset.kc_supervisi} onChange={(e) => setNewAsset({...newAsset, kc_supervisi: e.target.value})} placeholder="e.g., KC Jakarta Pusat" className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Klasifikasi (DK/LK)</label>
                                    <select value={newAsset.dk_lk} onChange={(e) => setNewAsset({...newAsset, dk_lk: e.target.value})} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold cursor-pointer">
                                        <option value="DK">DK (Dalam Kota)</option>
                                        <option value="LK">LK (Luar Kota)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Wilayah (Kanwil)</label>
                                    <select required value={newAsset.kanwil_id} onChange={(e) => setNewAsset({...newAsset, kanwil_id: e.target.value})} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold cursor-pointer">
                                        <option value="">-- Pilih Kanwil --</option>
                                        {kanwils.map(kw => <option key={kw.id} value={kw.id}>{kw.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">PIC / Pelaksana</label>
                                    <select required value={newAsset.pic_id} onChange={(e) => setNewAsset({...newAsset, pic_id: e.target.value})} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold cursor-pointer">
                                        <option value="">-- Pilih PIC --</option>
                                        {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button disabled={isSaving} type="submit" className="btn-dongker w-full py-4 mt-4 text-sm tracking-[0.2em] shadow-xl shadow-blue-200 active:scale-[0.98] transition-all">
                                {isSaving ? 'MEMPROSES...' : 'SIMPAN DATA ASSET'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
