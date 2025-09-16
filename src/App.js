// App.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import Auth from "./Auth";
import {
  Box, AppBar, Toolbar, Typography, Button, TextField, MenuItem,
  Grid, Snackbar, Alert, CircularProgress, Container, FormControl, Fab,
  LinearProgress, Chip, Tooltip, Stack, GlobalStyles
} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import { UI_TEXT } from "./constant.ts";

const LOGO_MARK = "/ISAAC Logo 2.png";
const FAVICON   = "/ISAAC Logo 3.png";

const html = (s) => ({ __html: s ?? "" });

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

function App() {
  const [supabase, setSupabase] = useState(null);
  const [session, setSession] = useState(null);
  const [socialGroup, setSocialGroup] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [numDocs, setNumDocs] = useState("");
  const [loading, setLoading] = useState(false);

  const [stage, setStage] = useState("");
  const [percent, setPercent] = useState(null);
  const [etaHuman, setEtaHuman] = useState(null);
  const [etaSeconds, setEtaSeconds] = useState(null);

  const [downloadLink, setDownloadLink] = useState(null);
  const [page, setPage] = useState("home");
  const [issueDesc, setIssueDesc] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [pollIntervalId, setPollIntervalId] = useState(null);

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

  // Create a Supabase client only so <Auth /> renders
  useEffect(() => {
    async function setupSupabase() {
      try {
        if (typeof fetch === "undefined") {
          const { default: fetchPoly } = await import("cross-fetch");
          global.fetch = fetchPoly; window.fetch = fetchPoly;
        }
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = "https://bcaeugxhaokrankuwtsa.supabase.co";
        const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";
        const client = createClient(supabaseUrl, supabaseAnonKey);
        setSupabase(client);
      } catch {
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

  const handleLogout = () => setSession(null);
  const enterAsGuest = () => setSession({ user: { email: "guest@local" }, provider: "guest" });

  const formatDate = (date) =>
    date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "";

  const resetProgress = () => {
    setStage(""); setPercent(null); setEtaHuman(null); setEtaSeconds(null); setDownloadLink(null);
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
    setLoading(true);
    resetProgress();

    try {
      const res = await axios.post("http://127.0.0.1:8000/sample", {
        social_group: socialGroup,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        num_docs: numDocs ? Number(numDocs) : undefined
      });
      const taskId = res.data.task_id;

      const intervalId = setInterval(async () => {
        try {
          const { data } = await axios.get(`http://127.0.0.1:8000/progress/${taskId}`);
          setStage(data.stage || "");
          setPercent(typeof data.percent === "number" ? data.percent : null);
          setEtaHuman(data.eta_human || null);
          setEtaSeconds(typeof data.eta_seconds === "number" ? data.eta_seconds : null);

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
            clearInterval(intervalId); setPollIntervalId(null); setDownloadLink(data.download_link);
            setSnackbar({ open: true, message: UI_TEXT?.snackbar?.fileReady ?? "Your file is ready.", severity: "success" });
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
    setLoading(false); setStage(""); setPercent(null); setEtaHuman(null); setEtaSeconds(null);
    setSnackbar({ open: true, message: UI_TEXT?.snackbar?.stopped ?? "Stopped.", severity: "info" });
  };

  const handleIssueSubmit = async () => {
    if (!issueDesc) {
      setSnackbar({ open: true, message: UI_TEXT?.snackbar?.issueEmpty ?? "Please enter an issue description.", severity: "error" });
      return;
    }
    setIssueLoading(true);
    try {
      await axios.post("http://127.0.0.1:8000/report_issue", {
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

  if (!session) {
    return (
      <>
        <Auth supabase={supabase} />
        <Box sx={{ position: "fixed", bottom: 24, right: 24 }}>
          <Fab variant="extended" color="primary" onClick={enterAsGuest}>
            Enter app
          </Fab>
        </Box>
      </>
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
                sx={{
                  fontWeight: 700,
                  fontFamily: HEADLINE_FF,
                  letterSpacing: 0.5,
                  textTransform: "uppercase"
                }}
              >
                {UI_TEXT?.appTitle ?? "ISAAC Reddit Sampler"}
              </Typography>
            </Box>
            <Box>
              <Button color="inherit" onClick={() => setPage("home")}>Home</Button>
              <Button color="inherit" onClick={() => setPage("issue")}>
                {UI_TEXT?.issueTitle ?? "Report Issue"}
              </Button>
              <Button color="inherit" onClick={handleLogout}>Logout</Button>
            </Box>
          </Toolbar>
        </AppBar>

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
                      "Select a social group and time period to retrieve a random sample of Reddit posts in ZIP format."
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
                      <MenuItem value="race">Race</MenuItem>
                      <MenuItem value="sexuality">Sexuality</MenuItem>
                    </TextField>
                  </FormControl>
                </Grid>

                <Grid item>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      <DatePicker
                        views={["year", "month"]}
                        label="Start Date"
                        value={startDate}
                        minDate={new Date(2007, 0)}
                        maxDate={new Date(2023, 11)}
                        onChange={(nv) => setStartDate(nv)}
                        slotProps={{
                          popper: { sx: { "& .MuiPaper-root": { borderRadius: BR_ONLY } } },
                          textField: { sx: BR_INPUT_SX },
                        }}
                        componentsProps={{ paper: { sx: { borderRadius: BR_ONLY } } }}
                        renderInput={(params) => <TextField fullWidth {...params} sx={BR_INPUT_SX} />}
                        disabled={loading}
                      />

                      <DatePicker
                        views={["year", "month"]}
                        label="End Date"
                        value={endDate}
                        minDate={startDate || new Date(2007, 0)}
                        maxDate={new Date(2023, 11)}
                        onChange={(nv) => setEndDate(nv)}
                        slotProps={{
                          popper: { sx: { "& .MuiPaper-root": { borderRadius: BR_ONLY } } },
                          textField: { sx: BR_INPUT_SX },
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
                      <a href={downloadLink} download target="_blank" rel="noreferrer">
                        {UI_TEXT?.downloadZip ?? "Download ZIP"}
                      </a>
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

export default App;
