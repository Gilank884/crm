import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { parseExcelFile, exportToExcel } from '../../utils/excelHandler';

// Modular Components
import CMDetailView from './corrective/CMDetailView';
import CMImportPreviewModal from './corrective/CMImportPreviewModal';
import CMHeader from './corrective/CMHeader';
import CMFilters from './corrective/CMFilters';
import CMTable from './corrective/CMTable';
import AddCMModal from './corrective/AddCMModal';

const getIsoDate = (raw) => {
    if (!raw) return null;
    try {
        let str = raw.toString().trim();
        if (!str) return null;

        // Support formats like "DD/MM/YYYY" or "DD/MM/YYYY HH.mm.ss" or "DD-MM-YYYY"
        const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const month = parseInt(dmyMatch[2], 10) - 1;
            const year = parseInt(dmyMatch[3], 10);
            
            // Check if there's also a time part (HH.mm.ss or HH:mm:ss)
            const timeMatch = str.match(/(\d{1,2})[:.](\d{1,2})[:.](\d{1,2})/);
            if (timeMatch) {
                const hour = parseInt(timeMatch[1], 10);
                const min = parseInt(timeMatch[2], 10);
                const sec = parseInt(timeMatch[3], 10);
                const dObj = new Date(year, month, day, hour, min, sec);
                if (!isNaN(dObj.getTime())) {
                    return `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')} ${String(dObj.getHours()).padStart(2, '0')}:${String(dObj.getMinutes()).padStart(2, '0')}:${String(dObj.getSeconds()).padStart(2, '0')}`;
                }
            } else {
                const dObj = new Date(year, month, day);
                if (!isNaN(dObj.getTime())) {
                    return `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
                }
            }
        }

        const fallbackDate = new Date(str);
        if (fallbackDate && !isNaN(fallbackDate.getTime())) {
            const year = fallbackDate.getFullYear();
            if (year > 1900 && year < 2100) {
                const yyyy = fallbackDate.getFullYear();
                const mm = String(fallbackDate.getMonth() + 1).padStart(2, '0');
                const dd = String(fallbackDate.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }
        }

        return null;
    } catch (e) { 
        return null; 
    }
};

const formatDate = (iso) => {
    if (!iso) return '---';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function CorrectiveMaintenance() {
    const fileInputRef = useRef(null);
    const [tasks, setTasks] = useState([]);
    const [totalDbCount, setTotalDbCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [rowLimit, setRowLimit] = useState(100);
    const [showAllDates, setShowAllDates] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // Relational Data
    const [kanwils, setKanwils] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [assets, setAssets] = useState([]);

    // Filter Stats
    const [startMonth, setStartMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [endMonth, setEndMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [newTask, setNewTask] = useState({
        ticket_date: '', bit_ticket_number: '', 
        asset_id: '', technician_id: '', kanwil_id: '',
        supervisor_kc: '', problem_part: '', ticket_status: 'OPEN', 
        action: '', pic_uker: '', ticket_link: '', work_status: 'OPEN', 
        notes: '', schedule: '', reference: '', approval: 'PENDING', finished_at: null,
        evident: null
    });

    // Import Preview States
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [pendingImportData, setPendingImportData] = useState(null);
    const [isImportSaving, setIsImportSaving] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [startMonth, endMonth, rowLimit, showAllDates]);

    const fetchInitialData = async () => {
        const [kw, tech, ast] = await Promise.all([
            supabase.from('kanwils').select('id, name').order('name'),
            supabase.from('technicians').select('id, name').order('name'),
            supabase.from('managed_assets').select('id, tid, name, kc_supervisi').order('tid')
        ]);
        setKanwils(kw.data || []);
        setTechnicians(tech.data || []);
        setAssets(ast.data || []);
    };

    const fetchTasks = async () => {
        setLoading(true);
        const { count } = await supabase.from('corrective_maintenance').select('*', { count: 'exact', head: true });
        setTotalDbCount(count || 0);

        let query = supabase
            .from('corrective_maintenance')
            .select(`
                *,
                managed_assets(tid, name, kc_supervisi),
                technicians(name),
                kanwils(name)
            `);

        if (!showAllDates) {
            const start = `${startMonth}-01`;
            const endD = new Date(endMonth.split('-')[0], endMonth.split('-')[1], 0);
            const end = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
            query = query.gte('ticket_date', start).lte('ticket_date', end);
        }

        query = query.order('ticket_date', { ascending: false, nullsFirst: false });

        if (rowLimit !== 'all') {
            query = query.limit(rowLimit);
        }

        const { data, error } = await query;
        if (error) {
            console.error(error);
            alert("Gagal mengambil data dari database: " + error.message);
        } else {
            setTasks(data || []);
        }
        setLoading(false);
    };

    const updateTaskField = async (taskId, field, value) => {
        const { error } = await supabase
            .from('corrective_maintenance')
            .update({ [field]: value })
            .eq('id', taskId);
            
        if (error) {
            console.error('Update error:', error);
            alert(`Gagal update database: ${error.message}`);
        } else {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
        }
    };

    const filteredTasks = useMemo(() => {
        const s = searchTerm.toLowerCase();
        if (!s) return tasks;
        return tasks.filter(t => 
            t.managed_assets?.tid?.toLowerCase()?.includes(s) ||
            t.managed_assets?.name?.toLowerCase()?.includes(s) ||
            t.bit_ticket_number?.toLowerCase()?.includes(s) ||
            t.technicians?.name?.toLowerCase()?.includes(s) ||
            t.kanwils?.name?.toLowerCase()?.includes(s)
        );
    }, [tasks, searchTerm]);

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            const data = await parseExcelFile(file);
            const nK = (k) => k?.toString().trim().toUpperCase();
            
            const assetMap = {}; assets.forEach(a => assetMap[nK(a.tid)] = a.id);
            const assetNameMap = {}; assets.forEach(a => assetNameMap[nK(a.tid)] = a.name);
            const techMap = {}; technicians.forEach(t => techMap[nK(t.name)] = t.id);
            const kwMap = {}; kanwils.forEach(k => kwMap[nK(k.name)] = k.id);

            const { data: existingTickets } = await supabase
                .from('corrective_maintenance')
                .select('id, bit_ticket_number');
            
            const existingMap = {};
            existingTickets?.forEach(t => {
                if (t.bit_ticket_number) existingMap[nK(t.bit_ticket_number)] = t.id;
            });

            const newRecords = [];
            const updateRecords = [];
            const invalidRecords = [];

            data.forEach(item => {
                const norm = {};
                Object.keys(item).forEach(k => norm[nK(k)] = item[k]);

                const tid = nK(norm['TID']);
                const techName = nK(norm['PELAKSANA'] || norm['TEKNISI']);
                const kwName = nK(norm['KANWIL'] || norm['KANWIIL']);
                const ticketNum = nK(norm['NOMOR TIKET BIT'] || norm['TIKET BIT']);
                const t_date = getIsoDate(norm['TANGGAL TIKET'] || norm['TANGGAL'] || norm['DATE']);

                if (!tid && !t_date) return;

                const row = {
                    ticket_date: t_date,
                    bit_ticket_number: norm['NOMOR TIKET BIT'] || norm['TIKET BIT'] || '',
                    asset_id: assetMap[tid] || null,
                    technician_id: techMap[techName] || null,
                    kanwil_id: kwMap[kwName] || null,
                    supervisor_kc: norm['KC SUPERVISI'] || '',
                    problem_part: norm['PROBLEM PART'] || '',
                    ticket_status: item['STATUS'] || 'OPEN',
                    action: norm['TINDAKAN'] || '',
                    pic_uker: norm['PIC UKER'] || '',
                    ticket_link: norm['TIKET'] || '',
                    work_status: item['STATUS_1'] || item['STATUS'] || 'OPEN',
                    notes: norm['KETERANGAN'] || '',
                    schedule: getIsoDate(norm['JADWAL']),
                    reference: norm['REFERENSI'] || '',
                    approval: norm['APPROVAL'] || '',
                    finished_at: getIsoDate(norm['SELESAI']),
                    tid_preview: tid,
                    site_preview: assetNameMap[tid] || norm['LOKASI'] || 'Unknown',
                };

                if (!row.asset_id) {
                    invalidRecords.push({ ...row, reason: `TID ${tid} tidak ditemukan di database` });
                } else if (ticketNum && existingMap[ticketNum]) {
                    updateRecords.push({ ...row, id: existingMap[ticketNum] });
                } else {
                    newRecords.push(row);
                }
            });

            setPendingImportData({
                totalRows: data.length,
                newRecords,
                updateRecords,
                invalidRecords
            });
            setIsImportModalOpen(true);
        } catch (err) {
            console.error(err);
            alert('Gagal menganalisis file Excel: ' + err.message);
        }
        setLoading(false);
    };

    const handleConfirmImport = async () => {
        if (!pendingImportData) return;
        setIsImportSaving(true);
        try {
            const clean = (r) => {
                const { tid_preview, site_preview, ...rest } = r;
                return rest;
            };
            const toInsert = pendingImportData.newRecords.map(clean);
            const toUpdate = pendingImportData.updateRecords.map(clean);

            let successCount = 0;
            if (toInsert.length > 0) {
                const { error: insErr } = await supabase.from('corrective_maintenance').insert(toInsert);
                if (insErr) throw insErr;
                successCount += toInsert.length;
            }
            if (toUpdate.length > 0) {
                const { error: updErr } = await supabase.from('corrective_maintenance').upsert(toUpdate);
                if (updErr) throw updErr;
                successCount += toUpdate.length;
            }

            alert(`Berhasil mengimpor ${successCount} data CM.`);
            setIsImportModalOpen(false);
            setPendingImportData(null);
            fetchTasks();
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan data import: ' + err.message);
        } finally {
            setIsImportSaving(false);
        }
    };

    const handleAddCM = async () => {
        setIsSaving(true);
        const { error } = await supabase.from('corrective_maintenance').insert([newTask]);
        if (error) {
            alert(error.message);
        } else {
            setIsModalOpen(false);
            fetchTasks();
            setNewTask({
                ticket_date: '', bit_ticket_number: '', 
                asset_id: '', technician_id: '', kanwil_id: '',
                supervisor_kc: '', problem_part: '', ticket_status: 'OPEN', 
                action: '', pic_uker: '', ticket_link: '', work_status: 'OPEN', 
                notes: '', schedule: '', reference: '', approval: 'PENDING', finished_at: null,
                evident: null
            });
        }
        setIsSaving(false);
    };

    const handleExport = async () => {
        const exportData = filteredTasks.map(t => ({
            'TANGGAL TIKET': formatDate(t.ticket_date),
            'NOMOR TIKET BIT': t.bit_ticket_number,
            'TID': t.managed_assets?.tid || 'N/A',
            'LOKASI': t.managed_assets?.name || 'Unknown',
            'KC SUPERVISI': t.supervisor_kc,
            'KANWIIL': t.kanwils?.name || 'Induk',
            'PROBLEM PART': t.problem_part,
            'TINDAKAN': t.action,
            'PELAKSANA': t.technicians?.name || 'Unassigned',
            'STATUS (TICKET)': t.ticket_status,
            'STATUS (WORK)': t.work_status,
            'JADWAL': formatDate(t.schedule),
            'EVIDEN': t.evident || ''
        }));
        await exportToExcel(exportData, `Corrective_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-full mx-auto min-h-screen bg-slate-50">
            <AnimatePresence mode="wait">
                {selectedTask ? (
                    <CMDetailView 
                        key="detail"
                        task={selectedTask}
                        onBack={() => {
                            setSelectedTask(null);
                            fetchTasks();
                        }}
                        formatDate={formatDate}
                        kanwils={kanwils}
                        technicians={technicians}
                        assets={assets}
                        onUpdate={updateTaskField}
                    />
                ) : (
                    <motion.div
                        key="table"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />

                        <CMHeader 
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            onAddClick={() => setIsModalOpen(true)}
                            onImportClick={() => fileInputRef.current.click()}
                            onExportClick={handleExport}
                        />

                        <CMFilters 
                            startMonth={startMonth}
                            setStartMonth={setStartMonth}
                            endMonth={endMonth}
                            setEndMonth={setEndMonth}
                            showAllDates={showAllDates}
                            setShowAllDates={setShowAllDates}
                            rowLimit={rowLimit}
                            setRowLimit={setRowLimit}
                            tasksCount={tasks.length}
                            totalDbCount={totalDbCount}
                        />

                        <CMTable 
                            loading={loading}
                            filteredTasks={filteredTasks}
                            onRowClick={setSelectedTask}
                            onEvidentUpdate={updateTaskField}
                            formatDate={formatDate}
                            totalDbCount={totalDbCount}
                            onShowAllDates={() => setShowAllDates(true)}
                        />

                        <AddCMModal 
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            newTask={newTask}
                            setNewTask={setNewTask}
                            assets={assets}
                            kanwils={kanwils}
                            technicians={technicians}
                            onSave={handleAddCM}
                            isSaving={isSaving}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <CMImportPreviewModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                importData={pendingImportData}
                isSaving={isImportSaving}
                onConfirm={handleConfirmImport}
                formatDate={formatDate}
            />
        </motion.div>
    );
}
