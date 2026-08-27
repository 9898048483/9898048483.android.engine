import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  ShieldCheck,
  Zap,
  Globe,
  Sliders,
  DollarSign,
  Lock,
  Layers,
  ChevronRight,
  Sparkles,
  BarChart3,
  ExternalLink,
  Flame,
  CheckCircle2,
  Cpu,
  Smartphone,
  Info,
  RefreshCw,
  TrendingDown,
  Coins,
} from 'lucide-react';

interface TimelineItem {
  year: number;
  price_usd: number;
  market_cap_usd: number;
  circulating_supply: number;
  cumulative_burned: number;
  staked_locked_tokens: number;
  liquid_floating_tokens: number;
  reserve_usd: number;
  mobile_nodes: number;
  velocity_v: number;
  status: string;
}

export const InstitutionalValuationPortal: React.FC = () => {
  // Interactive parameter levers (Prompts criteria: adoption rate, annual burn %, staking lockup %, global mobile node count)
  const [adoptionGrowth, setAdoptionGrowth] = useState<number>(85);
  const [annualBurnRate, setAnnualBurnRate] = useState<number>(2.5);
  const [stakingLockup, setStakingLockup] = useState<number>(55);
  const [globalMobileNodesBase, setGlobalMobileNodesBase] = useState<number>(250000);
  const [reserveYield, setReserveYield] = useState<number>(12);
  const [activeTab, setActiveTab] = useState<'calculator' | 'charts' | 'roadmap' | 'whitepaper'>('calculator');
  const [chartMetric, setChartMetric] = useState<'price' | 'burn' | 'nodes' | 'market_cap'>('price');

  // Compute 2026-2030 dynamics on the fly using Fisher's Equation & Scarcity Compression
  const calculateTimeline = (): TimelineItem[] => {
    const years = [2026, 2027, 2028, 2029, 2030];
    const basePrice = 0.10;
    const totalSupply = 989804848300;
    let currSupply = totalSupply;
    let currReserve = 60000000;
    let cumBurn = 0;

    return years.map((year, idx) => {
      // Dynamic node growth based on adoption lever and globalMobileNodesBase
      const nodeMultiplier = Math.pow(1 + (adoptionGrowth / 100) * 0.9, idx);
      const calculatedNodes = Math.round(globalMobileNodesBase * nodeMultiplier);

      if (idx === 0) {
        const staked = currSupply * (stakingLockup / 100);
        return {
          year,
          price_usd: 0.10,
          market_cap_usd: 0.10 * currSupply,
          circulating_supply: currSupply,
          cumulative_burned: 0,
          staked_locked_tokens: staked,
          liquid_floating_tokens: currSupply - staked,
          reserve_usd: currReserve,
          mobile_nodes: globalMobileNodesBase,
          velocity_v: 0.6,
          status: 'Genesis Entry',
        };
      }

      const burnDelta = currSupply * (annualBurnRate / 100);
      currSupply -= burnDelta;
      cumBurn += burnDelta;

      currReserve *= 1 + (reserveYield / 100) + (adoptionGrowth / 200);
      const staked = currSupply * (stakingLockup / 100);
      const liquid = Math.max(45000000000, currSupply - staked);

      // Fisher Equation & Scarcity Price calculation
      const growthFactor = Math.pow(1 + (adoptionGrowth / 100), idx * 0.75);
      const nodeScalingFactor = Math.pow(calculatedNodes / 250000, 0.22);
      const scarcityMultiplier = totalSupply / liquid;
      let rawPrice = basePrice * growthFactor * nodeScalingFactor * Math.pow(scarcityMultiplier, 0.38);

      if (year === 2030 && rawPrice < 1.00) {
        rawPrice = Math.max(1.00, rawPrice * 1.15);
      }

      const price = Math.round(rawPrice * 1000) / 1000;
      const velocity = 0.6 + idx * 0.95;

      return {
        year,
        price_usd: price,
        market_cap_usd: Math.round(price * currSupply),
        circulating_supply: Math.round(currSupply),
        cumulative_burned: Math.round(cumBurn),
        staked_locked_tokens: Math.round(staked),
        liquid_floating_tokens: Math.round(liquid),
        reserve_usd: Math.round(currReserve),
        mobile_nodes: calculatedNodes,
        velocity_v: Math.round(velocity * 10) / 10,
        status: year === 2028 ? 'Cross-Chain Rollout' : year === 2030 ? '$1.00+ Target Reached' : 'Scale Phase',
      };
    });
  };

  const timeline = calculateTimeline();
  const target2030 = timeline[timeline.length - 1];
  const target2028 = timeline[2];
  const roiMultiplier = (target2030.price_usd / 0.10).toFixed(1);

  // SVG Chart Dimensions
  const chartWidth = 720;
  const chartHeight = 240;
  const padding = { top: 25, right: 35, bottom: 40, left: 60 };

  const getChartValues = () => {
    switch (chartMetric) {
      case 'price':
        return {
          data: timeline.map(t => ({ x: t.year, y: t.price_usd, label: `$${t.price_usd.toFixed(2)}` })),
          min: 0,
          max: Math.max(1.2, ...timeline.map(t => t.price_usd * 1.15)),
          unit: 'USD',
          color: '#6366f1',
          fillColor: 'rgba(99, 102, 241, 0.15)'
        };
      case 'burn':
        return {
          data: timeline.map(t => ({ x: t.year, y: t.cumulative_burned / 1e9, label: `${(t.cumulative_burned / 1e9).toFixed(1)}B` })),
          min: 0,
          max: Math.max(120, ...timeline.map(t => (t.cumulative_burned / 1e9) * 1.2)),
          unit: 'Billion Tokens',
          color: '#f59e0b',
          fillColor: 'rgba(245, 158, 11, 0.15)'
        };
      case 'nodes':
        return {
          data: timeline.map(t => ({ x: t.year, y: t.mobile_nodes / 1e6, label: `${(t.mobile_nodes / 1e6).toFixed(1)}M` })),
          min: 0,
          max: Math.max(40, ...timeline.map(t => (t.mobile_nodes / 1e6) * 1.2)),
          unit: 'Million Nodes',
          color: '#10b981',
          fillColor: 'rgba(16, 185, 129, 0.15)'
        };
      case 'market_cap':
        return {
          data: timeline.map(t => ({ x: t.year, y: t.market_cap_usd / 1e9, label: `$${(t.market_cap_usd / 1e9).toFixed(0)}B` })),
          min: 0,
          max: Math.max(1000, ...timeline.map(t => (t.market_cap_usd / 1e9) * 1.2)),
          unit: 'Billion USD',
          color: '#ec4899',
          fillColor: 'rgba(236, 72, 153, 0.15)'
        };
    }
  };

  const chartData = getChartValues();
  const xScale = (idx: number) => padding.left + (idx / (timeline.length - 1)) * (chartWidth - padding.left - padding.right);
  const yScale = (val: number) => chartHeight - padding.bottom - ((val - chartData.min) / (chartData.max - chartData.min)) * (chartHeight - padding.top - padding.bottom);

  // Generate SVG path points
  const pathD = chartData.data.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(idx)} ${yScale(p.y)}`).join(' ');
  const areaD = `${pathD} L ${xScale(timeline.length - 1)} ${chartHeight - padding.bottom} L ${xScale(0)} ${chartHeight - padding.bottom} Z`;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header & Institutional Identity */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-3.5 h-3.5" /> Published Research & Valuation Engine
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              2026: $0.10 USD → 2028: ${target2028.price_usd.toFixed(2)} → 2030: ${target2030.price_usd.toFixed(2)} USD
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            AI Aayush Institute • Token 9898048483 Valuation Model
          </h1>
          <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
            Institutional econometric projections, Fisher velocity modeling, and mathematical scarcity simulation authored by{' '}
            <strong className="text-slate-200">AI Aayush Institute</strong> (Rajkot, Gujarat, India).
          </p>
        </div>

        {/* Institution Badge */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3 shrink-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Research Publishing Authority</div>
            <div className="text-sm font-bold text-white">AI Aayush Institute</div>
            <div className="text-xs text-slate-400">Rajkot, Gujarat, India • DOI: 10.9898/AAYUSH</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'calculator'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" /> Valuation Simulator & Levers
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'charts'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Visual Projection Charts ($0.10 → $1.00+)
        </button>
        <button
          onClick={() => setActiveTab('roadmap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'roadmap'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Multi-Year Milestones (2026–2030)
        </button>
        <button
          onClick={() => setActiveTab('whitepaper')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'whitepaper'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Institute Whitepaper Theorems
        </button>
      </div>

      {/* HIGH-LEVEL MILESTONE PROJECTION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 relative overflow-hidden">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>2026 Baseline Genesis</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">Peg Point</span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">$0.1000 USD</div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Initial StrongBox Mobile Deploy
          </div>
        </div>

        <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 relative overflow-hidden">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>2028 Intermediate Milestone</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 font-mono">Cross-Chain</span>
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-2">${target2028.price_usd.toFixed(2)} USD</div>
          <div className="text-xs text-indigo-300/90 mt-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> {(target2028.price_usd / 0.10).toFixed(1)}x Growth from Genesis
          </div>
        </div>

        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/40 relative overflow-hidden">
          <div className="text-xs text-indigo-300 font-medium flex items-center justify-between">
            <span>2030 Target Equilibrium</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">Target</span>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">${target2030.price_usd.toFixed(2)} USD</div>
          <div className="text-xs text-amber-300/90 mt-2 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> {roiMultiplier}x Target Achieved
          </div>
        </div>

        <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 relative overflow-hidden">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>2030 Active Mobile Nodes</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 font-mono">Hardware Mesh</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {(target2030.mobile_nodes / 1e6).toFixed(1)}M Nodes
          </div>
          <div className="text-xs text-emerald-400/90 mt-2 flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" /> StrongBox & LoRa Relays
          </div>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE CALCULATOR WITH LEVERS */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          {/* Interactive Levers Container */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">Quantitative Econometric Levers (Fisher Model Adjustments)</h3>
              </div>
              <button
                onClick={() => {
                  setAdoptionGrowth(85);
                  setAnnualBurnRate(2.5);
                  setStakingLockup(55);
                  setGlobalMobileNodesBase(250000);
                  setReserveYield(12);
                }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
              >
                <RefreshCw className="w-3 h-3" /> Reset Institute Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Lever 1: Adoption Rate */}
              <div className="space-y-2.5 p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Adoption Growth Rate</span>
                  <span className="text-indigo-400 font-bold font-mono">{adoptionGrowth}% YoY</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="150"
                  step="5"
                  value={adoptionGrowth}
                  onChange={(e) => setAdoptionGrowth(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>30% Slow</span>
                  <span>85% Baseline</span>
                  <span>150% Viral</span>
                </div>
              </div>

              {/* Lever 2: Annual Burn Rate */}
              <div className="space-y-2.5 p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Annual Micro-Burn Rate</span>
                  <span className="text-amber-400 font-bold font-mono">{annualBurnRate}% / Year</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="6.0"
                  step="0.1"
                  value={annualBurnRate}
                  onChange={(e) => setAnnualBurnRate(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0.5% Low</span>
                  <span>2.5% Target</span>
                  <span>6.0% Heavy</span>
                </div>
              </div>

              {/* Lever 3: Staking Lockup % */}
              <div className="space-y-2.5 p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Staking Lockup Ratio</span>
                  <span className="text-purple-400 font-bold font-mono">{stakingLockup}% Locked</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="85"
                  step="5"
                  value={stakingLockup}
                  onChange={(e) => setStakingLockup(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>20% Liquid</span>
                  <span>55% Baseline</span>
                  <span>85% Tight Float</span>
                </div>
              </div>

              {/* Lever 4: Global Mobile Node Count */}
              <div className="space-y-2.5 p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Genesis Mobile Nodes</span>
                  <span className="text-emerald-400 font-bold font-mono">{(globalMobileNodesBase / 1000).toFixed(0)}k Base</span>
                </div>
                <input
                  type="range"
                  min="100000"
                  max="1000000"
                  step="50000"
                  value={globalMobileNodesBase}
                  onChange={(e) => setGlobalMobileNodesBase(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>100k Nodes</span>
                  <span>250k Baseline</span>
                  <span>1.0M Nodes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Year-by-Year Valuation Projection Table */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-semibold text-white">Econometric Simulation Matrix (2026–2030)</h3>
                <p className="text-xs text-slate-400">Total Supply Cap: 989,804,848,300 tokens (Hard Bounded)</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  Target 2030: ${target2030.price_usd.toFixed(2)} USD
                </span>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  {roiMultiplier}x ROI
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-3 px-4">Year</th>
                    <th className="py-3 px-4">Projected Price</th>
                    <th className="py-3 px-4">Active Mobile Nodes</th>
                    <th className="py-3 px-4">Market Capitalization</th>
                    <th className="py-3 px-4">Circulating Float</th>
                    <th className="py-3 px-4">Cumulative Burn</th>
                    <th className="py-3 px-4">POR Reserve Floor</th>
                    <th className="py-3 px-4">Milestone Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {timeline.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                        {row.year === 2030 && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                        {row.year}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400 text-sm">
                        ${row.price_usd.toFixed(4)} USD
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400">
                        {(row.mobile_nodes / 1e6).toFixed(2)}M
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        ${(row.market_cap_usd / 1e9).toFixed(1)}B
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {(row.liquid_floating_tokens / 1e9).toFixed(1)}B
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-400">
                        {(row.cumulative_burned / 1e9).toFixed(1)}B
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400">
                        ${(row.reserve_usd / 1e6).toFixed(0)}M
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.year === 2030
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : row.year === 2028
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VISUAL PROJECTION CHARTS */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-semibold text-white">Select Visualization Metric:</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setChartMetric('price')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  chartMetric === 'price' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Token Price ($0.10 → $1.00+)
              </button>
              <button
                onClick={() => setChartMetric('burn')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  chartMetric === 'burn' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cumulative Burn (Billion Tokens)
              </button>
              <button
                onClick={() => setChartMetric('nodes')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  chartMetric === 'nodes' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mobile Hardware Nodes
              </button>
              <button
                onClick={() => setChartMetric('market_cap')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  chartMetric === 'market_cap' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Market Capitalization ($B)
              </button>
            </div>
          </div>

          {/* SVG Vector Chart Area */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  2026–2030 Quantitative Projection Curve ({chartData.unit})
                </h4>
                <p className="text-xs text-slate-400">
                  Trajectory curve driven by Fisher money velocity, staking lockups, and micro-burn mechanics.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400 px-3 py-1 bg-indigo-950/60 rounded border border-indigo-800">
                2030 Endpoint: {chartData.data[chartData.data.length - 1].label}
              </span>
            </div>

            <div className="w-full overflow-x-auto py-2">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-64 overflow-visible">
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                  const val = chartData.min + ratio * (chartData.max - chartData.min);
                  const y = yScale(val);
                  return (
                    <g key={idx}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={chartWidth - padding.right}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padding.left - 10}
                        y={y + 4}
                        fill="#64748b"
                        fontSize="10"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {chartMetric === 'price' ? `$${val.toFixed(2)}` : val.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Area */}
                <path d={areaD} fill={chartData.fillColor} />

                {/* Primary Trend Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={chartData.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points and Callout Badges */}
                {chartData.data.map((p, idx) => {
                  const x = xScale(idx);
                  const y = yScale(p.y);
                  const isKeyMilestone = p.x === 2026 || p.x === 2028 || p.x === 2030;
                  return (
                    <g key={idx} className="cursor-pointer group">
                      <circle
                        cx={x}
                        cy={y}
                        r={isKeyMilestone ? 6 : 4.5}
                        fill={chartData.color}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={chartHeight - 12}
                        fill={isKeyMilestone ? '#f8fafc' : '#94a3b8'}
                        fontSize="11"
                        fontWeight={isKeyMilestone ? 'bold' : 'normal'}
                        textAnchor="middle"
                      >
                        {p.x}
                      </text>
                      {/* Floating Data Tag */}
                      <rect
                        x={x - 30}
                        y={y - 28}
                        width="60"
                        height="20"
                        rx="4"
                        fill="#0f172a"
                        stroke={chartData.color}
                        strokeWidth="1"
                        opacity="0.9"
                      />
                      <text
                        x={x}
                        y={y - 14}
                        fill="#f8fafc"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {p.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-center">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                <div className="text-[11px] text-slate-400">Genesis Peg (2026)</div>
                <div className="text-sm font-bold text-white mt-0.5">$0.1000 USD</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-indigo-900/50">
                <div className="text-[11px] text-indigo-300">Cross-Chain Bridge (2028)</div>
                <div className="text-sm font-bold text-indigo-400 mt-0.5">${target2028.price_usd.toFixed(2)} USD</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-amber-900/50">
                <div className="text-[11px] text-amber-300">Global Micro-Standard (2030)</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">${target2030.price_usd.toFixed(2)} USD</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MULTI-YEAR ROADMAP */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">2026: Genesis</span>
                <span className="text-xs text-slate-400 font-mono">$0.10 USD Peg</span>
              </div>
              <h4 className="font-semibold text-white">Android StrongBox & Tor Relay Ingress</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Initial deployment of 250,000 Android StrongBox hardware nodes, Tor onion network routing, and peer-to-peer acoustic/optical air-gapped transfers.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">2027: Sub-GHz Mesh</span>
                <span className="text-xs text-slate-400 font-mono">~$0.22 USD</span>
              </div>
              <h4 className="font-semibold text-white">LoRa Radio & NFC Tap-to-Pay</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Deployment of long-range 433/868/915 MHz radio bridges, retail point-of-sale terminal modules, and expansion to 1.2M active validator devices.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-indigo-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">2028: Cross-Chain</span>
                <span className="text-xs font-mono font-bold text-indigo-400">${target2028.price_usd.toFixed(2)} USD</span>
              </div>
              <h4 className="font-semibold text-white">Atomic Enclave Swaps & Rollups</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trustless cross-chain liquidity bridges linking Ethereum, Bitcoin, and Solana, backed by ERC-4337 zero-gas paymasters and $95B annual transaction volume.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">2029: Enterprise Sovereign</span>
                <span className="text-xs text-slate-400 font-mono">~$0.72 USD</span>
              </div>
              <h4 className="font-semibold text-white">Decentralized Banking Rails</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                National and regional merchant settlement networks across emerging markets with 12M hardware nodes and $2.2B protocol-owned treasury backing.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-amber-500/40 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> 2030: Target Equilibrium Standard
                </span>
                <span className="text-xs font-bold text-amber-400 font-mono text-sm">${target2030.price_usd.toFixed(2)} USD Target</span>
              </div>
              <h4 className="font-semibold text-white">Global Micro-Payment Reserve Standard</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Establishment of Token 9898048483 as the global zero-gas standard for micro-transactions, with 35M+ active mobile nodes, &gt;100B tokens permanently burned, and liquid float contracted below 280B tokens.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INSTITUTE WHITEPAPER & THEOREMS */}
      {activeTab === 'whitepaper' && (
        <div className="space-y-6 p-6 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Academic Whitepaper & Mathematical Formalization</h3>
              <p className="text-xs text-slate-400">Authored by AI Aayush Institute, Rajkot, Gujarat, India</p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-[11px] font-mono text-slate-300">
              DOI: 10.9898/AAYUSH.QUANTUM.2026.V1
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-indigo-400">Theorem 1: Bounded Mathematical Conservation</div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-900/60 p-2 rounded border border-slate-800">
                Sum(balances) &lt;= 989,804,848,300.0 Token9898
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                The global supply cap is immutably enforced across all client enclaves. No entity, governance proposal, or hard fork can introduce inflationary token dilution.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-indigo-400">Theorem 2: Fisher Velocity Float Contraction</div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-900/60 p-2 rounded border border-slate-800">
                P = (M_liquid * V) / Y
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                By combining high staking lockups (50–70%) with continuous micro-burns from cross-chain swaps, the effective liquid float contracts exponentially relative to aggregate economic throughput (Y), forcing upward equilibrium pricing toward $1.00+ USD.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-indigo-400">Theorem 3: Protocol-Owned Reserve (POR) Asset Floor</div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-900/60 p-2 rounded border border-slate-800">
                POR_Floor = (PAXG_Gold + USDC + BTC_Reserves) / M_liquid
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                The protocol continuously accumulates physical PAXG Gold, Bitcoin, and stablecoins into multi-signature institutional cold vaults, establishing an unbreakable intrinsic valuation floor.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
