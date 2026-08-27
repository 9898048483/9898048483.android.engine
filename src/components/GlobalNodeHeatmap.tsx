import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
  Radio,
  Wifi,
  Satellite,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Search,
  Filter,
  Maximize2,
  RefreshCw,
  Compass,
} from "lucide-react";

interface NodeData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "MOBILE_NPU" | "TOR_RELAY" | "SATELLITE_DOWNLINK" | "VALIDATOR";
  region: "Asia" | "Europe" | "Americas" | "Africa" | "Remote/Satellite";
  tps: number;
  status: "ONLINE" | "SYNCING" | "STANDBY";
  latencyMs: number;
}

interface ArcLink {
  from: NodeData;
  to: NodeData;
  progress: number;
  color: string;
  txHash: string;
  amount: number;
}

const SAMPLE_NODES: NodeData[] = [
  { id: "node_delhi", name: "Delhi SuperCluster Node-01", lat: 28.6139, lng: 77.2090, type: "VALIDATOR", region: "Asia", tps: 18450, status: "ONLINE", latencyMs: 8 },
  { id: "node_gujarat", name: "Gujarat Mobile NPU Mesh-48", lat: 22.2587, lng: 71.1924, type: "MOBILE_NPU", region: "Asia", tps: 12300, status: "ONLINE", latencyMs: 12 },
  { id: "node_mumbai", name: "Mumbai Subsea Relay Edge", lat: 19.0760, lng: 72.8777, type: "TOR_RELAY", region: "Asia", tps: 9800, status: "ONLINE", latencyMs: 14 },
  { id: "node_tokyo", name: "Tokyo ZK Accelerator Enclave", lat: 35.6762, lng: 139.6503, type: "VALIDATOR", region: "Asia", tps: 24500, status: "ONLINE", latencyMs: 22 },
  { id: "node_singapore", name: "Singapore ASEAN Gateway", lat: 1.3521, lng: 103.8198, type: "VALIDATOR", region: "Asia", tps: 21100, status: "ONLINE", latencyMs: 18 },
  { id: "node_frankfurt", name: "Frankfurt Tor Privacy Bridge", lat: 50.1109, lng: 8.6821, type: "TOR_RELAY", region: "Europe", tps: 16700, status: "ONLINE", latencyMs: 34 },
  { id: "node_london", name: "London Financial Hub Node", lat: 51.5074, lng: -0.1278, type: "VALIDATOR", region: "Europe", tps: 19400, status: "ONLINE", latencyMs: 38 },
  { id: "node_nyc", name: "New York Low-Latency Sentry", lat: 40.7128, lng: -74.0060, type: "VALIDATOR", region: "Americas", tps: 26800, status: "ONLINE", latencyMs: 45 },
  { id: "node_sf", name: "Silicon Valley NPU Collective", lat: 37.7749, lng: -122.4194, type: "MOBILE_NPU", region: "Americas", tps: 14900, status: "ONLINE", latencyMs: 52 },
  { id: "node_sao_paulo", name: "São Paulo LatAm Ingress", lat: -23.5505, lng: -46.6333, type: "TOR_RELAY", region: "Americas", tps: 8200, status: "ONLINE", latencyMs: 78 },
  { id: "node_nairobi", name: "Nairobi LoRa Mesh Hub", lat: -1.2921, lng: 36.8219, type: "MOBILE_NPU", region: "Africa", tps: 6400, status: "ONLINE", latencyMs: 65 },
  { id: "node_johannesburg", name: "Johannesburg Secure Enclave", lat: -26.2041, lng: 28.0473, type: "TOR_RELAY", region: "Africa", tps: 7100, status: "ONLINE", latencyMs: 82 },
  { id: "node_sat_starlink1", name: "LEO-Orbiter Downlink Alpha", lat: 10.0, lng: 0.0, type: "SATELLITE_DOWNLINK", region: "Remote/Satellite", tps: 31200, status: "ONLINE", latencyMs: 95 },
  { id: "node_sat_iridium", name: "Iridium Polar Mesh Gateway", lat: 78.0, lng: 15.0, type: "SATELLITE_DOWNLINK", region: "Remote/Satellite", tps: 28900, status: "ONLINE", latencyMs: 110 },
];

