import Header from './Header';
import Sidebar from './Sidebar';
import { useState } from 'react';

export default function Layout({ children }) {
    const [filter, setFilter] = useState('all');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
            {/* Header stays at the top */}
            <Header />

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar stays fixed on the left */}
                <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

                {/* Only the main content area scrolls */}
                <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="max-w-7xl mx-auto">
                        {children({ filter, setFilter })}
                    </div>
                </main>
            </div>
        </div>
    );
}
