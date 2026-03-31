import Header from './Header';
import Sidebar from './Sidebar';
import { useState } from 'react';

export default function Layout({ children }) {
    const [filter, setFilter] = useState('all');

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
            <Header />

            <div className="flex">
                <Sidebar />

                <main className="flex-1 p-4">
                    {/* Provide filter via context-like prop (simple) */}
                    {children({ filter, setFilter })}
                </main>
            </div>
        </div>
    );
}