export const GlobalNodeHeatmap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(SAMPLE_NODES[0]);
  const [rotationYaw, setRotationYaw] = useState<number>(75); // Centered around Asia / India
  const [rotationPitch, setRotationPitch] = useState<number>(20);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [liveTps, setLiveTps] = useState<number>(148920);

  const filteredNodes = SAMPLE_NODES.filter((n) => {
    const matchReg = selectedRegion === "All" || n.region === selectedRegion;
    const matchType = selectedType === "ALL" || n.type === selectedType;
    return matchReg && matchType;
  });

  // Simulated real-time TPS fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTps((prev) => Math.max(120000, Math.floor(prev + (Math.random() * 4000 - 2000))));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Animation Loop for 3D Globe Projection and Arcs
  useEffect(() => {
    let animId: number;
    let arcProgress = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.40;

      ctx.clearRect(0, 0, width, height);

      // 1. Globe Ambient Glow & Sphere Background
      const grad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, radius * 0.1, cx, cy, radius * 1.05);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(0.7, "#020617");
      grad.addColorStop(1, "#090d16");

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.stroke();

      // Atmospheric Outer Glow
      ctx.shadowColor = "rgba(56, 189, 248, 0.35)";
      ctx.shadowBlur = 24;
      ctx.stroke();
      ctx.restore();

      // 2. Render Lat/Long Wireframe Grid
      const yawRad = (rotationYaw * Math.PI) / 180;
      const pitchRad = (rotationPitch * Math.PI) / 180;

      const project3D = (lat: number, lng: number) => {
        const phi = (lat * Math.PI) / 180;
        const theta = (lng * Math.PI) / 180 + yawRad;

        // Spherical coordinates
        const x0 = Math.cos(phi) * Math.sin(theta);
        const y0 = Math.sin(phi);
        const z0 = Math.cos(phi) * Math.cos(theta);

        // Apply pitch rotation around X-axis
        const y1 = y0 * Math.cos(pitchRad) - z0 * Math.sin(pitchRad);
        const z1 = y0 * Math.sin(pitchRad) + z0 * Math.cos(pitchRad);

        const screenX = cx + x0 * radius;
        const screenY = cy - y1 * radius;
        const isVisible = z1 > 0; // Front hemisphere

        return { x: screenX, y: screenY, z: z1, visible: isVisible };
      };

      // Draw Latitude rings
      ctx.strokeStyle = "rgba(51, 65, 85, 0.35)";
      ctx.lineWidth = 1;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let first = true;
        for (let lng = 0; lng <= 360; lng += 10) {
          const pt = project3D(lat, lng);
          if (pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // 3. Draw Pulsating Transaction Arcs
      arcProgress = (arcProgress + 0.012) % 1;
      const arcs: [number, number][] = [
        [0, 1], // Delhi -> Gujarat
        [0, 3], // Delhi -> Tokyo
        [1, 2], // Gujarat -> Mumbai
        [3, 7], // Tokyo -> NYC
        [5, 0], // Frankfurt -> Delhi
        [7, 8], // NYC -> SF
        [12, 0], // Satellite Alpha -> Delhi
      ];

      arcs.forEach(([fromIdx, toIdx], i) => {
        const fromNode = SAMPLE_NODES[fromIdx];
        const toNode = SAMPLE_NODES[toIdx];
        if (!fromNode || !toNode) return;

        const pFrom = project3D(fromNode.lat, fromNode.lng);
        const pTo = project3D(toNode.lat, toNode.lng);

        if (pFrom.visible || pTo.visible) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(pFrom.x, pFrom.y);

          // Quadratic curve midpoint elevated above globe surface
          const midX = (pFrom.x + pTo.x) / 2;
          const midY = (pFrom.y + pTo.y) / 2 - 40;
          ctx.quadraticCurveTo(midX, midY, pTo.x, pTo.y);

          ctx.strokeStyle = i % 2 === 0 ? "rgba(245, 158, 11, 0.4)" : "rgba(56, 189, 248, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Particle moving along arc
          const t = (arcProgress + i * 0.15) % 1;
          const px = (1 - t) * (1 - t) * pFrom.x + 2 * (1 - t) * t * midX + t * t * pTo.x;
          const py = (1 - t) * (1 - t) * pFrom.y + 2 * (1 - t) * t * midY + t * t * pTo.y;

          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 === 0 ? "#fbbf24" : "#38bdf8";
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.restore();
        }
      });

      // 4. Render Nodes & Heatmap Blips
      filteredNodes.forEach((node) => {
        const pt = project3D(node.lat, node.lng);
        if (pt.visible) {
          ctx.save();
          const isSelected = selectedNode?.id === node.id;

          // Pulsing halo
          const pulse = (Math.sin(Date.now() / 250 + node.lat) + 1) * 0.5;
          const haloRadius = isSelected ? 12 + pulse * 6 : 6 + pulse * 4;

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, haloRadius, 0, Math.PI * 2);
          ctx.fillStyle =
            node.type === "VALIDATOR"
              ? `rgba(16, 185, 129, ${0.15 + pulse * 0.2})`
              : node.type === "SATELLITE_DOWNLINK"
              ? `rgba(168, 85, 247, ${0.15 + pulse * 0.2})`
              : `rgba(56, 189, 248, ${0.15 + pulse * 0.2})`;
          ctx.fill();

          // Center Core Dot
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isSelected ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle =
            node.type === "VALIDATOR"
              ? "#10b981"
              : node.type === "SATELLITE_DOWNLINK"
              ? "#a855f7"
              : node.type === "TOR_RELAY"
              ? "#f59e0b"
              : "#38bdf8";
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = isSelected ? 12 : 6;
          ctx.fill();

          // Label for selected or prominent nodes
          if (isSelected || node.id === "node_delhi" || node.id === "node_gujarat") {
            ctx.font = "10px monospace";
            ctx.fillStyle = "#f8fafc";
            ctx.fillText(node.name.split(" ")[0], pt.x + 8, pt.y + 3);
          }
          ctx.restore();
        }
      });

      if (isAutoRotate) {
        setRotationYaw((prev) => (prev + 0.18) % 360);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [rotationYaw, rotationPitch, isAutoRotate, filteredNodes, selectedNode]);

  // Drag to rotate handlers
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setIsAutoRotate(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setRotationYaw((prev) => (prev + dx * 0.4) % 360);
    setRotationPitch((prev) => Math.max(-60, Math.min(60, prev - dy * 0.4)));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div id="global-node-heatmap-container" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <Globe className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              Global Validator Mesh & Node Heatmap
              <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 font-mono">
                LIVE 3D
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Real-time geospatial distribution of mobile NPUs, Tor privacy bridges, and LEO satellite relays.
            </p>
          </div>
        </div>

        {/* Global Live TPS Metric */}
        <div className="flex items-center gap-6 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase">Global Network TPS</div>
            <div className="text-base font-bold text-emerald-400 font-mono flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              {liveTps.toLocaleString()} <span className="text-xs text-slate-400 font-normal">tx/s</span>
            </div>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase">Active Nodes</div>
            <div className="text-base font-bold text-sky-400 font-mono">
              1,420,850 <span className="text-xs text-slate-400 font-normal">verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        {/* Region Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {["All", "Asia", "Europe", "Americas", "Africa", "Remote/Satellite"].map((reg) => (
            <button
              key={reg}
              id={`filter-region-${reg.toLowerCase().replace('/', '-')}`}
              onClick={() => setSelectedRegion(reg)}
              className={`px-3 py-1 rounded-md transition-all whitespace-nowrap font-medium ${
                selectedRegion === reg
                  ? "bg-sky-500 text-slate-950 font-semibold shadow"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {reg}
            </button>
          ))}
        </div>

        {/* Node Type Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-mono flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Type:
          </span>
          <select
            id="node-type-filter"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs outline-none focus:border-sky-500"
          >
            <option value="ALL">All Hardware Types</option>
            <option value="VALIDATOR">SuperCluster Validators</option>
            <option value="MOBILE_NPU">Mobile NPU Mesh</option>
            <option value="TOR_RELAY">Tor Privacy Bridges</option>
            <option value="SATELLITE_DOWNLINK">LEO Satellite Downlinks</option>
          </select>

          {/* Auto Rotate Toggle */}
          <button
            id="toggle-autorotate-btn"
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className={`px-2.5 py-1 rounded border text-xs flex items-center gap-1.5 transition-colors ${
              isAutoRotate
                ? "bg-slate-800 border-sky-500/50 text-sky-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            {isAutoRotate ? "Auto Orbit ON" : "Auto Orbit OFF"}
          </button>
        </div>
      </div>

      {/* Main Interactive Stage: Canvas + Inspector Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
        {/* 3D Canvas Stage */}
        <div
          className="lg:col-span-2 relative bg-slate-900/50 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing h-[380px]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={640}
            height={380}
            className="w-full h-full object-contain"
          />

          {/* Overlay Coordinates & Controls */}
          <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-md text-[11px] font-mono text-slate-400 flex items-center gap-3">
            <span>Yaw: {rotationYaw.toFixed(0)}°</span>
            <span>Pitch: {rotationPitch.toFixed(0)}°</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Sync: PQC-Secured
            </span>
          </div>

          <div className="absolute top-3 right-3 flex flex-col gap-1 text-[11px] font-mono text-slate-400 bg-slate-950/70 p-2 rounded border border-slate-800">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> SuperCluster</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> Mobile NPU</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Tor Relay</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /> Satellite LEO</div>
          </div>
        </div>

        {/* Node Inspector & Regional Telemetry */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between h-[380px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" /> Node Telemetry Inspector
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono">100% HEALTHY</span>
            </div>

            {selectedNode ? (
              <div className="mt-3 space-y-2.5 text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Cluster Identity</div>
                  <div className="text-sm font-semibold text-white font-mono mt-0.5">{selectedNode.name}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">TYPE</div>
                    <div className="text-sky-300 font-medium">{selectedNode.type}</div>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">REGION</div>
                    <div className="text-slate-200">{selectedNode.region}</div>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">PEAK TPS</div>
                    <div className="text-emerald-400 font-bold">{selectedNode.tps.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">RTT LATENCY</div>
                    <div className="text-amber-300 font-bold">{selectedNode.latencyMs} ms</div>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 space-y-1 font-mono text-[11px]">
                  <div className="text-slate-400 flex justify-between">
                    <span>Coordinates:</span>
                    <span className="text-slate-200">{selectedNode.lat.toFixed(4)}° N, {selectedNode.lng.toFixed(4)}° E</span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>Hardware TEE:</span>
                    <span className="text-emerald-400">Qualcomm Hexagon NPU / TEE</span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>Quantum Guard:</span>
                    <span className="text-purple-400">ML-DSA-87 / Kyber-1024</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-6 text-center">Select a node from the cluster list below.</p>
            )}
          </div>

          {/* Quick Select Buttons */}
          <div>
            <div className="text-[10px] text-slate-500 font-mono uppercase mb-1.5">Switch Focus Cluster</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {SAMPLE_NODES.slice(0, 4).map((n) => (
                <button
                  key={n.id}
                  id={`select-cluster-${n.id}`}
                  onClick={() => {
                    setSelectedNode(n);
                    setRotationYaw(n.lng > 0 ? 360 - n.lng + 90 : -n.lng + 90);
                    setRotationPitch(n.lat * 0.6);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-mono border whitespace-nowrap transition-colors ${
                    selectedNode?.id === n.id
                      ? "bg-sky-500/20 border-sky-500 text-sky-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {n.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
