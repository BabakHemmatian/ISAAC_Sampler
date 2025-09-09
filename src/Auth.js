import React, { useState, useEffect } from 'react';
import {
  Container, Form, Button, ToggleButtonGroup, ToggleButton,
  Alert, Row, Col, Card
} from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { UI_TEXT } from './constant.ts';

const LOGO_PRIMARY = "/ISAAC Logo 1.png"; // ensure this exists in /public

// One place to control the radius value (for other usage)
const BR_ONLY = "12px 12px 0 12px";

function Auth({ supabase }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isPasswordResetFlow = location.pathname === '/update-password' || params.has('code');

  // Load IBM Plex Sans Devanagari from Google Fonts
  useEffect(() => {
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = '';

    const plexLink = document.createElement('link');
    plexLink.rel = 'stylesheet';
    plexLink.href =
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Devanagari:wght@400;500;600;700&display=swap';

    document.head.appendChild(preconnect1);
    document.head.appendChild(preconnect2);
    document.head.appendChild(plexLink);
    return () => {
      document.head.removeChild(preconnect1);
      document.head.removeChild(preconnect2);
      document.head.removeChild(plexLink);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      (async () => {
        const { error } = await supabase.auth.exchangeCodeForSession();
        if (error) setError(UI_TEXT.auth.resetError);
      })();
    }
  }, []);

  useEffect(() => {
    if (!isPasswordResetFlow) return;
    const queryString = window.location.hash
      ? window.location.hash.slice(1)
      : window.location.search.slice(1);
    const params = new URLSearchParams(queryString);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      (async () => {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) setError(UI_TEXT.auth.resetError);
      })();
    } else {
      setError(UI_TEXT.auth.resetInvalid);
    }
  }, [isPasswordResetFlow]);

  const handleAuth = async () => {
    setError(null); setSuccess(null);
    if (!email || !password) {
      setError(`${UI_TEXT.auth.email} and ${UI_TEXT.auth.password} are required.`);
      return;
    }
    let result;
    if (mode === 'login') {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ email, password });
    }
    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(
        mode === 'login'
          ? `${UI_TEXT.auth.login} successful!`
          : `${UI_TEXT.auth.signup} successful! Check your email for confirmation.`
      );
    }
  };

  const handlePasswordResetEmail = async () => {
    if (!email) {
      setError(`Enter your ${UI_TEXT.auth.email} first.`);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`
    });
    if (error) setError(error.message);
    else setSuccess(UI_TEXT.auth.resetSent);
  };

  const handleUpdatePassword = async () => {
    setError(null); setSuccess(null);
    if (newPassword !== confirmPassword) {
      setError(UI_TEXT.auth.passwordMismatch);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setError(error.message);
    } else {
      await supabase.auth.signOut();
      window.location.replace('/');
    }
    setLoading(false);
  };

  // ---------- CSS helpers: fonts + radius (scoped to this page) ----------
  const fontCss = `
    @font-face {
      font-family: 'OctoberCompressedDevanagari';
      src: url('/fonts/OctoberCompressedDevanagari.woff2') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }

    /* Utility classes */
    .isaac-body { font-family: 'IBM Plex Sans Devanagari', 'IBM Plex Sans', Arial, sans-serif; color: #2D2D2D; }
    .isaac-heading {
      font-family: 'OctoberCompressedDevanagari','IBM Plex Sans Devanagari','IBM Plex Sans', Arial, sans-serif;
      font-weight: 700; letter-spacing: .5px; text-transform: uppercase;
    }
    .br-only { border-radius: ${BR_ONLY} !important; }

    .br-only .card, .br-only.card, .br-only .btn, .br-only .form-control, .br-only .alert {
      border-radius: ${BR_ONLY} !important;
    }

    /* UPDATED: Toggle buttons (react-bootstrap) */
    .toggle-login-custom {
      border-top-left-radius: 12px !important;
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 12px !important;
      border-bottom-left-radius: 0 !important;
    }
    .toggle-signup-custom {
      border-top-left-radius: 0 !important;
      border-top-right-radius: 12px !important;
      border-bottom-right-radius: 0 !important;
      border-bottom-left-radius: 0 !important;
    }
  `;

  // ---------- Password reset view ----------
  if (isPasswordResetFlow) {
    return (
      <Container className="d-flex align-items-center justify-content-center vh-100 isaac-body">
        <style>{fontCss}</style>
        <Card className="p-4 shadow br-only" style={{ maxWidth: 400, width: '100%' }}>
          <h3 className="text-center mb-3 isaac-heading">{UI_TEXT.auth.updatePassword}</h3>
          {error && <Alert className="br-only" variant="danger">{error}</Alert>}
          {success && <Alert className="br-only" variant="success">{success}</Alert>}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{UI_TEXT.auth.newPassword ?? 'New Password'}</Form.Label>
              <Form.Control
                className="br-only"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>{UI_TEXT.auth.confirmNewPassword ?? 'Confirm New Password'}</Form.Label>
              <Form.Control
                className="br-only"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </Form.Group>
            <Button className="w-100 br-only" onClick={handleUpdatePassword} disabled={loading}>
              {loading ? 'Updating…' : UI_TEXT.auth.updatePassword}
            </Button>
          </Form>
        </Card>
      </Container>
    );
  }

  // ---------- Main auth view ----------
  return (
    <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-light isaac-body">
      <style>{fontCss}</style>

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
              <p className="text-secondary">{UI_TEXT.auth.welcomeText}</p>
              <p className="text-muted small mb-0">{UI_TEXT.auth.copyright}</p>
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
                variant="outline-secondary"
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

            <Form>
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
              <Button
                onClick={handleAuth}
                variant={mode === 'login' ? 'primary' : 'secondary'}
                className="w-100 mb-2 br-only"
              >
                {mode === 'login' ? UI_TEXT.auth.login : UI_TEXT.auth.signup}
              </Button>
              {mode === 'login' && (
                <Button variant="link" onClick={handlePasswordResetEmail} className="w-100 p-0 br-only">
                  {UI_TEXT.auth.forgotPassword}
                </Button>
              )}
            </Form>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Auth;
