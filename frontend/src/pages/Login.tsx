import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Compass, Eye, EyeOff, Lock, Mail, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
    const [showPass, setShowPass] = useState(false);
    const [serverError, setServerError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        setServerError('');
        try {
            const res = await authApi.login(data.email, data.password);
            login(res.data.access_token, res.data.user);
            const role = res.data.user.role;
            if (role === 'super_admin' || role === 'agency_admin' || role === 'agency_staff') navigate('/dashboard');
            else navigate('/customer/dashboard');
        } catch (err: any) {
            setServerError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        }
    };

    return (
        <div className="auth-page min-h-screen flex items-center justify-center py-12 px-4 pt-24">
            <div className="w-full max-w-md relative z-10">
                {/* Card */}
                <div className="auth-card backdrop-blur-xl border border-slate-200/90 rounded-3xl p-7 sm:p-10 shadow-2xl shadow-sky-950/10">
                    <div className="flex flex-col items-center mb-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 via-cyan-500 to-teal-400 shadow-lg shadow-sky-500/25 flex items-center justify-center mb-4 text-white">
                            <Compass className="w-8 h-8" />
                        </div>
                        <span className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold uppercase tracking-wider">
                            <Sparkles className="h-3.5 w-3.5 text-sky-600" /> Welcome back
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Ready for your next trip?</h1>
                        <p className="text-slate-500 text-sm mt-1.5">Sign in to your IslandGo account</p>
                    </div>

                    {serverError && (
                        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
                            {serverError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                Email address
                            </label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    {...register('email')}
                                    type="email"
                                    placeholder="your.email@example.com"
                                    autoComplete="off"
                                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs"
                                />
                            </div>
                            {errors.email && <p className="text-rose-500 text-xs font-semibold mt-1.5">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    {...register('password')}
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(p => !p)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                                >
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-rose-500 text-xs font-semibold mt-1.5">{errors.password.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-bold transition-all shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span>{isSubmitting ? 'Signing in…' : 'Sign in'}</span>
                            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-slate-500 text-sm">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-sky-600 hover:text-sky-800 font-bold transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
