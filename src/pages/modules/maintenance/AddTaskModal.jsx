import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCalendar, FiMapPin, FiUser, FiInfo } from 'react-icons/fi';

const AddTaskModal = ({ 
    isOpen, 
    onClose, 
    newTask, 
    setNewTask, 
    isSaving, 
    onAdd, 
    assets, 
    technicians 
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        {/* Header */}
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-800 tracking-tight uppercase">Tambah Jadwal Baru</h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Input Maintenance Task</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 transition-all">
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={onAdd} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <FiMapPin size={12} /> Asset (TID)
                                    </label>
                                    <select 
                                        required 
                                        value={newTask.asset_id} 
                                        onChange={(e) => setNewTask({ ...newTask, asset_id: e.target.value })} 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                                    >
                                        <option value="">Pilih Asset...</option>
                                        {assets.map(a => <option key={a.id} value={a.id}>{a.tid} - {a.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <FiUser size={12} /> Teknisi
                                    </label>
                                    <select 
                                        required 
                                        value={newTask.technician_id} 
                                        onChange={(e) => setNewTask({ ...newTask, technician_id: e.target.value })} 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                                    >
                                        <option value="">Pilih Teknisi...</option>
                                        {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <FiCalendar size={12} /> Tgl Jadwal
                                        </label>
                                        <input 
                                            type="date" 
                                            required 
                                            value={newTask.scheduled_date} 
                                            onChange={(e) => setNewTask({ ...newTask, scheduled_date: e.target.value })} 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <FiCalendar size={12} /> Tgl Target
                                        </label>
                                        <input 
                                            type="date" 
                                            value={newTask.target_date} 
                                            onChange={(e) => setNewTask({ ...newTask, target_date: e.target.value })} 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <FiInfo size={12} /> Alasan / Catatan
                                    </label>
                                    <textarea 
                                        value={newTask.reason} 
                                        onChange={(e) => setNewTask({ ...newTask, reason: e.target.value })} 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all min-h-[80px]" 
                                        placeholder="Tambahkan keterangan..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center gap-4">
                                <button type="button" onClick={onClose} className="flex-1 px-6 py-3.5 border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
                                <button type="submit" disabled={isSaving} className="flex-1 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:bg-slate-300">
                                    {isSaving ? 'Menyimpan...' : 'Simpan Jadwal'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddTaskModal;
