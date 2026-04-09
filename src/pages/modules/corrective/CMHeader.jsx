import React from 'react';
import { FiTool, FiSearch, FiPlus, FiUpload, FiDownload } from 'react-icons/fi';

const CMHeader = ({ 
    searchTerm, 
    setSearchTerm, 
    onAddClick, 
    onImportClick, 
    onExportClick 
}) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-5">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                        <FiTool size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-[950] text-slate-900 leading-none tracking-tight uppercase">Corrective Maintenance</h1>
                        <p className="text-[9px] font-bold text-slate-400 tracking-[0.15em] mt-1.5 grayscale uppercase opacity-70">Logistics & Service Portal</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-50 transition-all">
                        <FiSearch size={13} className="text-slate-300" />
                        <input 
                            type="text" 
                            placeholder="Search TID, Site, Ticket..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-700 w-40 ml-2 placeholder:text-slate-300" 
                        />
                    </div>
                    <button 
                        onClick={onAddClick} 
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-black text-[9px] tracking-wider uppercase transition-all shadow-sm active:scale-95"
                    >
                        <FiPlus size={13} /> ADD CM TICKET
                    </button>
                    <button 
                        onClick={onImportClick} 
                        className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 transition-all active:scale-95"
                        title="Import from Excel"
                    >
                        <FiUpload size={14} />
                    </button>
                    <button 
                        onClick={onExportClick} 
                        className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 transition-all active:scale-95"
                        title="Export to Excel"
                    >
                        <FiDownload size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CMHeader;
