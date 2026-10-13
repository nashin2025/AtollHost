import { useState, type FormEvent, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { isAuthConfigured } from '../../lib/config';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

type FieldName = 'email' | 'password' | 'confirmPassword';

export function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedEmail, setCompletedEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('completed') === 'true') {
      setShowCompleted(true);
      setCompletedEmail(params.get('email') || '');
    }
  }, [location.search]);

  if (!isAuthConfigured || !supabase) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <svg
              className="brand-icon"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="16" cy="16" r="16" fill="var(--primary)" />
              <path
                d="M10 16L14 20L22 12"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="brand-name">AtollHost</span>
          </div>
          <h1>Sign up</h1>
          <div className="auth-notice" role="status">
            <p>
              Authentication is not configured for this environment. Set
              <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> in a local{' '}
              <code>.env</code> file (see <code>.env.example</code>) to enable
              registration.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Enter a valid email address';
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
    return undefined;
  };

  const validateConfirmPassword = (value: string): string | undefined => {
    if (!value) return 'Please confirm your password';
    if (value !== password) return 'Passwords do not match';
    return undefined;
  };

  const validateField = (name: FieldName, value: string): string | undefined => {
    switch (name) {
      case 'email':
        return validateEmail(value);
      case 'password':
        return validatePassword(value);
      case 'confirmPassword':
        return validateConfirmPassword(value);
      default:
        return undefined;
    }
  };

  const handleBlur = (name: FieldName, value: string) => {
    const error = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  const clearFieldError = (name: FieldName) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(confirmPassword);

    const errors: typeof fieldErrors = {};
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    if (confirmError) errors.confirmPassword = confirmError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fix the errors above');
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('An account with this email already exists. Sign in instead, or request a password reset.');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      navigate(`${paths.signUp}?completed=true&email=${encodeURIComponent(email.trim())}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showCompleted) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <svg className="brand-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="16" fill="var(--success)" />
              <path d="M10 16L14 20L22 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="brand-name">AtollHost</span>
          </div>
          <h1>Check your email</h1>
          <p role="status" className="auth-success-message">
            We sent a verification link to <strong>{completedEmail}</strong>.
            Verify your email, then sign in.
          </p>
          <p className="auth-notice">
            Creating an account does not grant access to any organization.
            Organization access comes from an invitation or from creating a new
            organization after you sign in.
          </p>
          <div className="auth-actions">
            <Link to={paths.signIn} className="btn btn-primary btn-block">
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <svg
            className="brand-icon"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="16" cy="16" r="16" fill="var(--primary)" />
            <path
              d="M10 16L14 20L22 12"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="brand-name">AtollHost</span>
        </div>
        <header className="auth-header">
          <h1>Create your account</h1>
          <p className="auth-subtitle">Join your team and manage your properties</p>
        </header>

        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError('email');
            }}
            onBlur={(event) => handleBlur('email', event.target.value)}
            error={fieldErrors.email}
            required
            placeholder="you@company.com"
            autoFocus
          />

          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError('password');
            }}
            onBlur={(event) => handleBlur('password', event.target.value)}
            error={fieldErrors.password}
            required
            placeholder="Min. 8 characters"
            helper="At least 8 characters with uppercase, lowercase, and number"
          />

          <Field
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearFieldError('confirmPassword');
            }}
            onBlur={(event) => handleBlur('confirmPassword', event.target.value)}
            error={fieldErrors.confirmPassword}
            required
            placeholder="Confirm your password"
          />

          {error && (
            <div className="auth-error" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="btn-block"
            loading={loading}
            disabled={loading}
          >
            Create account
          </Button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <Button
          variant="outline"
          className="btn-block"
          onClick={() => navigate(paths.signIn)}
        >
          Already have an account? Sign in
        </Button>

        <p className="auth-notice">
          Were you invited to an organization? Use the invitation link you
          received instead. Sign-up alone does not grant organization access.
        </p>

        <footer className="auth-footer">
          <p>
            By creating an account, you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            .
          </p>
        </footer>
      </div>
    </main>
  );
}