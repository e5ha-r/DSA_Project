import React, { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

const API_BASE_DEFAULT = "http://localhost:8000";

const PURPLE = "#6D28D9";
const PURPLE_SOFT = "#EDE9FE";

const STATE = { 0: "S", 1: "E", 2: "I", 3: "Q", 4: "R" };

const FULL = {
  S: "Susceptible",
  E: "Exposed",
  I: "Infected",
  Q: "Quarantined",
  R: "Recovered",
};

function colorForStateLetter(s) {
  switch (s) {
    case "S":
      return "#94a3b8";
    case "E":
      return "#f59e0b";
    case "I":
      return "#ef4444";
    case "Q":
      return "#3b82f6";
    case "R":
      return "#22c55e";
    default:
      return "#94a3b8";
  }
}

async function apiJson(base, path, method = "GET", body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `${method} ${path} failed: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`
    );
  }
  return await res.json();
}

function Card({ title, children }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "primary" }) {
  const base = "rounded-2xl px-3 py-2 text-sm transition active:scale-[0.99]";
  const cls =
    variant === "primary"
      ? "text-white"
      : variant === "secondary"
      ? "border text-slate-900 hover:bg-slate-50"
      : "text-slate-700 hover:bg-slate-50";
  const style =
    variant === "primary"
      ? { background: PURPLE }
      : variant === "secondary"
      ? { borderColor: "#E5E7EB", background: "white" }
      : { background: "transparent" };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${cls} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={style}
    >
      {children}
    </button>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-xs text-slate-700">{label}</span>
      </div>
      <span className="text-xs font-mono text-slate-800">{value}</span>
    </div>
  );
}

function SimpleLineChart({ series, width = 820, height = 240 }) {
  const pad = 26;
  const keys = ["S", "E", "I", "Q", "R"];

  const maxY = useMemo(() => {
    let m = 1;
    for (const p of series) for (const k of keys) m = Math.max(m, p[k] || 0);
    return m;
  }, [series]);

  const xAt = (i) =>
    series.length <= 1 ? pad : pad + (i / (series.length - 1)) * (width - 2 * pad);
  const yAt = (v) => height - pad - (v / maxY) * (height - 2 * pad);

  const pathFor = (k) => {
    if (!series.length) return "";
    let d = "";
    for (let i = 0; i < series.length; i++) {
      const x = xAt(i);
      const y = yAt(series[i][k] || 0);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  };

  return (
    <div className="w-full overflow-x-auto rounded-3xl border bg-white p-3">
      <svg width={width} height={height} className="block">
        <rect x={0} y={0} width={width} height={height} fill="#fff" />
        {Array.from({ length: 6 }, (_, i) => {
          const y = pad + (i / 5) * (height - 2 * pad);
          return (
            <line key={i} x1={pad} y1={y} x2={width - pad} y2={y} stroke="#E5E7EB" strokeWidth={1} />
          );
        })}
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#CBD5E1" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#CBD5E1" />
        {keys.map((k) => (
          <path
            key={k}
            d={pathFor(k)}
            fill="none"
            stroke={colorForStateLetter(k)}
            strokeWidth={k === "I" ? 2.5 : 2}
          />
        ))}
      </svg>
    </div>
  );
}

function useOverlayCanvas({ map, overlayHostRef, nodes, edges, stateArr, wobblePhaseRef }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!map || !overlayHostRef?.current || !window.google?.maps) return;

    // Cleanup
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }

    const overlay = new window.google.maps.OverlayView();
    overlayRef.current = overlay;

    let canvas = null;
    let raf = 0;

    const draw = () => {
      if (!canvas) return;

      const proj = overlay.getProjection();
      if (!proj) return;

      const host = overlayHostRef.current;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(2,6,23,0.10)";
      ctx.lineWidth = 1;
      const grid = 64;
      for (let gx = 0; gx < w; gx += grid) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += grid) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      if (!nodes?.length) return;

      const toPx = (lat, lng) => {
        const p = proj.fromLatLngToDivPixel(new window.google.maps.LatLng(lat, lng));
        if (!p) return null;
        return { x: p.x, y: p.y };
      };

      // wobble
      const t = wobblePhaseRef.current;
      const wob = 0.75;

      // Edges (sample for perf)
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "rgba(109,40,217,0.55)";
      ctx.lineWidth = 1;

      const maxEdgesToDraw = 7000;
      const step = Math.max(1, Math.floor((edges?.length || 0) / maxEdgesToDraw));

      for (let i = 0; i < (edges?.length || 0); i += step) {
        const e = edges[i];
        const a = nodes[e.a];
        const b = nodes[e.b];
        if (!a || !b) continue;

        const pa = toPx(a.lat, a.lng);
        const pb = toPx(b.lat, b.lng);
        if (!pa || !pb) continue;

        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const p = toPx(n.lat, n.lng);
        if (!p) continue;

        const st = stateArr ? STATE[stateArr[i]] : "S";
        const c = colorForStateLetter(st);

        const dx = Math.sin(t * 0.016 + i * 0.13) * wob;
        const dy = Math.cos(t * 0.014 + i * 0.11) * wob;

        ctx.beginPath();
        ctx.arc(p.x + dx, p.y + dy, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();

        if (st === "Q") {
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = "rgba(59,130,246,0.9)";
          ctx.stroke();
        }
      }
    };

    overlay.onAdd = () => {
      const panes = overlay.getPanes();
      if (!panes) return;

      canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.left = "0px";
      canvas.style.top = "0px";
      canvas.style.pointerEvents = "none";

      overlayHostRef.current.appendChild(canvas);
    };

    overlay.draw = () => {
      draw();
    };

    overlay.onRemove = () => {
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvas = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    overlay.setMap(map);

    const loop = () => {
      wobblePhaseRef.current += 1;
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const listeners = [
      map.addListener("idle", draw),
      map.addListener("zoom_changed", draw),
      map.addListener("bounds_changed", draw),
      map.addListener("center_changed", draw),
    ];

    const onResize = () => draw();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      listeners.forEach((l) => l.remove());
      overlay.setMap(null);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [map, overlayHostRef]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.draw();
  }, [nodes, edges, stateArr]);
}
console.log("MAP KEY:", import.meta.env.VITE_GOOGLE_MAPS_KEY);

