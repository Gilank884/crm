import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiDatabase, FiPlus, FiRefreshCcw, FiAlertCircle } from 'react-icons/fi';
import { formatDate } from './maintenanceUtils';

const ImportPreviewModal = ({ 
    isOpen, 
    onClose, 
    importData, 
    isSaving, 
    onConfirm 
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                    <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                        {/* Header */}
                        <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <div className="animate-pulse-slow"><FiDatabase size={20} /></div>
                                    </div>
                                    Data Import Preview
                                </h3>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{importData.totalRows} baris ditemukan</span>
                                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-100">{importData.provisionedCount} asset baru di-sync</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-rose-500 transition-all border border-transparent hover:border-slate-100">
                                <FiX size={24} />
                            </button>
                        </div>

                        {/* Summary Bar */}
                        <div className="px-10 py-4 bg-blue-50/30 border-b border-blue-50 flex items-center gap-6 shrink-0 overflow-x-auto no-scrollbar">
                            <SummaryTile icon={<FiPlus />} label="BARU" count={importData.newRecords.length} color="text-emerald-600" bgColor="bg-emerald-50" />
                            <SummaryTile icon={<FiRefreshCcw />} label="UPDATE" count={importData.updateRecords.length} color="text-blue-600" bgColor="bg-blue-50" />
                            <SummaryTile icon={<FiCheck />} label="DILEWATI" count={importData.skipCount} color="text-slate-400" bgColor="bg-slate-100" />
                            <div className="w-px h-8 bg-slate-200 ml-auto mr-4" />
                            <SummaryTile label="OPEN" count={importData.openCount} color="text-amber-600" bgColor="bg-amber-50" icon={<div className="w-1.5 h-1.5 rounded-full bg-amber-500" />} />
                            <SummaryTile label="CLOSED" count={importData.closedCount} color="text-emerald-600" bgColor="bg-emerald-50" icon={<div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />} />
                        </div>

                        {/* List View */}
                        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30 custom-scrollbar">
                            <div className="space-y-3">
                                {[...importData.newRecords, ...importData.updateRecords].map((row, idx) => (
                                    <div key={idx} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ring-4 ring-offset-2 transition-all ${row.id ? 'bg-blue-50 text-blue-600 ring-blue-50/50' : 'bg-emerald-50 text-emerald-600 ring-emerald-50/50'}`}>
                                                {row.id ? 'UP' : 'NEW'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black text-slate-900 tracking-tight font-mono uppercase">{row.tid_preview}</span>
                                                    {row.is_new_asset && <span className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-tighter">New Asset</span>}
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-500 line-clamp-1 group-hover:text-slate-900 transition-colors uppercase">{row.site_preview}</p>
                                            </div>
                                            <div className="w-px h-8 bg-slate-100 mx-1" />
                                            <div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Scheduled</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-black text-slate-700 font-mono tracking-tighter">{formatDate(row.scheduled_date)}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">[{row.type}]</span>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Technician</span>
                                                <span className="text-[10px] font-black text-slate-700 truncate block max-w-[120px] uppercase">{row.tech_preview}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Kunjungan</span>
                                            {row.completed_date ? (
                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-lg border border-emerald-100 tracking-tighter uppercase whitespace-nowrap">SELESAI ({formatDate(row.completed_date)})</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[9px] font-black rounded-lg border border-amber-100 tracking-tighter uppercase whitespace-nowrap">MENUNGGU</span>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {importData.invalidRecords?.map((row, idx) => (
                                    <div key={`inv-${idx}`} className="bg-rose-50/50 border border-rose-100 p-5 rounded-2xl flex items-center justify-between group grayscale-[0.5] opacity-80">
                                        <div className="flex items-center gap-5">
                                            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center text-[10px] font-black">FAIL</div>
                                            <div>
                                                <span className="text-[11px] font-black text-rose-900 tracking-tight font-mono">{row.tid_preview}</span>
                                                <p className="text-[10px] font-bold text-rose-500 line-clamp-1">{row.site_preview}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-rose-600 font-black text-[9px] uppercase">
                                            <FiAlertCircle size={14} />
                                            {row.reason}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-10 py-8 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Konfirmasi Sinkronisasi</p>
                                <p className="text-[11px] font-bold text-slate-600 mt-1">Data yang valid akan dimasukkan ke database.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={onClose} className="px-8 py-3.5 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all">Batalkan</button>
                                <button onClick={onConfirm} disabled={isSaving} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-700 shadow-2xl shadow-blue-500/30 transition-all active:scale-95 disabled:bg-slate-300">
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
    <div className={`flex items-center gap-3 ${bgColor} px-4 py-2 rounded-xl border border-white/50 shadow-sm transition-all hover:scale-105`}>
        <div className={`${color}`}>{icon}</div>
        <div className="flex flex-col">
            <span className={`text-[8px] font-black ${color} tracking-tighter uppercase leading-none mb-0.5`}>{label}</span>
            <span className="text-sm font-black text-slate-900 leading-none tabular-nums">{count}</span>
        </div>
    </div>
);

export default ImportPreviewModal;
