'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleKeyPress = useCallback(async (digit) => {
    if (pin.length >= 4) return;
    setError('');

    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      setLoading(true);
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: newPin }),
        });

        if (res.ok) {
          router.push('/dashboard');
        } else {
          setError('Wrong PIN. Try again.');
          setPin('');
          // Vibrate on error
          if (navigator.vibrate) navigator.vibrate(200);
        }
      } catch (err) {
        setError('Connection error. Please try again.');
        setPin('');
      }
      setLoading(false);
    }
  }, [pin, router]);

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  }, []);

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKeyPress, handleBackspace]);

  return (
    <div className="login-page">
      {/* Animated background blobs */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'
      }}>
        <div style={{
          position: 'absolute', top: '10%', left: '20%',
          width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)',
          animation: 'float 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '15%',
          width: '250px', height: '250px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)',
          animation: 'float 8s ease-in-out infinite reverse',
        }} />
      </div>

      <div className="login-card animate-slide-up">
        <div className="login-logo">🎮</div>
        <h1 className="login-title">Mirpurkhas Gaming Zone</h1>
        <p className="login-subtitle">Enter your PIN to continue</p>

        {/* PIN dots */}
        <div className="pin-display">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`pin-dot ${i < pin.length ? 'filled' : ''} ${error ? 'error' : ''}`}
            />
          ))}
        </div>

        {error && <p className="login-error">{error}</p>}

        {/* Numeric keypad */}
        <div className="pin-keypad" style={{ marginTop: error ? '16px' : '0' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, i) => (
            <button
              key={i}
              className={`pin-key ${key === '' ? 'empty' : ''} ${key === '⌫' ? 'backspace' : ''}`}
              onClick={() => {
                if (key === '⌫') handleBackspace();
                else if (key !== '') handleKeyPress(key);
              }}
              disabled={loading}
              type="button"
            >
              {key}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ marginTop: '24px' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        )}
      </div>
    </div>
  );
}
