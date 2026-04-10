import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiDatabase, FiPlus, FiRefreshCcw, FiAlertCircle } from 'react-icons/fi';

const CMImportPreviewModal = ({ 
    isOpen, 
    onClose, 
    importData, 
    isSaving, 
    onConfirm,
    formatDate 
}) => {
    if (!importData) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose} 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
                    />
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 30 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.95, opacity: 0, y: 30 }} 
                        className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
                    >
                        {/* Header */}
                        <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
                                    <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                                        <FiDatabase size={20} />
                                    </div>
                                    Corrective Log Preview
                                </h3>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{importData.totalRows} baris dianalisis</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-rose-500 transition-all border border-transparent hover:border-slate-100">
                                <FiX size={24} />
                            </button>
                        </div>

                        {/* Summary Bar */}
                        <div className="px-10 py-4 bg-rose-50/30 border-b border-rose-50 flex items-center gap-6 shrink-0 overflow-x-auto no-scrollbar">
                            <SummaryTile icon={<FiPlus />} label="BARU" count={importData.newRecords.length} color="text-rose-600" bgColor="bg-rose-50" />
                            <SummaryTile icon={<FiRefreshCcw />} label="UPDATE" count={importData.updateRecords.length} color="text-blue-600" bgColor="bg-blue-50" />
                            <SummaryTile icon={<FiX />} label="GAGAL" count={importData.invalidRecords.length} color="text-slate-400" bgColor="bg-slate-100" />
                        </div>

                        {/* List View */}
                        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/20 custom-scrollbar">
                            <div className="space-y-3">
                                {importData.updateRecords.map((row, idx) => (
                                    <PreviewRow key={`upd-${idx}`} row={row} type="UPDATE" formatDate={formatDate} />
                                ))}
                                {importData.newRecords.map((row, idx) => (
                                    <PreviewRow key={`new-${idx}`} row={row} type="NEW" formatDate={formatDate} />
                                ))}
                                {importData.invalidRecords.map((row, idx) => (
                                    <PreviewRow key={`inv-${idx}`} row={row} type="FAIL" formatDate={formatDate} isInvalid />
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-10 py-8 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Konfirmasi Sinkronisasi CM</p>
                                <p className="text-[11px] font-bold text-slate-600">
                                    {importData.newRecords.length + importData.updateRecords.length} data valid siap di-import.
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={onClose} className="px-8 py-3.5 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all">Batalkan</button>
                                <button 
                                    onClick={onConfirm} 
                                    disabled={isSaving || (importData.newRecords.length === 0 && importData.updateRecords.length === 0)} 
                                    className="px-10 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-700 shadow-2xl shadow-rose-500/30 transition-all active:scale-95 disabled:bg-slate-200"
                                >
                                    {isSaving ? 'MEMPROSES...' : 'KONFIRMASI IMPORT'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const SummaryTile = ({ icon, label, count, color, bgColor }) => (
    <div className={`flex items-center gap-3 ${bgColor} px-4 py-2 rounded-xl border border-white/50 shadow-sm`}>
        <div className={`${color}`}>{icon}</div>
        <div className="flex flex-col">
            <span className={`text-[8px] font-black ${color} tracking-tighter uppercase leading-none mb-0.5`}>{label}</span>
            <span className="text-sm font-black text-slate-900 leading-none tabular-nums">{count}</span>
        </div>
    </div>
);

const PreviewRow = ({ row, type, formatDate, isInvalid = false }) => {
    let statusColor = "bg-rose-50 text-rose-600 ring-rose-50/50";
    if (type === "UPDATE") statusColor = "bg-blue-50 text-blue-600 ring-blue-50/50";
    if (isInvalid) statusColor = "bg-slate-200 text-slate-500 ring-slate-100";

    return (
        <div className={`bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group ${isInvalid ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            <div className="flex items-center gap-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black ring-4 ring-offset-2 transition-all ${statusColor}`}>
                    {type}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-slate-900 font-mono uppercase">[{row.tid_preview || 'N/A'}]</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{row.site_preview || 'Unknown Site'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{row.bit_ticket_number || 'No Ticket'}</span>
                        <span className="text-[10px] font-bold text-slate-400">/</span>
                        <span className="text-[10px] font-bold text-slate-400">{formatDate(row.ticket_date)}</span>
                    </div>
                </div>
                <div className="w-px h-8 bg-slate-100 mx-1" />
                <div className="max-w-[200px]">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Problem</span>
                    <p className="text-[10px] font-black text-slate-600 line-clamp-1 group-hover:text-slate-900 uppercase">{row.problem_part || '---'}</p>
                </div>
            </div>
            
            {isInvalid ? (
                <div className="flex items-center gap-2 text-rose-600 font-black text-[9px] uppercase">
                    <FiAlertCircle size={14} />
                    {row.reason}
                </div>
            ) : (
                <div className="text-right flex items-center gap-4">
                    {row.finished_at && (
                        <div className="text-right">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 whitespace-nowrap">Tgl Selesai</span>
                            <span className="text-[10px] font-black text-emerald-600 font-mono tracking-tighter">{formatDate(row.finished_at)}</span>
                        </div>
                    )}
                    <div className="text-right">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Ticket</span>
                        <span className={`px-3 py-1 text-[9px] font-black rounded-lg border tracking-tighter uppercase whitespace-nowrap ${row.work_status === 'FINISH' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                            {row.work_status || 'OPEN'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CMImportPreviewModal;
