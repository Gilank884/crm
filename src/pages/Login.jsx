import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiArrowRight } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const AnimatedBlob = ({ className, delay = 0, duration = 25 }) => (
    <motion.div
        animate={{
            x: [0, 80, -40, 0],
            y: [0, -100, 40, 0],
            scale: [1, 1.15, 0.9, 1],
            rotate: [0, 90, 180, 270, 360],
        }}
        transition={{
            duration,
            repeat: Infinity,
            delay,
            ease: "easeInOut",
        }}
        className={`absolute rounded-full blur-[110px] opacity-20 pointer-events-none ${className}`}
    />
);

export default function Login() {
    const navigate = useNavigate();
    const [npp, setNpp] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.6, ease: "easeOut" }
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error: queryError } = await supabase
                .from('users')
                .select('*')
                .eq('no_npp', npp)
                .eq('password', password)
                .single();

            if (queryError || !data) {
                setError('NPP atau Password salah. Silakan coba lagi.');
            } else {
                localStorage.setItem('user', JSON.stringify({
                    id: data.id,
                    no_npp: data.no_npp,
                    name: data.name,
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans selection:bg-blue-100 overflow-hidden relative">
            {/* Soft Pastel Background */}
            <div className="fixed inset-0 bg-slate-50/50">
                <AnimatedBlob className="w-[600px] h-[600px] bg-blue-300 top-[-15%] right-[-10%]" delay={0} />
                <AnimatedBlob className="w-[500px] h-[500px] bg-indigo-200 bottom-[-10%] left-[-5%]" delay={3} duration={30} />
                <AnimatedBlob className="w-[450px] h-[450px] bg-sky-200 top-[30%] left-[10%]" delay={7} duration={22} />
                
                {/* Clean Dot Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%236366f1'/%3E%3C/svg%3E")` }} 
                />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-md relative z-10"
            >
                {/* High-Energy Glass Card */}
                <div className="bg-white/80 border border-white rounded-[3.5rem] p-12 shadow-[0_50px_100px_-20px_rgba(15,23,42,0.15),0_30px_60px_-30px_rgba(0,0,0,0.3)] backdrop-blur-2xl relative overflow-hidden group">
                    {/* Interior Radiance */}
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-100/50 rounded-full blur-[80px] pointer-events-none transition-all duration-1000 group-hover:scale-110" />
                    
                    <div className="relative z-10">
                        {/* Header Section */}
                        <motion.div variants={itemVariants} className="text-center mb-12">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">CRM JST</h1>
                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.4em] mb-12 opacity-90">Internal Operations</p>
                            
                            <div className="flex justify-center items-center gap-8 py-4 px-6 bg-slate-50/80 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
                                <img src="/Logo/jst.png" alt="JST Logo" className="h-12 object-contain" />
                                <div className="w-[1px] h-8 bg-slate-200" />
                                <img src="/Logo/wahana.png" alt="Wahana Logo" className="h-10 object-contain" />
                            </div>
                        </motion.div>

                        <form onSubmit={handleLogin} className="space-y-8">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl text-center shadow-sm"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-6">
                                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">Nomor NPP</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 group-focus-within/input:text-blue-500 transition-colors">
                                            <FiUser fontSize={20} />
                                        </div>
                                        <input
                                            required
                                            type="text"
                                            value={npp}
                                            onChange={(e) => setNpp(e.target.value)}
                                            placeholder="Masukkan NPP"
                                            className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-6 text-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                                        />
                                    </div>
                                </motion.div>

                                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">Security Password</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 group-focus-within/input:text-blue-500 transition-colors">
                                            <FiLock fontSize={20} />
                                        </div>
                                        <input
                                            required
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-6 text-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                                        />
                                    </div>
                                </motion.div>
                            </div>

                            <motion.button
                                variants={itemVariants}
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={loading}
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xs tracking-[0.25em] uppercase shadow-[0_20px_40px_-12px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-4 disabled:opacity-50 group"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Authorize & Enter <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </motion.button>
                        </form>
                    </div>
                </div>

                <motion.p 
                    variants={itemVariants}
                    className="text-center mt-12 text-[10px] uppercase font-black tracking-[0.3em] text-slate-400"
                >
                    &copy; 2026 JST MAINTENANCE OPERATIONS. <span className="text-slate-500 ml-2">SECURE PORTAL V.P</span>
                </motion.p>
            </motion.div>
        </div>
    );
}
