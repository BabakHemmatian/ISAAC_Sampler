// Scroll-through Data Use Agreement modal shown at registration.
//
// Replaces an earlier checkbox-plus-external-link flow: the user must scroll the
// full text before they can accept, and the acceptance timestamp is stored
// server-side alongside the version identifiers.
//
// The text is fetched live from GET /dua, which proxies the DUA markdown out of
// the public corpus repo — so edits to the agreement take effect immediately
// with no frontend rebuild. The sha256/commit returned alongside it are echoed
// back to /record_consent so each signup is pinned to the exact text displayed.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import { UI_TEXT } from './constant.ts';

// Treat "within a few pixels of the end" as the bottom: fractional scroll
// heights on HiDPI displays and browser zoom mean scrollTop rarely lands
// exactly on the maximum, which would otherwise leave Accept stuck disabled.
const BOTTOM_SLACK_PX = 24;

// `children` is passed explicitly rather than left to the spread: jsx-a11y's
// anchor-has-content rule reads the JSX statically and cannot see it otherwise,
// which fails the build wherever warnings are errors (CI=true).
const MARKDOWN_COMPONENTS = {
  a: ({ node, children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
};

// `blocking` is for the re-consent case: the agreement changed under a signed-in
// user, so there is no dismissing the dialog — the only ways out are accepting
// the new text or signing out.
function DuaAgreement({ show, onHide, onAccept, blocking = false, notice, declineLabel }) {
  const [dua, setDua] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollRef = useRef(null);

  const loadDua = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/dua', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.markdown) throw new Error('empty agreement');
      setDua(data);
    } catch (err) {
      console.error('Failed to load Data Use Agreement:', err);
      setError(UI_TEXT.auth.agreementLoadError);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on first open; re-fetch on reopen so a user who closed the dialog
  // before accepting sees the current text rather than a stale copy.
  useEffect(() => {
    if (!show) return;
    setScrolledToEnd(false);
    loadDua();
  }, [show, loadDua]);

  const checkScrollPosition = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Not scrollable at all (short text, tall viewport) counts as fully read —
    // otherwise Accept could never enable.
    const atEnd =
      el.scrollHeight - el.clientHeight <= BOTTOM_SLACK_PX ||
      el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_SLACK_PX;
    if (atEnd) setScrolledToEnd(true);
  }, []);

  // Re-evaluate once the text has actually been laid out, and again if the
  // window is resized (rotating a phone can make a scrolled box fit outright).
  useEffect(() => {
    if (!dua) return undefined;
    const raf = window.requestAnimationFrame(checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [dua, checkScrollPosition]);

  const handleAccept = () => {
    if (!dua || !scrolledToEnd) return;
    onAccept({
      version: dua.version,
      sha256: dua.sha256,
      commit: dua.commit,
      acceptedAt: new Date().toISOString(),
    });
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      scrollable
      backdrop="static"
      keyboard={!blocking}
    >
      <Modal.Header closeButton={!blocking}>
        <Modal.Title className="isaac-heading h5 mb-0">
          {UI_TEXT.auth.agreementTitle}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="isaac-body">
        {notice && (
          <Alert className="br-only" variant="warning">
            {notice}
          </Alert>
        )}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" size="sm" className="me-2" />
            {UI_TEXT.auth.agreementLoading}
          </div>
        )}

        {error && !loading && (
          <Alert className="br-only" variant="danger">
            {error}
            <div className="mt-2">
              <Button size="sm" variant="outline-danger" className="br-only" onClick={loadDua}>
                {UI_TEXT.auth.agreementRetry}
              </Button>
            </div>
          </Alert>
        )}

        {dua && !loading && (
          <>
            {/* tabIndex makes the box focusable so keyboard and screen-reader
                users can scroll it with arrows/PageDown; those scrolls fire the
                same handler, so the gate is not mouse-only. */}
            <div
              ref={scrollRef}
              onScroll={checkScrollPosition}
              tabIndex={0}
              aria-label={UI_TEXT.auth.agreementTitle}
              style={{
                maxHeight: '55vh',
                overflowY: 'auto',
                padding: '16px',
                border: '1px solid #dee2e6',
                borderRadius: '12px 12px 0 12px',
                background: '#fff',
                fontSize: '0.925rem',
                lineHeight: 1.6,
              }}
            >
              {/* Links open in a new tab so following one mid-signup doesn't
                  navigate away from the (unsubmitted) auth form. */}
              <ReactMarkdown components={MARKDOWN_COMPONENTS}>{dua.markdown}</ReactMarkdown>
            </div>
            <div className="text-muted small mt-2 d-flex justify-content-between flex-wrap gap-2">
              <span>
                {UI_TEXT.auth.agreementVersionLabel.replace('{version}', dua.version)}
              </span>
              {!scrolledToEnd && <span>{UI_TEXT.auth.agreementScrollHint}</span>}
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" className="br-only" onClick={onHide}>
          {declineLabel || UI_TEXT.auth.agreementDecline}
        </Button>
        <Button
          variant="primary"
          className="br-only"
          onClick={handleAccept}
          disabled={!dua || loading || !scrolledToEnd}
          title={!scrolledToEnd ? UI_TEXT.auth.agreementScrollHint : undefined}
        >
          {UI_TEXT.auth.agreementAccept}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DuaAgreement;
