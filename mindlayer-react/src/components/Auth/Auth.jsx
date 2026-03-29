import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFirebaseStorage } from '../../hooks/useFirebaseStorage';
import OrbAssistant from '../Orb/OrbAssistant';
import './Auth.css';

export default function Auth() {
  const { login, register, error: authError } = useAuth();
  const { saveUserProfile } = useFirebaseStorage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        // Register new user
        const user = await register(email, password);
        // Save user profile
        await saveUserProfile({
          email: email.trim(),
        });
      }
    } catch (err) {
      setError(err.message || authError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="auth-header">
          <div className="auth-orb-container">
            <OrbAssistant state="idle" sliderValue={50} />
          </div>
          <h1 className="auth-title">MindFlyer</h1>
          <p className="auth-subtitle">Your personal mental clarity companion</p>
        </div>

        <div className="auth-card">
          <h2 className="auth-form-title">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>

          {/* Error message */}
          {(error || authError) && (
            <div className="auth-error">
              {error || authError}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Email input */}
            <div className="auth-input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus={isLogin}
              />
            </div>

            {/* Password input */}
            <div className="auth-input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="auth-input"
                placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Confirm password (signup only) */}
            {!isLogin && (
              <div className="auth-input-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="auth-input"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Sign up')}
            </button>
          </form>

          {/* Toggle between login and signup */}
          <div className="auth-footer">
            <p className="auth-toggle-text">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                className="auth-toggle-button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setError('');
                }}
                disabled={loading}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
