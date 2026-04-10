import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { parseExcelFile, exportToExcel } from '../../utils/excelHandler';

// Sub-components
import MaintenanceHeader from './maintenance/Header';
import MaintenanceStats from './maintenance/Stats';
import FilterBar from './maintenance/FilterBar';
import TaskTable from './maintenance/TaskTable';
import TaskChart from './maintenance/TaskChart';
import AddTaskModal from './maintenance/AddTaskModal';
import ImportPreviewModal from './maintenance/ImportPreviewModal';
import TargetUpdateModal from './maintenance/TargetUpdateModal';
import TaskDetailView from './maintenance/TaskDetailView';
import StatListModal from './maintenance/StatListModal';

// Utilities
import { getIsoDate, formatDate, getPerformanceStatus } from './maintenance/maintenanceUtils';

export default function MaintenanceTracker({ typeFilter }) {
    const fileInputRef = useRef(null);
    const targetFileInputRef = useRef(null);
    
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Date Range State (YYYY-MM-DD format)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    });
    const [dateFilterField, setDateFilterField] = useState('scheduled_date');
    const [filterSla, setFilterSla] = useState('all');

    const [filterKanwil, setFilterKanwil] = useState('all');
    const [filterTechnician, setFilterTechnician] = useState('all');
    const [kanwils, setKanwils] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [assets, setAssets] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [devMode, setDevMode] = useState(false);
    const [modifiedTaskIds, setModifiedTaskIds] = useState(new Set());
    const [sortConfig, setSortConfig] = useState({ key: 'scheduled_date', direction: 'desc' });
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, key: null });
    const [isAllPeriods, setIsAllPeriods] = useState(false);
    const [rowLimit, setRowLimit] = useState(20);
    const [viewMode, setViewMode] = useState('table');

    const [newTask, setNewTask] = useState({ 
        asset_id: '', 
        technician_id: '', 
        type: typeFilter || 'PM', 
        period: '', 
        target_date: '',
        reason: '',
        scheduled_date: '',
        status: 'on progress' 
    });

    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isTargetPreviewModalOpen, setIsTargetPreviewModalOpen] = useState(false);
    const [targetUpdateData, setTargetUpdateData] = useState({ updates: [], count: 0 });
    const [toast, setToast] = useState(null);
    const [importData, setImportData] = useState({ newRecords: [], updateRecords: [], skipCount: 0, openCount: 0, closedCount: 0, provisionedCount: 0, totalRows: 0 });

    const [selectedTask, setSelectedTask] = useState(null);
    const [activeStatModal, setActiveStatModal] = useState(null); // 'MEET', 'MISS', 'ON PROGRESS'

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    async function fetchInitialData() {
        setLoading(true);
        let taskQuery = supabase
            .from('maintenance_tasks')
            .select(`
                id, asset_id, technician_id, type, scheduled_date, target_date, completed_date, reason, evident,
                managed_assets!inner ( name, tid, kanwils ( name, id ) ),
                technicians ( name, id )
            `);

        if (!isAllPeriods) {
            taskQuery = taskQuery.gte(dateFilterField, startDate).lte(dateFilterField, endDate);
        }

        taskQuery = taskQuery
            .order('scheduled_date', { ascending: true })
            .limit(rowLimit === 'all' ? 10000 : rowLimit);

        if (typeFilter) taskQuery.eq('type', typeFilter);

        const [assetRes, techRes, kwRes, taskRes] = await Promise.all([
            supabase.from('managed_assets').select('id, name, tid').order('name'),
            supabase.from('technicians').select('id, name, kanwil_id').order('name'),
            supabase.from('kanwils').select('id, name').order('name'),
            taskQuery
        ]);

        setAssets(assetRes.data || []);
        setTechnicians(techRes.data || []);
        setKanwils(kwRes.data || []);
        
        let filtered = taskRes.data || [];
        if (filterKanwil !== 'all') {
            filtered = filtered.filter(t => t.managed_assets?.kanwils?.id === filterKanwil);
        }
        setTasks(filtered);
        setLoading(false);
    }

    async function fetchTasks(startD = startDate, endD = endDate, kanwilId = filterKanwil, techId = filterTechnician, limitVal = rowLimit, allPeriodsOverride = isAllPeriods, field = dateFilterField) {
        setLoading(true);
        let query = supabase
            .from('maintenance_tasks')
            .select(`
                id, asset_id, technician_id, type, scheduled_date, target_date, completed_date, reason, evident,
                managed_assets!inner ( name, tid, kanwils ( name, id ) ),
                technicians ( name, id )
            `);

        if (!allPeriodsOverride) {
            query = query.gte(field, startD).lte(field, endD);
        }

        if (typeFilter) query = query.eq('type', typeFilter);
        query = query.order('scheduled_date', { ascending: true }).limit(limitVal === 'all' ? 10000 : limitVal);
        if (techId !== 'all') query = query.eq('technician_id', techId);

        const { data, error } = await query;
        if (error) {
            console.error(error);
            setTasks([]);
        } else {
            let filtered = data || [];
            if (kanwilId !== 'all') {
                filtered = filtered.filter(t => t.managed_assets?.kanwils?.id === kanwilId);
            }
            setTasks(filtered);
        }
        setLoading(false);
    }

    async function updateTaskField(taskId, field, value) {
        const { error } = await supabase
            .from('maintenance_tasks')
            .update({ [field]: value === '' ? null : value })
            .eq('id', taskId);
        if (error) {
            alert(`Gagal update database: ${error.message}`);
        } else {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
            if (selectedTask?.id === taskId) {
                setSelectedTask(prev => ({ ...prev, [field]: value }));
            }
            setModifiedTaskIds(prev => new Set(prev).add(taskId));
        }
    }

    const handleRowClick = (task) => {
        setSelectedTask(task);
    };

    const requestSort = (key, direction = null) => {
        if (!direction) {
            direction = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
        }
        setSortConfig(direction === 'clear' ? { key: null, direction: 'asc' } : { key, direction });
    };

    const handleContextMenu = (e, key) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, key });
    };

    useEffect(() => {
        const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 250);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const stats = useMemo(() => {
        const search = debouncedSearch.toLowerCase();
        let filtered = search ? tasks.filter(t => t.managed_assets?.name?.toLowerCase().includes(search) || t.managed_assets?.tid?.toString().toLowerCase().includes(search) || t.technicians?.name?.toLowerCase().includes(search)) : tasks;

        if (filterSla !== 'all') {
            filtered = filtered.filter(t => getPerformanceStatus(t) === filterSla);
        }

        if (sortConfig.key) {
            filtered = [...filtered].sort((a, b) => {
                let aVal, bVal;
                switch (sortConfig.key) {
                    case 'tid': aVal = a.managed_assets?.tid; bVal = b.managed_assets?.tid; break;
                    case 'site': aVal = a.managed_assets?.name; bVal = b.managed_assets?.name; break;
                    case 'kanwil': aVal = a.managed_assets?.kanwils?.name; bVal = b.managed_assets?.kanwils?.name; break;
                    case 'tech': aVal = a.technicians?.name; bVal = b.technicians?.name; break;
                    case 'status': aVal = getPerformanceStatus(a); bVal = getPerformanceStatus(b); break;
                    default: aVal = a[sortConfig.key]; bVal = b[sortConfig.key];
                }
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        let meet = 0, miss = 0, pending = 0;
        const monthMap = {};
        const MONTH_NAMES = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

        tasks.forEach(t => {
            const perf = getPerformanceStatus(t);
            if (perf === 'MEET') meet++; else if (perf === 'MISS') miss++; else pending++;
            if (t.scheduled_date) {
                const ym = t.scheduled_date.slice(0, 7);
                if (!monthMap[ym]) monthMap[ym] = { meet: 0, miss: 0, pending: 0, total: 0 };
                monthMap[ym].total++;
                if (perf === 'MEET') monthMap[ym].meet++; else if (perf === 'MISS') monthMap[ym].miss++; else monthMap[ym].pending++;
            }
        });

        const chart = Object.keys(monthMap).sort().map(ym => {
            const d = monthMap[ym];
            const total = d.total || 1;
            return {
                name: MONTH_NAMES[parseInt(ym.split('-')[1]) - 1] || ym,
                'IN SLA': Math.round((d.meet / total) * 100), 'OUT SLA': Math.round((d.miss / total) * 100), 'ON PROGRESS': Math.round((d.pending / total) * 100),
                meetRaw: d.meet, missRaw: d.miss, pendingRaw: d.pending, totalRaw: d.total
            };
        });

        return { filteredTasks: filtered, meetCount: meet, missCount: miss, pendingCount: pending, chartData: chart };
    }, [tasks, debouncedSearch, sortConfig]);

    async function handleExcelUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            const data = await parseExcelFile(file);
            const { data: currentAssets } = await supabase.from('managed_assets').select('id, tid');
            const { data: existingTasks } = await supabase.from('maintenance_tasks').select('id, asset_id, scheduled_date, completed_date');
            
            const assetMap = {}; currentAssets?.forEach(a => assetMap[a.tid?.toString()?.toUpperCase()] = a.id);
            const existingMap = {}; existingTasks?.forEach(t => existingMap[`${t.asset_id}_${t.scheduled_date}`] = { id: t.id, completed_date: t.completed_date });
            const techMap = {}; technicians.forEach(t => techMap[t.name?.toUpperCase()] = t.id);

            const missingTids = new Map();
            data.forEach(item => {
                const tid = item['TID']?.toString()?.toUpperCase();
                if (tid && !assetMap[tid]) missingTids.set(tid, item['LOKASI'] || item['SITE'] || 'Auto-Provisioned Site');
            });

            if (missingTids.size > 0) {
                const newAssets = Array.from(missingTids.entries()).map(([tid, name]) => ({ tid, name }));
                const { data: provisioned } = await supabase.from('managed_assets').insert(newAssets).select('id, tid');
                provisioned?.forEach(a => assetMap[a.tid?.toString()?.toUpperCase()] = a.id);
            }

            const newRecords = [], updateRecords = [], invalidRecords = [];
            let skipCount = 0;
            const createdTechNames = new Set();

            for (const item of data) {
                const tid = item['TID']?.toString()?.toUpperCase();
                const assetId = assetMap[tid];
                const rawJadwal = item['JADWAL'] || item['SCHEDULED DATE'] || item['PLAN'];
                const scheduledDate = rawJadwal ? getIsoDate(rawJadwal) : null;

                if (!tid || !assetId || !scheduledDate) {
                    invalidRecords.push({ tid_preview: tid || 'MISSING', site_preview: item['LOKASI'] || item['SITE'] || 'Unknown', reason: !tid ? 'TID EMPTY' : !assetId ? 'TID NOT FOUND' : 'DATE INVALID' });
                    continue;
                }

                const techNameRaw = item['TEKNISI'] || item['PELAKSANA'];
                const pelaksana = techNameRaw?.toString()?.trim()?.toUpperCase();
                let techId = techMap[pelaksana] || null;
                if (!techId && pelaksana && !createdTechNames.has(pelaksana)) {
                    const { data: newTech } = await supabase.from('technicians').insert([{ name: pelaksana }]).select('id').single();
                    if (newTech) { techId = newTech.id; techMap[pelaksana] = newTech.id; }
                    createdTechNames.add(pelaksana);
                }

                const visitDate = getIsoDate(item['STATUS'] || item['TANGGAL KUNJUNGAN']);
                const type = (item['TYPE'] || '').toString().toUpperCase().includes('CM') ? 'CM' : 'PM';
                const taskData = { 
                    asset_id: assetId, 
                    technician_id: techId, 
                    type, 
                    scheduled_date: scheduledDate, 
                    period: scheduledDate.slice(0, 7),
                    target_date: getIsoDate(item['TARGET'] || item['TARGET DATE'] || item['TGL TARGET']), 
                    reason: item['REASON'] || '',
                    tid_preview: tid, 
                    site_preview: item['LOKASI'] || item['SITE'] || 'Unknown', 
                    tech_preview: pelaksana || 'Unassigned', 
                    is_new_asset: missingTids.has(tid)
                };

                // Only update visit date if provided, prevent nullifying existing data
                if (visitDate) {
                    taskData.completed_date = visitDate;
                    taskData.status = 'completed';
                } else {
                    taskData.status = 'on progress';
                }

                const existing = existingMap[`${assetId}_${scheduledDate}`];
                if (existing) {
                    if (existing.completed_date !== visitDate) updateRecords.push({ ...taskData, id: existing.id }); else skipCount++;
                } else newRecords.push(taskData);
            }

            setImportData({ newRecords, updateRecords, invalidRecords, skipCount, provisionedCount: missingTids.size, totalRows: data.length, openCount: [...newRecords, ...updateRecords].filter(r => !r.completed_date).length, closedCount: [...newRecords, ...updateRecords].filter(r => r.completed_date).length });
            setIsPreviewModalOpen(true);
        } catch (err) { console.error(err); alert('Gagal memproses file Excel.'); }
        setLoading(false); e.target.value = '';
    }

    async function handleConfirmImport() {
        setIsSaving(true);
        const allRecords = [...importData.newRecords, ...importData.updateRecords].map(({ tid_preview, site_preview, tech_preview, is_new_asset, ...rest }) => rest);
        const { error } = await supabase.from('maintenance_tasks').upsert(allRecords);
        if (error) {
            console.error(error);
            showToast(`Gagal Import: ${error.message}`, 'error');
        } else { 
            setIsPreviewModalOpen(false); 
            fetchInitialData();
            showToast('Data berhasil disinkronisasi!');
        }
        setIsSaving(false);
    }

    async function handleAddTask(e) {
        e.preventDefault(); setIsSaving(true);
        const taskToInsert = { ...newTask, period: newTask.scheduled_date.slice(0, 7), status: newTask.completed_date ? 'completed' : 'on progress' };
        const { error } = await supabase.from('maintenance_tasks').insert([taskToInsert]);
        if (error) alert(`Error: ${error.message}`); else { setIsModalOpen(false); fetchTasks(); }
        setIsSaving(false);
    }

    async function handleExportTargetTemplate() {
        const exportData = stats.filteredTasks.map(t => ({ 
            'TID': t.managed_assets?.tid || 'N/A', 
            'SCHEDULED DATE': formatDate(t.scheduled_date), 
            'TARGET DATE': t.target_date ? formatDate(t.target_date) : '' 
        }));
        await exportToExcel(exportData, `Template_Target_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    async function handleTargetExcelUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            const data = await parseExcelFile(file);
            const updates = [];
            const taskMap = {}; tasks.forEach(t => taskMap[`${t.managed_assets?.tid?.toString()?.toUpperCase()}_${t.scheduled_date}`] = t);

            for (const item of data) {
                const tid = item['TID']?.toString()?.trim()?.toUpperCase();
                const schedDate = getIsoDate(item['SCHEDULED DATE'] || item['TGL JADWAL']);
                const newTargetDate = getIsoDate(item['TARGET DATE'] || item['TGL TARGET'] || item['TARGET']);
                if (!tid || !schedDate || !newTargetDate) continue;
                const existingTask = taskMap[`${tid}_${schedDate}`];
                if (existingTask && existingTask.target_date !== newTargetDate) {
                    updates.push({ 
                        id: existingTask.id, 
                        asset_id: existingTask.asset_id,
                        type: existingTask.type,
                        scheduled_date: schedDate,
                        period: schedDate.slice(0, 7),
                        tid, 
                        site: existingTask.managed_assets?.name, 
                        oldTarget: existingTask.target_date, 
                        newTarget: newTargetDate 
                    });
                }
            }

            if (updates.length > 0) { setTargetUpdateData({ updates, count: updates.length }); setIsTargetPreviewModalOpen(true); } else alert("Tidak ada pembaruan target.");
        } catch (err) { console.error(err); }
        setLoading(false); e.target.value = '';
    }

    async function handleConfirmTargetUpdate() {
        setIsSaving(true);
        const updateRows = targetUpdateData.updates.map(u => ({ 
            id: u.id, 
            asset_id: u.asset_id,
            type: u.type,
            scheduled_date: u.scheduled_date,
            period: u.period,
            target_date: u.newTarget 
        }));
        const { error } = await supabase.from('maintenance_tasks').upsert(updateRows);
        if (error) {
            console.error(error);
            showToast(`Gagal Update: ${error.message}`, 'error');
        } else { 
            setIsTargetPreviewModalOpen(false); 
            fetchInitialData(); 
            showToast('Target berhasil diperbarui!');
        }
        setIsSaving(false);
    }

    async function handleExportPremiumExcel() {
        const exportData = stats.filteredTasks.map(t => {
            let aging = '---';
            if (t.scheduled_date && t.target_date) aging = Math.round((new Date(t.target_date) - new Date(t.scheduled_date)) / (1000 * 60 * 60 * 24));
            return {
                'TID': t.managed_assets?.tid, 'LOKASI': t.managed_assets?.name, 'TYPE': t.type, 'WILAYAH': t.managed_assets?.kanwils?.name, 'TGL JADWAL': formatDate(t.scheduled_date), 'TGL TARGET': formatDate(t.target_date), 'AGING (HARI)': aging, 'TEKNISI': t.technicians?.name, 'SLA STATUS': getPerformanceStatus(t), 'TGL KUNJUNGAN': formatDate(t.completed_date), 'REASON': t.reason || (getPerformanceStatus(t) === 'MEET' ? 'DONE' : '-')
            };
        });
        await exportToExcel(exportData, `Maintenance_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-full mx-auto min-h-screen selection:bg-blue-100 bg-slate-50">
            <AnimatePresence mode="wait">
                {selectedTask ? (
                    <TaskDetailView 
                        key="detail"
                        task={selectedTask} 
                        onBack={() => setSelectedTask(null)} 
                    />
                ) : (
                    <motion.div 
                        key="dashboard"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />
                        <input type="file" ref={targetFileInputRef} onChange={handleTargetExcelUpload} accept=".xlsx, .xls" className="hidden" />

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
                            <MaintenanceHeader 
                                typeFilter={typeFilter} searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
                                devMode={devMode} setDevMode={setDevMode} setModifiedTaskIds={setModifiedTaskIds} 
                                onOpenAddModal={() => setIsModalOpen(true)} onImportAll={() => fileInputRef.current.click()} 
                            />
                            
                            <div className="px-6 py-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
                                <MaintenanceStats 
                                    meetCount={stats.meetCount} 
                                    missCount={stats.missCount} 
                                    pendingCount={stats.pendingCount} 
                                    totalCount={assets.length}
                                    onExportTarget={handleExportTargetTemplate}
                                    onImportTarget={() => targetFileInputRef.current.click()}
                                    onStatClick={setActiveStatModal}
                                />
                            </div>

                            <FilterBar 
                                filterKanwil={filterKanwil} setFilterKanwil={setFilterKanwil} kanwils={kanwils} 
                                filterTechnician={filterTechnician} setFilterTechnician={setFilterTechnician} technicians={technicians} 
                                rowLimit={rowLimit} setRowLimit={setRowLimit} viewMode={viewMode} setViewMode={setViewMode} 
                                onFetchTasks={fetchTasks} onExportExcel={handleExportPremiumExcel} 
                                startDate={startDate} setStartDate={setStartDate}
                                endDate={endDate} setEndDate={setEndDate}
                                dateFilterField={dateFilterField} setDateFilterField={setDateFilterField}
                                filterSla={filterSla} setFilterSla={setFilterSla}
                                isAllPeriods={isAllPeriods} setIsAllPeriods={setIsAllPeriods}
                            />
                        </div>

                        {viewMode === 'table' ? (
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                                <TaskTable 
                                    tasks={stats.filteredTasks} sortConfig={sortConfig} requestSort={requestSort} 
                                    handleContextMenu={handleContextMenu} devMode={devMode} assets={assets} 
                                    technicians={technicians} updateTaskField={updateTaskField} modifiedTaskIds={modifiedTaskIds} 
                                    formatDate={formatDate}
                                    onRowClick={handleRowClick}
                                />
                            </div>
                        ) : (
                            <TaskChart chartData={stats.chartData} />
                        )}

                        <AddTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} newTask={newTask} setNewTask={setNewTask} isSaving={isSaving} onAdd={handleAddTask} assets={assets} technicians={technicians} />
                        <ImportPreviewModal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} importData={importData} isSaving={isSaving} onConfirm={handleConfirmImport} />
                        <TargetUpdateModal isOpen={isTargetPreviewModalOpen} onClose={() => setIsTargetPreviewModalOpen(false)} targetUpdateData={targetUpdateData} isSaving={isSaving} onConfirm={handleConfirmTargetUpdate} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast Notification stays global */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[300px] backdrop-blur-md ${toast.type === 'error' ? 'bg-rose-500/90 text-white border-rose-400' : 'bg-slate-900/90 text-white border-slate-700'}`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${toast.type === 'error' ? 'bg-white animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
                        <span className="text-[11px] font-black uppercase tracking-widest">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            <StatListModal 
                isOpen={!!activeStatModal}
                onClose={() => setActiveStatModal(null)}
                type={activeStatModal}
                onTaskClick={(task) => {
                    setSelectedTask(task);
                    setActiveStatModal(null);
                }}
            />
        </motion.div>
    );
}
