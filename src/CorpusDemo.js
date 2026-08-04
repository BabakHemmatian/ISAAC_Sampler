import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Box, Typography, Button, Paper, Chip, Stack, LinearProgress, Divider,
  ToggleButton, ToggleButtonGroup, Alert, Tooltip, Link as MuiLink,
} from "@mui/material";
import DATA from "./data/corpusDemo.json";

const BR = "12px 12px 0px 12px";
const HEADLINE_FF =
  "'OctoberCompressedDevanagari','IBM Plex Sans Devanagari','IBM Plex Sans',Roboto,sans-serif";
const MONO = "'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const BLUE = "#318CE7";
const PALE = "#E1F4FF";
const LINE = "#E3E8EF";
// Columns whose value is one entry per line, matching line for line.
const MULTILINE_COLS = new Set(["clauses", "generalization_clause_labels"]);

const fmtInt = (n) => (n == null ? "n/a" : n.toLocaleString());
const fmtSecs = (s) =>
  s == null ? "n/a" : s >= 60 ? `${(s / 60).toFixed(2)} min` : `${s.toFixed(1)} s`;

const STAGES = DATA.stages;
const LAST = STAGES.length; // index of the closing summary page

export default function CorpusDemo() {
  const [page, setPage] = useState(0);
  const [speed, setSpeed] = useState(1);

  const stage = page < LAST ? STAGES[page] : null;

  // Per page replay clock. Resets and auto plays whenever the page changes, so
  // advancing is what drives the run rather than one long timeline.
  const [clock, setClock] = useState(0);
  const [running, setRunning] = useState(false);
  const raf = useRef(null);
  const last = useRef(null);

  const duration = stage?.replay_seconds || 0;

  const [started, setStarted] = useState(false);

  useEffect(() => {
    setClock(0);
    setRunning(false);
    setStarted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  useEffect(() => {
    if (!running) {
      last.current = null;
      return undefined;
    }
    const tick = (now) => {
      if (last.current == null) last.current = now;
      const dt = (now - last.current) / 1000;
      last.current = now;
      setClock((c) => {
        const next = c + dt * speed;
        if (next >= duration) {
          setRunning(false);
          return duration;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      last.current = null;
    };
  }, [running, speed, duration]);

  const finishStage = useCallback(() => {
    setStarted(true);
    setRunning(false);
    setClock(duration);
  }, [duration]);

  const runStage = useCallback(() => {
    setStarted(true);
    setClock(0);
    setRunning(true);
  }, []);

  const go = useCallback((n) => setPage(Math.max(0, Math.min(LAST, n))), []);

  return (
    <Box sx={{ width: "100%", maxWidth: 1000, mx: "auto", pb: 10 }}>
      <Header page={page} onJump={go} />

      {page < LAST ? (
        <StagePage
          stage={stage}
          index={page}
          clock={clock}
          running={running}
          speed={speed}
          onSpeed={setSpeed}
          onPause={() => setRunning(false)}
          onResume={() => setRunning(true)}
          onFinish={finishStage}
          onRun={runStage}
          started={started}
          complete={started && clock >= duration}
        />
      ) : (
        <SummaryPage />
      )}

      <Spine upto={page} />

      <Nav page={page} onGo={go} />
    </Box>
  );
}

/* ---------------------------------------------------------------- */

function Header({ page, onJump }) {
  const m = DATA.meta;
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ bgcolor: BLUE, color: "#fff", borderRadius: BR, p: "22px 28px" }}>
        <Typography
          sx={{
            fontFamily: HEADLINE_FF, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: ".5px", lineHeight: 1.05, fontSize: "1.9rem", mb: 0.8,
          }}
        >
          How the corpus was built
        </Typography>
        <Typography sx={{ opacity: 0.97, fontSize: ".95rem" }}>
          One real run of the ISAAC pipeline: the <strong>{m.group}</strong> group
          for <strong>{m.year}</strong>. {fmtInt(STAGES[0].count)} comments go in,{" "}
          {fmtInt(DATA.funnel[DATA.funnel.length - 1].kept)} come out labelled.
          Nothing on these pages is simulated: the counts, timings and log lines
          are the ones this run produced. Move through it a stage at a time.
        </Typography>
      </Box>

      <Stack direction="row" spacing={0.6} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.6 }}>
        {STAGES.map((s, i) => (
          <Tooltip key={s.id} title={s.label}>
            <Box
              onClick={() => onJump(i)}
              sx={{
                width: 26, height: 6, borderRadius: 3, cursor: "pointer",
                bgcolor: i === page ? BLUE : i < page ? "#9FC7EE" : "#DDE4EC",
                transition: "background-color .2s",
              }}
            />
          </Tooltip>
        ))}
        <Tooltip title="Summary">
          <Box
            onClick={() => onJump(LAST)}
            sx={{
              width: 26, height: 6, borderRadius: 3, cursor: "pointer",
              bgcolor: page === LAST ? BLUE : "#DDE4EC",
            }}
          />
        </Tooltip>
      </Stack>
    </Box>
  );
}

