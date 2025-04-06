import React, { useState, useEffect } from "react";
import axios from "axios";
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Form, Button, Row, Col, Alert, Spinner, Navbar, Nav, Toast, ToastContainer } from 'react-bootstrap';
import { supabase } from "./supabaseClient";
import Auth from "./Auth";

function App() {
  const [session, setSession] = useState(null);
  const [socialGroup, setSocialGroup] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [numDocs, setNumDocs] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState(null);
  const [page, setPage] = useState("home");
  const [issueDesc, setIssueDesc] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!socialGroup) errors.socialGroup = "Social group is required.";
    if (!startDate) errors.startDate = "Start date is required.";
    if (!endDate) errors.endDate = "End date is required.";
    if (startDate && endDate && startDate > endDate) errors.endDate = "End date must be after start date.";
    if (!numDocs || parseInt(numDocs) <= 0) errors.numDocs = "Enter a valid number of documents.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const showToast = (message, variant = 'success', duration = 4000) => {
    setToast({ show: true, message, variant });
    setTimeout(() => setToast({ ...toast, show: false }), duration);
  };

  const handleSample = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setDownloadLink(null);

    try {
      const res = await axios.post("https://isaac-sampler-backend.onrender.com/sample", {
        social_group: socialGroup,
        start_date: startDate,
        end_date: endDate,
        num_docs: parseInt(numDocs),
      });
      setDownloadLink(res.data.download_link);
      showToast("File sampled successfully!", "success");

      setSocialGroup("");
      setStartDate("");
      setEndDate("");
      setNumDocs("");
      setFormErrors({});
    } catch (err) {
      showToast("Sampling failed: " + (err.response?.data?.detail || err.message), "danger");
    }
    setLoading(false);
  };

  const handleIssueSubmit = async () => {
    if (!issueDesc) {
      showToast("Please describe the issue.", "danger");
      return;
    }

    try {
      await axios.post("https://isaac-sampler-backend.onrender.com/report_issue", {
        email: session?.user?.email,
        description: issueDesc,
      });
      setIssueDesc("");
      showToast("Issue submitted successfully!", "success", 3000);
    } catch (err) {
      showToast("Failed to send issue report.", "danger");
    }
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div>
      <Navbar bg="dark" variant="dark" expand="lg">
        <div className="px-5 d-flex w-100 justify-content-between">
          <Navbar.Brand href="#">ISAAC App</Navbar.Brand>
          <Nav className="d-flex align-items-center">
            <Nav.Link onClick={() => setPage("home")} className="text-white">Home</Nav.Link>
            <Nav.Link onClick={() => setPage("issue")} className="text-white">Report Issue</Nav.Link>
            <Button variant="outline-light" size="sm" onClick={handleLogout}>Logout</Button>
          </Nav>
        </div>
      </Navbar>

      <ToastContainer position="top-end" className="p-3">
        <Toast bg={toast.variant} show={toast.show} onClose={() => setToast({ ...toast, show: false })} delay={4000} autohide>
          <Toast.Header closeButton className={toast.variant === 'danger' ? 'bg-danger text-white' : 'bg-success text-white'}>
            <strong className="me-auto">Notification</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>

      {page === "home" && (
        <div className="p-5">
          <h1 className="mb-4">ISAAC Reddit Sampler</h1>
          <p className="text-muted mb-4">Select a social group and time period to retrieve a random sample of Reddit posts in ZIP format.</p>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Social Group</Form.Label>
              <Form.Select
                value={socialGroup}
                onChange={(e) => setSocialGroup(e.target.value)}
                isInvalid={!!formErrors.socialGroup}
              >
                <option value="">-- Select --</option>
                <option value="race">Race</option>
                <option value="sexuality">Sexuality</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">{formErrors.socialGroup}</Form.Control.Feedback>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date (YYYY-MM)</Form.Label>
                  <Form.Control
                    type="month"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min="2007-01"
                    max="2023-12"
                    isInvalid={!!formErrors.startDate}
                  />
                  <Form.Control.Feedback type="invalid">{formErrors.startDate}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date (YYYY-MM)</Form.Label>
                  <Form.Control
                    type="month"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || "2007-01"}
                    max="2023-12"
                    isInvalid={!!formErrors.endDate}
                  />
                  <Form.Control.Feedback type="invalid">{formErrors.endDate}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Number of Documents</Form.Label>
              <Form.Control
                type="number"
                value={numDocs}
                onChange={(e) => setNumDocs(e.target.value)}
                isInvalid={!!formErrors.numDocs}
              />
              <Form.Control.Feedback type="invalid">{formErrors.numDocs}</Form.Control.Feedback>
            </Form.Group>

            <Button variant="primary" onClick={handleSample} disabled={loading}>
              {loading ? (<><Spinner animation="border" size="sm" /> Retrieving...</>) : ("Retrieve")}
            </Button>
          </Form>

          {downloadLink && (
            <Alert variant="success" className="mt-4">
              Your file is ready: <Alert.Link href={downloadLink} target="_blank" download onClick={() => setDownloadLink(null)}>Download ZIP</Alert.Link>
            </Alert>
          )}
        </div>
      )}

      {page === "issue" && (
        <div className="p-5">
          <h1 className="mb-4">Report an Issue</h1>
          <p className="text-muted mb-4">Use this form to report bugs or suggestions. We’ll follow up using your registered email.</p>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Issue Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
                required
              />
            </Form.Group>

            <Button variant="danger" onClick={handleIssueSubmit}>Send</Button>
          </Form>
        </div>
      )}
    </div>
  );
}

export default App;