import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiActivity, FiSearch, FiArrowRight, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../../../supabaseClient';
import { getPerformanceStatus, formatDate } from './maintenanceUtils';

const StatListModal = ({ isOpen, onClose, type, onTaskClick }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen && type) {
            fetchStatsData();
        }
    }, [isOpen, type]);

    const fetchStatsData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('maintenance_tasks')
                .select(`
                    id, asset_id, technician_id, type, scheduled_date, target_date, completed_date, reason, evident,
                    managed_assets ( name, tid, kanwils ( name ) ),
                    technicians ( name )
                `)
                .order('scheduled_date', { ascending: false });

            if (error) throw error;
            
            // Filter by SLA status manually to ensure consistency with getPerformanceStatus util
            const filtered = data.filter(t => getPerformanceStatus(t) === type);
            setTasks(filtered);
        } catch (err) {
            console.error('Error loading stats detail:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredList = useMemo(() => {
        const s = searchTerm.toLowerCase();
        if (!s) return tasks;
        return tasks.filter(t => 
            t.managed_assets?.tid?.toLowerCase().includes(s) ||
            t.managed_assets?.name?.toLowerCase().includes(s) ||
            t.technicians?.name?.toLowerCase().includes(s)
        );
    }, [tasks, searchTerm]);

    const getHeaderColor = () => {
        if (type === 'MEET') return 'from-emerald-500 to-emerald-600';
        if (type === 'MISS') return 'from-rose-500 to-rose-600';
        return 'from-amber-500 to-amber-600';
    };

    const getStatusLabel = () => {
        if (type === 'MEET') return 'IN SLA (MEET)';
        if (type === 'MISS') return 'OUT SLA (MISS)';
        return 'ON PROGRESS';
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className={`px-8 py-6 bg-gradient-to-r ${getHeaderColor()} text-white flex items-center justify-between`}>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                    <FiActivity size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-[950] tracking-tight uppercase">{getStatusLabel()} RECORDS</h2>
                                    <p className="text-[10px] font-bold text-white/70 tracking-[0.2em] uppercase mt-1">Found {tasks.length} total across all periods</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                            >
                                <FiX size={24} />
                            </button>
                        </div>

                        {/* Search & Stats Bar */}
                        <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex items-center justify-between gap-6">
                            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2 flex-grow max-w-md focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
                                <FiSearch className="text-slate-400" size={14} />
                                <input 
                                    type="text"
                                    placeholder="Search within these records..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 ml-3 w-full placeholder:text-slate-300"
                                />
                            </div>
                            <div className="hidden md:flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Showing</div>
                                    <div className="text-[16px] font-black text-slate-800 leading-tight">{filteredList.length} Items</div>
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-grow overflow-y-auto p-4 md:p-8">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-800 rounded-full animate-spin" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hydrating Database Records...</p>
                                </div>
                            ) : filteredList.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">No matching records found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {filteredList.map(task => (
                                        <div 
                                            key={task.id}
                                            onClick={() => onTaskClick(task)}
                                            className="bg-white border border-slate-100 hover:border-slate-300 hover:shadow-md rounded-xl p-4 flex items-center justify-between group cursor-pointer transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                    type === 'MEET' ? 'bg-emerald-50 text-emerald-500' :
                                                    type === 'MISS' ? 'bg-rose-50 text-rose-500' :
                                                    'bg-amber-50 text-amber-500'
                                                }`}>
                                                    {type === 'MEET' ? <FiCheckCircle size={18} /> :
                                                     type === 'MISS' ? <FiAlertCircle size={18} /> :
                                                     <FiClock size={18} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">{task.managed_assets?.tid}</span>
                                                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                        <span className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">{task.managed_assets?.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                        <span>{formatDate(task.scheduled_date)}</span>
                                                        <FiArrowRight size={10} className="text-slate-300" />
                                                        <span>{task.technicians?.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="hidden sm:flex flex-col items-end">
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-0.5">Kanwil Induk</span>
                                                    <span className="text-[10px] font-black text-slate-600 uppercase">{task.managed_assets?.kanwils?.name || '---'}</span>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                    <FiArrowRight />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default StatListModal;
