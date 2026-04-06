import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiUsers, FiUpload, FiPlus, FiPhone, FiBriefcase, FiTrash2, FiEdit3, FiBox, FiShield, FiInfo, FiCheckCircle, FiAlertCircle, FiSearch, FiList, FiTrendingUp, FiSettings, FiActivity, FiMapPin } from 'react-icons/fi';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('all');
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

    const fetchTechnicians = async (kanwilId = selectedKanwil, limit = pageSize) => {
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

    const filteredTechnicians = useMemo(() => {
        const s = searchTerm.toLowerCase();
        let result = technicians;
        
        if (selectedSpecialty !== 'all') {
            result = result.filter(t => t.specialty === selectedSpecialty);
        }
        
        if (!s) return result;
        return result.filter(t => 
            t.name?.toLowerCase().includes(s) || 
            t.phone?.toLowerCase().includes(s) || 
            t.specialty?.toLowerCase().includes(s) ||
            t.kanwils?.name?.toLowerCase().includes(s) ||
            t.kanwils?.code?.toLowerCase().includes(s)
        );
    }, [technicians, searchTerm, selectedSpecialty]);

    const specialties = useMemo(() => {
        const set = new Set(technicians.map(t => t.specialty).filter(Boolean));
        return Array.from(set);
    }, [technicians]);

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await parseExcelFile(file);
            
            // Fetch ALL existing technicians to check for duplicates (Name + Kanwil)
            const { data: existingTechs } = await supabase.from('technicians').select('name, kanwil_id');
            const existingKeys = new Set(existingTechs?.map(t => `${t.name?.toUpperCase().trim()}_${t.kanwil_id}`) || []);

            const newRecords = [];
            const duplicateRecords = [];

            for (const item of data) {
                const rawName = item['Nama'] || item['Name'] || item['nama'];
                const name = rawName?.toString().trim();
                const kanwilCode = item['Kode Kanwil'] || item['Kanwil'] || item['kanwil_code']?.toString().trim();
                const matchedKanwil = kanwils.find(kw => kw.code === kanwilCode || kw.name === kanwilCode);
                
                if (!name || !matchedKanwil) continue;

                const techData = {
                    name,
                    kanwil_id: matchedKanwil.id,
                    phone: item['Telepon'] || item['Phone'] || item['phone']?.toString() || '',
                    specialty: item['Spesialisasi'] || item['Specialty'] || item['specialty'] || 'Generalist',
                    status: 'active',
                    kanwil_name: matchedKanwil.name
                };

                const key = `${name.toUpperCase()}_${matchedKanwil.id}`;
                
                // Check against DB and also against records already found in this file
                if (existingKeys.has(key)) {
                    duplicateRecords.push(techData);
                } else {
                    newRecords.push(techData);
                    existingKeys.add(key); // Prevent duplicate within the same file
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
        
        // Anti-Duplicate Check
        const isDuplicate = technicians.some(t => 
            t.name?.toLowerCase().trim() === newTech.name?.toLowerCase().trim() && 
            t.kanwil_id === newTech.kanwil_id
        );

        if (isDuplicate) {
            alert(`Peringatan: Teknisi "${newTech.name}" sudah terdaftar di wilayah ini.`);
            return;
        }

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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen">
            <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />
            
            {/* ═══ Header ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
                {/* Top Row: Title + Stats + Actions */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-5">
                    {/* Brand */}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <FiUsers size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-[950] text-slate-900 leading-none tracking-tight">Personnel Hub</h1>
                            <p className="text-[9px] font-bold text-slate-400 tracking-[0.15em] mt-1 uppercase">Field Force Directory</p>
                        </div>
                    </div>

                    {/* Stats Chips */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 border-l-[3px] border-blue-400 bg-blue-50/60 pl-3 pr-4 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-blue-600/60 uppercase tracking-wider">Total Force</div>
                                <div className="text-xl font-[950] text-blue-600 leading-none tabular-nums mt-0.5">{technicians.length}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-l-[3px] border-emerald-400 bg-emerald-50/60 pl-3 pr-4 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-emerald-600/60 uppercase tracking-wider">Active Status</div>
                                <div className="text-xl font-[950] text-emerald-600 leading-none tabular-nums mt-0.5">{technicians.filter(t => t.status === 'active').length}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-l-[3px] border-indigo-400 bg-indigo-50/60 pl-3 pr-4 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-indigo-600/60 uppercase tracking-wider">Assignments</div>
                                <div className="text-xl font-[950] text-indigo-600 leading-none tabular-nums mt-0.5">
                                    {technicians.reduce((acc, current) => acc + (current.managed_assets?.[0]?.count || 0), 0)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                            <FiSearch size={13} className="text-slate-300" />
                            <input type="text" placeholder="Search Personnel..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-700 w-48 ml-2 placeholder:text-slate-300" />
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[9px] tracking-wider uppercase transition-all shadow-sm active:scale-95">
                            <FiPlus size={13} /> Personnel
                        </button>
                        <button onClick={() => fileInputRef.current.click()} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg border border-slate-200 hover:border-blue-200 transition-all" title="Import Data">
                            <FiUpload size={14} />
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Filters Bar */}
                <div className="flex flex-wrap items-center gap-5 px-6 py-2.5 bg-slate-50/50 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <FiBriefcase size={12} className="text-slate-300" />
                        <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-600 outline-none cursor-pointer hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all">
                            <option value="all">Specialization: All</option>
                            {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <FiMapPin size={12} className="text-slate-300" />
                        <select value={selectedKanwil} onChange={(e) => { setSelectedKanwil(e.target.value); fetchTechnicians(e.target.value); }} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-600 outline-none cursor-pointer hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all">
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
                            fetchTechnicians(selectedKanwil, val);
                        }} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-600 outline-none cursor-pointer hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all">
                            <option value={50}>Limit 50 Rows</option>
                            <option value={100}>Limit 100 Rows</option>
                            <option value="all">Unlimited View</option>
                        </select>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">Live Personnel Tracking</span>
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-200" />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead className="bg-slate-100/50 text-slate-400 border-b border-slate-200">
                            <tr className="text-[9px] font-black tracking-widest uppercase align-middle">
                                <th className="px-3 py-3 border-r border-slate-200 text-center w-12 bg-slate-200/20">#</th>
                                <th className="px-5 py-3 border-r border-slate-200 w-64">PERSONNEL FULL NAME</th>
                                <th className="px-3 py-3 border-r border-slate-200 text-center w-24">WILAYAH</th>
                                <th className="px-3 py-3 border-r border-slate-200 text-center w-36">SPECIALTY</th>
                                <th className="px-3 py-3 border-r border-slate-200 text-center w-28">MANAGED</th>
                                <th className="px-3 py-3 border-r border-slate-200 text-center w-32">PHONE / CONTACT</th>
                                <th className="px-3 py-3 border-r border-slate-200 text-center w-28">STATUS</th>
                                <th className="px-3 py-3 text-center w-24 font-black">ACTION</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i} className="h-10 animate-pulse"><td colSpan="8" className="px-3"><div className="h-2 bg-slate-50 rounded w-full opacity-60" /></td></tr>)
                            ) : filteredTechnicians.length === 0 ? (
                                <tr><td colSpan="8" className="py-24 text-center text-[10px] font-black text-slate-200 uppercase tracking-[0.5em] italic">No Personnel Records</td></tr>
                            ) : (
                                filteredTechnicians.map((tech, idx) => (
                                    <tr key={tech.id} className="text-[10px] uppercase font-bold hover:bg-slate-50 transition-colors group">
                                        <td className="px-3 py-4 border-r border-slate-100 text-center bg-slate-100/10 text-slate-300 font-mono text-[9px]">{idx + 1}</td>
                                        <td className="px-5 py-4 border-r border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 text-sm border border-blue-100 transition-transform group-hover:scale-105 shadow-sm">
                                                    <FiUsers size={14} />
                                                </div>
                                                <div className="text-slate-800 tracking-tight">{tech.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 border-r border-slate-100 text-center">
                                            <span className="font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-[8px] font-black">{tech.kanwils?.code || '---'}</span>
                                        </td>
                                        <td className="px-3 py-4 border-r border-slate-100 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-[9px] font-black text-slate-400 italic">
                                                <FiBriefcase size={10} className="text-blue-500" />
                                                {tech.specialty || 'Generalist'}
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 border-r border-slate-100 text-center">
                                            <button onClick={() => navigate(`/assets?pic_id=${tech.id}`)} className="flex items-center justify-center gap-1.5 mx-auto bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-[8px] font-black shadow-sm group/btn">
                                                <FiBox size={10} /> {tech.managed_assets?.[0]?.count || 0} Assets
                                            </button>
                                        </td>
                                        <td className="px-3 py-4 border-r border-slate-100 text-center text-slate-400 font-mono text-[9px]">
                                            {tech.phone || 'NO CONTACT'}
                                        </td>
                                        <td className="px-3 py-4 border-r border-slate-100 text-center">
                                            <div className={`mx-auto flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border w-fit text-[8px] font-black tracking-widest ${tech.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-300 border-slate-200'}`}>
                                                <FiShield size={10} /> {tech.status}
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex justify-center gap-2">
                                                <button className="p-1.5 bg-slate-50 hover:bg- blue-50 rounded-md transition-all border border-slate-100 text-slate-400 hover:text-blue-600"><FiEdit3 size={12} /></button>
                                                <button className="p-1.5 bg-slate-50 hover:bg-rose-50 rounded-md transition-all border border-slate-100 text-slate-400 hover:text-rose-500"><FiTrash2 size={12} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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

            <AnimatePresence>
                {isPreviewModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-white">
                            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h2 className="text-3xl font-[950] text-slate-900 tracking-tighter uppercase leading-none">Personnel Audit</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 ml-1">Technician Entry Verification</p>
                                </div>
                                <button onClick={() => setIsPreviewModalOpen(false)} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 shadow-sm border border-slate-100">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-12 space-y-12">
                                <div className="grid grid-cols-3 gap-6">
                                    {[
                                        { label: 'Total Scanned', val: importData.newRecords.length + importData.duplicateRecords.length, c: 'blue' },
                                        { label: 'Authorized New', val: importData.newRecords.length, c: 'emerald' },
                                        { label: 'Already Registered', val: importData.duplicateRecords.length, c: 'rose' }
                                    ].map(s => (
                                        <div key={s.label} className={`p-8 bg-${s.c}-50/30 border border-${s.c}-100 rounded-[2.5rem] relative overflow-hidden group`}>
                                            <div className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-1">{s.label}</div>
                                            <div className={`text-4xl font-[950] text-${s.c}-600 tracking-tighter`}>{s.val}</div>
                                            <div className={`absolute -right-4 -bottom-4 w-16 h-16 bg-${s.c}-400/5 rounded-full`} />
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-[3rem] overflow-hidden shadow-inner font-bold">
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-left text-[11px] uppercase tracking-tight">
                                            <thead className="sticky top-0 bg-white border-b border-slate-100 font-black text-slate-300 z-10">
                                                <tr>
                                                    <th className="px-10 py-6">Technician Name</th>
                                                    <th className="px-10 py-6 text-center">Kanwil Node</th>
                                                    <th className="px-10 py-6 text-right">Primary Specialty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-bold bg-white/40">
                                                {importData.newRecords.map((r, i) => (
                                                    <tr key={i} className="hover:bg-emerald-50/20">
                                                        <td className="px-10 py-4 text-slate-900">{r.name}</td>
                                                        <td className="px-10 py-4 text-center text-slate-400">{r.kanwil_name}</td>
                                                        <td className="px-10 py-4 text-right text-blue-600 italic">{r.specialty}</td>
                                                    </tr>
                                                ))}
                                                {importData.newRecords.length === 0 && <tr><td colSpan="3" className="py-20 text-center text-slate-300 font-black tracking-widest italic opacity-50">No Authorized Personnel to Batch</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="p-12 bg-slate-50/80 backdrop-blur-xl border-t border-slate-100 flex gap-8">
                                <button onClick={() => setIsPreviewModalOpen(false)} className="flex-1 py-7 bg-white border border-slate-200 text-slate-400 rounded-3xl font-black text-[12px] tracking-[0.2em] uppercase hover:bg-slate-100 transition-all">Abort Sync</button>
                                <button onClick={confirmImport} disabled={isSaving || importData.newRecords.length === 0} className="flex-[2] bg-blue-600 text-white rounded-[3rem] font-black text-[12px] tracking-[0.4em] uppercase shadow-2xl shadow-blue-200 transition-all disabled:opacity-50">
                                    Commit {importData.newRecords.length} Personnel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
