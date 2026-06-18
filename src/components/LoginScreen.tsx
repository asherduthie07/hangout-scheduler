import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, User, Lock, Eye, EyeOff, ShieldCheck, Heart } from 'lucide-react';
import { UserInfo } from '../types.js';

interface LoginScreenProps {
  onLoginSuccess: (user: UserInfo & { isAdminDev?: boolean }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'host' | 'booker'>('booker');
  
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Hidden indicator state for Admin trigger
  const isAdminCredentials = username.trim() === 'Admin' && password === 'asher29001';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please fill in all blanks.');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const body = isRegistering 
        ? { username: username.trim(), password: password.trim(), role }
        : { username: username.trim(), password: password.trim() };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const resData = await response.json();
      setIsLoading(false);

      if (resData.success) {
        if (isRegistering) {
          setSuccessMessage('Account created successfully! You can now log in.');
          setIsRegistering(false);
          setPassword('');
        } else {
          onLoginSuccess(resData.data);
        }
      } else {
        setErrorMessage(resData.error || 'Something went wrong.');
      }
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setErrorMessage('Error communicating with hangout server.');
    }
  }

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center bg-transparent text-text-main px-4 py-12 relative overflow-hidden">
      
      {/* Animated Floating Card */}
      <motion.div 
        id="login-card" 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 15 }}
        className="w-full max-w-md bg-bg-card/90 backdrop-blur-xl border border-border-custom shadow-xl rounded-3xl overflow-hidden transition-shadow duration-300 hover:shadow-2xl"
      >
        <div className="bg-bg-inner/60 px-8 py-8 relative overflow-hidden border-b border-border-custom">
          {/* Aesthetic warm bronze orb glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent-bronze/10 rounded-full filter blur-2xl pointer-events-none" />
          
          {/* Hidden indicator state for Admin trigger */}
          {isAdminCredentials && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-4 right-4 bg-accent-bronze/20 text-accent-bronze border border-accent-bronze/35 text-[9px] uppercase tracking-wider font-mono py-1 px-2.5 rounded-full flex items-center gap-1.5 font-bold"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Core Dev Mode
            </motion.div>
          )}

          <div className="flex items-center gap-3">
            <motion.div 
              className="p-3 bg-accent-main text-accent-text rounded-2xl shadow-md"
              whileHover={{ rotate: 5, scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Calendar className="w-5 h-5" />
            </motion.div>
            <div>
              <h1 className="text-base font-sans font-bold tracking-tight text-text-main">
                Hangouts & Appointments
              </h1>
              <div className="text-[10px] font-mono text-accent-bronze font-bold tracking-wider uppercase mt-0.5">
                SyncSchedule Suite
              </div>
            </div>
          </div>
          
          {/* Custom Doctor Bio Profile Badge */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 p-4 bg-bg-card/85 rounded-2xl border border-border-custom flex items-center gap-3.5 shadow-sm"
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-accent-bronze/20 p-0.5 shadow-sm flex items-center justify-center">
                <div className="w-full h-full bg-accent-main rounded-full flex items-center justify-center font-mono font-bold text-xs text-accent-text">
                  BZ
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-bg-card rounded-full" />
            </div>
            <div className="flex-grow">
              <div className="text-xs font-bold text-text-main flex items-center gap-1.5">
                Dr. Bion Zastakoti 
                <span className="text-[9px] font-bold bg-accent-soft text-accent-main px-2 py-0.5 rounded-full border border-accent-main/15">
                  Coordinator
                </span>
              </div>
              <p className="text-[10px] text-text-muted leading-tight mt-0.5">
                Schedule personal check-ins, coffee hangouts, or flexible calendar slots easily.
              </p>
            </div>
          </motion.div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <span className="w-1.5 h-3 bg-accent-main rounded-full" />
            {isRegistering ? 'Register Slot Identity' : 'Verify Identity'}
          </h2>

          {errorMessage && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-3 text-xs text-red-700 bg-red-500/10 border border-red-500/20 rounded-xl leading-relaxed font-medium"
            >
              {errorMessage}
            </motion.div>
          )}

          {successMessage && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-3 text-xs text-emerald-800 bg-emerald-500/10 border border-emerald-500/20 rounded-xl leading-relaxed font-medium"
            >
              {successMessage}
            </motion.div>
          )}

          {/* Role Choice (Only when registering) */}
          {isRegistering && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Join As</label>
              <div className="grid grid-cols-2 gap-3.5">
                <motion.button
                  type="button"
                  onClick={() => setRole('booker')}
                  whileTap={{ scale: 0.98 }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    role === 'booker'
                      ? 'bg-accent-main text-accent-text border-accent-main shadow-md'
                      : 'bg-bg-inner/60 text-text-muted border-border-custom hover:bg-bg-inner'
                  }`}
                >
                  Booker (Visitor)
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setRole('host')}
                  whileTap={{ scale: 0.98 }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    role === 'host'
                      ? 'bg-accent-main text-accent-text border-accent-main shadow-md'
                      : 'bg-bg-inner/60 text-text-muted border-border-custom hover:bg-bg-inner'
                  }`}
                >
                  Host (Admin)
                </motion.button>
              </div>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                <User className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Name or alias"
                className="w-full pl-9 pr-4 py-2.5 bg-bg-inner border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-accent-main focus:ring-2 focus:ring-accent-main/15 placeholder:text-text-muted/65 transition-all font-mono"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-bg-inner border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-accent-main focus:ring-2 focus:ring-accent-main/15 placeholder:text-text-muted/65 transition-all font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-muted hover:text-text-main transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full bg-accent-main hover:bg-accent-hover text-accent-text text-xs font-bold py-3 px-4 rounded-xl transition-colors shadow-sm focus:outline-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-accent-text/30 border-t-accent-text rounded-full animate-spin" />
            ) : isRegistering ? (
              'Create account & Log in'
            ) : (
              'Access Console'
            )}
          </motion.button>

          {/* Toggle Registering / Logging in */}
          <div className="text-center pt-1.5">
            <button
              type="button"
              className="text-[11px] text-text-muted hover:text-accent-main transition-all cursor-pointer underline underline-offset-4"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMessage('');
                setSuccessMessage('');
              }}
            >
              {isRegistering
                ? 'Already verified? Sign in here'
                : "Need access? Register your slot identity"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