function Nav({ page, onGo }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mt: 3 }}
    >
      <Button
        onClick={() => onGo(page - 1)}
        disabled={page === 0}
        sx={{ borderRadius: BR }}
      >
        Back
      </Button>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {page < LAST ? `Stage ${page} of ${LAST - 1}` : "Summary"}
      </Typography>
      <Button
        variant="contained"
        onClick={() => onGo(page + 1)}
        disabled={page === LAST}
        sx={{ borderRadius: BR }}
      >
        {page === LAST - 1 ? "Finish" : "Next stage"}
      </Button>
    </Stack>
  );
}

/* ---------------------------------------------------------------- */

function StagePage({ stage, index, clock, running, speed, onSpeed, onPause,
                     onResume, onFinish, onRun, started, complete }) {
  const examples = DATA.examples.filter((e) => e.page === stage.id);

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3, borderRadius: BR, border: `1px solid ${LINE}` }}>
        <Stack direction="row" alignItems="baseline" spacing={1.5} flexWrap="wrap">
          <Typography sx={{ fontWeight: 700, fontSize: "1.3rem" }}>
            {index}. {stage.label}
          </Typography>
          {stage.script && (
            <MuiLink href={stage.source_url} target="_blank" rel="noopener"
                     sx={{ fontFamily: MONO, fontSize: ".85rem" }}>
              {stage.script}
            </MuiLink>
          )}
        </Stack>

        <Typography sx={{ mt: 1.2, fontSize: "1.02rem" }}>{stage.blurb}</Typography>

        {stage.detail && (
          <Typography sx={{ mt: 1.2, color: "text.secondary", fontSize: ".93rem" }}>
            {stage.detail}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
          {stage.count != null && (
            <Chip label={`${fmtInt(stage.count)} rows out`} />
          )}
          {stage.columns ? (
            <Chip variant="outlined" label={`${stage.columns} columns`} />
          ) : null}
          {stage.elapsed_seconds > 0 && (
            <Tooltip title="Real time this stage took when the run was recorded">
              <Chip variant="outlined" label={`ran in ${fmtSecs(stage.elapsed_seconds)}`} />
            </Tooltip>
          )}
          {stage.raw_files ? (
            <Chip variant="outlined" label={`${stage.raw_files} monthly archive files`} />
          ) : null}
        </Stack>

        {stage.command && (
          <CommandBox command={stage.command} expandByDefault={index === 1} />
        )}

        {stage.kind === "info" && (
          <Box sx={{ mt: 2, p: 1.6, borderRadius: 1, bgcolor: PALE }}>
            <Typography variant="body2">
              {"There is no output to watch here: this walkthrough follows the comments side only, so nothing runs at this step."}
            </Typography>
          </Box>
        )}

        {stage.column_notes && (
          <ColumnNotes notes={stage.column_notes} stageId={stage.id} />
        )}

        {stage.link && (
          <Box sx={{ mt: 2, p: 1.6, borderRadius: 1, bgcolor: "#F5F8FC" }}>
            <MuiLink href={stage.link.url} target="_blank" rel="noopener"
                     sx={{ fontWeight: 600 }}>
              {stage.link.label}
            </MuiLink>
            <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
              {stage.link.note}
            </Typography>
          </Box>
        )}

        {stage.log?.length > 0 && (
          <LogPane
            stage={stage}
            clock={clock}
            running={running}
            speed={speed}
            onSpeed={onSpeed}
            onPause={onPause}
            onResume={onResume}
            onFinish={onFinish}
            onRun={onRun}
            started={started}
            complete={complete}
          />
        )}
      </Paper>

      {stage.id === "filter_keywords" && <Keywords tag="simple" />}
      {stage.id === "filter_keywords_adv" && <Keywords tag="advanced" />}
      {examples.length > 0 && <Examples items={examples} stage={stage} />}
      {stage.id === "label_location" && <LocationPanel />}
      {stage.id === "organize_anonymize" && <AnonPanel />}
    </Box>
  );
}

