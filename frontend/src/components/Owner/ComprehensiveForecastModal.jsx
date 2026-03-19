/**
 * ComprehensiveForecastModal
 * Professional-grade Prophet forecast dashboard — Tableau / Shopify Analytics level
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Package, TrendingUp, ShoppingCart, BarChart3,
  AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight,
  RefreshCw, Layers, ChevronDown, ChevronUp,
  Activity, Target, Zap,
} from 'lucide-react';
import Plot from 'react-plotly.js';
import { ownerAPI } from '../../services/api';

// ─── Utilities ────────────────────────────────────────────────────
const safe    = v  => (v != null && isFinite(Number(v))) ? Number(v) : 0;
const safeArr = ar => (Array.isArray(ar) ? ar : []).map(safe);
const fmtN    = (v, dp=1) => (typeof v==='number' && isFinite(v)) ? v.toFixed(dp) : '—';

const fmtC = (v) => {
  v = safe(v);
  if (v >= 10_000_000) return `Rs.${(v/10_000_000).toFixed(2)}Cr`;
  if (v >=    100_000) return `Rs.${(v/100_000).toFixed(1)}L`;
  if (v >=      1_000) return `Rs.${(v/1_000).toFixed(1)}K`;
  return `Rs.${Math.round(v)}`;
};

const stdDev = arr => {
  if (!arr.length) return 0;
  const mu = arr.reduce((a,b)=>a+b,0)/arr.length;
  return Math.sqrt(arr.reduce((s,v)=>s+(v-mu)**2,0)/arr.length);
};

const rollingMean = (arr, w=7) =>
  arr.map((_,i) => {
    const sl = arr.slice(Math.max(0,i-w+1), i+1).filter(x=>x!=null&&isFinite(x));
    return sl.length ? sl.reduce((a,b)=>a+b,0)/sl.length : null;
  });

// ─── Colour System ────────────────────────────────────────────────
const C = {
  revenue : '#2563EB',
  profit  : '#059669',
  units   : '#D97706',
  forecast: '#7C3AED',
  holdout : '#F59E0B',
  anomaly : '#EF4444',
  ma      : '#0891B2',
  revenueFill : 'rgba(37,99,235,0.07)',
  profitFill  : 'rgba(5,150,105,0.07)',
  unitsFill   : 'rgba(217,119,6,0.07)',
  forecastFill: 'rgba(124,58,237,0.09)',
  holdoutFill : 'rgba(245,158,11,0.05)',
};

const FONT = '"Plus Jakarta Sans", "DM Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", "Fira Code", monospace';

// ─── Plotly config ────────────────────────────────────────────────
const PLOTLY_CONFIG = {
  responsive: true,
  displayModeBar: true,
  modeBarButtonsToRemove: ['select2d','lasso2d','autoScale2d','toImage'],
  displaylogo: false,
};

// ─────────────────────────────────────────────────────────────────
//  TRACE BUILDERS
// ─────────────────────────────────────────────────────────────────

function makeHistoricalLine({ dates, vals, color, fillColor, prefix }) {
  return {
    x: dates, y: vals,
    type: 'scatter', mode: 'lines', name: 'Historical',
    line: { color, width: 2.5, shape: 'spline', smoothing: 0.7 },
    fill: 'tozeroy', fillcolor: fillColor,
    hovertemplate: `<b>%{x|%a, %d %b %Y}</b><br>Actual: <b>${prefix}%{y:,.0f}</b><extra></extra>`,
  };
}

function makeHistoricalBars({ dates, vals, color, holdoutStart, prefix }) {
  return {
    x: dates, y: vals,
    type: 'bar', name: 'Actual Units',
    marker: {
      color: dates.map((d, i) =>
        holdoutStart && d >= holdoutStart
          ? C.holdout
          : vals[i] > 0 ? color : 'rgba(0,0,0,0.04)'
      ),
      cornerradius: 3,
      line: { width: 0 },
    },
    opacity: 0.88,
    hovertemplate: `<b>%{x|%a, %d %b %Y}</b><br>Units: <b>%{y:,}</b><extra></extra>`,
  };
}

function makeHoldoutLine({ dates, vals, prefix }) {
  if (!dates.length) return null;
  return {
    x: dates, y: vals,
    type: 'scatter', mode: 'lines+markers', name: 'Validation (holdout)',
    line: { color: C.holdout, width: 2, dash: 'dot', shape: 'spline' },
    marker: { size: 5, color: C.holdout, symbol: 'circle', line: { color:'#fff', width:1.5 } },
    hovertemplate: `<b>%{x|%a %d %b}</b><br>Validation: <b>${prefix}%{y:,.0f}</b><extra></extra>`,
  };
}

function makeMA7({ dates, vals, prefix }) {
  return {
    x: dates, y: vals,
    type: 'scatter', mode: 'lines', name: '7-Day MA',
    line: { color: C.ma, width: 1.8, dash: 'dot' },
    hovertemplate: `<b>%{x|%d %b}</b><br>7-Day MA: <b>${prefix}%{y:,.1f}</b><extra></extra>`,
  };
}

function makeCIBand({ dates, upper, lower }) {
  return {
    x: [...dates, ...[...dates].reverse()],
    y: [...upper, ...[...lower].reverse()],
    type: 'scatter', mode: 'none', fill: 'toself',
    fillcolor: C.forecastFill,
    line: { width: 0 }, name: '80% Conf. Interval',
    hoverinfo: 'skip', showlegend: true,
  };
}

function makeForecastLine({ connDates, connVals, prefix }) {
  return {
    x: connDates, y: connVals,
    type: 'scatter', mode: 'lines+markers', name: 'Forecast (Prophet)',
    line: { color: C.forecast, width: 3, dash: 'dash' },
    marker: {
      size:    connDates.map((_,i) => i===0 ? 0 : 7),
      symbol:  'diamond',
      color:   C.forecast,
      line:    { color:'#fff', width:1.5 },
    },
    hovertemplate: `<b>%{x|%a, %d %b %Y}</b><br>Forecast: <b>${prefix}%{y:,.0f}</b><extra></extra>`,
  };
}

function makeAnomalyMarkers({ dates, vals, prefix }) {
  if (!dates.length || !vals.length) return null;
  const mu  = vals.reduce((a,b)=>a+b,0)/vals.length;
  const sd  = stdDev(vals);
  const idx = vals.map((v,i) => Math.abs(v-mu) > 2.2*sd ? i : -1).filter(i=>i>=0);
  if (!idx.length) return null;
  return {
    x: idx.map(i=>dates[i]), y: idx.map(i=>vals[i]),
    type: 'scatter', mode: 'markers', name: 'Anomaly',
    marker: { size:11, color:C.anomaly, symbol:'x-open', line:{ color:C.anomaly, width:2.5 } },
    hovertemplate: `<b>%{x|%d %b}</b><br>⚠ Anomaly: <b>${prefix}%{y:,.0f}</b><extra></extra>`,
  };
}

// ─────────────────────────────────────────────────────────────────
//  MAIN CHART BUILDER
// ─────────────────────────────────────────────────────────────────
function buildChart({ historical, forecastDates, forecastData, color, fillColor, prefix, metricKey, isBar=false }) {
  const dates   = historical?.dates || [];
  const rawVals = safeArr(historical?.[metricKey]);
  const rawMA7  = rollingMean(rawVals, 7);
  const fDates  = forecastDates || [];
  const fVals   = safeArr(forecastData?.prophet);
  const ciUp    = safeArr(forecastData?.ci_80?.upper || forecastData?.ci_95?.upper);
  const ciLo    = safeArr(forecastData?.ci_80?.lower || forecastData?.ci_95?.lower);

  const holdoutN     = 7;
  const holdoutIdx   = Math.max(0, dates.length - holdoutN);
  const holdoutStart = dates[holdoutIdx] || null;
  const lastDate     = dates[dates.length-1] || null;
  const lastVal      = rawVals[rawVals.length-1] || 0;

  const traces      = [];
  const shapes      = [];
  const annotations = [];

  // ── Background regions ──
  // Holdout validation zone (amber tint)
  if (holdoutStart && lastDate) {
    shapes.push({
      type:'rect', x0:holdoutStart, x1:lastDate, y0:0, y1:1, yref:'paper',
      fillcolor: C.holdoutFill, line:{ width:0 }, layer:'below',
    });
  }
  // Forecast zone (purple tint)
  if (lastDate && fDates.length) {
    shapes.push({
      type:'rect', x0:lastDate, x1:fDates[fDates.length-1], y0:0, y1:1, yref:'paper',
      fillcolor:'rgba(124,58,237,0.03)', line:{ width:0 }, layer:'below',
    });
  }
  // Holdout divider line
  if (holdoutStart) {
    shapes.push({
      type:'line', x0:holdoutStart, x1:holdoutStart, y0:0, y1:1, yref:'paper',
      line:{ color:C.holdout, width:1.5, dash:'dot' },
    });
  }
  // Forecast start divider line
  if (lastDate) {
    shapes.push({
      type:'line', x0:lastDate, x1:lastDate, y0:0, y1:1, yref:'paper',
      line:{ color:C.forecast, width:1.5, dash:'dot' },
    });
  }

  // ── Annotations ──
  if (holdoutStart) {
    annotations.push({
      x:holdoutStart, y:1.01, yref:'paper', xanchor:'center', yanchor:'bottom',
      text:'◀ Validation', showarrow:false,
      font:{ size:8, color:C.holdout, family:FONT },
      bgcolor:'#FFFBEB', bordercolor:'#FDE68A', borderwidth:1, borderpad:3,
    });
  }
  if (lastDate && fDates.length) {
    annotations.push({
      x:lastDate, y:1.01, yref:'paper', xanchor:'center', yanchor:'bottom',
      text:'Forecast ▶', showarrow:false,
      font:{ size:8, color:C.forecast, family:FONT },
      bgcolor:'#F5F3FF', bordercolor:'#C4B5FD', borderwidth:1, borderpad:3,
    });
  }

  // ── Historical traces ──
  if (isBar) {
    traces.push(makeHistoricalBars({ dates, vals:rawVals, color, holdoutStart, prefix }));
  } else {
    const histEndIdx = holdoutIdx + 1;
    const histD = dates.slice(0, histEndIdx);
    const histV = rawVals.slice(0, histEndIdx);
    if (histD.length) traces.push(makeHistoricalLine({ dates:histD, vals:histV, color, fillColor, prefix }));
    if (holdoutIdx > 0) {
      const holdD = dates.slice(holdoutIdx);
      const holdV = rawVals.slice(holdoutIdx);
      const hl = makeHoldoutLine({ dates:holdD, vals:holdV, prefix });
      if (hl) traces.push(hl);
    }
  }

  // ── 7-Day MA ──
  if (rawMA7.some(v => v != null && v > 0)) {
    traces.push(makeMA7({ dates, vals:rawMA7, prefix }));
  }

  // ── Anomaly markers ──
  const anom = makeAnomalyMarkers({ dates, vals:rawVals, prefix });
  if (anom) traces.push(anom);

  // ── CI band ──
  if (ciUp.length && ciLo.length && fDates.length) {
    traces.push(makeCIBand({ dates:fDates, upper:ciUp, lower:ciLo }));
  }

  // ── Forecast line (connects from last historical point) ──
  if (fVals.length && fDates.length) {
    traces.push(makeForecastLine({
      connDates: [lastDate, ...fDates],
      connVals:  [lastVal,  ...fVals],
      prefix,
    }));
  }

  // ── Peak annotation for bar chart ──
  if (isBar && rawVals.length) {
    const peak  = Math.max(...rawVals.filter(v=>v>0));
    const peakI = rawVals.indexOf(peak);
    if (peak > 0 && peakI >= 0) {
      annotations.push({
        x:dates[peakI], y:peak,
        text:`⬆ Peak: ${peak}`, showarrow:true,
        arrowhead:2, arrowsize:0.9, arrowcolor:color, arrowwidth:1.5,
        font:{ size:9, color:color, family:FONT },
        bgcolor:'#FFFBEB', bordercolor:'#FCD34D', borderwidth:1, borderpad:3,
        ax:0, ay:-36,
      });
    }
  }

  // ── Y-axis range ──
  const allVals = [...rawVals, ...fVals, ...ciUp].filter(v=>isFinite(v)&&v>0);
  const maxV    = allVals.length ? Math.max(...allVals) : 10;
  const yRange  = [0, maxV * 1.25];

  return { traces, shapes, annotations, yRange };
}

// ─────────────────────────────────────────────────────────────────
//  LAYOUT BUILDER
// ─────────────────────────────────────────────────────────────────
function buildLayout({ title, yLabel, yRange, shapes=[], annotations=[], isWide=false, xRange=null, yTickFormat=null }) {
  return {
    autosize: true,
    height: isWide ? 320 : 280,
    margin: { t:52, r:20, b: isWide ? 72 : 50, l:70 },
    paper_bgcolor: '#FFFFFF',
    plot_bgcolor:  '#FAFBFD',
    font: { family:MONO, size:10, color:'#64748B' },

    title: {
      text: title,
      font: { size:12, color:'#1E293B', family:FONT },
      x:0.015, y:0.985, xanchor:'left',
    },

    xaxis: {
      type:'date',
      showgrid: false,
      zeroline: false,
      tickangle: -30,
      tickfont: { size:9, color:'#94A3B8', family:MONO },
      tickformat: '%d %b',
      linecolor: '#E2E8F0', showline:true,
      tickcolor: '#E2E8F0',
      ...(xRange ? { range:xRange } : {}),
      rangeslider: isWide
        ? { visible:true, thickness:0.055, bgcolor:'#F8FAFC', bordercolor:'#E2E8F0', borderwidth:1 }
        : { visible:false },
      rangeselector: isWide ? {
        buttons:[
          { count:7,  label:'1W',  step:'day', stepmode:'backward' },
          { count:14, label:'2W',  step:'day', stepmode:'backward' },
          { count:21, label:'3W',  step:'day', stepmode:'backward' },
          { step:'all', label:'All' },
        ],
        font:{ size:9, family:MONO, color:'#475569' },
        bgcolor:'#F1F5F9', activecolor:'#EDE9FE',
        bordercolor:'#E2E8F0', borderwidth:1,
        x:0, y:1.18,
      } : undefined,
    },

    yaxis: {
      gridcolor: 'rgba(0,0,0,0.035)',
      gridwidth: 1,
      zeroline: true, zerolinecolor:'rgba(0,0,0,0.07)', zerolinewidth:1,
      tickfont: { size:9, color:'#94A3B8', family:MONO },
      linecolor: '#E2E8F0', showline:true,
      title: { text:yLabel, font:{ size:9, color:'#94A3B8', family:MONO }, standoff:10 },
      ...(yRange ? { range:yRange } : { rangemode:'tozero' }),
      ...(yTickFormat ? { tickformat:yTickFormat } : {}),
      fixedrange: false,
    },

    showlegend: true,
    legend: {
      orientation:'h',
      y: isWide ? -0.35 : -0.22,
      x:0.5, xanchor:'center',
      font:{ size:9, color:'#64748B', family:MONO },
      bgcolor:'rgba(255,255,255,0.95)',
      bordercolor:'#F1F5F9', borderwidth:1,
    },

    hovermode: 'x unified',
    hoverlabel: {
      bgcolor:'#1E293B',
      bordercolor:'#334155',
      font:{ size:11, color:'#F8FAFC', family:FONT },
      namelength:-1,
    },
    dragmode: 'zoom',
    shapes,
    annotations,
  };
}

// ─────────────────────────────────────────────────────────────────
//  MODULE-LEVEL CACHE
// ─────────────────────────────────────────────────────────────────
const CACHE = {};

// ─────────────────────────────────────────────────────────────────
//  SKELETON
// ─────────────────────────────────────────────────────────────────
function Shimmer({ h=60, r=12, style={} }) {
  return (
    <div style={{
      height:h, borderRadius:r,
      background:'linear-gradient(90deg,#F1F5F9 25%,#E8EDF3 50%,#F1F5F9 75%)',
      backgroundSize:'400% 100%',
      animation:'cfm_shimmer 1.5s ease-in-out infinite',
      ...style,
    }}/>
  );
}
function SkeletonBody() {
  return (
    <div style={{ padding:'0.75rem 1.25rem', display:'flex', flexDirection:'column', gap:'0.7rem' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.55rem' }}>
        {[0,1,2,3].map(i=><Shimmer key={i} h={90} r={14}/>)}
      </div>
      <Shimmer h={48} r={10}/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.55rem' }}>
        <Shimmer h={280} r={12}/>
        <Shimmer h={280} r={12}/>
        <Shimmer h={320} r={12} style={{ gridColumn:'1/-1' }}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SPARKLINE
// ─────────────────────────────────────────────────────────────────
function Sparkline({ vals=[], color='#2563EB', width=64, height=28 }) {
  if (vals.length < 3) return null;
  const mn = Math.min(...vals), mx = Math.max(...vals), range = mx-mn || 1;
  const pts = vals.map((v,i) => {
    const x = (i/(vals.length-1))*width;
    const y = height - ((v-mn)/range)*(height-4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow:'visible', flexShrink:0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.9"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
//  KPI CARD
// ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, iconBg, iconColor, value, label, sub, delta, sparkVals, sparkColor, accent, animDelay=0 }) {
  const pos = typeof delta==='number' ? delta>=0 : null;
  return (
    <div className="cfm-kpi-card" style={{ animationDelay:`${animDelay}ms` }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ width:34, height:34, borderRadius:9, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {icon}
        </div>
        {sparkVals?.length >= 3 && <Sparkline vals={sparkVals} color={sparkColor||iconColor}/>}
      </div>
      <div style={{ fontSize:'1.05rem', fontWeight:800, color:'#0F172A', letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:3, fontFamily:MONO }}>
        {value}
      </div>
      <div style={{ fontSize:'0.64rem', fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>
        {label}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
        {pos !== null && (
          <span style={{
            display:'flex', alignItems:'center', gap:1,
            color: pos?'#059669':'#EF4444',
            background: pos?'#ECFDF5':'#FEF2F2',
            padding:'1px 5px', borderRadius:4,
            fontSize:'0.68rem', fontWeight:700, fontFamily:MONO,
          }}>
            {pos ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
            {fmtN(Math.abs(delta),1)}%
          </span>
        )}
        {sub && <span style={{ fontSize:'0.68rem', color:'#64748B', fontWeight:500 }}>{sub}</span>}
      </div>
      {accent && <div style={{ marginTop:8, height:3, background:`linear-gradient(90deg,${accent},${accent}33)`, borderRadius:2 }}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ACCURACY RING
// ─────────────────────────────────────────────────────────────────
function AccuracyRing({ mape }) {
  if (mape == null) return null;
  const acc = Math.max(0, Math.min(100, 100-Math.abs(mape)));
  const col = acc>=80?'#059669':acc>=60?'#D97706':'#EF4444';
  const r=18, cx=24, cy=24, circ=2*Math.PI*r;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1, flexShrink:0 }}>
      <svg width={48} height={48}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={4}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={4}
          strokeDasharray={`${(acc/100)*circ} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90,${cx},${cy})`}/>
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize:9, fontWeight:700, fill:col, fontFamily:MONO }}>
          {acc.toFixed(0)}%
        </text>
      </svg>
      <span style={{ fontSize:'0.57rem', color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Accuracy</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  STOCK GAUGE
// ─────────────────────────────────────────────────────────────────
function StockGauge({ current, reorder, forecastDailyUnits }) {
  if (current == null) return null;
  const daysLeft  = forecastDailyUnits > 0 ? Math.round(current/forecastDailyUnits) : null;
  const cap       = Math.max(current, (reorder||0)*3, 1);
  const pct       = current/cap;
  const isVeryLow = current <= (reorder||0)*0.5;
  const isLow     = current <= (reorder||0);
  const statusCol = isVeryLow?'#EF4444': isLow?'#D97706':'#059669';
  const statusBg  = isVeryLow?'#FEF2F2': isLow?'#FFFBEB':'#ECFDF5';
  const statusLbl = isVeryLow?'CRITICAL': isLow?'LOW STOCK':'IN STOCK';

  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'0.6rem 1rem', borderRadius:10, background:'#FAFBFD', border:'1px solid #F1F5F9' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'0.67rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.06em' }}>Inventory Status</span>
          <span style={{ fontSize:'0.62rem', fontWeight:800, padding:'2px 7px', borderRadius:4, color:statusCol, background:statusBg, letterSpacing:'0.04em' }}>{statusLbl}</span>
        </div>
        <div style={{ background:'#E2E8F0', borderRadius:4, height:6, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct*100}%`, background:`linear-gradient(90deg,${statusCol}88,${statusCol})`, borderRadius:4, transition:'width 0.6s ease' }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.68rem', color:'#64748B', fontFamily:MONO }}>
          <span><b style={{ color:'#1E293B' }}>{(current||0).toLocaleString()}</b> units in stock</span>
          <span>Reorder at <b style={{ color:statusCol }}>{(reorder||0).toLocaleString()}</b></span>
        </div>
      </div>
      {daysLeft != null && (
        <div style={{ textAlign:'center', flexShrink:0, padding:'4px 8px', background:statusBg, borderRadius:8, border:`1px solid ${statusCol}30` }}>
          <div style={{ fontSize:'1.4rem', fontWeight:800, color:statusCol, lineHeight:1, letterSpacing:'-0.03em', fontFamily:MONO }}>{daysLeft}</div>
          <div style={{ fontSize:'0.56rem', fontWeight:700, color:statusCol, textTransform:'uppercase', letterSpacing:'0.04em', marginTop:1 }}>days left</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  WEEKDAY PATTERN
// ─────────────────────────────────────────────────────────────────
function WeekdayPattern({ dates, vals }) {
  if (!dates?.length) return null;
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const sums = Array(7).fill(0), cnts = Array(7).fill(0);
  dates.forEach((d,i) => { const dw=new Date(d).getDay(); sums[dw]+=vals[i]||0; cnts[dw]++; });
  const avgs  = sums.map((s,i) => cnts[i] ? s/cnts[i] : 0);
  const maxA  = Math.max(...avgs, 0.001);
  const peakI = avgs.indexOf(Math.max(...avgs));
  const weeklyTotal = Math.round(avgs.reduce((a,b)=>a+b,0) * 7 / 7 * 7); // sum of daily avgs × 7 = expected weekly
  // Use fractional avgs for bar heights but always display rounded integers
  const allZero = avgs.every(v => v < 0.5);

  if (allZero) {
    return (
      <div style={{ padding:'0.9rem 1rem', background:'#FAFBFD', borderRadius:10, border:'1px solid #F1F5F9', color:'#9CA3AF', fontSize:'0.75rem', textAlign:'center' }}>
        No unit sales recorded in the selected history window.
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', gap:5, alignItems:'flex-end', padding:'0.7rem 1rem 0.4rem', background:'#FAFBFD', borderRadius:10, border:'1px solid #F1F5F9' }}>
        {DAYS.map((d,i) => {
          const barH   = Math.max(4, (avgs[i]/maxA)*56);
          const isPeak = i===peakI && avgs[i] > 0;
          const isWknd = i===0||i===6;
          const barCol = isPeak ? C.units : isWknd ? '#CBD5E1' : '#94A3B8';
          const displayVal = Math.round(avgs[i]);
          return (
            <div key={d} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              <span style={{ fontSize:'0.62rem', fontFamily:MONO, color: isPeak ? C.units : '#64748B', fontWeight: isPeak?800:600 }}>
                {displayVal > 0 ? displayVal : (avgs[i] > 0 ? '<1' : '—')}
              </span>
              <div style={{ width:'100%', borderRadius:'3px 3px 0 0', background: barCol, height:barH, opacity: 0.6+0.4*(avgs[i]/maxA), transition:'height 0.4s ease' }}/>
              <span style={{ fontSize:'0.62rem', color: isPeak?C.units:isWknd?'#9CA3AF':'#64748B', fontWeight: isPeak?700:500 }}>{d}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', padding:'0 0.25rem', fontSize:'0.68rem', color:'#64748B' }}>
        <span>Peak day: <b style={{ color:C.units }}>{DAYS[peakI]} (~{Math.round(avgs[peakI])} units avg)</b></span>
        <span>Expected weekly total: <b style={{ color:C.forecast }}>~{Math.round(avgs.reduce((a,b)=>a+b,0))} units</b></span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TREND ROW
// ─────────────────────────────────────────────────────────────────
function TrendRow({ label, value, suffix='', delta }) {
  const pos = typeof delta==='number' ? delta>=0 : null;
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid #F8FAFC' }}>
      <span style={{ fontSize:'0.68rem', color:'#64748B', fontWeight:500 }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <span style={{ fontSize:'0.82rem', fontWeight:800, color:'#0F172A', fontFamily:MONO, letterSpacing:'-0.01em' }}>
          {value}{suffix}
        </span>
        {pos !== null && (
          <span style={{ color:pos?'#059669':'#EF4444', display:'flex', alignItems:'center' }}>
            {pos ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  COLLAPSIBLE SECTION
// ─────────────────────────────────────────────────────────────────
function Section({ title, icon, children, defaultOpen=true, onOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && onOpen) onOpen();
  };
  return (
    <div style={{ borderTop:'1px solid #F1F5F9' }}>
      <button className="cfm-section-head" onClick={handleToggle}>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          {icon && <span style={{ opacity:0.65 }}>{icon}</span>}
          {title}
        </span>
        {open ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
      </button>
      {open && <div className="cfm-section-body">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DAILY FORECAST TABLE
// ─────────────────────────────────────────────────────────────────
function DailyForecastTable({ forecastDates, forecasts, summaryTable }) {
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const prophetUnits   = safeArr(forecasts?.units?.prophet).slice(0,7);
  const prophetRevenue = safeArr(forecasts?.revenue?.prophet).slice(0,7);
  const prophetProfit  = safeArr(forecasts?.profit?.prophet).slice(0,7);
  const ciUnitsUp      = safeArr(forecasts?.units?.ci_80?.upper || forecasts?.units?.ci_95?.upper).slice(0,7);
  const ciUnitsLo      = safeArr(forecasts?.units?.ci_80?.lower || forecasts?.units?.ci_95?.lower).slice(0,7);

  const rows = (forecastDates||[]).slice(0,7).map((d,i) => {
    // Always use whole units — products are sold in whole quantities
    const rawUnits   = Math.max(0, Math.round(prophetUnits[i]   || 0));
    const rawRevenue = prophetRevenue[i] || 0;
    const rawProfit  = prophetProfit[i]  || 0;
    // If no units are forecast, revenue and profit should also be 0
    const revenue    = rawUnits > 0 ? rawRevenue : 0;
    const profit     = rawUnits > 0 ? rawProfit  : 0;
    return {
      date:  new Date(d),
      units: rawUnits,
      uHigh: Math.max(0, Math.round(ciUnitsUp[i] || prophetUnits[i] || 0)),
      uLow:  Math.max(0, Math.round(ciUnitsLo[i] || prophetUnits[i] || 0)),
      revenue,
      profit,
    };
  });

  // Use raw float max so sparse-product bars and peak detection work for sub-1 values
  const maxUnits  = Math.max(...rows.map(r=>r.units), 0.001);
  const totalUnits= rows.reduce((a,r)=>a+r.units,0);

  return (
    <div style={{ overflowX:'auto' }}>
      <table className="cfm-pro-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Day</th>
            <th style={{ textAlign:'right' }}>Forecast Units</th>
            <th style={{ textAlign:'center', width:80 }}>Volume Bar</th>
            <th style={{ textAlign:'right' }}>Range (80% CI)</th>
            <th style={{ textAlign:'right' }}>Est. Revenue</th>
            <th style={{ textAlign:'right' }}>Est. Profit</th>
            <th style={{ textAlign:'right' }}>Margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i) => {
            const margin   = row.revenue > 0 ? row.profit/row.revenue*100 : 0;
            // Use raw float for bar and peak detection — avoids all-zero bars for sparse products
            const barW     = (row.units/maxUnits)*100;
            const isPeak   = row.units >= maxUnits * 0.999;
            const isWknd   = row.date.getDay()===0||row.date.getDay()===6;
            return (
              <tr key={i} className={isPeak ? 'cfm-peak-row' : ''}>
                <td style={{ fontFamily:MONO, fontWeight:600, color:'#374151', fontSize:'0.78rem' }}>
                  {row.date.toLocaleDateString('en-IN',{ day:'numeric', month:'short' })}
                </td>
                <td>
                  <span style={{ fontSize:'0.64rem', fontWeight:700, padding:'2px 6px', borderRadius:4,
                    background: isWknd?'#FEF3C7':'#F0F9FF', color:isWknd?'#D97706':'#0369A1' }}>
                    {DAYS[row.date.getDay()]}
                  </span>
                </td>
                <td style={{ textAlign:'right', fontFamily:MONO, fontWeight:800, color:isPeak?C.units:row.units===0?'#9CA3AF':'#1E293B', fontSize:'0.85rem' }}>
                  {/* Units are always whole numbers — products can't be sold in fractions */}
                  {row.units.toLocaleString('en-IN')}
                  {isPeak && row.units > 0 && <span style={{ marginLeft:5, fontSize:'0.6rem', color:C.units, fontWeight:700 }}>PEAK</span>}
                  {row.units === 0 && <span style={{ marginLeft:5, fontSize:'0.6rem', color:'#9CA3AF', fontWeight:600 }}>—</span>}
                </td>
                <td style={{ padding:'0.3rem 0.6rem' }}>
                  <div style={{ background:'#F1F5F9', borderRadius:3, height:8, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${barW}%`, background:isPeak?C.units:C.forecast, borderRadius:3, opacity:0.7+0.3*(row.units/maxUnits) }}/>
                  </div>
                </td>
                <td style={{ textAlign:'right', fontFamily:MONO, fontSize:'0.72rem', color:'#94A3B8' }}>
                  {row.uLow === 0 && row.uHigh === 0 ? '—' : `${row.uLow} – ${row.uHigh}`}
                </td>
                <td style={{ textAlign:'right', fontFamily:MONO, fontWeight:600, color:C.revenue, fontSize:'0.78rem' }}>{fmtC(row.revenue)}</td>
                <td style={{ textAlign:'right', fontFamily:MONO, fontWeight:600, color:C.profit,  fontSize:'0.78rem' }}>{fmtC(row.profit)}</td>
                <td style={{ textAlign:'right' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:5 }}>
                    <div style={{ width:36, height:4, background:'#F1F5F9', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(100,margin)}%`, background:C.profit, borderRadius:2 }}/>
                    </div>
                    <span style={{ fontFamily:MONO, fontSize:'0.72rem', color:'#374151', fontWeight:700, minWidth:36, textAlign:'right' }}>
                      {fmtN(margin,1)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="cfm-total-row">
            <td colSpan={2}><b>7-Day Totals</b></td>
            <td style={{ textAlign:'right' }}><b style={{ fontFamily:MONO }}>{Math.round(summaryTable?.next_7_days?.units ?? totalUnits).toLocaleString('en-IN')}</b></td>
            <td/>
            <td/>
            <td style={{ textAlign:'right' }}><b style={{ fontFamily:MONO, color:C.revenue }}>{fmtC(summaryTable?.next_7_days?.revenue||0)}</b></td>
            <td style={{ textAlign:'right' }}><b style={{ fontFamily:MONO, color:C.profit  }}>{fmtC(summaryTable?.next_7_days?.profit||0)}</b></td>
            <td/>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
export default function ComprehensiveForecastModal({ product, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data,    setData   ] = useState(null);
  const [error,   setError  ] = useState(null);
  const [retry,   setRetry  ] = useState(0);
  const [xRange,  setXRange ] = useState(null);
  const overlayRef = useRef(null);

  // Fetch with cache
  const doFetch = useCallback(() => {
    const key = product.product_id;
    if (CACHE[key]) { setData(CACHE[key]); setLoading(false); return; }
    setLoading(true); setError(null);
    ownerAPI.getComprehensiveForecast(key, 365, 30)
      .then(res => {
        if (res.data?.error) throw new Error(res.data.error);
        CACHE[key] = res.data;
        setData(res.data);
      })
      .catch(e => setError(e.message || 'Failed to load forecast'))
      .finally(() => setLoading(false));
  }, [product.product_id, retry]); // eslint-disable-line

  useEffect(() => { doFetch(); }, [doFetch]);

  // Escape to close
  useEffect(() => {
    const h = e => { if(e.key==='Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Synchronized zoom across all charts
  const onRelayout = useCallback(ev => {
    if (ev['xaxis.range[0]'] && ev['xaxis.range[1]']) {
      setXRange([ev['xaxis.range[0]'], ev['xaxis.range[1]']]);
    } else if (ev['xaxis.autorange'] === true) {
      setXRange(null);
    }
  }, []);

  // Build charts
  const charts = useMemo(() => {
    if (!data) return {};
    return {
      rev: buildChart({ historical:data.historical, forecastDates:data.forecast_dates, forecastData:data.forecasts?.revenue, color:C.revenue, fillColor:C.revenueFill, prefix:'Rs.', metricKey:'revenue', isBar:false }),
      pro: buildChart({ historical:data.historical, forecastDates:data.forecast_dates, forecastData:data.forecasts?.profit,  color:C.profit,  fillColor:C.profitFill,  prefix:'Rs.', metricKey:'profit',  isBar:false }),
      uni: buildChart({ historical:data.historical, forecastDates:data.forecast_dates, forecastData:data.forecasts?.units,   color:C.units,   fillColor:C.unitsFill,   prefix:'',    metricKey:'units',   isBar:true  }),
    };
  }, [data]);

  const dc     = data?.decision?.color;
  const decCol = dc==='green'?'#059669': dc==='red'?'#EF4444':'#D97706';
  const decBg  = dc==='green'?'#F0FDF4': dc==='red'?'#FEF2F2':'#FFFBEB';
  const ti     = data?.trend_indicators;

  const forecastDailyUnits = safe(data?.summary_table?.next_7_days?.units)/7;

  const revSpark = safeArr(data?.historical?.revenue).slice(-14);
  const proSpark = safeArr(data?.historical?.profit).slice(-14);
  const uniSpark = safeArr(data?.historical?.units).slice(-14);

  return (
    <div className="cfm-overlay" ref={overlayRef} onClick={e=>{ if(e.target===overlayRef.current) onClose(); }}>
      <div className="cfm-modal" role="dialog" aria-modal="true" aria-label={`Forecast: ${product.name}`}>

        {/* ══ STICKY HEADER ══ */}
        <div className="cfm-header">
          <div style={{ display:'flex', alignItems:'center', gap:'0.9rem', flex:1, minWidth:0 }}>
            {data?.image_url || product.image_url
              ? <img src={data?.image_url||product.image_url} alt={product.name} className="cfm-product-img"/>
              : <div className="cfm-product-img"><Package size={22} color="#9CA3AF"/></div>
            }
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', gap:5, marginBottom:5, flexWrap:'wrap' }}>
                <span className="cfm-pill brand">{product.brand}</span>
                <span className="cfm-pill cat">{product.category}</span>
                <span className="cfm-pill model"><Zap size={9}/> Prophet ML · 1yr history + 30d forecast</span>
              </div>
              <h2 className="cfm-product-name">{product.name}</h2>
              {(data?.description||product.description) && (
                <p className="cfm-product-desc">{data?.description||product.description}</p>
              )}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <AccuracyRing mape={data?.metrics?.mape}/>
            <div style={{ display:'flex', gap:5 }}>
              <button className="cfm-icon-btn" onClick={doFetch} title="Refresh"><RefreshCw size={14}/></button>
              <button className="cfm-icon-btn close" onClick={onClose} title="Close (Esc)"><X size={15}/></button>
            </div>
          </div>
        </div>

        {/* ══ CHART LEGEND BAR ══ */}
        <div className="cfm-legend-bar">
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'center' }}>
            {[
              { col:C.revenue,  lbl:'Historical data' },
              { col:C.holdout,  lbl:'Validation holdout', dashed:true },
              { col:C.ma,       lbl:'7-Day moving average', dashed:true },
              { col:C.forecast, lbl:'Prophet forecast', dashed:true },
              { col:C.forecast, lbl:'80% confidence interval', band:true },
              { col:C.anomaly,  lbl:'Anomaly (±2.2σ)', isX:true },
            ].map(({ col,lbl,dashed,isX,band }) => (
              <span key={lbl} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.67rem', color:'#64748B', fontWeight:500 }}>
                {isX
                  ? <span style={{ fontSize:'0.75rem', color:col, fontWeight:800, lineHeight:1 }}>✕</span>
                  : band
                  ? <span style={{ width:12, height:8, borderRadius:2, background:col+'25', border:`1px solid ${col}80`, display:'inline-block' }}/>
                  : dashed
                  ? <svg width={18} height={2}><line x1="0" y1="1" x2="18" y2="1" stroke={col} strokeWidth="2" strokeDasharray="4,2"/></svg>
                  : <span style={{ width:8, height:8, borderRadius:'50%', background:col, display:'inline-block', flexShrink:0 }}/>
                }
                {lbl}
              </span>
            ))}
          </div>
          <span style={{ fontSize:'0.62rem', color:'#94A3B8', fontStyle:'italic', display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
            Drag to zoom · All charts sync · Double-click to reset
          </span>
        </div>

        {/* ══ LOADING / ERROR / DATA ══ */}
        {loading ? <SkeletonBody/> : error ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:'4rem 1.5rem' }}>
            <AlertTriangle size={36} color="#EF4444" strokeWidth={1.5}/>
            <p style={{ color:'#64748B', fontSize:'0.88rem', maxWidth:340, textAlign:'center', lineHeight:1.6 }}>{error}</p>
            <button className="cfm-retry-btn" onClick={()=>setRetry(r=>r+1)}><RefreshCw size={13}/> Try Again</button>
          </div>
        ) : data ? (
          <>
            {/* ── KPI Cards ── */}
            <div className="cfm-kpi-grid">
              <KpiCard icon={<ShoppingCart size={15} color={C.units}/>}   iconBg="#FFF7ED" iconColor={C.units}    value={(data.historical?.totals?.units||0).toLocaleString('en-IN')} label="Units Sold (1yr)"   sub={`avg ${Math.round(data.metrics?.avg_daily_units||0)}/day · ${Math.round((data.metrics?.avg_daily_units||0)*7)}/week`}    delta={ti?.units?.growth_rate_pct}   sparkVals={uniSpark} sparkColor={C.units}    accent={C.units}    animDelay={0}/>
              <KpiCard icon={<BarChart3  size={15} color={C.revenue}/>}   iconBg="#EFF6FF" iconColor={C.revenue}  value={fmtC(data.historical?.totals?.revenue||0)}                  label="Revenue (1yr)"     sub={`avg ${fmtC(data.metrics?.avg_daily_revenue||0)} / day`}     delta={ti?.revenue?.growth_rate_pct} sparkVals={revSpark} sparkColor={C.revenue}  accent={C.revenue}  animDelay={60}/>
              <KpiCard icon={<TrendingUp size={15} color={C.profit}/>}    iconBg="#ECFDF5" iconColor={C.profit}   value={fmtC(data.historical?.totals?.profit||0)}                   label="Gross Profit (1yr)" sub={`margin ${fmtN((data.margin_ratio||0)*100,1)}%`}            delta={ti?.profit?.growth_rate_pct}  sparkVals={proSpark} sparkColor={C.profit}   accent={C.profit}   animDelay={120}/>
              <KpiCard icon={<Target    size={15} color={C.forecast}/>}   iconBg="#F5F3FF" iconColor={C.forecast} value={(() => { const u = Math.round(safe(data.summary_table?.next_7_days?.units)); return `~${u} units`; })()} label="7-Day Forecast"  sub={`~${fmtC(data.summary_table?.next_7_days?.revenue||0)} est. revenue`}                                                            accent={C.forecast} animDelay={180}/>
            </div>

            {/* ── Decision banner + Stock gauge ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:6, margin:'0 1.25rem 0.25rem' }}>
              {data.decision && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0.5rem 0.9rem', borderRadius:10, background:decBg, border:`1px solid ${decCol}35` }}>
                  {dc==='green'?<CheckCircle2 size={15} color={decCol}/>:dc==='red'?<AlertTriangle size={15} color={decCol}/>:<Activity size={15} color={decCol}/>}
                  <span style={{ fontWeight:800, fontSize:'0.72rem', color:decCol, textTransform:'uppercase', letterSpacing:'0.05em', flexShrink:0 }}>{data.decision.action}</span>
                  <span style={{ fontSize:'0.77rem', color:'#475569', fontWeight:500 }}>{data.decision.reason}</span>
                </div>
              )}
              <StockGauge current={data.current_stock} reorder={data.reorder_level} forecastDailyUnits={forecastDailyUnits}/>
            </div>

            {/* ══ 3 CHARTS ══ */}
            <div className="cfm-chart-grid">
              {/* Revenue */}
              <div className="cfm-chart-card">
                {charts.rev?.traces.length
                  ? <Plot data={charts.rev.traces} layout={buildLayout({ title:'Revenue · Historical + Forecast', yLabel:'Rs.', yRange:charts.rev.yRange, shapes:charts.rev.shapes, annotations:charts.rev.annotations, xRange })} config={PLOTLY_CONFIG} onRelayout={onRelayout} useResizeHandler style={{ width:'100%' }}/>
                  : <div className="cfm-chart-empty">No revenue data</div>
                }
              </div>

              {/* Profit */}
              <div className="cfm-chart-card">
                {charts.pro?.traces.length
                  ? <Plot data={charts.pro.traces} layout={buildLayout({ title:'Profit · Historical + Forecast', yLabel:'Rs.', yRange:charts.pro.yRange, shapes:charts.pro.shapes, annotations:charts.pro.annotations, xRange })} config={PLOTLY_CONFIG} onRelayout={onRelayout} useResizeHandler style={{ width:'100%' }}/>
                  : <div className="cfm-chart-empty">No profit data</div>
                }
              </div>

              {/* Unit Sales — full width, range slider */}
              <div className="cfm-chart-card cfm-chart-full">
                {charts.uni?.traces.length
                  ? <Plot data={charts.uni.traces} layout={buildLayout({ title:'Unit Sales · Daily Actual  |  Validation Window  |  7-Day Forecast', yLabel:'Units', yRange:charts.uni.yRange, shapes:charts.uni.shapes, annotations:charts.uni.annotations, isWide:true, xRange, yTickFormat:',' })} config={PLOTLY_CONFIG} onRelayout={onRelayout} useResizeHandler style={{ width:'100%' }}/>
                  : <div className="cfm-chart-empty">No unit data</div>
                }
                {data.historical?.peak_day?.units > 0 && (
                  <div style={{ fontSize:'0.69rem', color:'#64748B', padding:'0.3rem 1rem 0.5rem', borderTop:'1px solid #F8FAFC', textAlign:'center' }}>
                    📈 Historical peak: <b style={{ color:C.units }}>{data.historical.peak_day.units} units</b> on{' '}
                    {new Date(data.historical.peak_day.date).toLocaleDateString('en-IN',{ weekday:'short', day:'numeric', month:'short' })}
                    {data.historical.peak_day.revenue > 0 && <> · Revenue: <b style={{ color:C.revenue }}>{fmtC(data.historical.peak_day.revenue)}</b></>}
                  </div>
                )}
              </div>
            </div>

            {/* ── Weekday Pattern ── */}
            <Section title="Average Units by Day of Week" icon={<BarChart3 size={12}/>} defaultOpen>
              <WeekdayPattern dates={data.historical?.dates||[]} vals={safeArr(data.historical?.units)}/>
            </Section>

            {/* ── 7-Day Daily Forecast Table ── */}
            <Section title="7-Day Daily Forecast Breakdown" icon={<Layers size={12}/>} defaultOpen>
              <DailyForecastTable
                forecastDates={data.forecast_dates}
                forecasts={data.forecasts}
                summaryTable={data.summary_table}
              />
            </Section>

            {/* ── Performance Metrics ── */}
            <Section title="Performance & Trend Indicators" icon={<Activity size={12}/>} defaultOpen>
              <div className="cfm-metrics-4col">
                <div className="cfm-metric-group">
                  <div className="cfm-metric-group-title">Growth (1yr)</div>
                  <TrendRow label="Revenue Growth"  value={fmtN(ti?.revenue?.growth_rate_pct)} suffix="%" delta={ti?.revenue?.growth_rate_pct}/>
                  <TrendRow label="Profit Growth"   value={fmtN(ti?.profit?.growth_rate_pct)}  suffix="%" delta={ti?.profit?.growth_rate_pct}/>
                  <TrendRow label="Units Growth"    value={fmtN(ti?.units?.growth_rate_pct)}   suffix="%" delta={ti?.units?.growth_rate_pct}/>
                </div>
                <div className="cfm-metric-group">
                  <div className="cfm-metric-group-title">Efficiency & Quality</div>
                  <TrendRow label="Gross Margin"          value={fmtN((data.margin_ratio||0)*100)} suffix="%"/>
                  <TrendRow label="Inv. Turnover"         value={fmtN(data.metrics?.inventory_turnover)} suffix="×"/>
                  <TrendRow label="Break-Even"            value={fmtN(data.metrics?.break_even_units)} suffix=" units/day"/>
                  {data.metrics?.mape != null && <TrendRow label="Forecast MAPE" value={fmtN(data.metrics.mape)} suffix="%"/>}
                  {data.metrics?.demand_volatility != null && <TrendRow label="Demand Volatility" value={fmtN(data.metrics.demand_volatility)} suffix="%"/>}
                </div>
                <div className="cfm-metric-group">
                  <div className="cfm-metric-group-title">7-Day Moving Averages</div>
                  <TrendRow label="Revenue MA"     value={fmtC(ti?.revenue?.ma_7)}/>
                  <TrendRow label="Profit MA"      value={fmtC(ti?.profit?.ma_7)}/>
                  <TrendRow label="Units MA / day" value={String(Math.round(safe(ti?.units?.ma_7)))}     suffix=" units"/>
                  <TrendRow label="Units MA / week" value={String(Math.round(safe(ti?.units?.ma_7) * 7))} suffix=" units"/>
                </div>
                <div className="cfm-metric-group">
                  <div className="cfm-metric-group-title">Forecast vs Historical</div>
                  <TrendRow label="Hist. Avg / Day"    value={String(Math.round(safe(data.key_insights?.historical_avg_units)))}   suffix=" units"/>
                  <TrendRow label="Forecast Avg / Day" value={String(Math.round(safe(data.key_insights?.forecasted_avg_units)))}   suffix=" units"/>
                  <TrendRow label="Forecast Avg / Week" value={String(Math.round(safe(data.key_insights?.forecasted_avg_units) * 7))} suffix=" units" delta={data.key_insights?.growth_vs_historical_pct}/>
                  <TrendRow label="Growth vs Hist." value={fmtN(data.key_insights?.growth_vs_historical_pct)} suffix="%" delta={data.key_insights?.growth_vs_historical_pct}/>
                </div>
              </div>
            </Section>

            {/* ── Period Summaries ── */}
            <Section title="Forecast Period Summaries" icon={<Target size={12}/>} defaultOpen={false}>
              <div className="cfm-summary-grid">
                {[
                  { period:'Next 3 Days', key:'next_3_days', conf:'High confidence',   confCol:'#059669', confBg:'#ECFDF5' },
                  { period:'Next 7 Days', key:'next_7_days', conf:'Medium confidence', confCol:'#D97706', confBg:'#FFFBEB' },
                ].map(({ period, key, conf, confCol, confBg }) => {
                  const r = data.summary_table?.[key]||{};
                  return (
                    <div key={key} className="cfm-summary-card">
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                        <span style={{ fontWeight:800, color:'#1E293B', fontSize:'0.82rem' }}>{period}</span>
                        <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 7px', borderRadius:4, color:confCol, background:confBg }}>{conf}</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                        {[
                          { label:'Units',   value:Math.round(r.units||0).toLocaleString('en-IN'),  color:C.units   },
                          { label:'Revenue', value:fmtC(Math.round(r.units||0) > 0 ? (r.revenue||0) : 0), color:C.revenue },
                          { label:'Profit',  value:fmtC(Math.round(r.units||0) > 0 ? (r.profit||0)  : 0), color:C.profit  },
                        ].map(({ label,value,color }) => (
                          <div key={label} style={{ textAlign:'center', padding:'10px 4px', background:'#FAFBFD', borderRadius:8 }}>
                            <div style={{ fontSize:'0.92rem', fontWeight:800, color, fontFamily:MONO, letterSpacing:'-0.01em' }}>{value}</div>
                            <div style={{ fontSize:'0.58rem', color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:3 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

          </>
        ) : null}
      </div>
      <style>{STYLES}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  @keyframes cfm_in      { from{opacity:0;transform:translateY(14px) scale(0.975)} to{opacity:1;transform:none} }
  @keyframes cfm_shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes cfm_rise    { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
  @keyframes spin        { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

  /* Overlay */
  .cfm-overlay {
    position:fixed; inset:0; z-index:2000;
    background:rgba(15,23,42,0.6);
    display:flex; align-items:center; justify-content:center;
    padding:1rem; backdrop-filter:blur(8px);
  }

  /* Modal shell */
  .cfm-modal {
    background:#fff;
    border-radius:22px;
    width:100%; max-width:1060px;
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.04),
      0 4px 16px rgba(0,0,0,0.06),
      0 24px 64px rgba(0,0,0,0.14);
    overflow:hidden;
    animation:cfm_in 0.28s cubic-bezier(0.16,1,0.3,1);
    max-height:95vh; overflow-y:auto;
    font-family:"Plus Jakarta Sans", system-ui, sans-serif;
    scrollbar-width:thin; scrollbar-color:#E2E8F0 transparent;
  }
  .cfm-modal::-webkit-scrollbar { width:4px; }
  .cfm-modal::-webkit-scrollbar-thumb { background:#E2E8F0; border-radius:4px; }

  /* Header */
  .cfm-header {
    display:flex; align-items:flex-start; justify-content:space-between;
    gap:1rem; padding:1.25rem 1.5rem;
    border-bottom:1px solid #F1F5F9;
    position:sticky; top:0; background:#fff; z-index:20;
    box-shadow:0 1px 0 #F1F5F9;
  }
  .cfm-product-img {
    width:54px; height:54px; border-radius:13px; object-fit:cover;
    border:1px solid #E2E8F0; flex-shrink:0;
    background:#F8FAFC; display:flex; align-items:center; justify-content:center;
  }
  .cfm-product-name {
    font-size:1.04rem; font-weight:800; color:#0F172A;
    margin:0; letter-spacing:-0.022em;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:600px;
  }
  .cfm-product-desc {
    font-size:0.72rem; color:#64748B; margin:3px 0 0; line-height:1.5;
    display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;
  }

  /* Pills */
  .cfm-pill {
    display:inline-flex; align-items:center; gap:3px;
    font-size:0.63rem; font-weight:700; padding:2px 8px; border-radius:20px;
  }
  .cfm-pill.brand  { background:#EFF6FF; color:#2563EB; }
  .cfm-pill.cat    { background:#F0FDF4; color:#059669; }
  .cfm-pill.model  { background:#F5F3FF; color:#7C3AED; }

  /* Icon buttons */
  .cfm-icon-btn {
    width:32px; height:32px; border-radius:8px;
    border:1px solid #E2E8F0; background:#F8FAFC;
    color:#64748B; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:all 0.15s;
  }
  .cfm-icon-btn:hover { background:#F1F5F9; color:#1E293B; border-color:#CBD5E1; }
  .cfm-icon-btn.close:hover { background:#FEF2F2; color:#EF4444; border-color:#FECACA; }

  /* Legend bar */
  .cfm-legend-bar {
    display:flex; align-items:center; justify-content:space-between;
    flex-wrap:wrap; gap:8px;
    padding:0.45rem 1.5rem;
    background:#FAFBFD; border-bottom:1px solid #F1F5F9;
  }

  /* KPI grid */
  .cfm-kpi-grid {
    display:grid; grid-template-columns:repeat(4,1fr);
    gap:0.6rem; padding:0.9rem 1.25rem 0.55rem;
  }
  .cfm-kpi-card {
    background:#FAFBFD; border:1px solid #F1F5F9; border-radius:14px;
    padding:0.8rem 0.9rem;
    animation:cfm_rise 0.35s ease both;
    transition:box-shadow 0.2s, transform 0.2s;
  }
  .cfm-kpi-card:hover { box-shadow:0 4px 18px rgba(0,0,0,0.07); transform:translateY(-1px); }

  /* Chart grid */
  .cfm-chart-grid {
    display:grid; grid-template-columns:1fr 1fr;
    gap:0.55rem; padding:0.6rem 1.25rem 0.2rem;
  }
  .cfm-chart-card {
    background:#fff; border:1px solid #F1F5F9; border-radius:12px;
    overflow:hidden; transition:box-shadow 0.2s;
  }
  .cfm-chart-card:hover { box-shadow:0 2px 12px rgba(0,0,0,0.05); }
  .cfm-chart-full  { grid-column:1/-1; }
  .cfm-chart-empty { display:flex; align-items:center; justify-content:center; height:200px; color:#9CA3AF; font-size:0.8rem; }
  /* Plotly modebar */
  .cfm-chart-card .modebar        { opacity:0.15; transition:opacity 0.2s; }
  .cfm-chart-card:hover .modebar  { opacity:1; }

  /* Sections */
  .cfm-section-head {
    width:100%; display:flex; align-items:center; justify-content:space-between;
    padding:0.5rem 1.25rem;
    background:#FAFBFD; border:none; cursor:pointer;
    font-family:"Plus Jakarta Sans", system-ui, sans-serif;
    font-size:0.7rem; font-weight:800; color:#374151;
    text-transform:uppercase; letter-spacing:0.06em;
    transition:background 0.12s;
  }
  .cfm-section-head:hover { background:#F1F5F9; }
  .cfm-section-body { padding:0.65rem 1.25rem 0.8rem; }

  /* Metrics grid */
  .cfm-metrics-4col {
    display:grid; grid-template-columns:repeat(4,1fr); gap:0.5rem;
  }
  .cfm-metric-group {
    background:#FAFBFD; border:1px solid #F1F5F9; border-radius:10px;
    padding:0.65rem 0.8rem;
  }
  .cfm-metric-group-title {
    font-size:0.62rem; font-weight:800; color:#94A3B8;
    text-transform:uppercase; letter-spacing:0.07em; margin-bottom:7px;
    padding-bottom:6px; border-bottom:1px solid #F1F5F9;
  }

  /* Forecast table */
  .cfm-pro-table { width:100%; border-collapse:collapse; font-size:0.77rem; }
  .cfm-pro-table th {
    background:#F8FAFC; padding:0.48rem 0.75rem;
    text-align:left; font-weight:700; color:#64748B;
    font-size:0.61rem; text-transform:uppercase; letter-spacing:0.06em;
    border-bottom:2px solid #E2E8F0;
    white-space:nowrap;
  }
  .cfm-pro-table td {
    padding:0.44rem 0.75rem;
    border-bottom:1px solid #F8FAFC; color:#374151; font-weight:500;
    transition:background 0.1s;
  }
  .cfm-pro-table tbody tr:hover td { background:#FAFBFD; }
  .cfm-peak-row td  { background:#FFF9EC !important; }
  .cfm-total-row td {
    background:#F1F5F9; font-weight:700; color:#1E293B;
    border-top:2px solid #E2E8F0; padding:0.5rem 0.75rem;
  }

  /* Summary */
  .cfm-summary-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; }
  .cfm-summary-card { background:#FAFBFD; border:1px solid #F1F5F9; border-radius:12px; padding:0.8rem 0.9rem; }

  /* Retry */
  .cfm-retry-btn {
    display:inline-flex; align-items:center; gap:5px;
    padding:0.5rem 1.25rem; border-radius:8px;
    background:#7C3AED; color:#fff; border:none; cursor:pointer;
    font-family:"Plus Jakarta Sans",system-ui,sans-serif;
    font-size:0.82rem; font-weight:700; transition:background 0.15s;
  }
  .cfm-retry-btn:hover { background:#6D28D9; }

  /* Responsive */
  @media (max-width:900px) {
    .cfm-metrics-4col { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:768px) {
    .cfm-modal         { border-radius:16px; }
    .cfm-chart-grid    { grid-template-columns:1fr; }
    .cfm-chart-full    { grid-column:1; }
    .cfm-kpi-grid      { grid-template-columns:repeat(2,1fr); }
    .cfm-summary-grid  { grid-template-columns:1fr; }
    .cfm-product-name  { max-width:100%; }
    .cfm-legend-bar    { flex-direction:column; align-items:flex-start; }
  }
  @media (max-width:480px) {
    .cfm-kpi-grid      { grid-template-columns:1fr; }
    .cfm-metrics-4col  { grid-template-columns:1fr; }
    .cfm-header        { padding:1rem; }
    .cfm-chart-grid    { padding:0.5rem 0.75rem; }
    .cfm-section-body  { padding:0.5rem 0.75rem 0.65rem; }
  }
`;