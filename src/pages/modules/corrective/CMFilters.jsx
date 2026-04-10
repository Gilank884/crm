import React from 'react';
import { FiCalendar } from 'react-icons/fi';

const CMFilters = ({ 
    startMonth, 
    setStartMonth, 
    endMonth, 
    setEndMonth, 
    showAllDates, 
    setShowAllDates,
    rowLimit,
    setRowLimit,
    filterWorkStatus,
    setFilterWorkStatus,
    tasksCount,
    totalDbCount
}) => {
    return (
        <div className="flex flex-wrap items-center gap-5 px-6 py-3 bg-slate-50 border border-slate-200 rounded-xl mb-4">
            <div className="flex items-center gap-2">
                <FiCalendar size={12} className="text-slate-300" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Periode</span>
                <div className={`flex items-center transition-opacity ${showAllDates ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex items-center bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <input 
                            type="month" 
                            value={startMonth} 
                            onChange={(e) => setStartMonth(e.target.value)} 
                            className="bg-transparent border-none px-3 py-1.5 text-[9px] font-bold text-slate-600 outline-none w-32" 
                        />
                        <div className="w-px h-4 bg-slate-200" />
                        <input 
                            type="month" 
                            value={endMonth} 
                            onChange={(e) => setEndMonth(e.target.value)} 
                            className="bg-transparent border-none px-3 py-1.5 text-[9px] font-bold text-slate-600 outline-none w-32" 
                        />
                    </div>
                </div>
                <button 
                    onClick={() => setShowAllDates(!showAllDates)} 
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${showAllDates ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
                >
                    {showAllDates ? 'Show filtered' : 'Show All Dates'}
                </button>
            </div>
            
            <div className="ml-auto flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{tasksCount} / {totalDbCount} Records</div>
                    <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest opacity-60 text-right">Showing Current View / Global Total</div>
                </div>
                <div className="h-6 w-px bg-slate-200 mx-2" />
                <select 
                    value={filterWorkStatus} 
                    onChange={(e) => setFilterWorkStatus(e.target.value)} 
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black outline-none cursor-pointer transition-all uppercase tracking-tight border ${filterWorkStatus === 'OPEN' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-200'}`}
                >
                    <option value="ALL">ALL STATUS</option>
                    <option value="OPEN">BELUM SELESAI</option>
                </select>
                <div className="h-6 w-px bg-slate-200 mx-2" />
                <select 
                    value={rowLimit} 
                    onChange={(e) => setRowLimit(e.target.value)} 
                    className="bg-transparent border-none text-[9px] font-bold text-slate-600 outline-none cursor-pointer uppercase tracking-widest"
                >
                    <option value={20}>Limit 20</option>
                    <option value={50}>Limit 50</option>
                    <option value={100}>Limit 100</option>
                    <option value="all">Unlimited</option>
                </select>
            </div>
        </div>
    );
};

export default CMFilters;
