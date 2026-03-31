// src/pages/Map.jsx

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { divIcon } from "leaflet";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "leaflet/dist/leaflet.css";
import { motion } from "framer-motion";
import { gsap } from "gsap";

// Create SVG-based DivIcon for crisp, scalable markers
function createSvgIcon(color = '#6EE7B7', label = '') {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
      <circle cx="12" cy="10" r="6" fill="${color}" stroke="#0b1220" stroke-width="1" />
      <path d="M12 18c-3 0-5-3-5-6 0-3.3 2.7-6 6-6s6 2.7 6 6c0 3-2 6-7 6z" fill="${color}" opacity="0.85"/>
    </svg>`;

    return divIcon({
        html: svg,
        className: '',
        iconSize: [18, 36],
        iconAnchor: [18, 36],
    });
}

const iconVisited = createSvgIcon('#2dd4bf'); // teal/green
const iconUnvisited = createSvgIcon('#5af500ff'); // gray-blue
const iconOverdue = createSvgIcon('#fb7185'); // pink/red

function chooseIcon(item) {
    if (!item.preventive) return iconUnvisited;
    if (item.preventive.status === "Done") return iconVisited;
    const today = new Date();
    const sla = new Date(item.preventive.tanggal_sla);
    if (today > sla) return iconOverdue;
    return iconUnvisited;
}

export default function Map({ filter }) {
    const [atmData, setAtmData] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        // small entrance animation for map markers container
        gsap.from('.marker-row', { opacity: 0, y: 10, stagger: 0.05, duration: 0.4 });
    }, [atmData]);

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

    const filtered = atmData.filter((item) => {
        if (filter === "all") return true;
        if (filter === "visited") return item.preventive?.status === "Done";
        if (filter === "unvisited") return !item.preventive;
        if (filter === "overdue") return item.preventive && new Date() > new Date(item.preventive.tanggal_sla);
        return true;
    });

    return (
        <div className="flex flex-col gap-3">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-dongker-800 rounded shadow">Total ATM: <b>{atmData.length}</b></div>
                <div className="p-3 bg-dongker-800 rounded shadow">Showing: <b>{filtered.length}</b></div>
                <div className="p-3 bg-dongker-800 rounded shadow">Legend: <span className="ml-2 inline-block w-3 h-3 bg-green-500 rounded-full" /> Visited</div>
            </motion.div>

            <div className="w-full h-[70vh] rounded overflow-hidden shadow-lg">
                <MapContainer center={[-6.2, 106.816]} zoom={10} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {filtered.map((item) => (
                        <Marker key={item.id} position={[Number(item.latitude), Number(item.longitude)]} icon={chooseIcon(item)}>
                            <Popup>
                                <div className="text-sm">
                                    <b>TID:</b> {item.tid}<br />
                                    <b>Lokasi:</b> {item.lokasi}<br />
                                    {item.preventive ? (
                                        <>
                                            <b>Status:</b> {item.preventive.status}<br />
                                            <b>SPK:</b> {item.preventive.tanggal_spk}<br />
                                            <b>SLA:</b> {item.preventive.tanggal_sla}
                                        </>
                                    ) : (
                                        <i>Tidak ada preventive bulan ini</i>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            <div className="bg-white rounded p-3 shadow">
                <h3 className="font-semibold mb-2">Quick List</h3>
                <div className="grid grid-cols-3 gap-2">
                    {filtered.slice(0, 9).map((i) => (
                        <div key={i.id} className="marker-row p-2 bg-dongker-700 rounded text-sm">
                            <div className="font-semibold">{i.tid}</div>
                            <div className="text-dongker-200">{i.lokasi}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
