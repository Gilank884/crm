import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    FiArrowLeft, FiCalendar, FiMapPin, FiUser, FiInfo, FiActivity, 
    FiClock, FiCheckCircle, FiImage, FiFileText, FiDatabase, 
    FiExternalLink, FiDownload, FiTool, FiLink, FiShield, 
    FiAlertCircle, FiChevronRight, FiMap, FiHash, FiEdit3, FiEye
} from 'react-icons/fi';

const CMDetailView = ({ task, onBack, formatDate, kanwils = [], technicians = [], assets = [], onUpdate }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    
    if (!task) return null;

    const handleChange = (field, val) => {
        if (onUpdate) onUpdate(task.id, field, val);
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex flex-col min-h-screen bg-slate-50 p-4 md:p-8"
        >
            {/* Main Unified Card */}
            <div className="max-w-5xl mx-auto w-full bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden flex flex-col">
                
                {/* 1. Header Area */}
                <div className="bg-white px-8 py-6 text-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100">
                    <div className="flex items-center gap-5">
                        <button 
                            onClick={onBack}
                            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-all group"
                        >
                            <FiArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-md">Corrective</span>
                                {isEditMode ? (
                                    <input 
                                        type="text" 
                                        value={task.bit_ticket_number || ''} 
                                        onChange={(e) => handleChange('bit_ticket_number', e.target.value)}
                                        className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-50 border border-slate-200 px-2 py-0.5 outline-none rounded"
                                    />
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{task.bit_ticket_number || '---'}</span>
                                )}
                            </div>
                            
                            {isEditMode ? (
                                <select 
                                    className="text-2xl font-black tracking-tight leading-none uppercase text-slate-900 bg-slate-50 border border-slate-200 outline-none rounded p-1"
                                    value={task.asset_id || ''}
                                    onChange={(e) => {
                                        const asset = assets.find(a => a.id === e.target.value);
                                        handleChange('asset_id', e.target.value);
                                        if (asset) handleChange('supervisor_kc', asset.kc_supervisi);
                                    }}
                                >
                                    <option value="">Select Site...</option>
                                    {assets.map(a => <option key={a.id} value={a.id}>[{a.tid}] {a.name}</option>)}
                                </select>
                            ) : (
                                <h1 className="text-2xl font-black tracking-tight leading-none uppercase text-slate-900">{task.managed_assets?.name || 'Unknown Site'}</h1>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditMode ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                        >
                            {isEditMode ? <><FiEye /> VIEW MODE</> : <><FiEdit3 /> DEV MODE</>}
                        </button>
                        <div className="flex items-center gap-3">
                            <StatusBadge label={task.ticket_status} type="ticket" isEdit={isEditMode} onChange={(val) => handleChange('ticket_status', val)} />
                            <StatusBadge label={task.work_status} type="work" isEdit={isEditMode} onChange={(val) => handleChange('work_status', val)} />
                        </div>
                    </div>
                </div>

                {/* 2. Core Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-8 p-8 bg-white border-b border-slate-50">
                    <PropItem label="TID Asset" val={task.managed_assets?.tid} icon={<FiHash className="text-rose-600" />} />
                    
                    <PropItem 
                        label="Kanwil" 
                        val={task.kanwils?.name} 
                        icon={<FiMap className="text-blue-600" />} 
                        isEdit={isEditMode}
                        type="select"
                        options={kanwils.map(k => ({ value: k.id, label: k.name }))}
                        currentValue={task.kanwil_id}
                        onUpdate={(v) => handleChange('kanwil_id', v)}
                    />
                    
                    <PropItem 
                        label="KC Supervisi" 
                        val={task.supervisor_kc} 
                        icon={<FiMapPin className="text-slate-500" />} 
                        isEdit={isEditMode}
                        onUpdate={(v) => handleChange('supervisor_kc', v)}
                    />
                    
                    <PropItem 
                        label="Tgl Tiket" 
                        val={formatDate(task.ticket_date)} 
                        icon={<FiCalendar className="text-indigo-600" />} 
                        isEdit={isEditMode}
                        type="date"
                        currentValue={task.ticket_date}
                        onUpdate={(v) => handleChange('ticket_date', v)}
                    />
                    
                    <PropItem 
                        label="Pelaksana" 
                        val={task.technicians?.name} 
                        icon={<FiUser className="text-emerald-600" />} 
                        isEdit={isEditMode}
                        type="select"
                        options={technicians.map(t => ({ value: t.id, label: t.name }))}
                        currentValue={task.technician_id}
                        onUpdate={(v) => handleChange('technician_id', v)}
                    />
                    
                    <PropItem 
                        label="PIC Uker" 
                        val={task.pic_uker} 
                        icon={<FiUser className="text-amber-600" />} 
                        isEdit={isEditMode}
                        onUpdate={(v) => handleChange('pic_uker', v)}
                    />
                    
                    <PropItem 
                        label="Jadwal Visit" 
                        val={formatDate(task.schedule)} 
                        icon={<FiClock className="text-slate-500" />} 
                        isEdit={isEditMode}
                        type="date"
                        currentValue={task.schedule}
                        onUpdate={(v) => handleChange('schedule', v)}
                    />
                    
                    <PropItem 
                        label="Selesai Di" 
                        val={task.finished_at ? formatDate(task.finished_at) : '---'} 
                        icon={<FiCheckCircle className="text-emerald-600" />} 
                        isEdit={isEditMode}
                        type="date"
                        currentValue={task.finished_at}
                        onUpdate={(v) => handleChange('finished_at', v)}
                    />
                </div>

                {/* 3. Main Content: Case Details & Evidence */}
                <div className="flex flex-col lg:flex-row p-8 gap-8">
                    
                    {/* Left: Problem & Solution Details */}
                    <div className="flex-1 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <ContentBox 
                                label="Problem Details" 
                                val={task.problem_part} 
                                icon={<FiAlertCircle className="text-rose-600" />} 
                                theme="rose" 
                                isEdit={isEditMode}
                                onUpdate={(v) => handleChange('problem_part', v)}
                            />
                            <ContentBox 
                                label="Action Performed" 
                                val={task.action} 
                                icon={<FiCheckCircle className="text-emerald-600" />} 
                                theme="emerald" 
                                isEdit={isEditMode}
                                onUpdate={(v) => handleChange('action', v)}
                            />
                        </div>

                        {/* Notes */}
                        <div className="relative group">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">Official Notes / Keterangan</label>
                            {isEditMode ? (
                                <textarea 
                                    className="w-full p-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold leading-relaxed outline-none focus:border-rose-300 transition-all min-h-[100px]"
                                    value={task.notes || ''}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                />
                            ) : (
                                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 text-xs font-bold leading-relaxed border-l-4 border-l-slate-400">
                                    {task.notes || 'No additional notes provided for this corrective maintenance log.'}
                                </div>
                            )}
                        </div>

                        {/* Ticket Link */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Integration Reference</label>
                            <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl transition-all group">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                    <FiLink size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">External Ticket Link / System ID</p>
                                    {isEditMode ? (
                                        <input 
                                            type="text" 
                                            className="w-full bg-transparent border-b border-slate-200 text-[11px] font-bold text-blue-800 outline-none focus:border-blue-400"
                                            value={task.ticket_link || ''}
                                            onChange={(e) => handleChange('ticket_link', e.target.value)}
                                        />
                                    ) : (
                                        <p className="text-[11px] font-bold text-blue-800 truncate">{task.ticket_link || '---'}</p>
                                    )}
                                </div>
                                {!isEditMode && task.ticket_link && (
                                    <a href={task.ticket_link} target="_blank" rel="noopener noreferrer">
                                        <FiExternalLink className="text-slate-400 hover:text-blue-500 transition-colors" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Evidence Preview */}
                    <div className="lg:w-80 flex flex-col gap-6">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Visual Evidence</label>
                        {task.evident ? (
                            <div className="space-y-4">
                                <div className="relative group rounded-xl overflow-hidden border border-slate-200 h-64 shadow-inner bg-slate-50">
                                    <img src={task.evident} alt="Evidence" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                        <a href={task.evident} target="_blank" rel="noopener noreferrer" className="p-3 bg-white rounded-lg text-slate-900 hover:scale-110 transition-transform">
                                            <FiActivity size={20} />
                                        </a>
                                        <button 
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = task.evident;
                                                link.download = `CM_${task.managed_assets?.tid}.jpg`;
                                                link.click();
                                            }}
                                            className="p-3 bg-white rounded-lg text-slate-900 hover:scale-110 transition-transform"
                                        >
                                            <FiDownload size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-64 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 gap-3 p-6 text-center">
                                <FiImage size={40} className="opacity-20" />
                                <span className="text-[10px] font-black uppercase tracking-widest leading-tight">No Snapshot<br/>Available</span>
                            </div>
                        )}

                        <div className="mt-auto pt-8 flex flex-col gap-3">
                           <PropItem 
                               label="Referensi" 
                               val={task.reference} 
                               icon={<FiShield className="text-indigo-600" />} 
                               isEdit={isEditMode}
                               onUpdate={(v) => handleChange('reference', v)}
                           />
                           <PropItem 
                               label="Approval Status" 
                               val={task.approval} 
                               icon={<FiShield className="text-emerald-600" />} 
                               isEdit={isEditMode}
                               type="select"
                               options={[{value: 'ON PROGRESS', label: 'ON PROGRESS'}, {value: 'APPROVED', label: 'APPROVED'}, {value: 'REJECTED', label: 'REJECTED'}]}
                               currentValue={task.approval}
                               onUpdate={(v) => handleChange('approval', v)}
                           />
                           <div className="h-px bg-slate-100 my-2" />
                           <button onClick={onBack} className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200">
                               Close & Sync
                           </button>
                        </div>
                    </div>

                </div>

                {/* Footer Reference */}
                <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between text-slate-500">
                    <div className="flex items-center gap-2">
                        <FiInfo size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Database entry ID: {task.id} • Created: {new Date(task.created_at).toLocaleString()}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40"> Gilank-CRM Engine V4.0</span>
                </div>
            </div>
        </motion.div>
    );
};

const PropItem = ({ label, val, icon, isEdit, type = 'text', options = [], currentValue, onUpdate }) => (
    <div className="flex items-start gap-3 group">
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-slate-400 transition-all">
            {React.cloneElement(icon, { size: 14 })}
        </div>
        <div className="flex-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
            {isEdit ? (
                type === 'select' ? (
                    <select 
                        value={currentValue || ''} 
                        onChange={(e) => onUpdate(e.target.value)}
                        className="w-full text-xs font-black text-slate-800 uppercase bg-white border-b border-slate-200 outline-none focus:border-rose-400"
                    >
                        <option value="">Select...</option>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                ) : (
                    <input 
                        type={type} 
                        value={currentValue || val || ''} 
                        onChange={(e) => onUpdate(e.target.value)}
                        className="w-full text-xs font-black text-slate-800 uppercase bg-white border-b border-slate-200 outline-none focus:border-rose-400"
                    />
                )
            ) : (
                <p className="text-[11px] font-bold text-slate-900 uppercase leading-none">{val || '---'}</p>
            )}
        </div>
    </div>
);

const ContentBox = ({ label, val, icon, theme, isEdit, onUpdate }) => {
    return (
        <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 leading-none">
                {icon} {label}
            </label>
            {isEdit ? (
                <textarea 
                    className="w-full p-6 rounded-xl border border-rose-100 bg-white text-xs font-black uppercase outline-none focus:border-rose-300 min-h-[80px]"
                    value={val || ''}
                    onChange={(e) => onUpdate(e.target.value)}
                />
            ) : (
                <div className="p-6 rounded-xl border border-slate-100 bg-slate-50/50 min-h-[80px]">
                    <p className="text-xs font-black uppercase tracking-tight leading-snug text-slate-900">
                        {val || 'Information not manually logged.'}
                    </p>
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ label, type, isEdit, onChange }) => {
    const val = (label || '').toUpperCase();
    const isTicket = type === 'ticket';
    
    if (isEdit) {
        const options = isTicket ? ['OPEN', 'CLOSED'] : ['OPEN', 'FINISH'];
        return (
            <div className="flex flex-col gap-1">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest text-center">{type}</span>
                <select 
                    value={val} 
                    onChange={(e) => onChange(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-black uppercase outline-none"
                >
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>
        );
    }

    let colorClass = 'bg-slate-50 text-slate-500 border-slate-200';
    if (val === 'OPEN') colorClass = isTicket ? 'bg-white text-slate-600 border-slate-800' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/10';
    if (val === 'CLOSED' || val === 'FINISH') colorClass = 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/10';
    if (val === 'ON PROGRESS') colorClass = 'bg-amber-600 text-white shadow-lg shadow-amber-500/10';

    return (
        <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center justify-center leading-none ${colorClass}`}>
            <span className="opacity-60 text-[7px] mb-1">{type}</span>
            {val || '---'}
        </div>
    );
};

export default CMDetailView;
