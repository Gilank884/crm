import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';
import { FiCalendar, FiUpload, FiPlus, FiTool, FiCheckCircle, FiClock, FiFileText, FiMapPin, FiUser, FiInfo, FiActivity, FiAlertCircle, FiDownload, FiSearch, FiFilter, FiChevronRight, FiDatabase, FiBarChart2, FiList } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { supabase } from '../../supabaseClient';
import { parseExcelFile, exportToExcel } from '../../utils/excelHandler';

const getIsoDate = (raw) => {
    try {
        if (!raw) return null;

        // If it's already a Date object (from Excel parser)
        if (raw instanceof Date) {
            if (isNaN(raw.getTime())) return null;
            return raw.toISOString().slice(0, 10);
        }

        const str = raw.toString().trim();

        // Handle DD/MM/YYYY format (e.g. 10/03/2026 = 10 March 2026)
        const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (slashMatch) {
            const day = parseInt(slashMatch[1], 10);
            const month = parseInt(slashMatch[2], 10);
            const year = parseInt(slashMatch[3], 10);
            // Validate ranges
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const d = new Date(year, month - 1, day);
                return d.toISOString().slice(0, 10);
            }
        }

        // Handle DD-MM-YYYY format
        const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (dashMatch) {
            const day = parseInt(dashMatch[1], 10);
            const month = parseInt(dashMatch[2], 10);
            const year = parseInt(dashMatch[3], 10);
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const d = new Date(year, month - 1, day);
                return d.toISOString().slice(0, 10);
            }
        }

        // Handle YYYY-MM-DD (ISO format) 
        const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            const d = new Date(str);
            if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        }

        // Handle Excel serial number (numeric value)
        const num = Number(str);
        if (!isNaN(num) && num > 40000 && num < 60000) {
            // Excel serial date: days since 1900-01-01 (with the 1900 bug)
            const excelEpoch = new Date(1899, 11, 30);
            const d = new Date(excelEpoch.getTime() + num * 86400000);
            return d.toISOString().slice(0, 10);
        }

        // Fallback: try native parsing
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

        return null;
    } catch (e) { return null; }
};

