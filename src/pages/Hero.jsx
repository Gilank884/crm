
import { useState } from "react";
import Data from "./Data";
import Map from "./Map";

export default function Hero() {
    const [activeTab, setActiveTab] = useState("data");

    return (
        <div className="w-full min-h-screen bg-gray-50">
            {/* Header Tabs */}
            <div className="flex justify-center gap-6 py-4 bg-white shadow">
                <button
                    className={`px-6 py-2 rounded font-semibold ${activeTab === "data"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                        }`}
                    onClick={() => setActiveTab("data")}
                >
                    Data ATM
                </button>

                <button
                    className={`px-6 py-2 rounded font-semibold ${activeTab === "map"
                        ? "bg-red-600 text-white"
                        : "bg-gray-200 text-gray-700"
                        }`}
                    onClick={() => setActiveTab("map")}
                >
                    Map ATM
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {activeTab === "data" ? <Data /> : <Map />}
            </div>
        </div>
    );
}
