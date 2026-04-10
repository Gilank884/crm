import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiCalendar, FiMapPin, FiUser, FiInfo, FiActivity, FiClock, FiCheckCircle, FiImage, FiFileText, FiDatabase, FiExternalLink, FiDownload } from 'react-icons/fi';
import { formatDate, getPerformanceStatus } from './maintenanceUtils';

const TaskDetailView = ({ task, onBack }) => {
    if (!task) return null;

    const status = getPerformanceStatus(task);
    const aging = task.scheduled_date && task.target_date 
        ? Math.round((new Date(task.target_date) - new Date(task.scheduled_date)) / (1000 * 60 * 60 * 24)) 
        : '---';

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col min-h-screen bg-slate-50"
        >
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-all flex items-center gap-2 group"
                    >
                        <FiArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Kembali ke Daftar</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ticket Details</span>
                        <span className="text-sm font-black text-slate-800 leading-none">{task.managed_assets?.tid || 'N/A'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <SLAChip status={status} />
                </div>
            </div>

            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
                {/* Hero Feature Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Panel: Primary Info */}
                    <div className="lg:col-span-8 space-y-8">
                        
                        {/* Summary Header */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                                <FiDatabase className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 text-white/5" size={240} />
                                <div className="relative z-10">
                                    <h1 className="text-5xl font-black tracking-tighter mb-4">{task.managed_assets?.name || 'Unknown Site'}</h1>
                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <FiMapPin className="text-blue-500" />
                                            <span className="text-sm font-bold uppercase tracking-wide">{task.managed_assets?.kanwils?.name || 'Induk Office'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <FiClock className="text-emerald-500" />
                                            <span className="text-sm font-bold uppercase tracking-wide">Period: {task.period || '---'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <FiActivity className="text-amber-500" />
                                            <span className="text-sm font-bold uppercase tracking-wide">{task.type} Maintenance</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 grid grid-cols-2 md:grid-cols-4 gap-8">
                                <BigStat label="Scheduled" val={formatDate(task.scheduled_date)} icon={<FiCalendar className="text-blue-500" />} />
                                <BigStat label="Target" val={formatDate(task.target_date)} icon={<FiClock className="text-emerald-500" />} />
                                <BigStat label="Completed" val={task.completed_date ? formatDate(task.completed_date) : 'On Progress'} icon={<FiCheckCircle className={task.completed_date ? "text-blue-500" : "text-slate-200"} />} />
                                <BigStat label="Aging" val={`${aging} Days`} icon={<FiActivity className="text-rose-500" />} />
                            </div>
                        </div>

                        {/* Detailed Specs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <FiUser size={14} className="text-blue-500" /> Technician Information
                                </h3>
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                        <FiUser size={32} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-slate-800 uppercase tracking-tight">{task.technicians?.name || 'Unassigned'}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Primary Staff</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <FiInfo size={14} className="text-emerald-500" /> Asset Meta
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TID</span>
                                        <span className="text-xs font-black text-slate-700">{task.managed_assets?.tid}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch</span>
                                        <span className="text-xs font-black text-slate-700">{task.managed_assets?.kc_supervisi || '---'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reason / Notes Section */}
                        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[200px] relative overflow-hidden">
                             <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                                <FiFileText size={14} className="text-amber-500" /> Maintenance Records & Notes
                            </h3>
                            <div className="relative z-10 bg-slate-50 p-8 rounded-3xl border border-slate-100 flex gap-6">
                                <div className="text-slate-200 shrink-0">
                                    <FiFileText size={48} />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-base font-bold text-slate-700 leading-relaxed italic">
                                        "{task.reason || (status === 'MEET' ? 'Maintenance pekerjaan selesai sesuai dengan jadwal yang ditentukan.' : 'Belum ada keterangan atau revisi yang dicatatkan pada tiket ini.')}"
                                    </p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4 italic">— Automated Log / Tech Notes</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Evidence & Actions */}
                    <div className="lg:col-span-4 space-y-8">
                        
                        {/* Evidence Card */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm sticky top-24">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <FiImage size={14} className="text-purple-500" /> Digital Evidence
                            </h3>

                            {task.evident ? (
                                <div className="space-y-6">
                                    <div className="group relative rounded-[2rem] overflow-hidden bg-slate-100 aspect-[4/5] shadow-lg border border-slate-200">
                                        <img src={task.evident} alt="Evidence" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        <div className="absolute inset-x-4 bottom-4 flex gap-2 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                                            <a 
                                                href={task.evident} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex-1 bg-white/90 backdrop-blur-md p-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-800 hover:bg-white transition-colors shadow-sm"
                                            >
                                                <FiExternalLink size={14} /> Full View
                                            </a>
                                            <button 
                                                className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl text-white hover:bg-slate-900 transition-colors shadow-sm"
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = task.evident;
                                                    link.download = `Evidence_${task.managed_assets?.tid}.jpg`;
                                                    link.click();
                                                }}
                                            >
                                                <FiDownload size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                        <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1">Upload Date</p>
                                        <p className="text-xs font-black text-purple-700 italic">Validated on server timestamp</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-[4/5] bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 gap-4 p-8 text-center">
                                    <div className="p-5 bg-white rounded-full shadow-sm">
                                        <FiImage size={40} className="text-slate-200" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Evidence Not Found</p>
                                        <p className="text-[9px] font-medium text-slate-400 mt-2">Silakan unggah foto bukti di kolom Evident pada tabel dashboard utama.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Sticky Actions Bar at bottom if needed */}
        </motion.div>
    );
};

const BigStat = ({ label, val, icon }) => (
    <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {icon} {label}
        </div>
        <p className="text-base md:text-xl font-black text-slate-800 tracking-tight leading-none uppercase">{val || '---'}</p>
    </div>
);

const SLAChip = ({ status }) => {
    const styles = {
        'MEET': 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30',
        'MISS': 'bg-rose-500 text-white shadow-xl shadow-rose-500/30',
        'ON PROGRESS': 'bg-slate-500 text-white shadow-xl shadow-slate-500/30'
    };
    return (
        <span className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase ${styles[status]}`}>
            {status}
        </span>
    );
};

export default TaskDetailView;
