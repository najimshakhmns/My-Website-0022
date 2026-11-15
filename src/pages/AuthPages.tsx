import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';

function getPasswordStrength(pw: string): { label: string; score: number; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', score: 25, color: '#DC2626' };
  if (score === 2) return { label: 'Fair', score: 50, color: '#D97706' };
  if (score === 3) return { label: 'Good', score: 75, color: '#2563EB' };
  return { label: 'Strong', score: 100, color: '#16A34A' };
}

export const LoginPage: React.FC = () => {
  const { navigate, setSessionUser, refreshMe, notify, websiteSettings } = useStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        authMode: 'none',
        body: JSON.stringify({ identifier, password, rememberMe }),
      });
      setSessionUser(res.user, res.token, rememberMe);
      await refreshMe();
      notify(`Welcome back, ${res.user.fullName}`, 'success');
      navigate('/account');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#FAF9F6]">
      <div className="w-full max-w-md bg-white border border-neutral-200 p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandLogo size="lg" companyName={websiteSettings?.companyName || 'MNS FASHION BRAND'} />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[#111111] pt-2">
            Client Sign In
          </h1>
          <p className="text-xs text-neutral-500">
            Access your saved addresses, order history, and wishlist.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
              Email or Mobile Number
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="email@example.com or 01XXXXXXXXX"
              className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-[#111111]"
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="underline text-neutral-700 hover:text-[#111111]"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors"
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-4 border-t border-neutral-200 text-center text-xs text-neutral-600">
          New to MNS Fashion Brand?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="font-semibold text-[#111111] underline"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { navigate, setSessionUser, refreshMe, notify, websiteSettings } = useStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        authMode: 'none',
        body: JSON.stringify({ fullName, email, mobile, password, confirmPassword }),
      });
      setSessionUser(res.user, res.token, true);
      await refreshMe();
      notify('Account created successfully!', 'success');
      navigate('/account');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#FAF9F6]">
      <div className="w-full max-w-md bg-white border border-neutral-200 p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandLogo size="lg" companyName={websiteSettings?.companyName || 'MNS FASHION BRAND'} />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[#111111] pt-2">
            Create Account
          </h1>
          <p className="text-xs text-neutral-500">
            Join MNS Fashion Brand for faster checkout and verified order tracking.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahim Uddin"
              className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
              Bangladesh Mobile Number *
            </label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-[#111111]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
              Password (min 8 chars) *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
            />
            {password && (
              <div className="mt-1.5 space-y-1">
                <div className="h-1 bg-neutral-200">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                  />
                </div>
                <div className="text-[11px] text-neutral-500">Strength: {strength.label}</div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
              Confirm Password *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors"
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="pt-4 border-t border-neutral-200 text-center text-xs text-neutral-600">
          Already registered?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-[#111111] underline"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { navigate, notify } = useStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sandboxOtp, setSandboxOtp] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const strength = getPasswordStrength(newPassword);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string; sandboxDeliveryCode?: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          authMode: 'none',
          body: JSON.stringify({ identifier }),
        }
      );
      notify(res.message, 'info');
      setCooldown(45);
      if (res.sandboxDeliveryCode) {
        setSandboxOtp(res.sandboxDeliveryCode);
      }
      setStep(2);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        authMode: 'none',
        body: JSON.stringify({ identifier, otp, newPassword, confirmPassword }),
      });
      notify(res.message, 'success');
      setStep(3);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#FAF9F6]">
      <div className="w-full max-w-md bg-white border border-neutral-200 p-8 space-y-6 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">Account Recovery</p>
          <h1 className="font-serif text-3xl font-semibold text-[#111111] mt-1">
            Reset Password
          </h1>
        </div>

        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-sm text-neutral-600">
              Enter your registered email or mobile number. We will issue a time-limited 6-digit verification code.
            </p>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                Email or Mobile Number
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="email@example.com or 01XXXXXXXXX"
                className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors"
            >
              {submitting ? 'Dispatching...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {sandboxOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <strong>Sandbox Verification Dispatch:</strong> Code{' '}
                <span className="font-mono font-bold">{sandboxOtp}</span> (valid 10 mins).
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase tracking-wider text-neutral-600">
                  6-Digit Verification Code
                </label>
                <button
                  type="button"
                  disabled={cooldown > 0}
                  onClick={() => handleRequestOtp()}
                  className="text-xs underline text-neutral-700 disabled:opacity-40"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm font-mono tracking-[0.3em] outline-none focus:border-[#111111]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                New Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
              />
              {newPassword && (
                <div className="mt-1.5 space-y-1">
                  <div className="h-1 bg-neutral-200">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                    />
                  </div>
                  <div className="text-[11px] text-neutral-500">Strength: {strength.label}</div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors"
            >
              {submitting ? 'Updating...' : 'Confirm Password Reset'}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 p-4">
              Your password has been updated and all prior sessions were invalidated for security.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest"
            >
              Sign In with New Password
            </button>
          </div>
        )}

        <div className="pt-3 border-t border-neutral-200 text-center text-xs">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-neutral-600 hover:text-[#111111] underline"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
