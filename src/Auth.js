import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Container, Form, Button, ToggleButtonGroup, ToggleButton,
  Alert, Row, Col, Card
} from 'react-bootstrap';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { auth } from './firebaseClient';
import { AUTH_FONT_CSS, useAuthFonts } from './authStyles';
import { UI_TEXT } from './constant.ts';

// Code-split: the agreement dialog pulls in a markdown renderer that only
// signups need, so it stays out of the main bundle until it is opened.
const DuaAgreement = lazy(() => import('./DuaAgreement'));

const LOGO_PRIMARY = "/ISAAC Logo 1.png"; // ensure this exists in /public

const html = (s) => ({ __html: s ?? "" });

const PROD_FALLBACK_ORIGIN = 'https://isaac.psychology.illinois.edu';

function getSafeRedirectOrigin() {
  const configured = process.env.REACT_APP_PUBLIC_ORIGIN?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const origin = window.location.origin;
  const isLocalhost =
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('0.0.0.0');

  if (process.env.NODE_ENV === 'production' && isLocalhost) {
    return PROD_FALLBACK_ORIGIN;
  }
  return origin;
}

// Where Firebase should send the user AFTER they finish a verify/reset action.
// Must be an authorized domain in the Firebase console.
const actionCodeSettings = () => ({ url: `${getSafeRedirectOrigin()}/`, handleCodeInApp: false });

// Record Data-Use-Agreement consent server-side (Firebase user profiles can't
// hold arbitrary fields). Best-effort: a failure here must never block signup.
// `acceptance` comes from <DuaAgreement />: the version identifiers of the exact
// text that was rendered, plus the moment the user clicked accept.
async function recordAgreementConsent(user, acceptance) {
  try {
    await fetch('/record_consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        agreement_version: acceptance.version,
        agreement_sha256: acceptance.sha256,
        agreement_commit: acceptance.commit,
        accepted_at: acceptance.acceptedAt,
      }),
    });
  } catch (_) { /* consent logging is best-effort */ }
}

