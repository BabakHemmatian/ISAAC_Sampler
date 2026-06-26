// App.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import Auth from "./Auth";
import {
  Box, AppBar, Toolbar, Typography, Button, TextField, MenuItem,
  Grid, Snackbar, Alert, CircularProgress, Container, FormControl,
  LinearProgress, Chip, Tooltip, Stack, GlobalStyles
} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import { Routes, Route } from "react-router-dom";
import { UI_TEXT } from "./constant.ts";

const LOGO_MARK = "/ISAAC Logo 2.png";
const FAVICON   = "/ISAAC Logo 3.png";

// Backend API URL - Use localhost for local development, empty for production (Nginx proxy)
const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? "" : "http://localhost:8000");

const html = (s) => ({ __html: s ?? "" });

// Public/anonymous Globus guest collection on Taiga that serves the raw monthly
// files. Whole-file ("leave document count blank") downloads point here so the
// bytes come straight off the storage DTNs, never through this VM.
const GLOBUS_DATA_BASE = "https://g-05a4b6.2d513.8443.data.globus.org";
const GLOBUS_COLLECTION_ID = "9fd39b9f-d60e-44c5-b475-691b614c3d46";
// At or below this many files, lead with clickable links; above it, lead with
// the Globus folder / command-line options instead of a long wall of links.
const FULL_FILES_LINKS_MAX = 10;

// Inclusive list of "YYYY-MM" strings between two "YYYY-MM" bounds.
const monthsBetween = (start, end) => {
  const out = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
};

// Deep-link into the Globus web app File Manager at one category folder.
const globusFolderLink = (category) =>
  `https://app.globus.org/file-manager?origin_id=${GLOBUS_COLLECTION_ID}` +
  `&origin_path=${encodeURIComponent(`/${category}/`)}`;

const prettyBytes = (n) => {
  if (!n && n !== 0) return null;
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
};

const BR_ONLY = "12px 12px 0px 12px";
const BR_INPUT_SX = {
  "& .MuiOutlinedInput-root": { borderRadius: BR_ONLY },
  "& .MuiOutlinedInput-notchedOutline": { borderRadius: BR_ONLY },
  "& fieldset": { borderRadius: BR_ONLY },
};

const HEADLINE_FF =
  '"OctoberCompressedDevanagari","IBM Plex Sans Devanagari","IBM Plex Sans",sans-serif';

const theme = createTheme({
  palette: {
    primary: { main: "#318CE7" },
    background: { default: "#FFFFFF" },
    text: { primary: "#2D2D2D" }
  },
  typography: {
    fontFamily:
      '"IBM Plex Sans Devanagari","IBM Plex Sans","Roboto","Helvetica Neue",Arial,sans-serif',
    // Headings use display font with Devanagari support
    h1: { fontFamily: HEADLINE_FF, fontWeight: 700 },
    h2: { fontFamily: HEADLINE_FF, fontWeight: 700 },
    h3: { fontFamily: HEADLINE_FF, fontWeight: 700 },
    h4: { fontFamily: HEADLINE_FF, fontWeight: 700 },
    h5: { fontFamily: HEADLINE_FF, fontWeight: 700 },
    h6: { fontFamily: HEADLINE_FF, fontWeight: 700 }
  },
  shape: { borderRadius: 0 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: BR_ONLY } } },
    MuiFab: { styleOverrides: { root: { borderRadius: BR_ONLY } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: BR_ONLY },
        notchedOutline: { borderRadius: BR_ONLY },
        input: { borderRadius: BR_ONLY }
      }
    },
    MuiPaper: { styleOverrides: { root: { borderRadius: BR_ONLY } } },
    MuiChip: { styleOverrides: { root: { borderRadius: BR_ONLY } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: BR_ONLY } } },
    MuiSnackbarContent: { styleOverrides: { root: { borderRadius: BR_ONLY } } },
    MuiAppBar: { styleOverrides: { root: { borderRadius: BR_ONLY } } }
  }
});