function LogPane({ stage, clock, running, speed, onSpeed, onPause, onResume,
                   onFinish, onRun, started, complete }) {
  const [showAll, setShowAll] = useState(false);
  const tailRef = useRef(null);

  const visible = useMemo(() => {
    const lines = showAll ? stage.log : stage.log.filter((e) => !e.verbose);
    if (complete) return lines;
    if (!started) return [];
    return lines.filter((e) => (e.replay_offset ?? 0) <= clock);
  }, [stage.log, showAll, complete, started, clock]);

  useEffect(() => {
    if (tailRef.current) tailRef.current.scrollTop = tailRef.current.scrollHeight;
  }, [visible.length]);

  const pinned = stage.log.filter((e) => e.pinned);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 1 }}>
        {stage.replay_is_real
          ? `This output plays at the speed it actually ran: ${fmtSecs(stage.elapsed_seconds)}. Use 2x or 4x, or skip ahead.`
          : `This step finished in ${fmtSecs(stage.elapsed_seconds)}, too fast to read, so its output is slowed to about ${fmtSecs(stage.replay_seconds)}.`}
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        {!started ? (
          <Button variant="contained" onClick={onRun} sx={{ borderRadius: BR }}>
            Run this step
          </Button>
        ) : running ? (
          <Button size="small" onClick={onPause} sx={{ borderRadius: BR }}>Pause</Button>
        ) : (
          !complete && (
            <Button size="small" onClick={onResume} sx={{ borderRadius: BR }}>Resume</Button>
          )
        )}
        {started && !complete && (
          <Button size="small" onClick={onFinish} sx={{ borderRadius: BR }}>
            Skip output
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <ToggleButtonGroup size="small" exclusive value={speed}
                           onChange={(_, v) => v && onSpeed(v)}>
          {[1, 2, 4].map((v) => (
            <ToggleButton key={v} value={v} sx={{ px: 1.2, py: 0.2 }}>{v}x</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {started && !complete && (
        <LinearProgress
          variant="determinate"
          value={Math.min(100, (clock / (stage.replay_seconds || 1)) * 100)}
          sx={{ height: 4, borderRadius: 2, mb: 1 }}
        />
      )}

      <Box ref={tailRef} sx={{
        p: 1.3, borderRadius: 1, bgcolor: "#1F2933", color: "#D7E0EA",
        fontFamily: MONO, fontSize: ".74rem", lineHeight: 1.5,
        height: 200, overflowY: "auto",
      }}>
        {started ? visible.map((e, i) => (
          <Box key={i} sx={{ whiteSpace: "pre-wrap", opacity: e.verbose ? 0.55 : 1 }}>
            {e.text}
          </Box>
        )) : (
          <Box sx={{ opacity: 0.5 }}>
            {"Press \u201cRun this step\u201d to watch this stage\u2019s real output as it was produced."}
          </Box>
        )}
      </Box>

      {complete && pinned.length > 0 && (
        <Box sx={{
          p: 1.2, borderRadius: 1, bgcolor: PALE, fontFamily: MONO,
          fontSize: ".76rem", borderTop: `2px solid ${BLUE}`,
        }}>
          {pinned.map((e, i) => (
            <Box key={i} sx={{ whiteSpace: "pre-wrap" }}>{e.text}</Box>
          ))}
        </Box>
      )}

      {stage.log_note && (
        <Typography variant="caption"
                    sx={{ display: "block", mt: 1, color: "text.secondary" }}>
          {stage.log_note}
        </Typography>
      )}

      {stage.log_total > stage.log_shown && (
        <Button size="small" onClick={() => setShowAll((v) => !v)} sx={{ mt: 0.5 }}>
          {showAll
            ? `Hide ${stage.log_total - stage.log_shown} progress lines`
            : `Show full log (${stage.log_total} lines)`}
        </Button>
      )}
    </Box>
  );
}

/* ---------------------------------------------------------------- */

function CommandBox({ command, expandByDefault }) {
  const [open, setOpen] = useState(!!expandByDefault);
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        The terminal command that runs this step
      </Typography>
      <Box sx={{
        mt: 0.5, p: 1.3, borderRadius: 1, bgcolor: "#F5F8FC",
        fontFamily: MONO, fontSize: ".8rem", overflowX: "auto", whiteSpace: "pre",
      }}>
        {command}
      </Box>
      <Button size="small" onClick={() => setOpen((v) => !v)} sx={{ mt: 0.3 }}>
        {open ? "Hide what these parts mean" : "What do these parts mean?"}
      </Button>
      {open && (
        <Box sx={{ mt: 0.5, border: `1px solid ${LINE}`, borderRadius: 1 }}>
          {DATA.command_args.map((a, i) => (
            <Stack key={a.part} direction={{ xs: "column", sm: "row" }} spacing={1.5}
                   sx={{ p: 1.1, borderTop: i === 0 ? "none" : `1px solid ${LINE}` }}>
              <Typography sx={{
                fontFamily: MONO, fontSize: ".76rem", minWidth: 168, flexShrink: 0,
                color: BLUE, fontWeight: 600,
              }}>
                {a.part}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {a.meaning}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}
    </Box>
  );
}

function ColumnNotes({ notes, stageId }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        The columns this step adds to every surviving row
      </Typography>
      <Box sx={{ mt: 0.5, border: `1px solid ${LINE}`, borderRadius: 1 }}>
        {notes.map((n, i) => (
          <Stack key={n.name} direction={{ xs: "column", sm: "row" }} spacing={1.5}
                 sx={{ p: 1.1, borderTop: i === 0 ? "none" : `1px solid ${LINE}` }}>
            <Typography sx={{
              fontFamily: MONO, fontSize: ".74rem", minWidth: 215, flexShrink: 0,
              fontWeight: 600,
            }}>
              {n.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {n.meaning}
            </Typography>
          </Stack>
        ))}
      </Box>
      {stageId === "label_generalization" && (
        <Typography variant="caption"
                    sx={{ display: "block", mt: 0.8, color: "text.secondary" }}>
          {"The full set of composite clause labels, with a table mapping each one to its four features, is in "}
          <MuiLink href={DATA.variable_list_url} target="_blank" rel="noopener">
            the corpus variable list
          </MuiLink>
          {"."}
        </Typography>
      )}
    </Box>
  );
}

function Section({ title, intro, children }) {
  return (
    <Box sx={{ mt: 3 }}>
      <Typography sx={{
        fontFamily: HEADLINE_FF, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: ".5px", fontSize: "1.15rem", mb: 0.8,
      }}>
        {title}
      </Typography>
      {intro && (
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
          {intro}
        </Typography>
      )}
      {children}
    </Box>
  );
}

function Examples({ items, stage }) {
  const dropped = items.filter((e) => e.kind === "rejected");
  const kept = items.filter((e) => e.kind !== "rejected");
  const sensitive = items.some((e) => e.sensitive);
  return (
    <Section
      title={dropped.length ? "What this stage removed" : "What this stage labelled"}
      intro={
        dropped.length
          ? `These rows reached ${stage.label.toLowerCase()} and did not survive it.`
          : "Rows from the finished corpus, chosen to show what these scores actually capture."
      }
    >
      {sensitive && (
        <Alert severity="warning" sx={{ borderRadius: BR, mb: 1.5 }}>
          {DATA.content_warning}
        </Alert>
      )}
      {[...dropped, ...kept].map((e) => (
        <ExampleCard key={e.id} ex={e} stageId={stage.id} />
      ))}
    </Section>
  );
}

function ExampleCard({ ex, stageId }) {
  const labels = ex.labels_by_stage?.[stageId];
  return (
    <Paper elevation={0} sx={{
      p: 2, mb: 1.5, borderRadius: BR, border: `1px solid ${LINE}`,
      borderLeft: `4px solid ${ex.kind === "rejected" ? "#C9A227" : BLUE}`,
    }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap"
             sx={{ mb: 1, gap: 0.7 }}>
        <Chip size="small" label={ex.month} />
        {ex.matched && (
          <Chip size="small" variant="outlined" sx={{ fontFamily: MONO }}
                label={`matched: ${ex.matched}`} />
        )}
      </Stack>
      <Typography sx={{ fontStyle: "italic", mb: 1 }}>{`“${ex.text}”`}</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>{ex.role}</Typography>
      {labels && (
        <Box sx={{ mt: 1.2, display: "flex", flexWrap: "wrap", gap: 0.7 }}>
          {Object.entries(labels).map(([k, v]) => (
            <Chip key={k} size="small" variant="outlined"
                  sx={{ fontFamily: MONO, fontSize: ".7rem" }}
                  label={`${k.replace(/_/g, " ")}: ${
                    isNaN(Number(v)) ? v : Number(v).toFixed(3)}`} />
          ))}
        </Box>
      )}
    </Paper>
  );
}

function Keywords({ tag }) {
  const kw = DATA.keywords || {};
  const senses = Object.keys(kw).filter((s) => kw[s][tag]);
  if (!senses.length) return null;
  return (
    <Section
      title={tag === "simple" ? "The keyword lists" : "The advanced patterns"}
      intro={
        tag === "simple"
          ? "Every word and word fragment the first step looks for. A comment is kept if it contains any of them anywhere, which is why so much irrelevant material comes through."
          : "The same idea, written so exceptions can be stated. Reading one is not necessary; the point is that they can say <this word, unless that one follows it>."
      }
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {senses.map((s) => (
          <Paper key={s} elevation={0}
                 sx={{ p: 2, flex: 1, borderRadius: BR, border: `1px solid ${LINE}` }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.8 }}>
              <Typography sx={{ fontWeight: 700 }}>{s}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {kw[s][tag].total} entries
              </Typography>
            </Stack>
            <Box sx={{
              fontFamily: MONO, fontSize: ".72rem", p: 1, bgcolor: "#F5F8FC",
              borderRadius: 1, maxHeight: 170, overflow: "auto", whiteSpace: "pre-wrap",
            }}>
              {kw[s][tag].sample.join("\n")}
            </Box>
          </Paper>
        ))}
      </Stack>
    </Section>
  );
}

function LocationPanel() {
  const l = DATA.location;
  if (!l || l.mode !== "labels") return null;
  const t = l.tiers || {};
  const TIER_COPY = {
    state: "A US state, when one candidate separates clearly from the other forty-nine.",
    country: "Inside the US, but no single state separates far enough to name.",
    region: "Outside the US, resolved to a world region.",
    unk: "Not enough posting history to say anything. The stage declines rather than guesses.",
  };
  return (
    <Section
      title="What a location answer looks like"
      intro={`This stage estimates an author's home region from their posting history across the archive, not from the post you see. It answers at whatever level the evidence supports, which is why the answers are not all the same shape. Of ${fmtInt(l.total)} rows, ${fmtInt(l.labeled)} carry a location.`}
    >
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
        {["state", "country", "region", "unk"].map((k) =>
          t[k] ? (
            <Chip key={k} variant={k === "unk" ? "outlined" : "filled"}
                  label={`${k === "unk" ? "no answer" : k}: ${fmtInt(t[k])}`} />
          ) : null
        )}
      </Stack>

      {l.sample.map((s) => (
        <Paper key={s.author + s.location} elevation={0} sx={{
          p: 2, mb: 1.5, borderRadius: BR, border: `1px solid ${LINE}`,
        }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8, gap: 0.7 }}
                 flexWrap="wrap">
            <Chip size="small" color={s.tier === "unk" ? "default" : "primary"}
                  label={s.location} />
            {s.prob && (
              <Chip size="small" variant="outlined" sx={{ fontFamily: MONO }}
                    label={`p=${Number(s.prob).toFixed(3)}`} />
            )}
            {s.contender && (
              <Chip size="small" variant="outlined" sx={{ fontFamily: MONO }}
                    label={`runner up: ${s.contender}`} />
            )}
            <Chip size="small" variant="outlined" sx={{ fontFamily: MONO }}
                  label={`author ${s.author}`} />
          </Stack>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.8 }}>
            {TIER_COPY[s.tier]}
          </Typography>
          <Typography sx={{ fontStyle: "italic", fontSize: ".92rem" }}>
            {`“${s.text}”`}
          </Typography>
        </Paper>
      ))}

      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        A state label is chosen when the leading candidate beats the runner up by
        a set margin. With fifty states in play, chance alone would give each
        about 0.02, so a leading score of 0.10 is already well clear of noise.
      </Typography>
    </Section>
  );
}

function AnonPanel() {
  const step = DATA.spine.steps.find((s) => s.stage === "organize_anonymize");
  const before = DATA.spine.steps.find((s) => s.new_values?.author)?.new_values?.author;
  const after = DATA.location?.sample?.[0]?.author;
  return (
    <Section
      title="The last step before publication"
      intro="Every author identifier is replaced with a persistent random number. The table that maps one to the other stays on the processing machine and is never published, so nothing in the released corpus can be traced back to an account."
    >
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: BR, border: `1px solid ${LINE}` }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              in the working data
            </Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: "1rem" }}>
              {before || "wsu_..."}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "1.4rem", color: BLUE }}>{"→"}</Typography>
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              in the published corpus
            </Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: "1rem" }}>
              {after || "000000000000"}
            </Typography>
          </Box>
        </Stack>
        {step && (
          <Typography variant="caption"
                      sx={{ display: "block", mt: 2, color: "text.secondary" }}>
            The row is otherwise untouched: all {step.total_columns} columns carry
            through unchanged.
          </Typography>
        )}
      </Paper>
    </Section>
  );
}

