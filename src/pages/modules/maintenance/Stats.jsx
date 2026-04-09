import React from 'react';
import { FiFileText, FiBox, FiTrendingUp } from 'react-icons/fi';

const Stats = ({ meetCount, missCount, pendingCount, totalCount, onExportTarget, onImportTarget, onStatClick }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-center gap-4 w-full px-8 py-4 bg-slate-50/50 border-b border-slate-100">
            {/* Stat Card 1 */}
            <div 
                onClick={() => onStatClick?.('MEET')}
                className="bg-white border border-slate-200 rounded-xl px-6 py-3 flex items-center justify-between shadow-sm group hover:border-emerald-200 cursor-pointer active:scale-95 transition-all"
            >
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">IN SLA</span>
                    <span className="text-2xl font-black text-slate-800 leading-none tabular-nums group-hover:text-emerald-700 transition-colors">{meetCount}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
            </div>

            {/* Stat Card 2 */}
            <div 
                onClick={() => onStatClick?.('MISS')}
                className="bg-white border border-slate-200 rounded-xl px-6 py-3 flex items-center justify-between shadow-sm group hover:border-rose-200 cursor-pointer active:scale-95 transition-all"
            >
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-rose-600 transition-colors">OUT SLA</span>
                    <span className="text-2xl font-black text-slate-800 leading-none tabular-nums group-hover:text-rose-700 transition-colors">{missCount}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                </div>
            </div>

            {/* Stat Card 3 */}
            <div 
                onClick={() => onStatClick?.('PENDING')}
                className="bg-white border border-slate-200 rounded-xl px-6 py-3 flex items-center justify-between shadow-sm group hover:border-amber-200 cursor-pointer active:scale-95 transition-all"
            >
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">PROGRESS</span>
                    <span className="text-2xl font-black text-slate-800 leading-none tabular-nums group-hover:text-amber-700 transition-colors">{pendingCount}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                </div>
            </div>

            {/* Total Section with Action Buttons (Distributed as Card 4) */}
            <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center shadow-lg shadow-blue-500/5">
                <div className="px-5 py-2 flex flex-col items-start flex-grow">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL ASSETS</span>
                    <div className="flex items-center gap-2">
                        <FiTrendingUp className="text-blue-600" size={12} />
                        <span className="text-xl font-black text-slate-900 leading-none tabular-nums">{totalCount}</span>
                    </div>
                </div>
                
                <div className="w-px h-8 bg-slate-200 mx-2" />
                
                <div className="flex items-center gap-1 pr-1.5">
                    <button 
                        onClick={onExportTarget}
                        className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all active:scale-95" 
                        title="Export Template Target"
                    >
                        <FiFileText size={16} />
                    </button>
                    <button 
                        onClick={onImportTarget}
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-all active:scale-95" 
                        title="Import/Update Target Only"
                    >
                        <FiBox size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Stats;