function MainApp() {
  const [supabase, setSupabase] = useState(null);
  const [session, setSession] = useState(null);
  const [socialGroup, setSocialGroup] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [numDocs, setNumDocs] = useState("");
  const [randomSeed, setRandomSeed] = useState("");
  const [loading, setLoading] = useState(false);

  const [stage, setStage] = useState("");
  const [percent, setPercent] = useState(null);
  const [etaHuman, setEtaHuman] = useState(null);

  const [downloadLink, setDownloadLink] = useState("");
  const [fullFiles, setFullFiles] = useState(null);
  const [page, setPage] = useState("home");
  const [issueDesc, setIssueDesc] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [pollIntervalId, setPollIntervalId] = useState(null);
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash ? window.location.hash.slice(1) : "");
  const isAuthRecoveryFlow =
    window.location.pathname === "/update-password" ||
    searchParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery" ||
    !!(hashParams.get("access_token") && hashParams.get("refresh_token"));
  const isAuthCodeFlow = searchParams.has("code");
  const forceAuthScreen = isAuthRecoveryFlow || isAuthCodeFlow;

  useEffect(() => {
    const pre1 = document.createElement("link");
    pre1.rel = "preconnect";
    pre1.href = "https://fonts.googleapis.com";
    const pre2 = document.createElement("link");
    pre2.rel = "preconnect";
    pre2.href = "https://fonts.gstatic.com";
    pre2.crossOrigin = "";
    const plex = document.createElement("link");
    plex.rel = "stylesheet";
    plex.href =
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Devanagari:wght@400;500;600;700&display=swap";
    document.head.appendChild(pre1);
    document.head.appendChild(pre2);
    document.head.appendChild(plex);
    return () => {
      document.head.removeChild(pre1);
      document.head.removeChild(pre2);
      document.head.removeChild(plex);
    };
  }, []);

  // Allow the static pages' "Report an Issue" tab to deep-link here via /#report-issue
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#report-issue") {
      setPage("issue");
    }
  }, []);

  // Create a Supabase client only so <Auth /> renders
  useEffect(() => {
    async function setupSupabase() {
      try {
        if (typeof fetch === "undefined") {
          const { default: fetchPoly } = await import("cross-fetch");
          global.fetch = fetchPoly; window.fetch = fetchPoly;
        }
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = "https://rfyavjpuqoepfkxhtzie.supabase.co";
        const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWF2anB1cW9lcGZreGh0emllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Njg1NDYsImV4cCI6MjA3MzQ0NDU0Nn0.pnW2RgIQj0G-CbY3neYc7zciAHrOHxyF8U7edlrwj1U";
        const client = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
          },
          global: {
            fetch: (url, options = {}) => {
              return fetch(url, {
                ...options,
                headers: {
                  ...options.headers,
                },
              });
            }
          }
        });
        setSupabase(client);
      } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
        setSupabase(null);
      }
    }
    setupSupabase();
  }, []);

  useEffect(() => {
    document.title = UI_TEXT?.appTitle ?? "ISSAC Sampler";
    const existing = document.querySelector("link[rel~='icon']");
    const link = existing || document.createElement("link");
    link.rel = "icon";
    link.href = FAVICON;
    if (!existing) document.head.appendChild(link);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
  };

  const formatDate = (date) =>
    date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "";

  const resetProgress = () => {
    setStage(""); setPercent(null); setEtaHuman(null); setDownloadLink(null); setFullFiles(null);
  };

  // Whole-file ("blank document count") request: resolve the one-category,
  // month-range selection to direct Globus CSV links. No server round-trip — the
  // VM does no file I/O and serves none of these bytes.
  const buildFullFileLinks = () => {
    const months = monthsBetween(formatDate(startDate), formatDate(endDate));
    const urls = months.map((ym) => `${GLOBUS_DATA_BASE}/${socialGroup}/RC_${ym}.csv`);
    setFullFiles({ category: socialGroup, months, urls, totalBytes: null });
    // Best-effort: sum CSV sizes from the published manifest so users can see how
    // big the pull is before they start. Failure just leaves the size hidden.
    axios.get("/direct-download/manifest.json")
      .then(({ data }) => {
        const want = new Set(months.map((ym) => `${socialGroup}/RC_${ym}.csv`));
        let total = 0;
        for (const r of data) {
          if (r.format === "csv" && want.has(r.rel_path)) total += r.size_bytes || 0;
        }
        setFullFiles((prev) => (prev && prev.category === socialGroup
          ? { ...prev, totalBytes: total } : prev));
      })
      .catch(() => { /* size is optional */ });
  };

  // Download the Globus URL list as isaac_urls.txt (for wget -i / aria2c -i).
  const downloadUrlList = () => {
    if (!fullFiles) return;
    const blob = new Blob([fullFiles.urls.join("\n") + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "isaac_urls.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleSample = async () => {
    if (!socialGroup || !startDate || !endDate || startDate > endDate) {
      setSnackbar({
        open: true,
        message: UI_TEXT?.snackbar?.invalidFields ?? "Please fill all fields correctly.",
        severity: "error"
      });
      return;
    }
    // Validate random seed if provided: must be a non-negative integer.
    let parsedSeed;
    if (randomSeed !== "" && randomSeed !== null && randomSeed !== undefined) {
      const trimmed = String(randomSeed).trim();
      if (!/^\d+$/.test(trimmed)) {
        setSnackbar({
          open: true,
          message: "Random Seed must be a non-negative integer.",
          severity: "error"
        });
        return;
      }
      parsedSeed = Number(trimmed);
      if (!Number.isSafeInteger(parsedSeed)) {
        setSnackbar({
          open: true,
          message: "Random Seed is too large.",
          severity: "error"
        });
        return;
      }
    }

    // Blank document count = whole monthly files, not a sample. Serve them as
    // direct Globus links (off-VM); no backend call, no server-side bundling.
    if (!numDocs) {
      resetProgress();
      buildFullFileLinks();
      return;
    }

    setLoading(true);
    resetProgress();

    try {
      const res = await axios.post(`${API_BASE_URL}/sample`, {
        social_group: socialGroup,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        num_docs: numDocs ? Number(numDocs) : undefined,
        random_seed: parsedSeed !== undefined ? parsedSeed : undefined
      });
      const taskId = res.data.task_id;

      const intervalId = setInterval(async () => {
        try {
          const { data } = await axios.get(`${API_BASE_URL}/progress/${taskId}`);
          setStage(data.stage || "");
          setPercent(typeof data.percent === "number" ? data.percent : null);
          setEtaHuman(data.eta_human || null);

          if (data.stage === "No files found") {
            clearInterval(intervalId); setPollIntervalId(null); setLoading(false);
            setSnackbar({ open: true, message: UI_TEXT?.snackbar?.noFiles ?? "No files found for this selection.", severity: "error" });
            return;
          }
          if (typeof data.stage === "string" && data.stage.startsWith("Error")) {
            clearInterval(intervalId); setPollIntervalId(null); setLoading(false);
            setSnackbar({ open: true, message: data.stage, severity: "error" });
            return;
          }
          if (data.download_link) {
            clearInterval(intervalId);
            setPollIntervalId(null);
          
            const resolvedDownloadLink =
              data.download_link.startsWith("http")
                ? data.download_link
                : `${API_BASE_URL}${data.download_link}`;
          
            setDownloadLink(resolvedDownloadLink);
            setSnackbar({
              open: true,
              message: UI_TEXT?.snackbar?.fileReady ?? "Your file is ready.",
              severity: "success"
            });
            setLoading(false);
         }
        } catch {
          clearInterval(intervalId); setPollIntervalId(null); setLoading(false);
          setSnackbar({ open: true, message: UI_TEXT?.snackbar?.progressFailed ?? "Failed to fetch progress.", severity: "error" });
        }
      }, 1000);

      setPollIntervalId(intervalId);
    } catch (err) {
      setSnackbar({
        open: true,
        message: `${UI_TEXT?.snackbar?.sampleFailed ?? "Failed to start job"}: ${err.message}`,
        severity: "error"
      });
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (pollIntervalId) { clearInterval(pollIntervalId); setPollIntervalId(null); }
    setLoading(false); setStage(""); setPercent(null); setEtaHuman(null);
    setSnackbar({ open: true, message: UI_TEXT?.snackbar?.stopped ?? "Stopped.", severity: "info" });
  };

  const handleIssueSubmit = async () => {
    if (!issueDesc) {
      setSnackbar({ open: true, message: UI_TEXT?.snackbar?.issueEmpty ?? "Please enter an issue description.", severity: "error" });
      return;
    }
    setIssueLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/report_issue`, {
        email: session?.user?.email || "guest@local",
        description: issueDesc
      });
      setIssueDesc("");
      setSnackbar({ open: true, message: UI_TEXT?.snackbar?.issueSuccess ?? "Issue sent. Thank you!", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: UI_TEXT?.snackbar?.issueError ?? "Couldn't send issue.", severity: "error" });
    }
    setIssueLoading(false);
  };

  if (!session || forceAuthScreen) {
    return (
      <Auth supabase={supabase} />
    );
  }

  // —— MAIN APP ——
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={`
        @font-face {
          font-family: 'OctoberCompressedDevanagari';
          src: url('/fonts/OctoberCompressedDevanagari.woff2') format('woff2');
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }
        body { font-family: "IBM Plex Sans Devanagari","IBM Plex Sans",Roboto,"Helvetica Neue",Arial,sans-serif; }
      `} />

      <Box sx={{ flexGrow: 1, backgroundColor: "background.default", minHeight: "100vh" }}>
        <IsaacAppBar
          onHome={() => setPage("home")}
          onIssue={() => setPage("issue")}
          onLogout={handleLogout}
        />

        <Container
          maxWidth="md"
          sx={{ py: 4, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}
        >
          {page === "home" && (
            <Box width="100%">
              <Box
                sx={{
                  backgroundColor: "#318CE7",
                  color: "common.white",
                  borderRadius: BR_ONLY,
                  p: { xs: 2.5, sm: 3.5 },
                  mb: 3,
                  maxWidth: 850
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    lineHeight: 1.05,
                    fontWeight: 700,
                    fontFamily: HEADLINE_FF
                  }}
                >
                  {UI_TEXT?.homeTitle ?? "ISAAC Reddit Sampler"}
                </Typography>
                <Typography
                  variant="body2"
                  component="div"
                  sx={{
                    mt: 1.5,
                    maxWidth: 640,
                    opacity: 0.95,
                    fontFamily: HEADLINE_FF
                  }}
                  dangerouslySetInnerHTML={html(
                    UI_TEXT?.homeSubtitle ??
                      "Select a social group and time period to retrieve a reproducible random sample of Reddit posts as a CSV file."
                  )}
                />

              </Box>

              <Grid container direction="column" spacing={3}>
                <Grid item>
                  <FormControl fullWidth sx={{ borderRadius: BR_ONLY }}>
                    <TextField
                      select
                      label={UI_TEXT?.socialGroupLabel ?? "Social Group"}
                      value={socialGroup}
                      onChange={(e) => setSocialGroup(e.target.value)}
                      helperText={UI_TEXT?.socialGroupHelper ?? "Select the dataset group"}
                      disabled={loading}
                      sx={BR_INPUT_SX}
                    >
                      <MenuItem value="ability">Ability</MenuItem>
                      <MenuItem value="age">Age</MenuItem>
                      <MenuItem value="race">Race</MenuItem>
                      <MenuItem value="sexuality">Sexuality</MenuItem>
                      <MenuItem value="skin_tone">Skin Tone</MenuItem>
                      <MenuItem value="weight">Weight</MenuItem>
                    </TextField>
                  </FormControl>
                </Grid>

                <Grid item>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      <DatePicker
                        views={["year", "month"]}
                        label="Start Month (YYYY-MM)"
                        value={startDate}
                        minDate={new Date(2007, 0)}
                        maxDate={new Date(2023, 11)}
                        onChange={(nv) => setStartDate(nv)}
                        slotProps={{
                          popper: { sx: { "& .MuiPaper-root": { borderRadius: BR_ONLY } } },
                          textField: {
                            sx: BR_INPUT_SX,
                            helperText: "Pick from calendar to avoid format typos.",
                            inputProps: { readOnly: true }
                          },
                        }}
                        componentsProps={{ paper: { sx: { borderRadius: BR_ONLY } } }}
                        renderInput={(params) => <TextField fullWidth {...params} sx={BR_INPUT_SX} />}
                        disabled={loading}
                      />

                      <DatePicker
                        views={["year", "month"]}
                        label="End Month (YYYY-MM)"
                        value={endDate}
                        minDate={startDate || new Date(2007, 0)}
                        maxDate={new Date(2023, 11)}
                        onChange={(nv) => setEndDate(nv)}
                        slotProps={{
                          popper: { sx: { "& .MuiPaper-root": { borderRadius: BR_ONLY } } },
                          textField: {
                            sx: BR_INPUT_SX,
                            helperText: "Pick from calendar to avoid format typos.",
                            inputProps: { readOnly: true }
                          },
                        }}
                        componentsProps={{ paper: { sx: { borderRadius: BR_ONLY } } }}
                        renderInput={(params) => <TextField fullWidth {...params} sx={BR_INPUT_SX} />}
                        disabled={loading}
                      />
                    </Box>
                  </LocalizationProvider>
                </Grid>

                <Grid item>
                  <TextField
                    fullWidth
                    type="number"
                    label={UI_TEXT?.numDocsLabel ?? "Number of documents (optional)"}
                    value={numDocs}
                    onChange={(e) => setNumDocs(e.target.value)}
                    helperText={UI_TEXT?.numDocsHelper ?? "Leave blank to bundle and return all original files (no sampling)."}
                    disabled={loading}
                    inputProps={{ min: 1 }}
                    sx={BR_INPUT_SX}
                  />
                </Grid>

                <Grid item>
                  <TextField
                    fullWidth
                    type="number"
                    label={UI_TEXT?.randomSeedLabel ?? "Random Seed (Optional)"}
                    value={randomSeed}
                    onChange={(e) => setRandomSeed(e.target.value)}
                    helperText={UI_TEXT?.randomSeedHelper ?? "If a sample size is set above, providing an integer seed produces a reproducible random subset. The seed is appended to the output filename."}
                    disabled={loading}
                    inputProps={{ min: 0, step: 1 }}
                    sx={BR_INPUT_SX}
                  />
                </Grid>

                <Grid item sx={{ display: "flex", gap: 2 }}>
                  <Button variant="contained" onClick={handleSample} disabled={loading}>
                    {loading ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} /> {UI_TEXT?.retrieving ?? "Working..."}
                      </>
                    ) : (
                      UI_TEXT?.retrieve ?? "Retrieve"
                    )}
                  </Button>
                  <AnimatePresence>
                    {loading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Button variant="outlined" color="error" onClick={handleStop}>
                          {UI_TEXT?.stop ?? "Stop"}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Grid>

                {loading && (
                  <Grid item>
                    <Stack spacing={1}>
                      <Typography variant="subtitle1" color="text.secondary">
                        {(UI_TEXT?.currentStage ?? "Current stage") + ": "} {stage || "Initializing..."}
                      </Typography>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          {typeof percent === "number" ? (
                            <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, percent))} />
                          ) : (
                            <LinearProgress />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ minWidth: 48, textAlign: "right" }}>
                          {typeof percent === "number" ? `${percent.toFixed(0)}%` : "--"}
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <Tooltip title="Estimated time remaining (based on work completed so far)">
                          <Chip label={`ETA: ${etaHuman ?? "--"}`} size="small" color="default" variant="outlined" />
                        </Tooltip>
                      </Box>
                    </Stack>
                  </Grid>
                )}

                {downloadLink && (
                  <Grid item>
                    <Alert severity="success" sx={{ borderRadius: BR_ONLY }}>
                      <Button
                        component="a"
                        href={downloadLink}
                        download
                        target="_blank"
                        rel="noreferrer"
                        variant="outlined"
                        color="success"
                        sx={{ ml: 0.5 }}
                      >
                        {UI_TEXT?.downloadSample ?? "Download CSV"}
                      </Button>
                    </Alert>
                  </Grid>
                )}

                {fullFiles && (
                  <Grid item>
                    <Alert severity="info" icon={false} sx={{ borderRadius: BR_ONLY }}>
                      <Stack spacing={1.25}>
                        <Typography variant="h6" sx={{ m: 0 }}>
                          {UI_TEXT?.fullFiles?.heading ?? "Whole monthly files — direct download"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>{fullFiles.urls.length}</strong>{" "}
                          monthly CSV file{fullFiles.urls.length === 1 ? "" : "s"} for{" "}
                          <strong>{fullFiles.category}</strong>, {fullFiles.months[0]} – {fullFiles.months[fullFiles.months.length - 1]}
                          {fullFiles.totalBytes != null ? <> · ~<strong>{prettyBytes(fullFiles.totalBytes)}</strong> total</> : null}.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {UI_TEXT?.fullFiles?.servedNote ?? "These files download directly from our Globus storage, not through this website."}
                        </Typography>

                        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                          <Button component="a" href={globusFolderLink(fullFiles.category)} target="_blank" rel="noreferrer"
                                  variant="contained" sx={{ borderRadius: BR_ONLY }}>
                            {UI_TEXT?.fullFiles?.openInGlobus ?? "Browse & download in Globus"}
                          </Button>
                          <Button onClick={downloadUrlList} variant="outlined" sx={{ borderRadius: BR_ONLY }}>
                            {UI_TEXT?.fullFiles?.downloadList ?? "Download file list (isaac_urls.txt)"}
                          </Button>
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          {UI_TEXT?.fullFiles?.bulkNote ?? "To download several files at once without writing code, open the folder in Globus, install the free Globus Connect Personal app once, then drag-and-drop the files to your computer."}{" "}
                          <a href={UI_TEXT?.fullFiles?.connectAppUrl ?? "https://www.globus.org/globus-connect-personal"}
                             target="_blank" rel="noreferrer" style={{ color: "#318CE7", whiteSpace: "nowrap" }}>
                            {UI_TEXT?.fullFiles?.connectAppLabel ?? "Get Globus Connect Personal"} →
                          </a>
                        </Typography>

                        {fullFiles.urls.length > FULL_FILES_LINKS_MAX ? (
                          <Typography variant="body2" color="text.secondary">
                            {UI_TEXT?.fullFiles?.cliNote ?? "Prefer the command line? The Direct Download tab has wget / aria2c recipes that use the file list above."}
                          </Typography>
                        ) : (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                            {fullFiles.urls.map((u) => (
                              <a key={u} href={u} style={{ color: "#318CE7", wordBreak: "break-all" }}>
                                {u.split("/").slice(-2).join("/")}
                              </a>
                            ))}
                          </Box>
                        )}

                        {UI_TEXT?.fullFiles?.excelNote ? (
                          <Typography variant="caption" color="text.secondary">
                            {UI_TEXT.fullFiles.excelNote}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {page === "issue" && (
            <Box width="100%">
              <Box
                sx={{
                  backgroundColor: "#318CE7",
                  color: "common.white",
                  borderRadius: BR_ONLY,
                  p: { xs: 2.5, sm: 3.5 },
                  mb: 3,
                  maxWidth: 850
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    lineHeight: 1.05,
                    fontWeight: 700,
                    fontFamily: HEADLINE_FF
                  }}
                >
                  {UI_TEXT?.issueTitle ?? "Report an Issue"}
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{
                    textTransform: "uppercase",
                    fontWeight: 600,
                    opacity: 0.95,
                    mt: 0.5,
                    fontFamily: HEADLINE_FF
                  }}
                >
                  {UI_TEXT?.issueKicker ?? "Help us improve"}
                </Typography>
                <Typography
                  variant="body2"
                  component="div"
                  sx={{
                    mt: 1.5,
                    maxWidth: 640,
                    opacity: 0.95,
                    fontFamily: HEADLINE_FF
                  }}
                  dangerouslySetInnerHTML={html(
                    UI_TEXT?.issueSubtitle ??
                      "If you notice any bugs, inconsistencies, or have feature suggestions, please describe them below. Your email will be used to follow up if needed."
                  )}
                />
              </Box>

              <TextField
                label={UI_TEXT?.issueDescLabel ?? "Issue description"}
                multiline
                rows={4}
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
                fullWidth
                sx={{ mb: 2, ...BR_INPUT_SX }}
              />
              <Button variant="outlined" color="error" onClick={handleIssueSubmit} disabled={issueLoading}>
                {issueLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} /> {UI_TEXT?.issueSending ?? "Sending..."}
                  </>
                ) : (
                  UI_TEXT?.issueSend ?? "Send Issue" )}
              </Button>
            </Box>
          )}
        </Container>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

// ——— Shared header (used by the main app AND the public doc routes) ———
function IsaacAppBar({ onHome, onIssue, onLogout }) {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ bgcolor: "#E1F4FF", color: "text.primary", borderRadius: BR_ONLY }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box component="img" src={LOGO_MARK} alt="ISAAC logo" sx={{ height: 28, width: "auto" }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontFamily: HEADLINE_FF, letterSpacing: 0.5, textTransform: "uppercase" }}
          >
            {UI_TEXT?.appTitle ?? "ISAAC Reddit Sampler"}
          </Typography>
        </Box>
        <Box>
          <Button color="inherit" onClick={onHome}>Home</Button>
          <Button color="inherit" onClick={onIssue}>{UI_TEXT?.issueTitle ?? "Report Issue"}</Button>
          <Button color="inherit" href="/direct-download/">Direct Download</Button>
          <Button color="inherit" href="/query/">Query Playground</Button>
          <Button color="inherit" onClick={onLogout}>Logout</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

const FONT_GLOBALS = `
  @font-face {
    font-family: 'OctoberCompressedDevanagari';
    src: url('/fonts/OctoberCompressedDevanagari.woff2') format('woff2');
    font-weight: 700; font-style: normal; font-display: swap;
  }
  body { font-family: "IBM Plex Sans Devanagari","IBM Plex Sans",Roboto,"Helvetica Neue",Arial,sans-serif; }
`;

// Styling for the doc/query page bodies (injected as HTML under the shared header)
const DOC_CSS = `
  .isaac-doc{max-width:880px;margin:0 auto;color:#2D2D2D;line-height:1.65;}
  .isaac-doc .hero{background:#318CE7;color:#fff;border-radius:${BR_ONLY};padding:26px 30px;margin:8px 0 28px;}
  .isaac-doc .hero h1{font-family:${HEADLINE_FF};font-weight:700;text-transform:uppercase;letter-spacing:.5px;line-height:1.05;margin:0 0 10px;font-size:2rem;}
  .isaac-doc .hero p{margin:0;opacity:.97;}
  .isaac-doc .hero a{color:#fff;text-decoration:underline;}
  .isaac-doc h2{font-family:${HEADLINE_FF};font-weight:700;font-size:1.35rem;margin:36px 0 12px;padding-top:14px;border-top:1px solid #e4e8ee;}
  .isaac-doc h3{font-family:${HEADLINE_FF};font-weight:700;font-size:1.08rem;margin:24px 0 8px;}
  .isaac-doc a{color:#318CE7;}
  .isaac-doc code{background:#eef2f7;color:#1c3d5a;padding:2px 6px;border-radius:6px;font-size:.88em;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}
  .isaac-doc pre{background:#f6f8fb;border:1px solid #e4e8ee;border-radius:${BR_ONLY};padding:15px 17px;overflow-x:auto;font-size:.85rem;line-height:1.5;}
  .isaac-doc pre code{background:none;color:#243b53;padding:0;}
  .isaac-doc table{border-collapse:collapse;width:100%;margin:8px 0;font-size:.9rem;}
  .isaac-doc th,.isaac-doc td{text-align:left;padding:8px 10px;border-bottom:1px solid #e4e8ee;}
  .isaac-doc th{color:#5b6470;font-weight:600;}
  .isaac-doc td.num,.isaac-doc th.num{text-align:right;font-variant-numeric:tabular-nums;}
  .isaac-doc .muted{color:#5b6470;font-size:.9rem;}
  .isaac-doc .pill{display:inline-block;background:#eef3f9;border:1px solid #e4e8ee;border-radius:6px;padding:1px 7px;margin:0 2px;font-size:.82em;}
  .isaac-doc .note{background:#eaf3fd;border-left:3px solid #318CE7;padding:12px 16px;border-radius:0 12px 12px 0;margin:14px 0;}
  .isaac-doc .examples{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;}
  .isaac-doc .examples button{background:#eef3f9;color:#1c3d5a;border:1px solid #e4e8ee;border-radius:${BR_ONLY};padding:6px 11px;font-size:.85rem;cursor:pointer;}
  .isaac-doc .examples button:hover{border-color:#318CE7;}
  .isaac-doc textarea{width:100%;min-height:150px;background:#f6f8fb;color:#243b53;border:1px solid #e4e8ee;border-radius:${BR_ONLY};padding:14px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9rem;line-height:1.5;resize:vertical;}
  .isaac-doc .runbar{display:flex;align-items:center;gap:14px;margin:12px 0;flex-wrap:wrap;}
  .isaac-doc #run{background:#318CE7;color:#fff;border:0;border-radius:${BR_ONLY};padding:10px 22px;font-size:.95rem;font-weight:600;cursor:pointer;}
  .isaac-doc #run:disabled{background:#c9d4e2;color:#fff;cursor:default;}
  .isaac-doc #export{background:#fff;color:#318CE7;border:1px solid #318CE7;border-radius:${BR_ONLY};padding:10px 18px;font-size:.9rem;font-weight:600;cursor:pointer;}
  .isaac-doc #export:disabled{background:#fff;color:#c9d4e2;border-color:#e4e8ee;cursor:default;}
  .isaac-doc .helper{background:#f6f8fb;border:1px solid #e4e8ee;border-radius:${BR_ONLY};padding:14px 16px;margin:12px 0;}
  .isaac-doc .helper .groups{display:flex;flex-wrap:wrap;gap:6px 16px;margin-bottom:12px;}
  .isaac-doc .helper .groups label{display:inline-flex;align-items:center;gap:5px;font-size:.9rem;color:#243b53;}
  .isaac-doc .helper .range{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;}
  .isaac-doc .helper .range label{display:inline-flex;align-items:center;gap:6px;font-size:.9rem;color:#5b6470;}
  .isaac-doc .helper input[type=month]{background:#fff;color:#243b53;border:1px solid #e4e8ee;border-radius:8px;padding:6px 8px;font-size:.88rem;font-family:inherit;}
  .isaac-doc .helper #hgen{background:#eef3f9;color:#1c3d5a;border:1px solid #318CE7;border-radius:${BR_ONLY};padding:7px 14px;font-size:.88rem;font-weight:600;cursor:pointer;}
  .isaac-doc .helper #hinfo{margin:10px 0 0;}
  .isaac-doc .helper #hinfo.err{color:#c0392b;}
  .isaac-doc .status{font-size:.9rem;color:#5b6470;}
  .isaac-doc .status.ok{color:#1e7a44;} .isaac-doc .status.err{color:#c0392b;}
  .isaac-doc .results{margin-top:18px;overflow-x:auto;}
  .isaac-doc .results th{position:sticky;top:0;background:#fff;}
  .isaac-doc .results th,.isaac-doc .results td{max-width:520px;overflow:hidden;text-overflow:ellipsis;vertical-align:top;}
`;

function clearIsaacSession() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.indexOf("sb-") === 0)
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) { /* ignore */ }
}

// Theme + shared header wrapper for the public doc routes
function DocPageShell({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={FONT_GLOBALS} />
      <GlobalStyles styles={DOC_CSS} />
      <Box sx={{ backgroundColor: "background.default", minHeight: "100vh" }}>
        <IsaacAppBar
          onHome={() => { window.location.href = "/"; }}
          onIssue={() => { window.location.href = "/#report-issue"; }}
          onLogout={() => { clearIsaacSession(); window.location.href = "/"; }}
        />
        <Container maxWidth="md" sx={{ py: 4 }}>
          {children}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

function useHtmlPartial(url) {
  const [body, setBody] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => r.text())
      .then((t) => { if (!cancelled) setBody(t); })
      .catch(() => { if (!cancelled) setBody("<p>Failed to load page content.</p>"); });
    return () => { cancelled = true; };
  }, [url]);
  return body;
}

function DirectDownloadPage() {
  const body = useHtmlPartial("/pages/direct-download.html");
  return (
    <DocPageShell>
      <div className="isaac-doc" dangerouslySetInnerHTML={{ __html: body }} />
    </DocPageShell>
  );
}

function QueryPlaygroundPage() {
  const body = useHtmlPartial("/pages/query.html");
  useEffect(() => {
    if (!body) return;
    let conn = null;
    let disposed = false;
    const DISPLAY_MAX = 10000;   // rows shown in the results table
    const CSV_MAX = 100000;      // rows written to an exported CSV
    const TEXT_SCAN_WARN_FILES = 6;  // warn when a full-text scan spans more than this many files
    const DATA_BASE = "https://g-05a4b6.2d513.8443.data.globus.org";
    const $ = (id) => document.getElementById(id);
    const sqlEl = $("sql");
    const runBtn = $("run");
    const exportBtn = $("export");
    const statusEl = $("status");
    const resultsEl = $("results");
    if (!sqlEl) return;
    let lastFields = null;
    let lastRows = null;
    const setStatus = (m, k = "") => { if (statusEl) { statusEl.textContent = m; statusEl.className = "status " + k; } };
    const fmt = (v) => (v === null || v === undefined) ? "" : (typeof v === "bigint" ? v.toString() : String(v));
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    function renderTable(table) {
      const fields = table.schema.fields.map((f) => f.name);
      const rows = table.toArray();
      lastFields = fields;
      lastRows = rows;
      let h = "<table><thead><tr>" + fields.map((f) => "<th>" + esc(f) + "</th>").join("") + "</tr></thead><tbody>";
      for (const r of rows.slice(0, DISPLAY_MAX)) {
        h += "<tr>" + fields.map((f) => "<td>" + esc(fmt(r[f])) + "</td>").join("") + "</tr>";
      }
      h += "</tbody></table>";
      if (rows.length > DISPLAY_MAX) {
        h += '<p class="muted">Showing first ' + DISPLAY_MAX.toLocaleString() + " of " + rows.length.toLocaleString() +
             " rows. Use <strong>Export CSV</strong> for up to " + CSV_MAX.toLocaleString() + ".</p>";
      }
      if (resultsEl) resultsEl.innerHTML = h;
      if (exportBtn) exportBtn.disabled = rows.length === 0;
      return rows.length;
    }
    // Warn before a query that scans the full `text` column across many monthly files.
    function shouldWarnTextScan(sql) {
      const referencesText = /\btext\b/i.test(sql);
      const fileCount = (sql.match(/\.parquet/gi) || []).length;
      return referencesText && fileCount > TEXT_SCAN_WARN_FILES;
    }
    async function run() {
      if (!conn) return;
      const sql = sqlEl.value;
      if (shouldWarnTextScan(sql)) {
        const ok = window.confirm(
          "This query reads the full \"text\" column across many monthly files. That can transfer a lot of " +
          "data and may exhaust this browser tab's memory.\n\n" +
          "Consider aggregating, adding filters, or using the Python package / direct downloads for large " +
          "extractions.\n\nRun anyway?"
        );
        if (!ok) { setStatus("Cancelled.", ""); return; }
      }
      if (runBtn) runBtn.disabled = true;
      if (exportBtn) exportBtn.disabled = true;
      if (resultsEl) resultsEl.innerHTML = "";
      lastFields = null; lastRows = null;
      setStatus("Running…");
      const t0 = performance.now();
      try {
        const res = await conn.query(sql);
        const n = renderTable(res);
        setStatus(n + " row(s) · " + ((performance.now() - t0) / 1000).toFixed(1) + "s", "ok");
      } catch (e) {
        setStatus("Error: " + (e && e.message ? e.message : e), "err");
      } finally {
        if (runBtn) runBtn.disabled = false;
      }
    }
    // Export the last result as CSV (up to CSV_MAX rows), downloaded from the browser.
    function exportCsv() {
      if (!lastFields || !lastRows || !lastRows.length) return;
      const cell = (v) => {
        const s = fmt(v);
        return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const n = Math.min(lastRows.length, CSV_MAX);
      const lines = [lastFields.map(cell).join(",")];
      for (let i = 0; i < n; i++) {
        const r = lastRows[i];
        lines.push(lastFields.map((f) => cell(r[f])).join(","));
      }
      const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "isaac_query.csv";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      const truncated = lastRows.length > CSV_MAX;
      setStatus("Exported " + n.toLocaleString() + " row(s)" +
        (truncated ? " (capped at " + CSV_MAX.toLocaleString() + " of " + lastRows.length.toLocaleString() + ")" : "") +
        " to isaac_query.csv", "ok");
    }
    // File-list helper: build a read_parquet([...]) query with a social_group column.
    function pad2(n) { return (n < 10 ? "0" : "") + n; }
    function monthsBetween(start, end) {
      const [sy, sm] = start.split("-").map(Number);
      const [ey, em] = end.split("-").map(Number);
      const out = [];
      let y = sy, m = sm;
      while (y < ey || (y === ey && m <= em)) {
        out.push(y + "-" + pad2(m));
        m += 1; if (m > 12) { m = 1; y += 1; }
      }
      return out;
    }
    function buildFileList() {
      const info = $("hinfo");
      const setInfo = (m, k = "") => { if (info) { info.innerHTML = m; info.className = "muted" + (k ? " " + k : ""); } };
      const groups = Array.from(document.querySelectorAll(".hg")).filter((c) => c.checked).map((c) => c.value);
      const startEl = $("hstart"), endEl = $("hend");
      if (!groups.length) { setInfo("Select at least one social group.", "err"); return; }
      let start = startEl ? startEl.value : "", end = endEl ? endEl.value : "";
      if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end)) { setInfo("Choose a valid month range.", "err"); return; }
      if (start > end) { const t = start; start = end; end = t; }
      if (start < "2007-01") start = "2007-01";
      if (end > "2023-12") end = "2023-12";
      const months = monthsBetween(start, end);
      const urls = [];
      for (const g of groups) for (const ym of months) urls.push(DATA_BASE + "/" + g + "/RC_" + ym + ".parquet");
      const list = urls.map((u) => "  '" + u + "'").join(",\n");
      const sql =
        "SELECT\n" +
        "  regexp_extract(filename, '/([^/]+)/RC_', 1) AS social_group,\n" +
        "  count(*) AS n, round(avg(score), 1) AS avg_score\n" +
        "FROM read_parquet([\n" + list + "], filename = true)\n" +
        "GROUP BY social_group\n" +
        "ORDER BY social_group;";
      sqlEl.value = sql;
      lastFields = null; lastRows = null;
      if (exportBtn) exportBtn.disabled = true;
      if (resultsEl) resultsEl.innerHTML = "";
      setInfo(urls.length + " file(s) — " + groups.length + " group(s) × " + months.length +
        " month(s). Inserted below; edit the SELECT, then Run.");
    }
    async function init() {
      try {
        const duckdb = await import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/+esm");
        const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
        const workerUrl = URL.createObjectURL(new Blob(['importScripts("' + bundle.mainWorker + '");'], { type: "text/javascript" }));
        const worker = new Worker(workerUrl);
        const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(workerUrl);
        if (disposed) return;
        conn = await db.connect();
        if (runBtn) runBtn.disabled = false;
        setStatus("Ready — edit the query and press Run (Ctrl/Cmd-Enter).", "ok");
      } catch (e) {
        setStatus("Failed to load DuckDB: " + (e && e.message ? e.message : e), "err");
      }
    }
    const onRun = () => run();
    const onExport = () => exportCsv();
    const onGen = () => buildFileList();
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(); };
    if (runBtn) runBtn.addEventListener("click", onRun);
    if (exportBtn) exportBtn.addEventListener("click", onExport);
    const genBtn = $("hgen");
    if (genBtn) genBtn.addEventListener("click", onGen);
    sqlEl.addEventListener("keydown", onKey);
    const exs = Array.from(document.querySelectorAll("[data-q]")).map((b) => {
      const handler = () => { sqlEl.value = b.getAttribute("data-q"); };
      b.addEventListener("click", handler);
      return [b, handler];
    });
    init();
    return () => {
      disposed = true;
      if (runBtn) runBtn.removeEventListener("click", onRun);
      if (exportBtn) exportBtn.removeEventListener("click", onExport);
      if (genBtn) genBtn.removeEventListener("click", onGen);
      sqlEl.removeEventListener("keydown", onKey);
      exs.forEach(([b, handler]) => b.removeEventListener("click", handler));
    };
  }, [body]);
  return (
    <DocPageShell>
      <div className="isaac-doc" dangerouslySetInnerHTML={{ __html: body }} />
    </DocPageShell>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/direct-download" element={<DirectDownloadPage />} />
      <Route path="/query" element={<QueryPlaygroundPage />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}

export default App;
