import React from 'react';
import { FiActivity, FiSearch, FiEdit3, FiPlus, FiUpload, FiCommand, FiCheckCircle } from 'react-icons/fi';

const Header = ({ 
    typeFilter, 
    searchTerm, 
    setSearchTerm, 
    devMode, 
    setDevMode, 
    setModifiedTaskIds, 
    onOpenAddModal, 
    onImportAll 
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-6 px-8 py-5 bg-white border-b border-slate-100">
            {/* Left: Identity */}
            <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/10">
                    <FiActivity size={20} />
                </div>
                <div>
                    <h1 className="text-lg font-black text-slate-900 leading-tight tracking-tight flex items-center gap-2">
                        {typeFilter ? `Monthly ${typeFilter}` : 'Performance Ops'}
                        {devMode && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black uppercase tracking-wider rounded border border-amber-100">
                                <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                DEV
                            </div>
                        )}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <FiCheckCircle size={10} className="text-emerald-500" />
                        <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                            System Live • {new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Center: Search (Takes more space) */}
            <div className="flex justify-center relative group">
                <div className="relative w-full max-w-md">
                    <FiSearch size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search TID, Site, Technician..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-12 py-2.5 text-[11px] font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-center placeholder:text-center" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-300 pointer-events-none">
                        <FiCommand size={8} /> K
                    </div>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-3">
                <button
                    onClick={() => {
                        if (devMode) {
                            if (window.confirm("Exit Developer Mode? Internal state will be cleared.")) {
                                setDevMode(false);
                                setModifiedTaskIds(new Set());
                            }
                        } else {
                            setDevMode(true);
                        }
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] tracking-widest uppercase border transition-all active:scale-95 ${devMode ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm'}`}
                    title="Manual Data Overrides"
                >
                    <FiEdit3 size={13} />
                    {devMode ? 'Developer' : 'Edit Mode'}
                </button>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                <button 
                    onClick={onImportAll} 
                    className="p-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 rounded-xl border border-slate-200 transition-all active:scale-95 shadow-sm" 
                    title="Import All Data"
                >
                    <FiUpload size={16} />
                </button>

                <button 
                    onClick={onOpenAddModal} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                    <FiPlus size={16} />
                    <span>Add Entry</span>
                </button>
            </div>
        </div>
    );
};

export default Header;
