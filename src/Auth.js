import React, { useState, useEffect } from 'react';
import {
  Container, Form, Button, ToggleButtonGroup, ToggleButton,
  Alert, Row, Col, Card
} from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const isPasswordResetFlow = location.pathname === '/update-password';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      (async () => {
        const { error } = await supabase.auth.exchangeCodeForSession();
        if (error) setError('Failed to verify auth session.');
      })();
    }
  }, []);

  useEffect(() => {
    if (!isPasswordResetFlow) return;

    const queryString = window.location.hash
      ? window.location.hash.slice(1)
      : window.location.search.slice(1);

    const params = new URLSearchParams(queryString);
    const access_token  = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      (async () => {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) setError('Failed to verify reset session.');
      })();
    } else {
      setError('Reset link is invalid or has expired.');
    }
  }, [isPasswordResetFlow]);

  const handleAuth = async () => {
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError("Email and password are required.");
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
      setSuccess(mode === 'login' ? 'Login successful!' : 'Signup successful! Check your email for confirmation.');
    }
  };

  const handlePasswordResetEmail = async () => {
    if (!email) { setError('Enter your email first.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`
    });
    if (error) setError(error.message);
    else       setSuccess('Reset link sent. Check your inbox.');
  };

  const handleUpdatePassword = async () => {
    setError(null); setSuccess(null);
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

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

  if (isPasswordResetFlow) {
    return (
      <Container className="d-flex align-items-center justify-content-center vh-100">
        <Card className="p-4 shadow" style={{ maxWidth: 400, width: '100%' }}>
          <h3 className="text-center mb-3">Update Password</h3>
          {error   && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </Form.Group>
            <Button className="w-100" onClick={handleUpdatePassword} disabled={loading}>
              {loading ? 'Updating…' : 'Update Password'}
            </Button>
          </Form>
        </Card>
      </Container>
    );
  }

  return (
    <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="w-100" style={{ maxWidth: 1000 }}>
        <Col md={6} className="d-flex align-items-center justify-content-center">
          <div>
            <h1 className="mb-3 text-primary">Welcome to ISAAC</h1>
            <p className="text-secondary">
              ISAAC lets you sample Reddit posts by social group and period.
              Secure login keeps your preferences safe.
            </p>
            <p className="text-muted small">© 2025 ISAAC Research Platform</p>
          </div>
        </Col>

        <Col md={6} className="d-flex align-items-center justify-content-center">
          <Card className="shadow w-100 p-4" style={{ maxWidth: 400 }}>
            <h3 className="text-center mb-4">
              {mode === 'login' ? 'Login to Your Account' : 'Create a New Account'}
            </h3>

            <ToggleButtonGroup
              type="radio"
              name="authMode"
              value={mode}
              onChange={setMode}
              className="mb-3 d-flex justify-content-center"
            >
              <ToggleButton id="login-btn"  value="login"  variant="outline-primary">Login</ToggleButton>
              <ToggleButton id="signup-btn" value="signup" variant="outline-secondary">Sign Up</ToggleButton>
            </ToggleButtonGroup>

            {error   && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Email address</Form.Label>
                <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </Form.Group>
              <Button onClick={handleAuth} variant={mode === 'login' ? 'primary' : 'secondary'} className="w-100 mb-2">
                {mode === 'login' ? 'Login' : 'Sign Up'}
              </Button>
              {mode === 'login' && (
                <Button variant="link" onClick={handlePasswordResetEmail} className="w-100 p-0">
                  Forgot Password?
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
