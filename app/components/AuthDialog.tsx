'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;

      if (isSignUp) {
        // Sign up new user
        result = await supabase.auth.signUp({
          email,
          password,
        });
      } else {
        // Sign in existing user
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }

      // Check for errors
      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      // Success - session will be detected by parent component
      setLoading(false);
      
      // Reset form
      setEmail('');
      setPassword('');
      
      // Close dialog on successful login (not sign up, as email verification may be required)
      if (!isSignUp) {
        onClose();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div 
          className="w-[360px] bg-white rounded-sm shadow-2xl p-8 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <h2 className="font-sans text-[11px] uppercase tracking-widest text-zinc-400 font-medium mb-6 text-center">
            Access Control
          </h2>

          {/* Form */}
          <form onSubmit={handleAuth}>
            {/* Email Input */}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full border-b border-zinc-200 py-3 outline-none text-sm font-mono text-zinc-900 placeholder-zinc-400 focus:border-black transition-colors mb-4"
            />

            {/* Password Input */}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              className="w-full border-b border-zinc-200 py-3 outline-none text-sm font-mono text-zinc-900 placeholder-zinc-400 focus:border-black transition-colors mb-4"
            />

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-xs mt-2 mb-4 font-sans">
                {error}
              </div>
            )}

            {/* Main Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white h-10 text-xs uppercase tracking-wider font-sans font-medium hover:bg-black transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>

            {/* Toggle Mode Button */}
            <button
              type="button"
              onClick={toggleMode}
              disabled={loading}
              className="mt-4 text-[11px] text-zinc-500 hover:text-zinc-900 cursor-pointer underline underline-offset-4 font-sans transition-colors w-full text-center disabled:opacity-50"
            >
              {isSignUp ? 'Have an account? Sign in' : 'New user? Create account'}
            </button>
          </form>

          {/* Info Message for Sign Up */}
          {isSignUp && (
            <p className="mt-6 text-[10px] text-zinc-400 font-sans text-center leading-relaxed">
              Check your email for a confirmation link after creating your account.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
