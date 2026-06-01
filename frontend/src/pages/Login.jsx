import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiLock, FiArrowRight, FiMail, FiEye, FiEyeOff, FiKey } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '@/store/slices/authSlice';

function PinDot({ filled }) {
  return (
    <motion.div
      animate={filled ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.3 }}
      className={cn('w-3.5 h-3.5 rounded-full transition-colors', filled ? 'bg-accent' : 'bg-border')}
    />
  );
}

export default function Login() {
  const [pin, setPin] = useState('');
  const [loginMode, setLoginMode] = useState('pin');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const handlePinSubmit = async (pinValue) => {
    const pinToSubmit = pinValue || pin;
    if (pinToSubmit.length === 4) {
      const result = await dispatch(login({ pin: pinToSubmit }));
      if (login.fulfilled.match(result)) navigate('/');
    }
  };

  const handlePinChange = (digit) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) handlePinSubmit(newPin);
    }
  };

  const handleKeypadDelete = () => setPin(pin.slice(0, -1));

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) navigate('/');
  };

  const pinButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'back'],
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="glass-card p-8 relative">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 bg-gradient-to-br from-accent to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/20"
            >
              <FiZap className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-heading font-bold">Tuck Shop POS</h1>
            <p className="text-sm text-foreground-muted mt-1">Sign in to continue</p>
          </div>

          <AnimatePresence mode="wait">
            {loginMode === 'pin' ? (
              <motion.div key="pin" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <PinDot key={i} filled={pin.length > i} />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-[220px] mx-auto">
                  {pinButtons.map((row, ri) =>
                    row.map((btn, ci) => {
                      const key = `${ri}-${ci}`;
                      if (btn === '') return <div key={key} />;
                      if (btn === 'back') {
                        return (
                          <motion.button
                            key={key}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleKeypadDelete}
                            className="h-14 rounded-xl bg-background-tertiary hover:bg-border transition-colors flex items-center justify-center text-lg"
                          >
                            ⌫
                          </motion.button>
                        );
                      }
                      return (
                        <motion.button
                          key={key}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handlePinChange(btn)}
                          className="h-14 rounded-xl bg-background-tertiary hover:bg-border transition-colors text-lg font-semibold"
                        >
                          {btn}
                        </motion.button>
                      );
                    })
                  )}
                </div>

                <button
                  onClick={() => { setLoginMode('email'); dispatch(clearError()); }}
                  className="w-full text-sm text-accent hover:text-accent-hover transition-colors flex items-center justify-center gap-1"
                >
                  <FiMail className="w-4 h-4" /> Sign in with email instead
                </button>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-danger text-center">{error}</motion.p>
                )}
              </motion.div>
            ) : (
              <motion.form key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="input w-full pl-10" placeholder="admin@tuckshop.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                      className="input w-full pl-10 pr-10" placeholder="Enter password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors">
                      {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading || !email || !password}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  {loading ? 'Signing in...' : 'Sign In'} <FiArrowRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => { setLoginMode('pin'); dispatch(clearError()); }}
                  className="w-full text-sm text-accent hover:text-accent-hover transition-colors flex items-center justify-center gap-1">
                  <FiKey className="w-4 h-4" /> Use PIN instead
                </button>
                {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-danger text-center">{error}</motion.p>}
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-xs text-foreground-muted text-center mt-6">
          &copy; 2026 Tuck Shop POS. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
