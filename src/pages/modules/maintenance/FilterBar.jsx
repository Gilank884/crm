import { FiMapPin, FiUser, FiList, FiBarChart2, FiDownload, FiCalendar } from 'react-icons/fi';

const FilterBar = ({
    filterKanwil,
    setFilterKanwil,
    kanwils,
    filterTechnician,
    setFilterTechnician,
    technicians,
    rowLimit,
    setRowLimit,
    viewMode,
    setViewMode,
    onFetchTasks,
    onExportExcel,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dateFilterField,
    setDateFilterField,
    filterSla,
    setFilterSla,
    isAllPeriods,
    setIsAllPeriods
}) => {
    return (
        <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-100">
            {/* Left: Time & Period Filters */}
            <div className="flex items-center gap-2 group flex-shrink-0">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:border-blue-200 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
                    <FiCalendar size={13} className="text-slate-400 group-focus-within:text-blue-500" />
                    <select 
                        value={dateFilterField}
                        onChange={(e) => {
                            setDateFilterField(e.target.value);
                            onFetchTasks(undefined, undefined, undefined, undefined, undefined, undefined, e.target.value);
                        }}
                        className="bg-transparent border-none outline-none text-[10px] font-black text-slate-600 uppercase tracking-tight cursor-pointer"
                    >
                        <option value="scheduled_date">Schedule</option>
                        <option value="target_date">Target</option>
                    </select>
                    <div className="w-px h-3 bg-slate-300 mx-0.5" />
                    <div className="flex items-center gap-1.5">
                        <input 
                            type="date" 
                            disabled={isAllPeriods}
                            value={startDate} 
                            onChange={(e) => { 
                                setStartDate(e.target.value); 
                                onFetchTasks(e.target.value, endDate); 
                            }} 
                            className="bg-transparent border-none outline-none text-[10px] font-black text-slate-800 w-[105px] disabled:opacity-30" 
                        />
                        <span className="text-[10px] font-black text-slate-300">→</span>
                        <input 
                            type="date" 
                            disabled={isAllPeriods}
                            value={endDate} 
                            onChange={(e) => { 
                                setEndDate(e.target.value); 
                                onFetchTasks(startDate, e.target.value); 
                            }} 
                            className="bg-transparent border-none outline-none text-[10px] font-black text-slate-800 w-[105px] disabled:opacity-30" 
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        id="allPeriods"
                        checked={isAllPeriods} 
                        onChange={(e) => {
                            setIsAllPeriods(e.target.checked);
                            onFetchTasks(undefined, undefined, undefined, undefined, undefined, e.target.checked);
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/10 cursor-pointer"
                    />
                    <label htmlFor="allPeriods" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer whitespace-nowrap">All Periods</label>
                </div>
            </div>

            {/* Center: Search Metadata/Filters */}
            <div className="flex-grow flex items-center justify-center gap-3 min-w-0 overflow-hidden">
                <div className="w-px h-6 bg-slate-100 hidden xl:block" />
                
                {/* Regional Filter Group */}
                <div className="flex items-center gap-1.5 flex-shrink-1">
                    <select 
                        value={filterKanwil} 
                        onChange={(e) => { 
                            setFilterKanwil(e.target.value); 
                            onFetchTasks(undefined, undefined, e.target.value, filterTechnician); 
                        }} 
                        className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-600 outline-none cursor-pointer hover:border-blue-200 transition-all uppercase tracking-tight max-w-[150px]"
                    >
                        <option value="all">REGION: GLOBAL</option>
                        {kanwils.map(k => <option key={k.id} value={k.id}>{k.name.toUpperCase()}</option>)}
                    </select>
                </div>
                
                {/* Technician Filter Group */}
                <div className="flex items-center gap-1.5 flex-shrink-1">
                    <select 
                        value={filterTechnician} 
                        onChange={(e) => { 
                            setFilterTechnician(e.target.value); 
                            onFetchTasks(undefined, undefined, filterKanwil, e.target.value); 
                        }} 
                        className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-600 outline-none cursor-pointer hover:border-blue-200 transition-all max-w-[180px] uppercase tracking-tight"
                    >
                        <option value="all">TECH: GLOBAL</option>
                        {technicians.filter(t => filterKanwil === 'all' || t.kanwil_id === filterKanwil).map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                    </select>
                </div>

                {/* SLA Filter Section */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <select 
                        value={filterSla} 
                        onChange={(e) => setFilterSla(e.target.value)} 
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black outline-none cursor-pointer transition-all uppercase tracking-tight border ${filterSla === 'MEET' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : filterSla === 'MISS' ? 'bg-rose-50 text-rose-700 border-rose-200' : filterSla === 'ON PROGRESS' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200'}`}
                    >
                        <option value="all">SLA: ALL STATUS</option>
                        <option value="MEET">IN SLA</option>
                        <option value="MISS">OUT SLA</option>
                        <option value="ON PROGRESS">ON PROGRESS</option>
                    </select>
                </div>

                <div className="w-px h-6 bg-slate-100 hidden xl:block" />
            </div>

            {/* Right: Data Controls */}
            <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                <select 
                    value={rowLimit} 
                    onChange={(e) => {
                        const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                        setRowLimit(val);
                        onFetchTasks(undefined, undefined, filterKanwil, filterTechnician, val);
                    }} 
                    className="bg-white border border-slate-200 px-4 py-1.5 rounded-xl text-[10px] font-black text-slate-600 outline-none cursor-pointer hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm uppercase"
                    title="Limit Dataset"
                >
                    <option value={20}>LIMIT: 20</option>
                    <option value={50}>LIMIT: 50</option>
                    <option value={100}>LIMIT: 100</option>
                    <option value={200}>LIMIT: 200</option>
                    <option value="all">LIMIT: ALL</option>
                </select>

                <div className="w-px h-6 bg-slate-200" />

                <div className="flex items-center gap-2">
                    <button 
                        onClick={onExportExcel}
                        className="p-2.5 bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all active:scale-90 shadow-sm"
                        title="Export Premium Excel"
                    >
                        <FiDownload size={13} />
                    </button>
                    <button 
                        onClick={() => setViewMode(viewMode === 'table' ? 'chart' : 'table')} 
                        className={`p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm ${viewMode === 'chart' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 hover:text-blue-600 border-slate-200'}`} 
                        title={viewMode === 'chart' ? 'View Table' : 'View Performance Chart'}
                    >
                        {viewMode === 'chart' ? <FiList size={13} /> : <FiBarChart2 size={13} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilterBar;
