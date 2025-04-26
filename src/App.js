import React, { useState, useEffect } from "react";
import axios from "axios";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
  Container,
  FormControl,
  InputLabel
} from "@mui/material";
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2'
    },
    background: {
      default: '#f9f9f9'
    }
  },
  typography: {
    fontFamily: 'Roboto, sans-serif'
  }
});

function App() {
  const [session, setSession] = useState(null);
  const [socialGroup, setSocialGroup] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [numDocs, setNumDocs] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");
  const [downloadLink, setDownloadLink] = useState(null);
  const [page, setPage] = useState("home");
  const [issueDesc, setIssueDesc] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const formatDate = (date) => {
    return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : "";
  };

  const handleSample = async () => {
    if (!socialGroup || !startDate || !endDate || (startDate > endDate)) {
      setSnackbar({ open: true, message: "Please provide valid input fields.", severity: "error" });
      return;
    }
    setLoading(true);
    setStage("Starting...");
    setDownloadLink(null);

    try {
      const res = await axios.post("https://isaac-sampler-backend.onrender.com/sample", {
        social_group: socialGroup,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        num_docs: numDocs ? parseInt(numDocs) : undefined
      });

      const taskId = res.data.task_id;

      const pollInterval = setInterval(async () => {
        try {
          const progressRes = await axios.get(`https://isaac-sampler-backend.onrender.com/${taskId}`);
          setStage(progressRes.data.stage);

          if (progressRes.data.stage === "No files found") {
            clearInterval(pollInterval);
            setStage("");
            setLoading(false);
            setSnackbar({ open: true, message: "No files found for the selected range.", severity: "error" });
          }

          if (progressRes.data.stage === "Done" && progressRes.data.download_link) {
            clearInterval(pollInterval);
            setDownloadLink(progressRes.data.download_link);
            setSnackbar({ open: true, message: "File ready for download!", severity: "success" });
            setSocialGroup("");
            setStartDate(null);
            setEndDate(null);
            setNumDocs("");
            setStage("");
            setLoading(false);
          }
        } catch (err) {
          clearInterval(pollInterval);
          setStage("Error");
          setLoading(false);
          setSnackbar({ open: true, message: "Progress check failed.", severity: "error" });
        }
      }, 1000);
    } catch (err) {
      setSnackbar({ open: true, message: `Sampling failed: ${err.message}`, severity: "error" });
      setLoading(false);
    }
  };

  const handleIssueSubmit = async () => {
    if (!issueDesc) {
      setSnackbar({ open: true, message: "Please describe the issue.", severity: "error" });
      return;
    }

    setIssueLoading(true);
    try {
      await axios.post("https://isaac-sampler-backend.onrender.com/report_issue", {
        email: session?.user?.email,
        description: issueDesc,
      });
      setIssueDesc("");
      setSnackbar({ open: true, message: "Issue submitted successfully!", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to send issue report.", severity: "error" });
    }
    setIssueLoading(false);
  };

  if (!session) return <Auth />;

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh' }}>
        <AppBar position="static">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6">ISAAC App</Typography>
            <Box>
              <Button color="inherit" onClick={() => setPage("home")}>Home</Button>
              <Button color="inherit" onClick={() => setPage("issue")}>Report Issue</Button>
              <Button variant="outlined" color="inherit" onClick={handleLogout}>Logout</Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          {page === "home" && (
            <Box width="100%">
              <Typography variant="h4" gutterBottom>ISAAC Reddit Sampler</Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Select a social group and time period to retrieve a random sample of Reddit posts in ZIP format.
              </Typography>
              <br></br>
              <Grid container direction="column" spacing={3}>
                <Grid item>
                  <FormControl fullWidth>
                    <TextField
                      select
                      labelId="group-label"
                      label="Social Group"
                      value={socialGroup}
                      onChange={(e) => setSocialGroup(e.target.value)}
                      helperText="Select a social group to sample posts from."
                    >
                      <MenuItem value="race">Race</MenuItem>
                      <MenuItem value="sexuality">Sexuality</MenuItem>
                    </TextField>
                  </FormControl>
                </Grid>

                <Grid item>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Box sx={{ display: "flex", gap: 20, '& .MuiFormControl-root.MuiPickersTextField-root': {
                      width: '100%'
                    } }}>
                      <DatePicker
                        views={["year", "month"]}
                        label="Start Date"
                        value={startDate}
                        minDate={new Date(2007, 0)}
                        maxDate={new Date(2023, 11)}
                        onChange={(newValue) => setStartDate(newValue)}
                        renderInput={(params) => (
                          <TextField
                            fullWidth
                            {...params}
                            helperText="Choose a start date (2007–2023)"
                            sx={{ flex: 1 }}
                          />
                        )}
                      />
                      <DatePicker
                        views={["year", "month"]}
                        label="End Date"
                        value={endDate}
                        minDate={startDate || new Date(2007, 0)}
                        maxDate={new Date(2023, 11)}
                        onChange={(newValue) => setEndDate(newValue)}
                        renderInput={(params) => (
                          <TextField
                            fullWidth
                            {...params}
                            helperText="Choose an end date (after start date)"
                            sx={{ flex: 1 }}
                          />
                        )}
                      />
                    </Box>
                  </LocalizationProvider>
                </Grid>



                <Grid item>
                  <TextField
                    fullWidth
                    type="number"
                    label="Number of Documents (Optional)"
                    value={numDocs}
                    onChange={(e) => setNumDocs(e.target.value)}
                    helperText="Leave blank to retrieve all available documents."
                  />
                </Grid>

                <Grid item>
                  <Button variant="contained" onClick={handleSample} disabled={loading}>
                    {loading ? <><CircularProgress size={20} sx={{ mr: 1 }} /> Retrieving...</> : "Retrieve"}
                  </Button>
                </Grid>

                {stage && (
                  <Grid item>
                    <Typography variant="subtitle1" color="text.secondary">⏳ Current Stage: {stage}</Typography>
                  </Grid>
                )}

                {downloadLink && (
                  <Grid item>
                    <Alert severity="success">
                      <a href={downloadLink} download target="_blank" rel="noreferrer">Click to Download ZIP</a>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {page === "issue" && (
            <Box>
              <Typography variant="h4" gutterBottom>Report an Issue</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                If you notice any bugs, inconsistencies, or have feature suggestions, please describe them below. Your email will be used to follow up if needed.
              </Typography>
              <TextField
                label="Issue Description"
                multiline
                rows={4}
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />
              <Button variant="outlined" color="error" onClick={handleIssueSubmit} disabled={issueLoading}>
                {issueLoading ? <><CircularProgress size={20} sx={{ mr: 1 }} /> Sending...</> : "Send"}
              </Button>
            </Box>
          )}
        </Container>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;
