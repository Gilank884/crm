import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';

const TaskChart = ({ chartData }) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Performance Analytics</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">SLA Achievement Distribution</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm shadow-sm shadow-blue-500/20" />
                        <span className="text-[9px] font-black text-slate-600 tracking-wider">IN SLA</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-rose-400 rounded-sm shadow-sm shadow-rose-400/20" />
                        <span className="text-[9px] font-black text-slate-600 tracking-wider">OUT SLA</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-slate-400 rounded-sm shadow-sm shadow-slate-400/20" />
                        <span className="text-[9px] font-black text-slate-600 tracking-wider">ON PROGRESS</span>
                    </div>
                </div>
            </div>
            
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={0}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                            tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white border border-slate-100 shadow-xl rounded-xl p-4 min-w-[180px]">
                                            <p className="text-[10px] font-black text-slate-400 mb-3 tracking-widest uppercase border-b border-slate-50 pb-2">{payload[0].payload.name}</p>
                                            <div className="space-y-2">
                                                {payload.map((entry, idx) => (
                                                    <div key={idx} className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                            <span className="text-[10px] font-bold text-slate-600">{entry.name}</span>
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-900">{entry.value}%</span>
                                                    </div>
                                                ))}
                                                <div className="pt-2 mt-2 border-t border-slate-50 flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Total Data</span>
                                                    <span className="text-[10px] font-black text-blue-600">{payload[0].payload.totalRaw}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar 
                            dataKey="IN SLA" 
                            stackId="a" 
                            fill="#3b82f6" 
                            radius={[0, 0, 0, 0]} 
                            barSize={40}
                        />
                        <Bar 
                            dataKey="OUT SLA" 
                            stackId="a" 
                            fill="#f43f5e" 
                        />
                        <Bar 
                            dataKey="ON PROGRESS" 
                            stackId="a" 
                            fill="#94a3b8" 
                            radius={[6, 6, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default TaskChart;
