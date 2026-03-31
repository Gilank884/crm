import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiArrowRight, FiShield } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

export default function Login() {
    const navigate = useNavigate();
    const [npp, setNpp] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error: queryError } = await supabase
                .from('users')
                .select('*')
                .eq('no_npp', npp)
                .eq('password', password) // ⚠️ Note: Plain text for now as per user schema
                .single();

            if (queryError || !data) {
                setError('NPP atau Password salah. Silakan coba lagi.');
            } else {
                // Success: Store user in localStorage
                localStorage.setItem('user', JSON.stringify({
                    id: data.id,
                    no_npp: data.no_npp,
                    loggedInAt: new Date().toISOString()
                }));
                navigate('/dashboard');
            }
        } catch (err) {
            console.error(err);
            setError('Terjadi kesalahan koneksi ke server.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans selection:bg-blue-100">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="w-full max-w-md"
            >
                {/* Login Card */}
                <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-2xl shadow-slate-200/50 relative overflow-hidden backdrop-blur-xl bg-white/80">
                    <div className="text-center mb-10">
                        <div className="flex justify-center items-center gap-6 mb-8">
                            <img src="/Logo/jst.png" alt="JST Logo" className="h-12 object-contain" />
                            <div className="w-[1px] h-8 bg-slate-200" />
                            <img src="/Logo/wahana.png" alt="Wahana Logo" className="h-10 object-contain" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-1">CRM JST</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Internal Operations</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-red-50 border border-red-100 text-red-600 text-xs font-black uppercase tracking-widest p-4 rounded-2xl text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 pl-4">Nomor NPP</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <FiUser fontSize={18} />
                                    </div>
                                    <input 
                                        required
                                        type="text" 
                                        value={npp}
                                        onChange={(e) => setNpp(e.target.value)}
                                        placeholder="Masukkan NPP Anda"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 pl-4">Security Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <FiLock fontSize={18} />
                                    </div>
                                    <input 
                                        required
                                        type="password" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            disabled={loading}
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs tracking-[0.2em] uppercase shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Masuk Ke CRM <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Decorative Corner */}
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-50 rounded-tl-[4rem] -mr-8 -mb-8 z-0 opacity-50" />
                </div>

                <p className="text-center mt-10 text-[10px] uppercase font-black tracking-widest text-slate-400">
                    &copy; 2026 JST MAINTENANCE OPERATIONS. SECURE ACCESS ONLY.
                </p>
            </motion.div>
        </div>
    );
}