export default function MaintenanceTracker({ typeFilter }) {
    const fileInputRef = useRef(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Month Range State (YYYY-MM format)
    const [startMonth, setStartMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [endMonth, setEndMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Convert YYYY-MM to first/last day of month
    const getFirstDay = (ym) => `${ym}-01`;
    const getLastDay = (ym) => {
        const [y, m] = ym.split('-').map(Number);
        return new Date(y, m, 0).toISOString().slice(0, 10);
    };

    const [filterKanwil, setFilterKanwil] = useState('all');
    const [filterTechnician, setFilterTechnician] = useState('all');
    const [kanwils, setKanwils] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [assets, setAssets] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [rowLimit, setRowLimit] = useState(100);
    const [newTask, setNewTask] = useState({ 
        asset_id: '', 
        technician_id: '', 
        type: typeFilter || 'PM', 
        period: '', 
        scheduled_date: '', 
        completed_date: '', 
        notes: '', 
        status: 'pending' 
    });

    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [importData, setImportData] = useState({ newRecords: [], updateRecords: [], skipCount: 0, openCount: 0, closedCount: 0 });

    const getPerformanceStatus = (task) => {
        if (!task.scheduled_date) return 'PENDING';

        const scheduled = new Date(task.scheduled_date);
        const completed = task.completed_date ? new Date(task.completed_date) : null;
        const now = new Date();

        const taskMonthYear = scheduled.getFullYear() * 12 + scheduled.getMonth();
        const currentMonthYear = now.getFullYear() * 12 + now.getMonth();
        const isPastMonth = taskMonthYear < currentMonthYear;

        if (!completed) {
            return isPastMonth ? 'MISS' : 'PENDING';
        }

        const diffInDays = Math.floor(Math.abs(completed - scheduled) / (1000 * 60 * 60 * 24));
        const completedMonthYear = completed.getFullYear() * 12 + completed.getMonth();
        if (completedMonthYear > taskMonthYear) return 'MISS';

        return diffInDays <= 7 ? 'MEET' : 'MISS';
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        // Parallel fetch — all 3 lookups happen at once
        const [assetRes, techRes, kwRes] = await Promise.all([
            supabase.from('managed_assets').select('id, name, tid').order('name'),
            supabase.from('technicians').select('id, name, kanwil_id').order('name'),
            supabase.from('kanwils').select('id, name').order('name')
        ]);

        setAssets(assetRes.data || []);
        setTechnicians(techRes.data || []);
        setKanwils(kwRes.data || []);
        fetchTasks(startMonth, endMonth, filterKanwil, filterTechnician, rowLimit);
    };

    const fetchTasks = async (startM = startMonth, endM = endMonth, kanwilId = filterKanwil, techId = filterTechnician, limitVal = rowLimit) => {
        setLoading(true);
        const start = getFirstDay(startM);
        const end = getLastDay(endM);

        // Select only needed columns — avoid fetching notes, created_at, status, etc.
        let query = supabase
            .from('maintenance_tasks')
            .select(`
                id,
                asset_id,
                technician_id,
                type,
                scheduled_date,
                completed_date,
                managed_assets!inner ( 
                    name, 
                    tid, 
                    kanwils ( name, id )
                ),
                technicians ( name, id )
            `)
            .gte('scheduled_date', start)
            .lte('scheduled_date', end);

        // Apply type filter if provided
        if (typeFilter) {
            query = query.eq('type', typeFilter);
        }

        query = query.order('scheduled_date', { ascending: true })
            .limit(limitVal === 'all' ? 10000 : limitVal);

        // Server-side technician filter — avoid fetching rows we'll discard
        if (techId !== 'all') {
            query = query.eq('technician_id', techId);
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            setTasks([]);
        } else {
            let filtered = data || [];
            // Kanwil filter (must be client-side due to nested join)
            if (kanwilId !== 'all') {
                filtered = filtered.filter(t => t.managed_assets?.kanwils?.id === kanwilId);
            }
            setTasks(filtered);
        }
        setLoading(false);
    };

    // Debounced search — avoids re-filtering on every keystroke
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 250);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Single pass: compute filteredTasks + meetCount + missCount + chartData all at once
    const MONTH_NAMES = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

    const { filteredTasks, meetCount, missCount, pendingCount, chartData } = useMemo(() => {
        // Step 1: Search filter
        const search = debouncedSearch.toLowerCase();
        const filtered = search
            ? tasks.filter(t =>
                t.managed_assets?.name?.toLowerCase().includes(search) ||
                t.managed_assets?.tid?.toString().toLowerCase().includes(search) ||
                t.technicians?.name?.toLowerCase().includes(search)
            )
            : tasks;

        // Step 2: Single pass over filtered tasks for stats + chart
        let meet = 0, miss = 0, pending = 0;
        const monthMap = {};

        for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i];
            const perf = getPerformanceStatus(t);
            if (perf === 'MEET') meet++;
            else if (perf === 'MISS') miss++;
            else pending++;

            if (t.scheduled_date) {
                const ym = t.scheduled_date.slice(0, 7);
                if (!monthMap[ym]) monthMap[ym] = { meet: 0, miss: 0, pending: 0, total: 0 };
                monthMap[ym].total++;
                if (perf === 'MEET') monthMap[ym].meet++;
                else if (perf === 'MISS') monthMap[ym].miss++;
                else monthMap[ym].pending++;
            }
        }

        const chart = Object.keys(monthMap).sort().map(ym => {
            const d = monthMap[ym];
            const total = d.total || 1;
            const monthIdx = parseInt(ym.split('-')[1], 10) - 1;
            return {
                name: MONTH_NAMES[monthIdx] || ym,
                'IN SLA': Math.round((d.meet / total) * 100),
                'OUT SLA': Math.round((d.miss / total) * 100),
                'IN PROGRESS': Math.round((d.pending / total) * 100),
                meetRaw: d.meet,
                missRaw: d.miss,
                pendingRaw: d.pending,
                totalRaw: d.total
            };
        });

        return { filteredTasks: filtered, meetCount: meet, missCount: miss, pendingCount: pending, chartData: chart };
    }, [tasks, debouncedSearch]);

    const [viewMode, setViewMode] = useState('table');

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await parseExcelFile(file);

            // 1. Initial Mappings
            const { data: existingTasks } = await supabase.from('maintenance_tasks').select('id, asset_id, type, period, scheduled_date, completed_date');
            const { data: currentAssets } = await supabase.from('managed_assets').select('id, tid');

            const assetMap = {};
            currentAssets?.forEach(a => assetMap[a.tid?.toString()?.toUpperCase()] = a.id);

            const existingMap = {};
            existingTasks?.forEach(t => {
                const key = `${t.asset_id}_${t.scheduled_date}`;
                existingMap[key] = { id: t.id, completed_date: t.completed_date };
            });

            const techMap = {};
            technicians.forEach(t => techMap[t.name?.toUpperCase()] = t.id);

            // 2. AUTO-PROVISION MISSING ASSETS
            const missingTids = new Map();
            data.forEach(item => {
                const tid = item['TID']?.toString()?.toUpperCase();
                if (tid && !assetMap[tid]) {
                    missingTids.set(tid, item['LOKASI'] || item['SITE'] || 'Auto-Provisioned Site');
                }
            });

            if (missingTids.size > 0) {
                const newAssets = Array.from(missingTids.entries()).map(([tid, name]) => ({
                    tid,
                    name,
                    kanwil_id: null // To be filled manually later
                }));

                const { data: provisioned, error: pErr } = await supabase
                    .from('managed_assets')
                    .insert(newAssets)
                    .select('id, tid');

                if (!pErr && provisioned) {
                    provisioned.forEach(a => assetMap[a.tid?.toString()?.toUpperCase()] = a.id);
                }
            }

            // 3. PROCESS MAINTENANCE RECORDS
            const newRecords = [];
            const updateRecords = [];
            const invalidRecords = [];
            let skipCount = 0;
            const createdTechNames = new Set();

            for (const item of data) {
                const techNameRaw = item['TEKNISI'] || item['PELAKSANA'];
                const pelaksana = techNameRaw?.toString()?.trim()?.toUpperCase();
                const tid = item['TID']?.toString()?.toUpperCase();
                const typeRaw = item['TYPE'] || item['STATUS TYPE'] || '';
                const type = typeRaw.toString().toUpperCase().includes('CM') ? 'CM' : 'PM';
                const siteName = item['LOKASI'] || item['SITE'] || 'Unknown Site';

                const rawJadwal = item['JADWAL'] || item['SCHEDULED DATE'] || item['PLAN'];
                const scheduledDate = rawJadwal ? getIsoDate(rawJadwal) : null;

                const rawStatus = item['STATUS'] || item['KUNJUNGAN'] || item['TANGGAL KUNJUNGAN'] || item['VISIT DATE'] || item['DATE'] || item['TANGGAL'];
                const visitDate = getIsoDate(rawStatus);

                const assetId = assetMap[tid];

                // ═══ VALIDATION (Now with Auto-Provisioning, assetId should exist) ═══
                if (!tid || !assetId || !scheduledDate) {
                    invalidRecords.push({
                        tid_preview: tid || 'MISSING',
                        site_preview: siteName,
                        scheduled_date: scheduledDate || 'INVALID',
                        reason: !tid ? 'TID EMPTY' : !assetId ? 'TID NOT FOUND' : 'DATE INVALID'
                    });
                    continue;
                }

                let techId = techMap[pelaksana] || null;
                if (!techId && pelaksana && !createdTechNames.has(pelaksana)) {
                    const { data: newTech, error: techErr } = await supabase
                        .from('technicians')
                        .insert([{ name: pelaksana, kanwil_id: null }])
                        .select('id')
                        .single();
                    if (newTech && !techErr) {
                        techId = newTech.id;
                        techMap[pelaksana] = newTech.id;
                    }
                    createdTechNames.add(pelaksana);
                } else if (!techId && pelaksana) {
                    techId = techMap[pelaksana] || null;
                }

                const taskPeriod = scheduledDate.slice(0, 7);
                const taskData = {
                    asset_id: assetId,
                    technician_id: techId,
                    type,
                    scheduled_date: scheduledDate,
                    completed_date: visitDate,
                    period: taskPeriod,
                    status: visitDate ? 'completed' : 'pending',
                    notes: `Imported: ${pelaksana || 'Unknown'}`,
                    tid_preview: tid,
                    site_preview: siteName,
                    tech_preview: pelaksana || 'Unassigned',
                    is_new_asset: missingTids.has(tid)
                };

                // User requested key: TID (AssetID) + Scheduled Date
                const key = `${assetId}_${scheduledDate}`;
                const existing = existingMap[key];

                if (existing) {
                    const existingDate = existing.completed_date || null;
                    const newDate = visitDate || null;

                    if (existingDate !== newDate) {
                        updateRecords.push({ ...taskData, id: existing.id });
                    } else {
                        skipCount++;
                    }
                } else {
                    newRecords.push(taskData);
                }
            }

            setImportData({
                newRecords,
                updateRecords,
                invalidRecords,
                skipCount,
                provisionedCount: missingTids.size,
                totalRows: data.length + 1, // +1 for Header
                openCount: [...newRecords, ...updateRecords].filter(r => !r.completed_date).length,
                closedCount: [...newRecords, ...updateRecords].filter(r => r.completed_date).length
            });
            setIsPreviewModalOpen(true);
        } catch (err) {
            console.error(err);
            alert('Gagal memproses file Excel.');
        }
        setLoading(false); e.target.value = '';
    };

    const confirmImport = async () => {
        const totalToProcess = importData.newRecords.length + importData.updateRecords.length;
        if (totalToProcess === 0) { setIsPreviewModalOpen(false); return; }
        setIsSaving(true);

        // Prepare all records for upsert
        const allRecords = [...importData.newRecords, ...importData.updateRecords].map(({ tid_preview, site_preview, tech_preview, is_new_asset, ...rest }) => ({
            ...rest,
            period: rest.period || new Date().toISOString().slice(0, 7)
        }));

        // Supabase Upsert handles both insert (no ID) and update (with ID)
        const { error } = await supabase.from('maintenance_tasks').upsert(allRecords);

        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            setIsPreviewModalOpen(false);
            fetchInitialData();
            alert(`Berhasil memproses ${allRecords.length} data (${importData.newRecords.length} baru, ${importData.updateRecords.length} update). ${importData.skipCount} data dilewati.`);
        }
        setIsSaving(false);
    };

    const handleAddTask = async (e) => {
        e.preventDefault(); setIsSaving(true);

        const taskToInsert = {
            asset_id: newTask.asset_id,
            technician_id: newTask.technician_id,
            type: newTask.type,
            period: newTask.scheduled_date ? newTask.scheduled_date.slice(0, 7) : new Date().toISOString().slice(0, 7),
            scheduled_date: newTask.scheduled_date,
            completed_date: newTask.completed_date || null,
            status: newTask.completed_date ? 'completed' : 'pending',
            notes: newTask.notes || ''
        };

        const { error } = await supabase.from('maintenance_tasks').insert([taskToInsert]);
        if (error) { alert(`Error: ${error.message}`); } else {
            setIsModalOpen(false);
            fetchTasks(startMonth, endMonth);
        }
        setIsSaving(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-full mx-auto min-h-screen selection:bg-blue-100 bg-slate-50">
            <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />

            {/* ═══ Header ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm mb-4 overflow-hidden">
                {/* Top Row: Title + Stats + Actions */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-6 py-5">
                    {/* Title */}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <FiActivity size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-[950] text-slate-900 leading-none tracking-tight">
                                {typeFilter ? `Monthly ${typeFilter}` : 'Performance Ops'}
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 tracking-[0.15em] mt-1 uppercase">
                                {typeFilter ? `${typeFilter} SLA TRACKING` : 'SLA TRACKING PORTAL'}
                            </p>
                        </div>
                    </div>

                    {/* Stats Chips */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 border-l-[3px] border-emerald-400 bg-emerald-50/60 pl-3 pr-4 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-emerald-600/60 uppercase tracking-wider">Meet SLA</div>
                                <div className="text-xl font-[950] text-emerald-600 leading-none tabular-nums mt-0.5">{meetCount}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-l-[3px] border-rose-400 bg-rose-50/60 pl-3 pr-4 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-rose-600/60 uppercase tracking-wider">Miss SLA</div>
                                <div className="text-xl font-[950] text-rose-600 leading-none tabular-nums mt-0.5">{missCount}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-l-[3px] border-lime-500 bg-lime-50/60 pl-3 pr-4 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-lime-600/60 uppercase tracking-wider">In Progress</div>
                                <div className="text-xl font-[950] text-lime-600 leading-none tabular-nums mt-0.5">{pendingCount}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-l-[3px] border-slate-300 bg-slate-50 pl-3 pr-4 py-2 rounded-r-lg">
                            <div>
                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
                                <div className="text-xl font-[950] text-slate-700 leading-none tabular-nums mt-0.5">{tasks.length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                            <FiSearch size={13} className="text-slate-300" />
                            <input type="text" placeholder="Cari TID, Site, Teknisi..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-700 w-40 ml-2 placeholder:text-slate-300" />
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[9px] tracking-wider uppercase transition-all shadow-sm shadow-blue-100 active:scale-95">
                            <FiPlus size={13} /> Jadwal
                        </button>
                        <button onClick={() => fileInputRef.current.click()} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg border border-slate-200 hover:border-blue-200 transition-all" title="Import Excel">
                            <FiUpload size={14} />
                        </button>
                        <button
                            onClick={async () => {
                                const exportData = filteredTasks.map(t => ({
                                    'TID': t.managed_assets?.tid || 'N/A',
                                    'Site Name': t.managed_assets?.name || 'Unknown',
                                    'Type': t.type,
                                    'Region': t.managed_assets?.kanwils?.name || 'Induk',
                                    'Engineer': t.technicians?.name || 'Unassigned',
                                    'Scheduled Date': t.scheduled_date,
                                    'Completed Date': t.completed_date || 'PENDING',
                                    'SLA Status': getPerformanceStatus(t)
                                }));
                                await exportToExcel(exportData, `Maintenance_SLA_${new Date().toISOString().slice(0, 10)}.xlsx`);
                            }}
                            className="p-2 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg border border-slate-200 hover:border-emerald-200 transition-all"
                            title="Export Premium Excel"
                        >
                            <FiDownload size={14} />
                        </button>
                        <button onClick={() => setViewMode(viewMode === 'table' ? 'chart' : 'table')} className={`p-2 rounded-lg border transition-all ${viewMode === 'chart' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-400 hover:text-blue-600 border-slate-200 hover:border-blue-200'}`} title={viewMode === 'chart' ? 'Table View' : 'Chart View'}>
                            {viewMode === 'chart' ? <FiList size={14} /> : <FiBarChart2 size={14} />}
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Filters + Period */}
                <div className="flex flex-wrap items-center gap-5 px-6 py-2.5 bg-slate-50/50 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <FiMapPin size={12} className="text-slate-300" />
                        <select value={filterKanwil} onChange={(e) => { setFilterKanwil(e.target.value); fetchTasks(startMonth, endMonth, e.target.value, filterTechnician); }} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-600 outline-none cursor-pointer hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all">
                            <option value="all">Semua Wilayah</option>
                            {kanwils.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                        </select>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <FiUser size={12} className="text-slate-300" />
                        <select value={filterTechnician} onChange={(e) => { setFilterTechnician(e.target.value); fetchTasks(startMonth, endMonth, filterKanwil, e.target.value); }} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-600 outline-none cursor-pointer min-w-[140px] hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all">
                            <option value="all">Semua Teknisi</option>
                            {technicians.filter(t => filterKanwil === 'all' || t.kanwil_id === filterKanwil).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <FiList size={12} className="text-slate-300" />
                        <select value={rowLimit} onChange={(e) => {
                            const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                            setRowLimit(val);
                            fetchTasks(startMonth, endMonth, filterKanwil, filterTechnician, val);
                        }} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-600 outline-none cursor-pointer hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all">
                            <option value={50}>Tampilkan 50</option>
                            <option value={100}>Tampilkan 100</option>
                            <option value={200}>Tampilkan 200</option>
                            <option value="all">Tampilkan Semua</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <FiCalendar size={12} className="text-slate-300" />
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Periode</span>
                        <div className="flex items-center bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <input type="month" value={startMonth} onChange={(e) => { setStartMonth(e.target.value); fetchTasks(e.target.value, endMonth, filterKanwil, filterTechnician); }} className="bg-transparent border-none px-3 py-1.5 text-[9px] font-bold text-slate-600 outline-none w-32" />
                            <div className="w-px h-4 bg-slate-200" />
                            <input type="month" value={endMonth} onChange={(e) => { setEndMonth(e.target.value); fetchTasks(startMonth, e.target.value, filterKanwil, filterTechnician); }} className="bg-transparent border-none px-3 py-1.5 text-[9px] font-bold text-slate-600 outline-none w-32" />
                        </div>
                    </div>
                </div>
            </div>

            {viewMode === 'table' ? (
                /* Excel-Style Table */
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead className="bg-slate-100/50 text-slate-400 border-b border-slate-200">
                                <tr className="text-[9px] font-black tracking-widest uppercase align-middle">
                                    <th className="px-3 py-3 border-r border-slate-200 text-center w-12 bg-slate-200/20">#</th>
                                    <th className="px-3 py-3 border-r border-slate-200 w-24">TID</th>
                                    <th className="px-3 py-3 border-r border-slate-200 w-56">SITE INFORMATION</th>
                                    <th className="px-3 py-3 border-r border-slate-200 text-center w-24">CATEGORY</th>
                                    <th className="px-3 py-3 border-r border-slate-200 w-32">REGION</th>
                                    <th className="px-3 py-3 border-r border-slate-200 text-center w-28">SCHEDULED</th>
                                    <th className="px-3 py-3 border-r border-slate-200 text-center w-28">KUNJUNGAN</th>
                                    <th className="px-4 py-3 border-r border-slate-200 w-44">TECHNICIAN</th>
                                    <th className="px-3 py-3 text-center w-24 font-black">SLA STATUS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {loading ? (
                                    Array(10).fill(0).map((_, i) => <tr key={i} className="h-10 animate-pulse"><td colSpan="9" className="px-3"><div className="h-2 bg-slate-50 rounded w-full opacity-60" /></td></tr>)
                                ) : filteredTasks.length === 0 ? (
                                    <tr><td colSpan="9" className="py-32 text-center text-[10px] font-black text-slate-200 uppercase tracking-[0.5em] italic">Zero Records Found</td></tr>
                                ) : (
                                    filteredTasks.map((task, idx) => {
                                        const perf = getPerformanceStatus(task);
                                        return (
                                            <tr key={task.id} className={`text-[10px] uppercase font-bold hover:bg-slate-50 transition-colors ${perf === 'MISS' ? 'bg-rose-50/20' : perf === 'MEET' ? 'bg-emerald-50/10' : ''}`}>
                                                <td className="px-3 py-2 border-r border-slate-100 text-center bg-slate-100/10 text-slate-300 font-mono text-[9px]">{idx + 1}</td>
                                                <td className="px-3 py-2 border-r border-slate-100 font-mono text-blue-500 bg-blue-50/10 text-[9px]">{task.managed_assets?.tid || '---'}</td>
                                                <td className="px-3 py-2 border-r border-slate-100 truncate pr-4 text-slate-800 tracking-tight">{task.managed_assets?.name}</td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${task.type === 'PM' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>{task.type}</span>
                                                </td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-slate-400 text-[9px]">{task.managed_assets?.kanwils?.name || '---'}</td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-center font-mono text-slate-500">{task.scheduled_date}</td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-center font-mono">
                                                    {task.completed_date ? (
                                                        <span className="text-slate-700">{task.completed_date}</span>
                                                    ) : (
                                                        <span className="text-slate-200 italic text-[8px]">WAITING</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 border-r border-slate-100 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 text-[8px] font-black">{task.technicians?.name?.[0]}</div>
                                                        <span className="truncate text-slate-600">{task.technicians?.name || 'UNASSIGNED'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center align-middle">
                                                    {perf === 'MEET' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-[8px] font-black shadow-lg shadow-emerald-200"><FiCheckCircle size={10} /> MEET</span>
                                                    ) : perf === 'MISS' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500 text-white rounded-full text-[8px] font-black shadow-lg shadow-rose-200"><FiAlertCircle size={10} /> MISS</span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-slate-100 text-slate-300 rounded-full text-[8px] font-black">PENDING</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Chart View — Premium Design */
                <div className="space-y-5">
                    {/* Stat Cards Row - High Density */}
                    <div className="grid grid-cols-4 gap-4">
                        {(() => {
                            const totalTasks = tasks.length;
                            const totalMeet = tasks.filter(t => getPerformanceStatus(t) === 'MEET').length;
                            const totalMiss = tasks.filter(t => getPerformanceStatus(t) === 'MISS').length;
                            const totalPending = tasks.filter(t => getPerformanceStatus(t) === 'PENDING').length;
                            const overallSla = totalTasks > 0 ? Math.round((totalMeet / (totalMeet + totalMiss || 1)) * 100) : 0;
                            return [
                                { label: 'Total Tasks', value: totalTasks, sub: 'Log Count', icon: <FiDatabase size={16} />, gradient: 'from-white to-slate-50', shadow: 'shadow-slate-100', isLight: true },
                                { label: 'In SLA (Meet)', value: totalMeet, sub: `${totalTasks > 0 ? Math.round((totalMeet / totalTasks) * 100) : 0}% Yield`, icon: <FiCheckCircle size={16} />, gradient: 'from-blue-600 to-blue-800', shadow: 'shadow-blue-200' },
                                { label: 'Out SLA (Miss)', value: totalMiss, sub: `${totalTasks > 0 ? Math.round((totalMiss / totalTasks) * 100) : 0}% Loss`, icon: <FiAlertCircle size={16} />, gradient: 'from-rose-600 to-rose-800', shadow: 'shadow-rose-200' },
                                { label: 'Overall Rate', value: `${overallSla}%`, sub: 'Efficiency', icon: <FiActivity size={16} />, gradient: overallSla >= 85 ? 'from-emerald-600 to-emerald-800' : overallSla >= 60 ? 'from-amber-600 to-amber-700' : 'from-rose-600 to-rose-800', shadow: 'shadow-indigo-100' }
                            ].map(card => (
                                <div key={card.label} className={`relative overflow-hidden bg-gradient-to-br ${card.gradient} rounded-xl p-4 ${card.isLight ? 'text-slate-900 border border-slate-200' : 'text-white'} shadow-lg ${card.shadow} group hover:translate-y-[-2px] transition-all`}>
                                    <div className={`absolute -right-2 -top-2 w-16 h-16 ${card.isLight ? 'bg-slate-200/20' : 'bg-white/5'} rounded-full` } />
                                    <div className={`flex items-center gap-2 mb-2 ${card.isLight ? 'text-slate-400' : 'opacity-70'}`}>
                                        {card.icon}
                                        <span className="text-[8px] font-black uppercase tracking-[0.1em]">{card.label}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <div className="text-2xl font-[950] tracking-tighter leading-none">{card.value}</div>
                                        <div className={`text-[7px] font-bold ${card.isLight ? 'text-slate-400' : 'opacity-40'} uppercase tracking-widest`}>{card.sub}</div>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>

                    {/* SLA Dashboard Section - Grid Layout for No-Scroll */}
                    <div className="grid grid-cols-12 gap-5 h-[420px]">
                        {/* Left: Performance Chart (8/12) */}
                        <div className="col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <FiBarChart2 size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-[950] text-slate-900 uppercase tracking-tighter">SLA Health Overview</h2>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Success Yield Trends</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    {[
                                        { label: 'SUCCESS', color: 'bg-blue-500' },
                                        { label: 'LOSS', color: 'bg-rose-500' },
                                        { label: 'WORK', color: 'bg-lime-500' }
                                    ].map(l => (
                                        <div key={l.label} className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-sm ${l.color}`} />
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">{l.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 p-6 relative">
                                {chartData.length === 0 ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-20">
                                        <FiActivity size={32} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Data Pool</span>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="25%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: '#475569' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={30} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 800 }} cursor={{ fill: '#f8fafc', radius: 8 }} />
                                            <Bar dataKey="IN SLA" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="OUT SLA" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="IN PROGRESS" fill="#84cc16" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Right: Vertical Summary Pool (4/12) */}
                        <div className="col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
                                <div>
                                    <h2 className="text-xs font-black uppercase tracking-widest">Yield Analysis</h2>
                                    <p className="text-[7px] font-bold text-white/40 uppercase tracking-[0.2em] mt-0.5">Monthly Node Performance</p>
                                </div>
                                <FiActivity className="text-blue-400" />
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
                                {chartData.map(d => (
                                    <div key={d.name} className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between hover:border-blue-300 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-slate-50 rounded-lg flex flex-col items-center justify-center border border-slate-100 group-hover:bg-blue-50 transition-colors">
                                                <span className="text-[9px] font-black text-slate-800 tracking-tighter leading-none">{d.name.split(' ')[0]}</span>
                                                <span className="text-[7px] font-bold text-slate-400 tracking-tighter">{d.name.split(' ')[1]}</span>
                                            </div>
                                            <div>
                                                <div className="text-[12px] font-[950] text-slate-900 tabular-nums">{d['IN SLA']}% <span className="text-[8px] text-slate-300 font-bold ml-1 uppercase">SLA</span></div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        <span className="text-[8px] font-black text-slate-400">{d.meetRaw}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                        <span className="text-[8px] font-black text-slate-400">{d.missRaw}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                                                        <span className="text-[8px] font-black text-slate-400">{d.pendingRaw}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`w-1.5 h-8 rounded-full ${parseInt(d['IN SLA']) >= 85 ? 'bg-emerald-500' : parseInt(d['IN SLA']) >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals - Optimized Layout */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-10 rounded-none w-full max-w-lg relative shadow-2xl border border-slate-200">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 w-10 h-10 bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-full flex items-center justify-center transition-all">✕</button>
                            <h2 className="text-2xl font-[950] text-slate-900 mb-2 uppercase tracking-tighter">Inject Production Schedule</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 border-b border-slate-50 pb-4">Internal Asset Log Sync</p>
                            <form onSubmit={handleAddTask} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-400 ml-4">SOURCE TID / SITE</label>
                                    <select required value={newTask.asset_id} onChange={(e) => setNewTask({ ...newTask, asset_id: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[10px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all">
                                        <option value="">SELECT ASSET...</option>
                                        {assets.map(a => <option key={a.id} value={a.id}>[{a.tid}] {a.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-400 ml-4">PLAN DATE</label>
                                        <input required type="date" value={newTask.scheduled_date} onChange={(e) => setNewTask({ ...newTask, scheduled_date: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[10px] font-black text-slate-700 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-400 ml-4">WORK TYPE</label>
                                        <select value={newTask.type} onChange={(e) => setNewTask({ ...newTask, type: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[10px] font-black text-slate-700 outline-none">
                                            <option value="PM">PREVENTIVE (PM)</option>
                                            <option value="CM">CORRECTIVE (CM)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-400 ml-4">ASSIGNED OPS ENGINEER</label>
                                    <select required value={newTask.technician_id} onChange={(e) => setNewTask({ ...newTask, technician_id: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[10px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all">
                                        <option value="">SELECT PERSONNEL...</option>
                                        {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <button disabled={isSaving} type="submit" className="w-full py-6 mt-6 bg-blue-600 text-white rounded-3xl font-black text-[11px] tracking-[0.4em] uppercase shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50">
                                    {isSaving ? 'EXECUTING SYNC...' : 'COMMIT NEW RECORD'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isPreviewModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="bg-white rounded-none shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-white">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                                        <h2 className="text-2xl font-[950] text-slate-900 tracking-tighter uppercase leading-none">Analysis Hub</h2>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">Operational Integrity Protocol</p>
                                </div>
                                <button onClick={() => setIsPreviewModalOpen(false)} className="w-10 h-10 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all border border-slate-100">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                <div className="grid grid-cols-5 gap-4">
                                    {[
                                        { label: 'File Rows', val: importData.totalRows || 0, c: 'slate' },
                                        { label: 'New Tasks', val: importData.newRecords.length, c: 'emerald' },
                                        { label: 'Updates', val: importData.updateRecords.length, c: 'amber' },
                                        { label: 'New Assets', val: importData.provisionedCount || 0, c: 'indigo' },
                                        { label: 'Invalid', val: importData.invalidRecords?.length || 0, c: 'rose' }
                                    ].map(s => (
                                        <div key={s.label} className={`p-5 bg-${s.c}-50/30 border border-${s.c}-100 rounded-xl relative overflow-hidden group`}>
                                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{s.label}</div>
                                            <div className={`text-2xl font-[950] text-${s.c}-600 tracking-tighter`}>{s.val}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm font-bold">
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-left text-[11px] uppercase tracking-tight">
                                            <thead className="bg-white border-b border-slate-100 text-slate-300 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-10 py-6">ID TICKET</th>
                                                    <th className="px-10 py-6">DESCRIPTION</th>
                                                    <th className="px-10 py-6 text-center">PLAN</th>
                                                    <th className="px-10 py-6 text-center">STATUS</th>
                                                    <th className="px-10 py-6 text-right">TARGET TECH</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100/50 bg-white/40">
                                                {importData.invalidRecords?.map((r, i) => (
                                                    <tr key={`inv-${i}`} className="bg-rose-50/30 group">
                                                        <td className="px-10 py-4 text-rose-600 font-mono italic">{r.tid_preview}</td>
                                                        <td className="px-10 py-4 text-slate-400 truncate max-w-[200px]">{r.site_preview}</td>
                                                        <td className="px-10 py-4 text-center text-rose-300 line-through">{r.scheduled_date}</td>
                                                        <td className="px-10 py-4 text-center">
                                                            <span className="px-2 py-1 bg-rose-600 text-white rounded text-[8px] font-black shadow-sm group-hover:animate-bounce">ERR: {r.reason}</span>
                                                        </td>
                                                        <td className="px-10 py-4 text-right opacity-40 italic">SKIPPED</td>
                                                    </tr>
                                                ))}
                                                {importData.newRecords.map((r, i) => (
                                                    <tr key={`new-${i}`} className="hover:bg-emerald-50/20">
                                                        <td className="px-10 py-4 text-emerald-600 font-mono flex items-center gap-2">
                                                            {r.tid_preview}
                                                            {r.is_new_asset && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-[4px] text-[7px] font-black animate-pulse">NEW ASSET</span>}
                                                        </td>
                                                        <td className="px-10 py-4 text-slate-600 truncate max-w-[200px]">{r.site_preview}</td>
                                                        <td className="px-10 py-4 text-center text-slate-400">{r.scheduled_date}</td>
                                                        <td className="px-10 py-4 text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black">NEW TASK</span></td>
                                                        <td className="px-10 py-4 text-right opacity-40 italic">{r.tech_preview}</td>
                                                    </tr>
                                                ))}
                                                {importData.updateRecords.map((r, i) => (
                                                    <tr key={`upd-${i}`} className="hover:bg-amber-50/20">
                                                        <td className="px-10 py-4 text-amber-600 font-mono">{r.tid_preview}</td>
                                                        <td className="px-10 py-4 text-slate-600 truncate max-w-[200px]">{r.site_preview}</td>
                                                        <td className="px-10 py-4 text-center text-slate-400">{r.scheduled_date}</td>
                                                        <td className="px-10 py-4 text-center"><span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black">UPDATE</span></td>
                                                        <td className="px-10 py-4 text-right opacity-40 italic">{r.tech_preview}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 bg-slate-50/80 backdrop-blur-xl border-t border-slate-100 flex gap-4">
                                <button onClick={() => setIsPreviewModalOpen(false)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-400 rounded-xl font-black text-[12px] tracking-[0.2em] uppercase hover:bg-slate-100 transition-all">Abort Sync</button>
                                <button onClick={confirmImport} disabled={isSaving || (importData.newRecords.length === 0 && importData.updateRecords.length === 0)} className="flex-[2] bg-blue-600 text-white rounded-xl font-black text-[12px] tracking-[0.4em] uppercase shadow-lg shadow-blue-200 transition-all disabled:opacity-50">
                                    {isSaving ? 'Processing...' : `Commit ${importData.newRecords.length + importData.updateRecords.length} Changes`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
