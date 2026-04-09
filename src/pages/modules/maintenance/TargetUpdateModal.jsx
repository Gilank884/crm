import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiClock, FiChevronRight, FiAlertCircle } from 'react-icons/fi';
import { formatDate } from './maintenanceUtils';

const TargetUpdateModal = ({ 
    isOpen, 
    onClose, 
    targetUpdateData, 
    isSaving, 
    onConfirm 
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
                        {/* Header */}
                        <div className="px-8 py-6 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                    <FiClock size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 tracking-tight uppercase">Konfirmasi Update Target</h3>
                                    <p className="text-[10px] font-bold text-amber-600 mt-1 uppercase tracking-widest">{targetUpdateData.count} perubahan terdeteksi</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 transition-all">
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 max-h-[60vh] overflow-y-auto bg-slate-50/30 custom-scrollbar">
                            <div className="space-y-4">
                                {targetUpdateData.updates.map((update, idx) => (
                                    <div key={idx} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-slate-900 tracking-tight font-mono">{update.tid}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase line-clamp-1">{update.site}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] font-black">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[8px] text-slate-300 uppercase">Lama</span>
                                                <span className="text-slate-400 font-mono">{formatDate(update.oldTarget)}</span>
                                            </div>
                                            <FiChevronRight className="text-slate-300" />
                                            <div className="flex flex-col items-start bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                                <span className="text-[8px] text-blue-400 uppercase">Baru</span>
                                                <span className="text-blue-600 font-mono">{formatDate(update.newTarget)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-white border-t border-slate-100 flex flex-col gap-4">
                            <div className="flex items-start gap-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                                <FiAlertCircle className="text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase">
                                    Ini akan memperbarui data target kunjungan pada {targetUpdateData.count} data maintenance sesuai dengan kecocokan TID dan Tanggal Jadwal.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 pt-2">
                                <button onClick={onClose} className="flex-1 px-6 py-3.5 border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
                                <button onClick={onConfirm} disabled={isSaving} className="flex-1 px-6 py-3.5 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-xl shadow-amber-500/20 transition-all active:scale-95 disabled:bg-slate-300">
                                    {isSaving ? 'MEMPROSES...' : 'UPDATE SEKARANG'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TargetUpdateModal;
