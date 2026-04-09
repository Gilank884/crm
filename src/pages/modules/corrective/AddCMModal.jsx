import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AddCMModal = ({ 
    isOpen, 
    onClose, 
    newTask, 
    setNewTask, 
    assets, 
    kanwils, 
    technicians, 
    onSave, 
    isSaving 
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.9 }} 
                        className="bg-white p-8 rounded-none w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border border-white shadow-2xl"
                    >
                        <button 
                            onClick={onClose} 
                            className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors text-xl font-black"
                        >
                            ✕
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tighter uppercase leading-none border-b border-slate-100 pb-4">
                            New CM Ticket Injection
                        </h2>
                        
                        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="grid grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Tanggal Tiket</label>
                                <input required type="date" value={newTask.ticket_date} onChange={(e) => setNewTask({...newTask, ticket_date: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Nomor Tiket BIT</label>
                                <input type="text" value={newTask.bit_ticket_number} onChange={(e) => setNewTask({...newTask, bit_ticket_number: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" placeholder="BIT/XXXX/..." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">TID Asset</label>
                                <select required value={newTask.asset_id} onChange={(e) => {
                                    const asset = assets.find(a => a.id === e.target.value);
                                    setNewTask({...newTask, asset_id: e.target.value, supervisor_kc: asset?.kc_supervisi || ''});
                                }} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]">
                                    <option value="">Select TID...</option>
                                    {assets.map(a => <option key={a.id} value={a.id}>[{a.tid}] {a.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">KC Supervisi</label>
                                <input type="text" value={newTask.supervisor_kc} onChange={(e) => setNewTask({...newTask, supervisor_kc: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Kanwil Region</label>
                                <select required value={newTask.kanwil_id} onChange={(e) => setNewTask({...newTask, kanwil_id: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]">
                                    <option value="">Select Kanwil...</option>
                                    {kanwils.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Pelaksana / Teknisi</label>
                                <select required value={newTask.technician_id} onChange={(e) => setNewTask({...newTask, technician_id: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]">
                                    <option value="">Select Technician...</option>
                                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div className="col-span-3 space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Problem Part</label>
                                <input type="text" value={newTask.problem_part} onChange={(e) => setNewTask({...newTask, problem_part: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" placeholder="Card Reader, PC, etc..." />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Tindakan / Action</label>
                                <input type="text" value={newTask.action} onChange={(e) => setNewTask({...newTask, action: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" placeholder="Describe the repair action taken..." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">PIC Uker</label>
                                <input type="text" value={newTask.pic_uker} onChange={(e) => setNewTask({...newTask, pic_uker: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Tiket Link</label>
                                <input type="text" value={newTask.ticket_link} onChange={(e) => setNewTask({...newTask, ticket_link: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Keterangan Tambahan</label>
                                <input type="text" value={newTask.notes} onChange={(e) => setNewTask({...newTask, notes: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Jadwal Visit</label>
                                <input type="date" value={newTask.schedule} onChange={(e) => setNewTask({...newTask, schedule: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Status Tiket</label>
                                <select value={newTask.ticket_status} onChange={(e) => setNewTask({...newTask, ticket_status: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]">
                                    <option value="OPEN">OPEN</option>
                                    <option value="CLOSED">CLOSED</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 ml-2">Status Kerja</label>
                                <select value={newTask.work_status} onChange={(e) => setNewTask({...newTask, work_status: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-[11px]">
                                    <option value="OPEN">OPEN</option>
                                    <option value="FINISH">FINISH</option>
                                </select>
                            </div>
                            <div className="col-span-3 pt-6">
                                <button disabled={isSaving} type="submit" className="w-full py-6 bg-slate-900 border border-slate-800 text-white rounded-[2rem] font-[1000] text-[11px] tracking-[0.4em] uppercase shadow-2xl hover:bg-black hover:-translate-y-1 active:scale-95 transition-all">
                                    {isSaving ? 'INJECTING...' : 'COMMIT CM RECORD'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddCMModal;
