import React from 'react';
import { FiActivity, FiTool, FiTrash2, FiUploadCloud, FiLoader, FiInfo } from 'react-icons/fi';
import { supabase } from '../../../supabaseClient';

const EvidentCell = ({ task, onUpdate }) => {
    const [uploading, setUploading] = React.useState(false);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `cm_${task.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `evidence/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('maintenance_evidence')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('maintenance_evidence')
                .getPublicUrl(filePath);

            onUpdate(publicUrl);
        } catch (error) {
            console.error('Error uploading image:', error.message);
            alert('Gagal upload gambar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Hapus bukti gambar ini?')) return;
        onUpdate(null);
    };

    if (uploading) {
        return (
            <div className="flex justify-center items-center">
                <FiLoader size={14} className="text-rose-500 animate-spin" />
            </div>
        );
    }

    if (task.evident) {
        return (
            <div className="flex items-center justify-center gap-2 group/evident" onClick={(e) => e.stopPropagation()}>
                <a 
                    href={task.evident} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="relative block w-8 h-8 rounded border border-slate-200 overflow-hidden hover:ring-2 hover:ring-rose-400 transition-all"
                >
                    <img src={task.evident} alt="Evidence" className="w-full h-full object-contain bg-slate-100" />
                </a>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                    }} 
                    className="p-1.5 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 opacity-0 group-hover/evident:opacity-100 transition-all"
                >
                    <FiTrash2 size={12} />
                </button>
            </div>
        );
    }

    return (
        <div className="flex justify-center">
            <label 
                onClick={(e) => e.stopPropagation()}
                className="cursor-pointer p-1.5 rounded-lg border border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/50 transition-all text-slate-400 hover:text-rose-600"
            >
                <FiUploadCloud size={14} />
                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            </label>
        </div>
    );
};

const CMTable = ({ 
    loading, 
    filteredTasks, 
    onRowClick, 
    onEvidentUpdate, 
    formatDate,
    totalDbCount,
    onShowAllDates 
}) => {
    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[2520px]">
                    <thead className="bg-slate-100/50 text-slate-400 border-b border-slate-200">
                        <tr className="text-[9px] font-black tracking-widest uppercase align-middle">
                            <th className="px-3 py-3 border-r border-slate-200 w-12 text-center bg-slate-200/20">#</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-32">TANGGAL TIKET</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-44">NOMOR TIKET BIT</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-24">TID</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-56">LOKASI</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-44">KC SUPERVISI</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-44">KANWIIL</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-56">PROBLEM PART</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-32 text-center">STATUS</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-56">TINDAKAN</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-44">PELAKSANA</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-44">PIC UKER</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-44">TIKET</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-32 text-center">STATUS</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-56">KETERANGAN</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-32 text-center">JADWAL</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-44">REFERENSI</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-32 text-center">APPROVAL</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-44">CREATE</th>
                            <th className="px-3 py-3 border-r border-slate-200 w-44">SELESAI</th>
                            <th className="px-3 py-3 w-[120px] text-center">EVIDEN</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            Array(10).fill(0).map((_, i) => <tr key={i} className="h-10 animate-pulse"><td colSpan="20" className="px-3"><div className="h-2 bg-slate-50 rounded w-full opacity-60" /></td></tr>)
                        ) : filteredTasks.length === 0 ? (
                            <tr className="bg-slate-50/50">
                                <td colSpan="20" className="py-40 text-center">
                                   <div className="flex flex-col items-center gap-4">
                                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-2">
                                        <FiActivity className="text-slate-200 animate-pulse" size={32} />
                                      </div>
                                      <div className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">No Records in Current Filter</div>
                                      {totalDbCount > 0 && (
                                          <div className="max-w-xs space-y-4">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                                Ditemukan <span className="text-rose-500">{totalDbCount} data </span> di database, tetapi tidak ada yang cocok dengan periode yang dipilih.
                                            </p>
                                            <button 
                                                onClick={onShowAllDates}
                                                className="px-6 py-2.5 bg-white border-2 border-slate-200 hover:border-rose-500 hover:text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                                            >
                                                Tampilkan Seluruh Data
                                            </button>
                                          </div>
                                      )}
                                   </div>
                                </td>
                            </tr>
                        ) : (
                            filteredTasks.map((task, idx) => (
                                <tr 
                                    key={task.id} 
                                    onClick={() => onRowClick(task)}
                                    className="text-[10px] uppercase font-bold hover:bg-slate-50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-3 py-2 border-r border-slate-100 text-center bg-slate-100/10 text-slate-300 font-mono text-[9px]">{idx + 1}</td>
                                    <td className={`px-3 py-2 border-r border-slate-100 font-mono ${task.ticket_date ? 'text-slate-600' : 'text-rose-300 bg-rose-50/30'}`}>{formatDate(task.ticket_date)}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-blue-600">{task.bit_ticket_number}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 font-mono text-rose-500">{task.managed_assets?.tid || '---'}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 truncate text-slate-800 tracking-tight">{task.managed_assets?.name || '---'}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-slate-400">{task.supervisor_kc}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-slate-400">{task.kanwils?.name || '---'}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-slate-600 tracking-tight">{task.problem_part}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${task.ticket_status?.toUpperCase() === 'OPEN' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>{task.ticket_status}</span>
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-slate-600">{task.action}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-slate-800">{task.technicians?.name || '---'}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-slate-400">{task.pic_uker}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-blue-500">{task.ticket_link}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${task.work_status?.toUpperCase() === 'FINISH' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{task.work_status}</span>
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-slate-600 italic">{task.notes}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-center font-mono text-slate-400">{formatDate(task.schedule)}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-slate-400">{task.reference}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black ${task.approval === 'APPROVED' ? 'text-emerald-500' : 'text-slate-300'}`}>{task.approval}</span>
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-100 font-mono text-slate-300 text-[8px]">{new Date(task.created_at).toLocaleString('id-ID')}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 font-mono text-slate-500">{formatDate(task.finished_at)}</td>
                                    <td className="px-3 py-2 text-center">
                                        <EvidentCell task={task} onUpdate={(val) => onEvidentUpdate(task.id, 'evident', val)} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-white border-t border-slate-200 px-8 py-8 text-center text-slate-400">
                <FiInfo size={40} className="mx-auto mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">End of Corrective Logs</p>
            </div>
        </div>
    );
};

export default CMTable;