/* ---------------------------------------------------------------- */

// The tracked comment, carried across every page. Columns accumulate as the
// stages add them, and the strip stays scrolled to the newest ones.
function Spine({ upto }) {
  const scroller = useRef(null);

  const { cells, newest, columns } = useMemo(() => {
    const seenIds = new Set(STAGES.slice(0, upto + 1).map((s) => s.id));
    const currentId = STAGES[Math.min(upto, STAGES.length - 1)]?.id;
    const acc = [];
    let latest = [];
    let total = null;
    DATA.spine.steps.forEach((s) => {
      if (!seenIds.has(s.stage) || !s.present || !s.new_values) return;
      const added = Object.entries(s.new_values);
      added.forEach(([k, v]) => acc.push([k, v]));
      // A stage can rewrite a column it did not create: anonymisation replaces
      // the author in place. Overwrite the existing cell so the strip shows the
      // new value on the page that explains it.
      Object.entries(s.changed_values || {}).forEach(([k, v]) => {
        const at = acc.findIndex(([key]) => key === k);
        if (at >= 0) acc[at] = [k, v];
        else acc.push([k, v]);
      });
      total = s.total_columns;
      if (s.stage === currentId) {
        latest = [...added.map(([k]) => k),
                  ...Object.keys(s.changed_values || {})];
      }
    });
    return { cells: acc, newest: latest, columns: total };
  }, [upto]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [cells.length]);

  if (!cells.length) return null;

  return (
    <Paper elevation={0} sx={{
      mt: 3, p: 2, borderRadius: BR, border: `1px solid ${LINE}`, bgcolor: "#FAFCFE",
    }}>
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: ".95rem" }}>
          The comment we are following
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Chip size="small" label={`${columns || cells.length} columns so far`} />
      </Stack>

      <Typography sx={{ fontStyle: "italic", fontSize: ".9rem", mb: 1.5 }}>
        {`“${DATA.spine.text}”`}
      </Typography>

      <Box ref={scroller} sx={{
        display: "flex", gap: 1, overflowX: "auto", pb: 1,
        scrollBehavior: "smooth",
      }}>
        {cells.map(([k, v], i) => {
          const isNew = newest.includes(k);
          return (
            <Box key={k + i} sx={{
              minWidth: MULTILINE_COLS.has(k) ? 300 : 132,
              maxWidth: MULTILINE_COLS.has(k) ? 340 : 200,
              flexShrink: 0, p: 1, borderRadius: 1,
              border: `1px solid ${isNew ? BLUE : LINE}`,
              bgcolor: isNew ? PALE : "#fff",
            }}>
              <Typography sx={{
                fontFamily: MONO, fontSize: ".64rem", color: "text.secondary",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {k}
              </Typography>
              <Typography sx={{
                fontFamily: MONO, fontSize: ".78rem", fontWeight: isNew ? 700 : 400,
                wordBreak: "break-word",
                // clauses and their labels are one entry per line and line up
                // with each other, so the breaks have to survive.
                whiteSpace: MULTILINE_COLS.has(k) ? "pre-wrap" : "normal",
                maxHeight: MULTILINE_COLS.has(k) ? 150 : "none",
                overflowY: MULTILINE_COLS.has(k) ? "auto" : "visible",
                lineHeight: MULTILINE_COLS.has(k) ? 1.45 : "inherit",
              }}>
                {v === "" ? "(empty)" : v}
              </Typography>
            </Box>
          );
        })}
      </Box>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Scrolled to the newest columns. Highlighted cells were added by the stage
        on this page.
      </Typography>
    </Paper>
  );
}