export default function App() {
  const [apiBase] = useState(API_BASE_DEFAULT);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const [simId, setSimId] = useState(null);
  const [graphId, setGraphId] = useState(null);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [day, setDay] = useState(0);
  const [counts, setCounts] = useState({ S: 0, E: 0, I: 0, Q: 0, R: 0 });
  const [series, setSeries] = useState([]);
  const [stateArr, setStateArr] = useState(null);

  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(2);

  const [tab, setTab] = useState("map");

  const [policyOn, setPolicyOn] = useState(false);
  const [policyMsg, setPolicyMsg] = useState("");

  const [nNodes, setNNodes] = useState(3000);

  const mapsKey = import.meta?.env?.VITE_GOOGLE_MAPS_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: mapsKey,
  });

  const mapRef = useRef(null);
  const wobblePhaseRef = useRef(0);

  const mapCenter = useMemo(() => ({ lat: 33.6900, lng: 73.0550 }), []);

  const overlayHostRef = useRef(null);

  useOverlayCanvas({
    map: mapRef.current,
    overlayHostRef,
    nodes,
    edges,
    stateArr,
    wobblePhaseRef,
  });

  const generateGraph = async () => {
    setErr(null);
    setBusy(true);
    setRunning(false);
    try {
      const data = await apiJson(apiBase, "/graph/generate/islamabad_uniform", "POST", { n: nNodes });
      setGraphId(data.graph_id);
      setSimId(data.sim_id);
      setDay(data.day || 0);
      setCounts(data.counts || { S: 0, E: 0, I: 0, Q: 0, R: 0 });
      setPolicyOn(!!data.policy_quarantine_on);
      setPolicyMsg(data.policy_message || "");

      const exported = await apiJson(apiBase, `/graph/${data.graph_id}/export/json`);
      setNodes(exported.nodes || []);
      setEdges(exported.edges || []);

      const st = await apiJson(apiBase, `/sim/${data.sim_id}/export/state.json`);
      setStateArr(st.state || null);

      const ts = await apiJson(apiBase, `/sim/${data.sim_id}/timeseries`);
      setSeries(ts.series || []);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    setRunning(false);
    setGraphId(null);
    setSimId(null);
    setNodes([]);
    setEdges([]);
    setDay(0);
    setCounts({ S: 0, E: 0, I: 0, Q: 0, R: 0 });
    setSeries([]);
    setStateArr(null);
    setPolicyOn(false);
    setPolicyMsg("");
  };

  const stepSim = async (daysToStep = 1) => {
    if (!simId) return;
    try {
      const data = await apiJson(apiBase, `/sim/${simId}/step`, "POST", { days: daysToStep });
      setDay(data.day ?? day);
      setCounts(data.counts || counts);
      setPolicyOn(!!data.policy_quarantine_on);
      setPolicyMsg(data.policy_message || "");

      const ts = await apiJson(apiBase, `/sim/${simId}/timeseries`);
      setSeries(ts.series || []);

      const st = await apiJson(apiBase, `/sim/${simId}/export/state.json`);
      setStateArr(st.state || null);
    } catch (e) {
      setErr(e.message || String(e));
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!running || !simId) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      if (cancelled) return;
      await stepSim(speed);
    }, 650);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [running, simId, speed]);

  const networkCanvasRef = useRef(null);
  useEffect(() => {
    const canvas = networkCanvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(2,6,23,0.03)";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(2,6,23,0.08)";
      ctx.lineWidth = 1;
      const grid = 64;
      for (let gx = 0; gx < w; gx += grid) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += grid) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      if (!nodes.length) return;

      const latMin = 33.55,
        latMax = 33.78,
        lngMin = 72.95,
        lngMax = 73.22;

      const t = wobblePhaseRef.current;
      const wob = 0.9;

      const px = (lat, lng) => {
        const x01 = (lng - lngMin) / (lngMax - lngMin);
        const y01 = 1 - (lat - latMin) / (latMax - latMin);
        return { x: x01 * w, y: y01 * h };
      };

      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "rgba(109,40,217,0.55)";
      ctx.lineWidth = 1;

      const maxEdgesToDraw = 9000;
      const step = Math.max(1, Math.floor(edges.length / maxEdgesToDraw));
      for (let i = 0; i < edges.length; i += step) {
        const e = edges[i];
        const a = nodes[e.a];
        const b = nodes[e.b];
        if (!a || !b) continue;
        const pa = px(a.lat, a.lng);
        const pb = px(b.lat, b.lng);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const p = px(n.lat, n.lng);

        const st = stateArr ? STATE[stateArr[i]] : "S";
        const c = colorForStateLetter(st);

        const dx = Math.sin(t * 0.016 + i * 0.13) * wob;
        const dy = Math.cos(t * 0.014 + i * 0.11) * wob;

        ctx.beginPath();
        ctx.arc(p.x + dx, p.y + dy, 2.0, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();

        if (st === "Q") {
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = "rgba(59,130,246,0.9)";
          ctx.stroke();
        }
      }
    };

    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [nodes, edges, stateArr]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight">COVID-19 Simulation</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={() => setRunning((r) => !r)} disabled={!simId || busy}>
              {running ? "Pause" : "Play"}
            </Btn>
            <Btn onClick={() => stepSim(1)} variant="secondary" disabled={!simId || busy}>
              Step
            </Btn>
            <button
              onClick={() => {
                setRunning(false);
                clearAll();
              }}
              className="rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>

            <div className="mx-1 h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-1 rounded-2xl border bg-white p-1">
              {[1, 2, 4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={
                    "rounded-xl px-2 py-1 text-xs transition " +
                    (speed === s ? "text-white" : "text-slate-700 hover:bg-slate-50")
                  }
                  style={speed === s ? { background: PURPLE } : undefined}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="ml-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800">
              Day: <span className="font-mono">{day}</span>
            </div>
          </div>
        </div>

        {policyOn ? (
          <div
            className="mt-4 rounded-3xl border p-4 text-sm"
            style={{ borderColor: "#C4B5FD", background: "#F5F3FF", color: "#4C1D95" }}
          >
            <div className="font-semibold">Alert</div>
            <div className="mt-1">{policyMsg || "Auto-quarantine is active."}</div>
          </div>
        ) : null}

        {err ? (
          <div
            className="mt-4 rounded-2xl border p-3 text-sm"
            style={{ borderColor: "#FECACA", background: "#FEF2F2", color: "#991B1B" }}
          >
            <div className="font-semibold">Error</div>
            <div className="mt-1 font-mono text-xs whitespace-pre-wrap">{err}</div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-4">
            <Card title="Graph">
              <div className="grid gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-800">Nodes</div>
                    <div className="rounded-full px-3 py-1 text-xs" style={{ background: PURPLE_SOFT, color: PURPLE }}>
                      {nNodes}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={10000}
                    step={100}
                    value={nNodes}
                    onChange={(e) => setNNodes(parseInt(e.target.value, 10))}
                    className="mt-2 w-full"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Btn onClick={generateGraph} disabled={busy}>
                    {busy ? "Working..." : "Generate graph"}
                  </Btn>
                  <Btn onClick={clearAll} variant="secondary" disabled={busy}>
                    Clear
                  </Btn>
                </div>
              </div>
            </Card>

            <Card title="Node Counts">
              <div className="grid grid-cols-2 gap-2">
                <StatPill label={FULL.S} value={counts.S} color={colorForStateLetter("S")} />
                <StatPill label={FULL.E} value={counts.E} color={colorForStateLetter("E")} />
                <StatPill label={FULL.I} value={counts.I} color={colorForStateLetter("I")} />
                <StatPill label={FULL.Q} value={counts.Q} color={colorForStateLetter("Q")} />
                <div className="col-span-2">
                  <StatPill label={FULL.R} value={counts.R} color={colorForStateLetter("R")} />
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-3xl border bg-white p-2 shadow-sm">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-1">
                {[
                  { k: "map", label: "Map" },
                  { k: "network", label: "Network"},
                  { k: "results", label: "Results"},
                ].map((it) => (
                  <button
                    key={it.k}
                    onClick={() => setTab(it.k)}
                    className={
                      "flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm transition " +
                      (tab === it.k ? "bg-white shadow-sm" : "text-slate-600 hover:bg-white/60")
                    }
                  >
                    <span>{it.emoji}</span>
                    <span className="font-medium">{it.label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-2">
                {tab === "map" && (
                  <div className="p-2">
                    <div className="h-[72vh] w-full overflow-hidden rounded-3xl border bg-white relative">
                      {/* MAP BACKGROUND */}
                      <div className="absolute inset-0">
                        {!mapsKey ? (
                          <div className="flex h-full items-center justify-center bg-white p-6 text-sm text-slate-600">
                            Add <span className="mx-1 rounded bg-slate-50 px-2 py-1 font-mono text-xs">VITE_GOOGLE_MAPS_KEY</span> to your .env
                          </div>
                        ) : loadError ? (
                          <div className="flex h-full items-center justify-center bg-white p-6 text-sm text-slate-600">
                            Map failed to load: {String(loadError?.message || loadError)}
                          </div>
                        ) : !isLoaded ? (
                          <div className="flex h-full items-center justify-center bg-white p-6 text-sm text-slate-600">
                            Loading map...
                          </div>
                        ) : (
                          <GoogleMap
                            mapContainerStyle={{ width: "100%", height: "100%" }}
                            center={mapCenter}
                            zoom={12}
                            onLoad={(m) => {
                              mapRef.current = m;
                            }}
                            onUnmount={() => {
                              mapRef.current = null;
                            }}
                            options={{
                              disableDefaultUI: true,
                              zoomControl: true,
                              clickableIcons: false,
                            }}
                          />
                        )}
                      </div>

                      {/* OVERLAY LAYER ON TOP */}
                      <div ref={overlayHostRef} className="absolute inset-0 pointer-events-none" />
                    </div>
                  </div>
                )}

                {tab === "network" && (
                  <div className="p-2">
                    <div className="h-[72vh] w-full overflow-hidden rounded-3xl border bg-white">
                      <canvas ref={networkCanvasRef} className="h-full w-full" />
                    </div>
                  </div>
                )}

                {tab === "results" && (
                  <div className="p-4">
                    <div className="mb-3">
                      <div className="text-sm font-semibold">Results</div>
                      <div className="mt-1 text-xs text-slate-600">Live backend timeseries</div>
                    </div>
                    <SimpleLineChart series={series.map((p) => ({ ...p }))} />
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
