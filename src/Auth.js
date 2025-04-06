import React, { useState } from 'react';
import { Container, Form, Button, ToggleButtonGroup, ToggleButton, Alert, Row, Col, Card } from 'react-bootstrap';
import { supabase } from './supabaseClient';

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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

  return (
    <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="w-100" style={{ maxWidth: '1000px' }}>
        <Col md={6} className="d-flex align-items-center justify-content-center">
          <div>
            <h1 className="mb-3 text-primary">Welcome to ISAAC</h1>
            <p className="text-secondary">
              ISAAC allows you to sample Reddit posts based on social groups and time periods.
              Analyze, download, and work with real-world datasets effortlessly. Secure login ensures your sampling preferences and issue reports are personalized.
            </p>
            <p className="text-muted small">© 2025 ISAAC Research Platform</p>
          </div>
        </Col>

        <Col md={6} className="d-flex align-items-center justify-content-center">
          <Card className="shadow w-100 p-4" style={{ maxWidth: 400 }}>
            <h3 className="text-center mb-4">{mode === 'login' ? 'Login to Your Account' : 'Create a New Account'}</h3>

            <ToggleButtonGroup
              type="radio"
              name="authMode"
              value={mode}
              onChange={val => setMode(val)}
              className="mb-3 d-flex justify-content-center"
            >
              <ToggleButton id="login-btn" value="login" variant="outline-primary">
                Login
              </ToggleButton>
              <ToggleButton id="signup-btn" value="signup" variant="outline-secondary">
                Sign Up
              </ToggleButton>
            </ToggleButtonGroup>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Email address</Form.Label>
                <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Password</Form.Label>
                <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </Form.Group>

              <Button onClick={handleAuth} variant={mode === 'login' ? 'primary' : 'secondary'} className="w-100">
                {mode === 'login' ? 'Login' : 'Sign Up'}
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Auth;
