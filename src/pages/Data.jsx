// src/pages/Data.jsx

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";

export default function Data({ filter }) {
    const [atmData, setAtmData] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        const startOfMonth = `${year}-${month}-01`;
        const endOfMonth = `${year}-${month}-${lastDay}`;

        const { data: atm, error: errAtm } = await supabase.from("atm_data").select("*");
        if (errAtm) return console.error(errAtm);

        const { data: prev = [], error: errPrev } = await supabase
            .from("preventives")
            .select("*")
            .gte("tanggal_spk", startOfMonth)
            .lte("tanggal_spk", endOfMonth);

        if (errPrev) return console.error(errPrev);

        const merged = atm.map((a) => ({ ...a, preventive: prev.find((x) => x.atm_id === a.id) || null }));
        setAtmData(merged);
    }

    const filtered = atmData.filter((a) => {
        if (!filter || filter === "all") return true;
        if (filter === "visited") return a.preventive?.status === "Done";
        if (filter === "unvisited") return !a.preventive;
        if (filter === "overdue") return a.preventive && new Date() > new Date(a.preventive.tanggal_sla);
        return true;
    });

    function statusBadge(p) {
        if (!p) return <span className="badge badge-gray">Unvisited</span>;
        if (p.status === 'Done') return <span className="badge badge-green">Visited</span>;
        const today = new Date();
        const sla = new Date(p.tanggal_sla);
        if (today > sla) return <span className="badge badge-red">Overdue</span>;
        return <span className="badge badge-yellow">Pending</span>;
    }

    return (
        <div className="p-3">
            <motion.h1 className="text-2xl font-bold mb-4 text-dongker-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Daftar ATM
            </motion.h1>

            <div className="card">
                <table className="w-full table-auto">
                    <thead>
                        <tr className="text-left text-dongker-200">
                            <th className="px-3 py-2">TID</th>
                            <th className="px-3 py-2">Lokasi</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">SLA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((item) => (
                            <motion.tr key={item.id} whileHover={{ scale: 1.01 }} className="border-t border-dongker-700">
                                <td className="px-3 py-2">{item.tid}</td>
                                <td className="px-3 py-2">{item.lokasi}</td>
                                <td className="px-3 py-2">{statusBadge(item.preventive)}</td>
                                <td className="px-3 py-2">{item.preventive?.tanggal_sla || '-'}</td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