// Map Firebase auth error codes to friendly, non-enumerating messages.
function friendlyAuthError(err) {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/email-already-in-use':
      return 'An account with that email already exists. Try logging in or resetting your password.';
    case 'auth/weak-password':
      return 'Password is too weak — use at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait about a minute and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return err?.message || 'Authentication failed. Please try again.';
  }
}

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetCooldownSeconds, setResetCooldownSeconds] = useState(0);
  // Null until the user has scrolled through and accepted the agreement; then
  // holds {version, sha256, commit, acceptedAt} for the consent record.
  const [agreementAcceptance, setAgreementAcceptance] = useState(null);
  const [showAgreement, setShowAgreement] = useState(false);
  // Post-signup / unverified-login: user must click the emailed link (which
  // logs them in from that tab). This screen is informational + resend.
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);

  useAuthFonts();

  useEffect(() => {
    if (resetCooldownSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResetCooldownSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resetCooldownSeconds]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCooldownSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldownSeconds]);

  // Submitting via the form (Enter in a field, or the button) rather than a bare
  // onClick, so pressing Enter after typing a password logs in as expected.
  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    handleAuth();
  };

  const handleAuth = async () => {
    setError(null); setSuccess(null);
    if (!email || !password) {
      setError(`${UI_TEXT.auth.email} and ${UI_TEXT.auth.password} are required.`);
      return;
    }
    if (mode === 'signup' && !agreementAcceptance) {
      setError(UI_TEXT.auth.agreementRequired);
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          // Parity with the old flow: unverified users can't enter the app.
          // Keep them signed in so "resend" works, and show the verify screen.
          setPendingEmail(email);
          setAwaitingVerify(true);
          setSuccess(UI_TEXT.auth.loginUnverified);
        } else {
          // onAuthStateChanged in App.js picks up the verified session.
          setSuccess(`${UI_TEXT.auth.login} successful!`);
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Legally meaningful; fire-and-forget so it can't block the flow.
        recordAgreementConsent(cred.user, agreementAcceptance);
        await sendEmailVerification(cred.user, actionCodeSettings());
        setPendingEmail(email);
        setAwaitingVerify(true);
        setResendCooldownSeconds(60);
        setSuccess(UI_TEXT.auth.signupCodeSent);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null); setSuccess(null);
    if (resendCooldownSeconds > 0) return;
    if (!auth.currentUser) {
      setError('Your session expired. Please log in again to resend.');
      return;
    }
    setLoading(true);
    try {
      await sendEmailVerification(auth.currentUser, actionCodeSettings());
      setSuccess(UI_TEXT.auth.signupCodeSent);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setResendCooldownSeconds(60);
      setLoading(false);
    }
  };

  const handleCancelVerify = async () => {
    setError(null); setSuccess(null);
    try { await signOut(auth); } catch (_) { /* ignore */ }
    setAwaitingVerify(false);
    setPendingEmail('');
  };

  const handlePasswordResetEmail = async () => {
    setError(null); setSuccess(null);
    if (!email) {
      setError(`Enter your ${UI_TEXT.auth.email} first.`);
      return;
    }
    if (resetCooldownSeconds > 0) {
      setError(`Please wait ${resetCooldownSeconds}s before requesting another reset email.`);
      return;
    }
    setLoading(true);
    try {
      // The reset link points at our /auth/action handler (set as the custom
      // action URL in the Firebase console), which applies the code only on
      // explicit submit — scanner-safe.
      await sendPasswordResetEmail(auth, email, actionCodeSettings());
      setSuccess(UI_TEXT.auth.resetSent);
    } catch (err) {
      // With email-enumeration protection on, Firebase resolves successfully
      // regardless; only surface real errors (e.g. rate limiting).
      setError(friendlyAuthError(err));
    } finally {
      setResetCooldownSeconds(60);
      setLoading(false);
    }
  };

  // ---------- Email verification view (post-signup / unverified login) ----------
  if (awaitingVerify) {
    const instruction = UI_TEXT.auth.verifyInstruction.replace('{email}', pendingEmail);
    return (
      <Container className="d-flex align-items-center justify-content-center vh-100 isaac-body">
        <style>{AUTH_FONT_CSS}</style>
        <Card className="p-4 shadow br-only" style={{ maxWidth: 440, width: '100%' }}>
          <h3 className="text-center mb-3 isaac-heading">{UI_TEXT.auth.verifyTitle}</h3>
          <p className="text-secondary small text-center" dangerouslySetInnerHTML={html(instruction)} />
          <p className="text-muted small text-center">{UI_TEXT.auth.verifySpamNote}</p>
          {error && <Alert className="br-only" variant="danger">{error}</Alert>}
          {success && <Alert className="br-only" variant="success">{success}</Alert>}
          <Form>
            <Button
              className="w-100 mb-2 br-only"
              onClick={handleResend}
              disabled={loading || resendCooldownSeconds > 0}
            >
              {resendCooldownSeconds > 0
                ? UI_TEXT.auth.verifyResendCooldown.replace('{seconds}', resendCooldownSeconds)
                : UI_TEXT.auth.verifyResend}
            </Button>
            <Button variant="link" className="w-100 p-0 br-only text-muted" onClick={handleCancelVerify} disabled={loading}>
              {UI_TEXT.auth.verifyBack}
            </Button>
          </Form>
        </Card>
      </Container>
    );
  }

  // ---------- Main auth view ----------
  return (
    <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-light isaac-body">
      <style>{AUTH_FONT_CSS}</style>

      <Row className="w-100" style={{ maxWidth: 1100 }}>
        {/* LEFT: brand logo + copy */}
        <Col md={6} className="d-flex align-items-center justify-content-center">
          <div className="br-only" style={{ background: "#E1F4FF", padding: 24, width: "100%" }}>
            <div className="text-center text-md-start" style={{ maxWidth: 440, marginInline: "auto" }}>
              <img
                src={LOGO_PRIMARY}
                alt="ISAAC"
                style={{ width: "100%", maxWidth: 320, height: "auto", marginBottom: 12 }}
              />
              {/* <h1 className="isaac-heading mb-3">{UI_TEXT.auth.welcomeTitle}</h1> */}
              <div
                className="text-secondary"
                dangerouslySetInnerHTML={html(UI_TEXT.auth.welcomeText)}
              />
              <p className="text-muted small mb-0">{UI_TEXT.auth.copyright}</p>
              <p
                className="text-muted small mb-0"
                dangerouslySetInnerHTML={html(UI_TEXT.auth.privacyNotice)}
              />
            </div>
          </div>
        </Col>

        {/* RIGHT: auth card */}
        <Col md={6} className="d-flex align-items-center justify-content-center">
          <Card className="shadow w-100 p-4 br-only" style={{ maxWidth: 420 }}>
            <h3 className="text-center mb-4 isaac-heading">
              {mode === 'login' ? UI_TEXT.auth.loginTitle : UI_TEXT.auth.signupTitle}
            </h3>

            <ToggleButtonGroup
              type="radio"
              name="authMode"
              value={mode}
              onChange={setMode}
              className="mb-3 d-flex justify-content-center"
            >
            <ToggleButton
              id="login-btn"
              value="login"
              variant="outline-primary"
              style={{
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '0px',
                borderBottomRightRadius: '12px',
                borderBottomLeftRadius: '0px',
                marginRight: '8px',
              }}
              >
                {UI_TEXT.auth.login}
              </ToggleButton>
              <ToggleButton
                id="signup-btn"
                value="signup"
                variant="outline-primary"
                style={{
                  borderTopLeftRadius: '0px',
                  borderTopRightRadius: '12px',
                  borderBottomRightRadius: '0px',
                  borderBottomLeftRadius: '0px',
                }}
              >
                {UI_TEXT.auth.signup}
              </ToggleButton>

            </ToggleButtonGroup>

            {error && <Alert className="br-only" variant="danger">{error}</Alert>}
            {success && <Alert className="br-only" variant="success">{success}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>{UI_TEXT.auth.email}</Form.Label>
                <Form.Control
                  className="br-only"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>{UI_TEXT.auth.password}</Form.Label>
                <Form.Control
                  className="br-only"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </Form.Group>
              {mode === 'signup' && (
                <Form.Group className="mb-3">
                  {agreementAcceptance ? (
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-1">
                      <span className="text-success small">
                        ✓ {UI_TEXT.auth.agreementAccepted.replace(
                          '{version}', agreementAcceptance.version)}
                      </span>
                      <Button
                        variant="link"
                        type="button"
                        className="p-0 small br-only"
                        onClick={() => setShowAgreement(true)}
                      >
                        {UI_TEXT.auth.agreementReview}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline-primary"
                      type="button"
                      className="w-100 br-only"
                      onClick={() => setShowAgreement(true)}
                    >
                      {UI_TEXT.auth.agreementOpen}
                    </Button>
                  )}
                </Form.Group>
              )}
              <Button
                type="submit"
                variant="primary"
                className="w-100 mb-2 br-only"
                disabled={loading || (mode === 'signup' && !agreementAcceptance)}
              >
                {loading ? 'Loading...' : (mode === 'login' ? UI_TEXT.auth.login : UI_TEXT.auth.signup)}
              </Button>
              {mode === 'login' && (
                <Button
                  variant="link"
                  onClick={handlePasswordResetEmail}
                  className="w-100 p-0 br-only"
                  disabled={loading || resetCooldownSeconds > 0}
                >
                  {resetCooldownSeconds > 0
                    ? `Try again in ${resetCooldownSeconds}s`
                    : UI_TEXT.auth.forgotPassword}
                </Button>
              )}
            </Form>
          </Card>
        </Col>
      </Row>

      {showAgreement && (
        <Suspense fallback={null}>
          <DuaAgreement
            show={showAgreement}
            onHide={() => setShowAgreement(false)}
            onAccept={(acceptance) => {
              setAgreementAcceptance(acceptance);
              setShowAgreement(false);
              setError(null);
            }}
          />
        </Suspense>
      )}
    </Container>
  );
}

export default Auth;