/* ---------------------------------------------------------------- */

function SummaryPage() {
  const rows = DATA.funnel;
  const start = STAGES[0].count;
  const end = rows[rows.length - 1].kept;
  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3, borderRadius: BR, border: `1px solid ${LINE}` }}>
        <Typography sx={{
          fontFamily: HEADLINE_FF, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: ".5px", fontSize: "1.4rem", mb: 1,
        }}>
          The whole run
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 2.5 }}>
          {fmtInt(start)} comments in the {DATA.meta.year} archive, {fmtInt(end)} in
          the finished corpus, about {((end / start) * 100).toFixed(2)} percent.
          The bars use a log scale; on a linear one every stage after the first
          would be an invisible sliver. Total running time was{" "}
          {fmtSecs(DATA.meta.total_elapsed_seconds)}, most of it in the relevance
          classifier.
        </Typography>

        {DATA.overview.map((o) => {
          const f = rows.find((r) => r.stage === o.id);
          return (
            <OverviewRow key={o.id} item={o} dropped={f ? f.dropped : null}
                         max={start} />
          );
        })}

        <Divider sx={{ my: 2.5 }} />

        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          The first four steps decide which comments belong in the corpus; the
          rest leave every row in place and describe it. Every script shown here
          is in the public repository, and these same steps produce all six
          social group distinctions across all years from 2007 to 2023.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" href={DATA.meta.repo} target="_blank"
                  rel="noopener" sx={{ borderRadius: BR }}>
            The scripts on GitHub
          </Button>
          <Button href="/" sx={{ borderRadius: BR }}>
            Back to the sampler
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

