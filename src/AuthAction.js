import React, { useEffect, useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import { auth } from './firebaseClient';
import { AUTH_FONT_CSS, useAuthFonts } from './authStyles';
import { UI_TEXT } from './constant.ts';

// Custom Firebase email-action handler (set as the "action URL" in the Firebase
// console: Authentication -> Templates -> edit -> customize action URL ->
// https://isaac.psychology.illinois.edu/auth/action).
//
// WHY THIS EXISTS: Firebase's default handler auto-applies the oobCode on page
// load. Corporate/university mail scanners (e.g. Microsoft 365 Safe Links)
// pre-fetch links, which would consume that one-time token before the user ever
// clicks. This page NEVER applies the code on load — it requires an explicit
// button press (verify) or form submit (reset), which passive scanners don't do.

function useQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function Shell({ title, children }) {
  return (
    <Container className="d-flex align-items-center justify-content-center vh-100 isaac-body">
      <style>{AUTH_FONT_CSS}</style>
      <Card className="p-4 shadow br-only" style={{ maxWidth: 440, width: '100%' }}>
        <h3 className="text-center mb-3 isaac-heading">{title}</h3>
        {children}
      </Card>
    </Container>
  );
}

export default function AuthAction() {
  useAuthFonts();
  const mode = useQueryParam('mode');
  const oobCode = useQueryParam('oobCode');

  const [phase, setPhase] = useState('init'); // init | ready | working | done | error
  const [error, setError] = useState(null);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const friendly = (err) => {
    switch (err?.code) {
      case 'auth/invalid-action-code':
      case 'auth/expired-action-code':
        return UI_TEXT.auth.resetInvalid ?? 'This link is invalid or has expired. Request a new one.';
      case 'auth/weak-password':
        return 'Password is too weak — use at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a minute and try again.';
      default:
        return err?.message || 'Something went wrong. Please request a new link.';
    }
  };

  // On load: validate inputs and, for password reset, look up the account email.
  // verifyPasswordResetCode only CHECKS the code — it does not consume it — so a
  // scanner pre-fetch here is harmless. The token is spent only on submit.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!oobCode || !mode) {
        setError('Missing or malformed link.');
        setPhase('error');
        return;
      }
      if (mode === 'resetPassword') {
        try {
          const em = await verifyPasswordResetCode(auth, oobCode);
          if (!cancelled) { setResetEmail(em); setPhase('ready'); }
        } catch (err) {
          if (!cancelled) { setError(friendly(err)); setPhase('error'); }
        }
      } else if (mode === 'verifyEmail') {
        setPhase('ready'); // apply only on explicit click
      } else {
        setError('Unsupported action.');
        setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [mode, oobCode]);

  const handleVerifyEmail = async () => {
    setError(null); setPhase('working');
    try {
      await applyActionCode(auth, oobCode);
      // If the user signed up in this same browser, they're already signed in
      // (unverified) here. Refresh so the session reflects verified status —
      // then the "Continue" button drops them straight into the app.
      try { await auth.currentUser?.reload(); } catch (_) { /* fine if absent */ }
      setPhase('done');
    } catch (err) {
      setError(friendly(err)); setPhase('error');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(UI_TEXT.auth.passwordMismatch ?? 'Passwords do not match.');
      return;
    }
    setPhase('working');
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setPhase('done');
    } catch (err) {
      setError(friendly(err)); setPhase('error');
    }
  };

  if (phase === 'init') {
    return (
      <Shell title="Please wait">
        <div className="text-center"><Spinner animation="border" role="status" /></div>
      </Shell>
    );
  }

  if (phase === 'error') {
    return (
      <Shell title="Link problem">
        <Alert className="br-only" variant="danger">{error}</Alert>
        <Button className="w-100 br-only" href="/">Go to login</Button>
      </Shell>
    );
  }

  if (phase === 'done') {
    const verified = mode === 'verifyEmail';
    return (
      <Shell title={verified ? 'Email verified' : 'Password updated'}>
        <Alert className="br-only" variant="success">
          {verified
            ? (UI_TEXT.auth.verifySuccess ?? 'Your email is verified.')
            : (UI_TEXT.auth.updateSuccess ?? 'Password updated successfully.')}
        </Alert>
        <Button className="w-100 br-only" href="/">
          {verified ? 'Continue to ISAAC' : 'Go to login'}
        </Button>
      </Shell>
    );
  }

  // phase === 'ready' or 'working'
  const busy = phase === 'working';

  if (mode === 'verifyEmail') {
    return (
      <Shell title={UI_TEXT.auth.verifyTitle ?? 'Verify your email'}>
        <p className="text-secondary small text-center">
          Click below to confirm your email address and finish setting up your ISAAC account.
        </p>
        {error && <Alert className="br-only" variant="danger">{error}</Alert>}
        <Button className="w-100 br-only" onClick={handleVerifyEmail} disabled={busy}>
          {busy ? 'Confirming…' : 'Confirm my email'}
        </Button>
      </Shell>
    );
  }

  // resetPassword
  return (
    <Shell title={UI_TEXT.auth.updatePassword ?? 'Update Password'}>
      <p className="text-secondary small text-center">
        Set a new password for <strong>{resetEmail}</strong>.
      </p>
      {error && <Alert className="br-only" variant="danger">{error}</Alert>}
      <Form onSubmit={handleResetSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>{UI_TEXT.auth.newPassword ?? 'New Password'}</Form.Label>
          <Form.Control
            className="br-only"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Form.Group>
        <Form.Group className="mb-4">
          <Form.Label>{UI_TEXT.auth.confirmNewPassword ?? 'Confirm New Password'}</Form.Label>
          <Form.Control
            className="br-only"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Form.Group>
        <Button className="w-100 br-only" type="submit" disabled={busy}>
          {busy ? 'Updating…' : (UI_TEXT.auth.updatePassword ?? 'Update Password')}
        </Button>
      </Form>
    </Shell>
  );
}
