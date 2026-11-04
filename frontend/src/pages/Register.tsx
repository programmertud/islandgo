import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Compass, Eye, EyeOff, User, Mail, Phone, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';

const registerSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    password_confirmation: z.string(),
    role: z.enum(['customer', 'agency_admin']),
}).refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ["password_confirmation"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
    const [showPass, setShowPass] = useState(false);
    const [serverError, setServerError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: 'customer'
        }
    });

    const selectedRole = watch('role');

    const onSubmit = async (data: RegisterForm) => {
        setServerError('');
        try {
            const res = await authApi.register(data);
            login(res.data.access_token, res.data.user);
            
            if (res.data.user.role === 'agency_admin') {
                navigate('/dashboard');
            } else {
                navigate('/customer/dashboard');
            }
        } catch (err: any) {
            setServerError(err.response?.data?.message || 'Failed to register. Please try again.');
        }
    };

    return (
        <div className="auth-page min-h-screen flex items-center justify-center py-12 px-4 pt-24">
            <div className="w-full max-w-lg relative z-10">
                <div className="auth-card backdrop-blur-xl border border-slate-200/90 rounded-3xl p-7 sm:p-10 shadow-2xl shadow-sky-950/10">
                    <div className="flex flex-col items-center mb-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 via-cyan-500 to-teal-400 shadow-lg shadow-sky-500/25 flex items-center justify-center mb-4 text-white">
                            <Compass className="w-8 h-8" />
                        </div>
                        <span className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Start your journey
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Create an account</h1>
                        <p className="text-slate-500 text-sm mt-1.5">Join IslandGo to manage tours &amp; bookings</p>
                    </div>

                    {serverError && (
                        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium text-center">
                            {serverError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-5">
                        
                        {/* Role Selector */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${
                                selectedRole === 'customer'
                                    ? 'bg-sky-50/80 border-sky-500 text-sky-800 shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}>
                                <input type="radio" value="customer" {...register('role')} className="hidden" />
                                <User className={`w-6 h-6 ${selectedRole === 'customer' ? 'text-sky-600' : 'text-slate-400'}`} />
                                <span className="text-xs font-bold uppercase tracking-wider">Customer</span>
                            </label>

                            <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${
                                selectedRole === 'agency_admin'
                                    ? 'bg-teal-50/80 border-teal-500 text-teal-800 shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}>
                                <input type="radio" value="agency_admin" {...register('role')} className="hidden" />
                                <Compass className={`w-6 h-6 ${selectedRole === 'agency_admin' ? 'text-teal-600' : 'text-slate-400'}`} />
                                <span className="text-xs font-bold uppercase tracking-wider">Travel Agency</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    {...register('name')}
                                    type="text"
                                    placeholder="e.g. Maria Santos"
                                    autoComplete="off"
                                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs"
                                />
                            </div>
                            {errors.name && <p className="text-rose-500 text-xs font-semibold mt-1.5">{errors.name.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Email address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-slate-400" />
                                    </div>
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
                                    Phone (Optional)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Phone className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        {...register('phone')}
                                        type="tel"
                                        placeholder="0917 123 4567"
                                        autoComplete="off"
                                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        {...register('password')}
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                        className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs"
                                    />
                                </div>
                                {errors.password && <p className="text-rose-500 text-xs font-semibold mt-1.5">{errors.password.message}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        {...register('password_confirmation')}
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
                                {errors.password_confirmation && <p className="text-rose-500 text-xs font-semibold mt-1.5">{errors.password_confirmation.message}</p>}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-3.5 px-6 rounded-2xl font-bold transition-all shadow-md mt-6 flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                                selectedRole === 'agency_admin' 
                                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-600/30' 
                                    : 'bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30'
                            }`}
                        >
                            <span>{isSubmitting ? 'Creating account…' : 'Create account'}</span>
                            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-slate-500 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-sky-600 hover:text-sky-800 font-bold transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
