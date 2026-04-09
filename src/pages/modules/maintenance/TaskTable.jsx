import React, { useState } from 'react';
import { FiChevronUp, FiChevronDown, FiMinus, FiMapPin, FiUser, FiCalendar, FiClock, FiFileText, FiInfo, FiActivity, FiDatabase, FiCheckCircle, FiImage, FiUploadCloud, FiTrash2, FiLoader } from 'react-icons/fi';
import { formatDate, getPerformanceStatus } from './maintenanceUtils';
import { supabase } from '../../../supabaseClient';

const TaskTable = ({
    tasks,
    sortConfig,
    requestSort,
    handleContextMenu,
    devMode,
    assets,
    technicians,
    updateTaskField,
    modifiedTaskIds,
    formatDate,
    onRowClick
}) => {
    return (
        <div className="overflow-x-auto selection:bg-blue-100">
            <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 uppercase tracking-widest text-[8.5px] font-[900] text-slate-500 select-none">
                        <th className="px-2 py-3 w-[40px] text-center border-r border-slate-200">#</th>
                        <th className="px-3 py-3 w-[110px] cursor-pointer hover:bg-slate-100/50 transition-colors group border-r border-slate-200" onClick={() => requestSort('tid')} onContextMenu={(e) => handleContextMenu(e, 'tid')}>
                            <div className="flex items-center gap-1.5">
                                <FiDatabase size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                <span>TID</span>
                                <SortIcon field="tid" config={sortConfig} />
                            </div>
                        </th>
                        <th className="px-4 py-3 cursor-pointer hover:bg-slate-100/50 transition-colors group border-r border-slate-200" onClick={() => requestSort('site')} onContextMenu={(e) => handleContextMenu(e, 'site')}>
                            <div className="flex items-center gap-1.5">
                                <FiMapPin size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                <span>Site Name</span>
                                <SortIcon field="site" config={sortConfig} />
                            </div>
                        </th>
                        <th className="px-4 py-3 w-[100px] cursor-pointer hover:bg-slate-100/50 transition-colors group border-r border-slate-200" onClick={() => requestSort('kanwil')} onContextMenu={(e) => handleContextMenu(e, 'kanwil')}>
                            <div className="flex items-center gap-1.5">
                                <FiActivity size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                <span>Wilayah</span>
                                <SortIcon field="kanwil" config={sortConfig} />
                            </div>
                        </th>
                        <th className="px-4 py-3 w-[130px] cursor-pointer hover:bg-slate-100/50 transition-colors group border-r border-slate-200" onClick={() => requestSort('tech')} onContextMenu={(e) => handleContextMenu(e, 'tech')}>
                            <div className="flex items-center gap-1.5">
                                <FiUser size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                <span>Technician</span>
                                <SortIcon field="tech" config={sortConfig} />
                            </div>
                        </th>
                        <th className="px-3 py-3 w-[100px] cursor-pointer hover:bg-slate-100/50 transition-colors group text-center border-r border-slate-200" onClick={() => requestSort('scheduled_date')} onContextMenu={(e) => handleContextMenu(e, 'scheduled_date')}>
                            <div className="flex items-center justify-center gap-1.5">
                                <FiCalendar size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                <span>Schedule</span>
                                <SortIcon field="scheduled_date" config={sortConfig} />
                            </div>
                        </th>
                        <th className="px-3 py-3 w-[100px] cursor-pointer hover:bg-slate-100/50 transition-colors group text-center border-r border-slate-200" onClick={() => requestSort('target_date')} onContextMenu={(e) => handleContextMenu(e, 'target_date')}>
                            <div className="flex items-center justify-center gap-1.5">
                                <FiClock size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                <span>Target</span>
                                <SortIcon field="target_date" config={sortConfig} />
                            </div>
                        </th>
                        <th className="px-3 py-3 w-[70px] cursor-pointer hover:bg-slate-100/50 transition-colors group text-center border-r border-slate-200">
                             <div className="flex items-center justify-center gap-1.5">
                                 <FiActivity size={12} className="text-slate-300" />
                                 <span>Aging</span>
                             </div>
                        </th>
                        <th className="px-3 py-3 w-[90px] cursor-pointer hover:bg-slate-100/50 transition-colors group text-center border-r border-slate-200" onClick={() => requestSort('status')} onContextMenu={(e) => handleContextMenu(e, 'status')}>
                            <div className="flex items-center justify-center gap-1.5">
                                <FiInfo size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                <span>SLA</span>
                                <SortIcon field="status" config={sortConfig} />
                            </div>
                        </th>
                        <th className="px-3 py-3 w-[100px] cursor-pointer hover:bg-slate-100/50 transition-colors group text-center border-r border-slate-200" onClick={() => requestSort('completed_date')} onContextMenu={(e) => handleContextMenu(e, 'completed_date')}>
                            <div className="flex items-center justify-center gap-1.5">
                                <FiCheckCircle size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                <span>Visit</span>
                                <SortIcon field="completed_date" config={sortConfig} />
                            </div>
                        </th>
                        <th className="px-4 py-3 min-w-[150px] border-r border-slate-200">
                             <div className="flex items-center gap-1.5 justify-center">
                                <FiFileText size={12} className="text-slate-300" />
                                <span>Reason</span>
                            </div>
                        </th>
                        <th className="px-4 py-3 w-[120px]">
                             <div className="flex items-center gap-1.5 justify-center">
                                <FiImage size={12} className="text-slate-300" />
                                <span>Evident</span>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {tasks.map((t, idx) => {
                        const aging = t.scheduled_date && t.target_date 
                            ? Math.round((new Date(t.target_date) - new Date(t.scheduled_date)) / (1000 * 60 * 60 * 24)) 
                            : '---';

                        const handleRowClick = (e) => {
                            // Don't trigger if clicking interactive elements
                            const tagName = e.target.tagName.toLowerCase();
                            if (['input', 'select', 'button', 'a', 'label', 'svg', 'path'].includes(tagName)) return;
                            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('label')) return;
                            
                            onRowClick(t);
                        };

                        return (
                            <tr 
                                key={t.id} 
                                onClick={handleRowClick}
                                className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/50 cursor-pointer transition-all group border-b border-slate-100`}
                            >
                                <td className="px-2 py-2 text-center border-r border-slate-100">
                                    <span className="text-[9px] font-black text-slate-300 font-mono italic">{idx + 1}</span>
                                </td>
                                <td className="px-3 py-2 border-r border-slate-100">
                                    {devMode ? (
                                        <select 
                                            value={t.asset_id} 
                                            onChange={(e) => updateTaskField(t.id, 'asset_id', e.target.value)}
                                            className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-700 outline-none w-full"
                                        >
                                            {assets.map(a => <option key={a.id} value={a.id}>{a.tid}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-[10px] font-black text-slate-700 tracking-tight font-mono">{t.managed_assets?.tid || 'N/A'}</span>
                                    )}
                                </td>
                                <td className="px-4 py-2 border-r border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-800 leading-tight uppercase line-clamp-1">{t.managed_assets?.name || '---'}</span>
                                        <span className="text-[8px] font-bold text-slate-400 mt-0.5 tracking-wider">{t.type} MAINTENANCE</span>
                                    </div>
                                </td>
                                <td className="px-4 py-2 border-r border-slate-100">
                                    <span className="text-[9px] font-black text-slate-500 tracking-widest uppercase line-clamp-1">{t.managed_assets?.kanwils?.name || 'Induk'}</span>
                                </td>
                                <td className="px-4 py-2 border-r border-slate-100">
                                    {devMode ? (
                                        <select 
                                            value={t.technician_id || ''} 
                                            onChange={(e) => updateTaskField(t.id, 'technician_id', e.target.value)}
                                            className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-700 outline-none w-full"
                                        >
                                            <option value="">Unassigned</option>
                                            {technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-[10px] font-black text-slate-600 tracking-tight group-hover:text-blue-600 transition-colors uppercase line-clamp-1">{t.technicians?.name || 'Unassigned'}</span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-center border-r border-slate-100">
                                    {devMode ? (
                                        <input 
                                            type="date" 
                                            value={t.scheduled_date || ''} 
                                            onChange={(e) => updateTaskField(t.id, 'scheduled_date', e.target.value)}
                                            className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-700 outline-none w-full"
                                        />
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-500 font-mono tracking-tight">{formatDate(t.scheduled_date)}</span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-center border-r border-slate-100">
                                    <input 
                                        type="date" 
                                        value={t.target_date || ''} 
                                        onChange={(e) => updateTaskField(t.id, 'target_date', e.target.value)}
                                        className={`bg-transparent text-[10px] font-bold text-slate-700 text-center outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:bg-white transition-all px-1 py-0.5 font-mono w-full ${modifiedTaskIds.has(t.id) ? 'text-amber-600' : ''}`}
                                    />
                                </td>
                                <td className="px-3 py-2 text-center border-r border-slate-100">
                                    <span className={`text-[10px] font-black font-mono ${aging === '---' ? 'text-slate-300' : aging > 30 ? 'text-rose-600' : 'text-slate-500'}`}>
                                        {aging}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-center border-r border-slate-100">
                                    <SLAChip status={getPerformanceStatus(t)} />
                                </td>
                                <td className="px-3 py-2 text-center border-r border-slate-100">
                                    {devMode ? (
                                        <input 
                                            type="date" 
                                            value={t.completed_date || ''} 
                                            onChange={(e) => updateTaskField(t.id, 'completed_date', e.target.value)}
                                            className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-700 outline-none w-full"
                                        />
                                    ) : (
                                        <span className={`text-[10px] font-bold font-mono tracking-tight ${t.completed_date ? 'text-blue-600' : 'text-slate-200 italic'}`}>
                                            {t.completed_date ? formatDate(t.completed_date) : 'PEN'}
                                        </span>
                                    )}
                                </td>
                                 <td className="px-4 py-2 border-r border-slate-100">
                                    <input 
                                        type="text" 
                                        value={t.reason || ''} 
                                        placeholder={getPerformanceStatus(t) === 'MEET' ? 'DONE' : '...'}
                                        onChange={(e) => updateTaskField(t.id, 'reason', e.target.value)}
                                        className="bg-transparent text-[10px] font-black text-slate-700 outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:bg-white transition-all w-full px-2 py-1 tracking-tight"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <EvidentCell task={t} onUpdate={(val) => updateTaskField(t.id, 'evident', val)} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// --- Sub-components used in Table ---

const SortIcon = ({ field, config }) => {
    if (config.key !== field) return <FiMinus size={10} className="text-slate-200" />;
    return config.direction === 'asc' ? <FiChevronUp size={10} className="text-blue-500" /> : <FiChevronDown size={10} className="text-blue-500" />;
};

const SLAChip = ({ status }) => {
    const styles = {
        'MEET': 'bg-emerald-100/40 text-emerald-700 border-emerald-200',
        'MISS': 'bg-rose-100/40 text-rose-700 border-rose-200',
        'PENDING': 'bg-slate-100 text-slate-500 border-slate-200'
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[8.5px] font-[900] border tracking-wider whitespace-nowrap shadow-sm ${styles[status]}`}>
            {status}
        </span>
    );
};

const EvidentCell = ({ task, onUpdate }) => {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${task.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `evidence/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('maintenance_evidence')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('maintenance_evidence')
                .getPublicUrl(filePath);

            onUpdate(publicUrl);
        } catch (error) {
            console.error('Error uploading image:', error.message);
            alert('Gagal upload gambar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Hapus bukti gambar ini?')) return;
        
        // Note: Full URL management might need extract path if we want to delete from storage
        // For simplicity, we just nullify the DB field here
        onUpdate(null);
    };

    if (uploading) {
        return (
            <div className="flex justify-center items-center">
                <FiLoader size={14} className="text-blue-500 animate-spin" />
            </div>
        );
    }

    if (task.evident) {
        return (
            <div className="flex items-center justify-center gap-2 group/evident">
                <a href={task.evident} target="_blank" rel="noopener noreferrer" className="relative block w-8 h-8 rounded border border-slate-200 overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all">
                    <img src={task.evident} alt="Evidence" className="w-full h-full object-cover" />
                </a>
                <button onClick={handleDelete} className="p-1.5 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 opacity-0 group-hover/evident:opacity-100 transition-all">
                    <FiTrash2 size={12} />
                </button>
            </div>
        );
    }

    return (
        <div className="flex justify-center">
            <label className="cursor-pointer p-1.5 rounded-lg border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-slate-400 hover:text-blue-500">
                <FiUploadCloud size={14} />
                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            </label>
        </div>
    );
};

export default TaskTable;