// One line per stage. Filters are shown by how many rows survive them;
// labelling stages keep every row and are shown by the columns they add.
function OverviewRow({ item, dropped, max }) {
  const isFilter = dropped != null && dropped > 0;
  const bar = item.rows
    ? Math.max(2, (Math.log10(Math.max(item.rows, 1)) / Math.log10(max)) * 100)
    : 0;
  return (
    <Box sx={{ mb: 1.4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {item.label}
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: MONO, fontSize: ".78rem" }}>
          {item.rows ? `${fmtInt(item.rows)} rows` : ""}
          {isFilter && (
            <Box component="span" sx={{ color: "#B47C00" }}>
              {`  -${fmtInt(dropped)}`}
            </Box>
          )}
          {item.columns_added > 0 && (
            <Box component="span" sx={{ color: BLUE }}>
              {`  +${item.columns_added} columns`}
            </Box>
          )}
          {item.elapsed_seconds > 0 && (
            <Box component="span" sx={{ color: "text.secondary" }}>
              {`  ${fmtSecs(item.elapsed_seconds)}`}
            </Box>
          )}
        </Typography>
      </Stack>
      {item.rows ? (
        <Box sx={{ height: 10, bgcolor: "#EEF3F8", borderRadius: 5, mt: 0.4 }}>
          <Box sx={{
            width: `${bar}%`, height: "100%", borderRadius: 5,
            bgcolor: item.columns_added > 0 ? "#9FC7EE" : BLUE,
          }} />
        </Box>
      ) : (
        <Box sx={{ height: 10, mt: 0.4 }} />
      )}
    </Box>
  );
}

