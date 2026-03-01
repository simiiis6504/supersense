'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DailyHealth {
  id: number; date: string; timestamp: number;
  hr_last: number; hr_resting: number; hr_max: number; hr_max_time: number;
  hr_today_array: [number, number][];
  spo2_current: number; body_temp: number; steps: number; calories: number;
  stress_current: number; sleep_score: number; sleep_total_minutes: number;
  sleep_deep_minutes: number; sleep_rem_minutes: number; sleep_light_minutes: number;
  sleep_wake_minutes: number; sleep_start_time: number; sleep_end_time: number;
  pai_total: number; pai_today: number; pai_week: number[];
  deep_sleep_minutes?: number; rem_sleep_minutes?: number;
  shallow_sleep_minutes?: number; wake_minutes?: number;
  hrv?: number;
}

interface Workout {
  id: number; date: string; start_time: any; end_time: any;
  type: any; type_name?: string;
  duration_seconds?: number; duration_minutes?: number;
  calories: number; avg_hr: number; max_hr: number; min_hr?: number;
  distance?: number; distance_meters?: number;
  avg_pace_min_km?: number; max_pace?: number;
  elevation_gain?: number; elevation_loss?: number;
  avg_cadence?: number; avg_stride_length?: number;
  training_effect?: number; anaerobic_te?: number; vo2max?: number;
  steps?: number; avg_altitude?: number;
  detail_heart_rate?: string; detail_gait?: string;
  detail_longitude_latitude?: string;
  raw?: any;
}

function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const handleEnter = () => { if (ref.current) setRect(ref.current.getBoundingClientRect()); setVisible(true); };
  const tooltipWidth = 220;
  const left = rect ? Math.min(Math.max(rect.left + rect.width / 2 - tooltipWidth / 2, 8), window.innerWidth - tooltipWidth - 8) : 0;
  const top = rect ? rect.top - 8 : 0;
  return (
    <div ref={ref} className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && rect && (
        <div className="fixed z-[9999] pointer-events-none" style={{ left, top, transform: 'translateY(-100%)' }}>
          <div className="bg-zinc-900 border border-zinc-700/60 rounded-xl px-3 py-2 text-[10px] text-zinc-300 leading-relaxed shadow-2xl" style={{ width: tooltipWidth }}>{content}</div>
        </div>
      )}
    </div>
  );
}

function InfoBtn({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const handleClick = () => { if (ref.current) setRect(ref.current.getBoundingClientRect()); setOpen(!open); };
  const popWidth = 256;
  const leftPos = rect ? Math.min(Math.max(rect.right - popWidth, 8), window.innerWidth - popWidth - 8) : 0;
  const topPos = rect ? rect.top - 8 : 0;
  return (
    <div className="relative inline-flex">
      <button ref={ref} onClick={handleClick} className="w-3.5 h-3.5 rounded-full border border-zinc-600 text-zinc-600 hover:border-zinc-400 hover:text-zinc-400 transition-colors flex items-center justify-center text-[8px] font-black leading-none">i</button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {rect && (
            <div className="fixed z-50 bg-zinc-900 border border-zinc-700/60 rounded-2xl p-3 shadow-2xl" style={{ width: popWidth, left: leftPos, top: topPos, transform: 'translateY(-100%)' }}>
              <p className="text-[10px] text-zinc-400 leading-relaxed">{text}</p>
              <button onClick={() => setOpen(false)} className="mt-2 text-[8px] text-zinc-600 hover:text-zinc-400 font-bold uppercase tracking-wider">Close</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const GLOSSARY: Record<string, string> = {
  ATL: 'Acute Training Load — your average training stress over the last 7 days. High ATL = high recent fatigue.',
  CTL: 'Chronic Training Load — your average training stress over the last 42 days. Represents your fitness base.',
  TSB: 'Training Stress Balance = ATL − CTL. Positive = fresh/tapered. Negative = fatigued/building. Ideal race TSB: +5 to +25.',
  RHR: 'Resting Heart Rate — measured during sleep. Lower is generally better for aerobic athletes. Elevated RHR often signals fatigue.',
  HRV: 'Heart Rate Variability — variation in time between heartbeats (ms). Higher = better recovery and autonomic nervous system health.',
  PAI: 'Personal Activity Intelligence — weekly score from Zepp. Maintaining 100+ PAI linked to reduced cardiovascular risk.',
  Recovery: 'Composite score from sleep score (35%), deep sleep ratio (30%), REM sleep (15%), stress (10%), and RHR delta (20%). 85+ = green light for hard training.',
  Strain: 'Daily training load from 0–21. Based on workout intensity × duration plus active steps.',
  SpO2: 'Blood oxygen saturation. Normal: 95–100%. Below 94% warrants monitoring.',
  TDEE: 'Total Daily Energy Expenditure — estimated calories burned. BMR + NEAT + Exercise + Thermic Effect of Food.',
  NEAT: 'Non-Exercise Activity Thermogenesis — calories burned through daily movement (steps, fidgeting). Often underrated for body composition.',
};

const getWorkoutName = (w: Workout): string => w.type_name || String(w.type) || 'Activity';
const WORKOUT_ICONS: Record<string, string> = {
  'Outdoor Running': '🏃', 'Treadmill': '🏃', 'Walking': '🚶', 'Outdoor Cycling': '🚴', 'Indoor Cycling': '🚴',
  'Strength Training': '🏋️', 'Stretching': '🧘', 'HIIT': '⚡', 'Outdoor Hiking': '🥾', 'Jump Rope': '🪢',
  'Elliptical': '🔄', 'Open Water Swimming': '🏊', 'Free Training': '💪', 'Yoga': '🧘', 'Disco': '🕺',
  'Dance': '💃', 'Ski': '⛷️', 'Paddleboarding': '🏄', 'Skateboard': '🛹', 'Street Dance': '💃',
  'Core Training': '🔥', 'Stair Stepper': '🪜', 'Floor Climbing Machine': '🧗', 'Group Calisthenics': '🤸',
};

const fmtDuration = (mins: number): string => {
  const h = Math.floor(mins / 60); const m = Math.floor(mins % 60); const s = Math.round((mins % 1) * 60);
  if (h > 0) return `${h}h ${m}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
};
const getWorkoutIcon = (w: Workout) => WORKOUT_ICONS[getWorkoutName(w)] || '⚡';
const fmtPace = (minKm: number | undefined | null): string => {
  if (!minKm || minKm <= 0 || minKm > 30) return '--';
  const m = Math.floor(minKm); const s = Math.round((minKm - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};
const getDurationMinutes = (w: Workout): number => {
  if (w.duration_seconds && w.duration_seconds > 0) return w.duration_seconds / 60;
  if (w.duration_minutes && w.duration_minutes > 0) return w.duration_minutes;
  return 0;
};
const getDistance = (w: Workout): number => w.distance_meters || w.distance || 0;
const calcPace = (w: Workout): number | null => {
  const dist = getDistance(w); const dur = getDurationMinutes(w);
  if (dist > 200 && dur > 0) return dur / (dist / 1000);
  return null;
};
const isRunning = (w: Workout) => ['Outdoor Running', 'Treadmill', 'Race Walking'].includes(getWorkoutName(w));

function predictRaceTimes(workouts: Workout[]) {
  const runs = workouts.filter(w => isRunning(w))
    .map(w => ({ dist: getDistance(w), pace: calcPace(w), hr: w.avg_hr, maxHr: w.max_hr }))
    .filter(r => r.dist > 3000 && r.pace && r.pace > 3 && r.pace < 20);
  if (runs.length < 2) return null;
  const best = runs.reduce((a, b) => {
    const sA = (1 / a.pace!) * Math.pow(a.dist / 1000, 0.15);
    const sB = (1 / b.pace!) * Math.pow(b.dist / 1000, 0.15);
    return sA > sB ? a : b;
  });
  const bp = best.pace!; const bd = best.dist;
  const riegel = (d: number) => bp * (bd / 1000) * Math.pow(d / (bd / 1000), 1.06);
  const fmtT = (m: number) => { const h = Math.floor(m/60); const mn = Math.floor(m%60); const s = Math.round((m%1)*60); return h>0?`${h}h ${mn}m`:`${mn}:${String(s).padStart(2,'0')}`; };
  const fmtP = (m: number, d: number) => fmtPace(m / d);
  const fK=riegel(5),tK=riegel(10),hf=riegel(21.0975),fl=riegel(42.195);
  const vo2 = workouts.find(w => w.vo2max && w.vo2max > 20)?.vo2max;
  return {
    bestPace: bp, bestDist: bd,
    fiveK:{time:fmtT(fK),pace:fmtP(fK,5)}, tenK:{time:fmtT(tK),pace:fmtP(tK,10)},
    half:{time:fmtT(hf),pace:fmtP(hf,21.0975)}, full:{time:fmtT(fl),pace:fmtP(fl,42.195)},
    vo2max:vo2, confidence: runs.length>=5?'high':runs.length>=3?'medium':'low', basedOn:`${runs.length} runs`,
  };
}

function computeMetrics(data: DailyHealth[], workouts: Workout[]) {
  if (!data.length) return null;
  const sorted = [...data].sort((a,b)=>a.date.localeCompare(b.date));
  const latest = sorted[sorted.length-1];
  const last7 = sorted.slice(-7); const last30 = sorted.slice(-30);
  const deepSleep = latest.sleep_deep_minutes||latest.deep_sleep_minutes||0;
  const remSleep = latest.sleep_rem_minutes||latest.rem_sleep_minutes||0;
  const lightSleep = latest.sleep_light_minutes||latest.shallow_sleep_minutes||0;
  const wakeSleep = latest.sleep_wake_minutes||latest.wake_minutes||0;
  const totalSleep = latest.sleep_total_minutes||(deepSleep+remSleep+lightSleep)||0;
  const rhrHistory = sorted.slice(-90).map(d=>d.hr_resting).filter(v=>v>30&&v<100).sort((a,b)=>a-b);
  const rhrBaseline = rhrHistory.length>=5?rhrHistory[Math.floor(rhrHistory.length*0.10)]:57;
  const rhrDelta = (latest.hr_resting||rhrBaseline)-rhrBaseline;
  const sleepTotal = latest.sleep_total_minutes||1;
  const deepRatio=(latest.sleep_deep_minutes||latest.deep_sleep_minutes||0)/sleepTotal;
  const remRatio=(latest.sleep_rem_minutes||latest.rem_sleep_minutes||0)/sleepTotal;
  const wakeRatio=(latest.sleep_wake_minutes||latest.wake_minutes||0)/sleepTotal;
  const sleepFactor=((latest.sleep_score||80)/100)*35;
  const deepBonus=Math.min(30,(deepRatio/0.20)*30);
  const remBonus=Math.min(15,(remRatio/0.22)*15);
  const stressFactor=(1-((latest.stress_current||30)/100))*10;
  const rhrFactor=Math.max(0,20-rhrDelta*3);
  const wakePenalty=Math.min(10,wakeRatio*100);
  const recoveryScore=Math.min(100,Math.max(0,Math.round(sleepFactor+deepBonus+remBonus+stressFactor+rhrFactor-wakePenalty)));
  const strainFromSteps=Math.min(6,(latest.steps||0)/3000);
  const todayWorkouts=workouts.filter(w=>{const wDate=typeof w.start_time==='string'?w.start_time.slice(0,10):w.date;return wDate===latest.date;});
  const strainFromWorkouts=todayWorkouts.reduce((s,w)=>{const mins=getDurationMinutes(w);const hrF=w.avg_hr>0?(w.avg_hr-60)/100:0.5;return s+(mins/20)*(1+hrF);},0);
  const strainScore=parseFloat(Math.min(21,strainFromSteps+strainFromWorkouts*3).toFixed(1));
  const estHRV=(latest as any).hrv||0;
  const now=new Date();
  const d7=new Date(now);d7.setDate(d7.getDate()-7);
  const d42=new Date(now);d42.setDate(d42.getDate()-42);
  const last7WorkoutCal=workouts.filter(w=>new Date(w.date)>=d7).reduce((s,w)=>s+(w.calories||0),0);
  const last42WorkoutCal=workouts.filter(w=>new Date(w.date)>=d42).reduce((s,w)=>s+(w.calories||0),0);
  const atl=Math.round(last7WorkoutCal/7); const ctl=Math.round(last42WorkoutCal/42); const tsb=atl-ctl;
  const BMR=1216;
  const neat=Math.round((latest.steps||0)*0.024);
  const exerciseBurn=todayWorkouts.reduce((s,w)=>s+(w.calories||0),0)||(latest.calories||0);
  const tdee=BMR+neat+exerciseBurn+Math.round(BMR*0.1);
  const validRHR=last7.filter(d=>(d.hr_resting||0)>0);
  const avgRHR7=validRHR.length?Math.round(validRHR.reduce((s,d)=>s+d.hr_resting,0)/validRHR.length):0;
  const avgSteps7=Math.round(last7.reduce((s,d)=>s+(d.steps||0),0)/last7.length);
  const avgSleep7=parseFloat((last7.reduce((s,d)=>{const ds=d.sleep_total_minutes||((d.sleep_deep_minutes||d.deep_sleep_minutes||0)+(d.sleep_rem_minutes||d.rem_sleep_minutes||0)+(d.sleep_light_minutes||d.shallow_sleep_minutes||0));return s+ds;},0)/last7.length/60).toFixed(1));
  const chartData=last30.map((d,i)=>{
    const dD=d.sleep_deep_minutes||d.deep_sleep_minutes||0;
    const dR=d.sleep_rem_minutes||d.rem_sleep_minutes||0;
    const dL=d.sleep_light_minutes||d.shallow_sleep_minutes||0;
    const dT=d.sleep_total_minutes||(dD+dR+dL)||0;
    return{date:i%5===0?d.date.slice(5):'',fullDate:d.date,RHR:d.hr_resting||0,Steps:d.steps||0,Score:d.sleep_score||0,Stress:d.stress_current||0,Calories:d.calories||0,Deep:dD,HRV:(d as any).hrv||0};
  });
  const racePredictions=predictRaceTimes(workouts);
  const insights:string[]=[];
  if(recoveryScore>=85)insights.push(`Full recovery at ${recoveryScore}/100 — systems primed for high output today.`);
  else if(recoveryScore>=65)insights.push(`Moderate recovery (${recoveryScore}/100). Aerobic work optimal; avoid maximal efforts.`);
  else insights.push(`Recovery at ${recoveryScore}/100 — accumulated fatigue detected. Prioritize sleep over training.`);
  if(rhrDelta>5)insights.push(`RHR elevated +${rhrDelta}bpm above baseline — fatigue or stress signal.`);
  if(deepSleep>100)insights.push(`Excellent deep sleep (${deepSleep}min) — full muscular repair activated.`);
  else if(deepSleep<60&&deepSleep>0)insights.push(`Deep sleep deficit at ${deepSleep}min. Limit caffeine after 14:00.`);
  if(tsb<-20)insights.push(`High training fatigue (TSB: ${tsb}). Deload week recommended.`);
  else if(tsb>15)insights.push(`Fresh & tapered (TSB: +${tsb}). Peak performance window open.`);
  return{latest,sorted,last7,last30,chartData,recoveryScore,strainScore,estHRV,atl,ctl,tsb,tdee,neat,exerciseBurn,BMR,deepSleep,remSleep,lightSleep,wakeSleep,totalSleep,avgRHR7,avgSteps7,avgSleep7,rhrDelta,rhrBaseline,todayWorkouts,insight:insights.slice(0,2).join(' '),racePredictions};
}

function InteractiveBarChart({data,dataKey,color,height=64,unit=''}:{data:any[];dataKey:string;color:string;height?:number;unit?:string;}) {
  const [hovered,setHovered]=useState<{i:number;rect:DOMRect}|null>(null);
  const vals=data.map(d=>Number(d[dataKey])||0);
  const max=Math.max(...vals,1);
  const tw=90;
  const tl=hovered?Math.min(Math.max(hovered.rect.left+hovered.rect.width/2-tw/2,8),window.innerWidth-tw-8):0;
  const tt=hovered?hovered.rect.top-8:0;
  const dv=hovered!==null?vals[hovered.i]:null;
  return(
    <div className="relative">
      <div className="flex items-end gap-px w-full" style={{height}}>
        {vals.map((v,i)=>(
          <div key={i} className="relative flex-1 flex flex-col items-center justify-end"
            onMouseEnter={e=>setHovered({i,rect:(e.currentTarget as HTMLElement).getBoundingClientRect()})}
            onMouseLeave={()=>setHovered(null)}>
            <div className="w-full rounded-t-[2px] transition-all duration-200" style={{height:`${Math.max(2,(v/max)*height)}px`,backgroundColor:color,opacity:hovered===null?(0.4+0.6*(v/max)):hovered.i===i?1:0.2,transform:hovered?.i===i?'scaleY(1.03)':'scaleY(1)',transformOrigin:'bottom'}}/>
          </div>
        ))}
      </div>
      {hovered!==null&&dv!==null&&dv>0&&(
        <div className="fixed z-[9999] pointer-events-none text-center" style={{left:tl,top:tt,transform:'translateY(-100%)',width:tw}}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 shadow-xl inline-block">
            <div className="text-[8px] text-zinc-500 font-bold">{data[hovered.i].fullDate?.slice(5)||data[hovered.i].date}</div>
            <div className="text-[11px] font-black" style={{color}}>{dataKey==='Steps'?`${(dv/1000).toFixed(1)}k`:dv}{dataKey!=='Steps'?unit:''}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function InteractiveSparkLine({data,dataKey,color,height=56,fill=false,unit=''}:{data:any[];dataKey:string;color:string;height?:number;fill?:boolean;unit?:string;}) {
  const [hovered,setHovered]=useState<{i:number;rect:DOMRect}|null>(null);
  const vals=data.map(d=>Number(d[dataKey])||0);
  const min=Math.min(...vals.filter(v=>v>0));
  const max=Math.max(...vals,1);
  const range=max-min||1;
  const W=200;const H=height;const pad=4;
  const pts=vals.map((v,i)=>`${(i/Math.max(vals.length-1,1))*W},${v>0?H-pad-((v-min)/range)*(H-pad*2):H-pad}`).join(' ');
  const gX=(i:number)=>(i/Math.max(vals.length-1,1))*W;
  const gY=(v:number)=>v>0?H-pad-((v-min)/range)*(H-pad*2):H-pad;
  const tw=80;
  const tl=hovered?Math.min(Math.max(hovered.rect.left+hovered.rect.width/2-tw/2,8),window.innerWidth-tw-8):0;
  const tt=hovered?hovered.rect.top-8:0;
  return(
    <div className="relative w-full" style={{height}}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full absolute inset-0" style={{height}}>
        {fill&&<polygon points={`0,${H} ${pts} ${W},${H}`} fill={color} fillOpacity="0.12"/>}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        {hovered!==null&&vals[hovered.i]>0&&(
          <>
            <line x1={gX(hovered.i)} y1={0} x2={gX(hovered.i)} y2={H} stroke={color} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.4"/>
            <circle cx={gX(hovered.i)} cy={gY(vals[hovered.i])} r="3" fill={color}/>
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex">
        {vals.map((_,i)=>(
          <div key={i} className="flex-1 h-full"
            onMouseEnter={e=>setHovered({i,rect:(e.currentTarget as HTMLElement).getBoundingClientRect()})}
            onMouseLeave={()=>setHovered(null)}/>
        ))}
      </div>
      {hovered!==null&&vals[hovered.i]>0&&(
        <div className="fixed z-[9999] pointer-events-none text-center" style={{left:tl,top:tt,transform:'translateY(-100%)',width:tw}}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 shadow-xl inline-block">
            <div className="text-[8px] text-zinc-500 font-bold">{data[hovered.i].fullDate?.slice(5)||''}</div>
            <div className="text-[11px] font-black" style={{color}}>{vals[hovered.i]}{unit}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Ring({pct,color,size=96,strokeW=8}:{pct:number;color:string;size?:number;strokeW?:number}) {
  const r=(size-strokeW)/2;const c=2*Math.PI*r;const offset=c*(1-Math.min(Math.max(pct,0),1));
  return(
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{transition:'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)'}}/>
    </svg>
  );
}

function HRHeatmap({data}:{data:[number,number][]}) {
  const [hovered,setHovered]=useState<number|null>(null);
  if(!data?.length)return<div className="text-xs text-zinc-700">No HR data today</div>;
  const vals=data.map(d=>d[1]).filter(v=>v>0);
  const min=Math.min(...vals);const max=Math.max(...vals);const range=max-min||1;
  return(
    <div className="relative">
      {hovered!==null&&data[hovered]?.[1]>0&&(
        <div className="absolute -top-8 left-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-[10px] font-black z-10 pointer-events-none" style={{color:data[hovered][1]>150?'#f43f5e':data[hovered][1]>120?'#fb923c':data[hovered][1]>100?'#fbbf24':'#34d399'}}>
          {Math.floor(hovered/60)}:{String(hovered%60).padStart(2,'0')} · {data[hovered][1]} bpm
        </div>
      )}
      <div className="flex flex-wrap gap-[2px]">
        {data.map(([,hr],i)=>{
          if(!hr||hr<=0)return<div key={i} style={{width:6,height:12,borderRadius:1,backgroundColor:'rgba(255,255,255,0.03)'}}/>;
          const pct=(hr-min)/range;
          const color=hr>150?`rgba(239,68,68,${0.4+pct*0.6})`:hr>120?`rgba(251,146,60,${0.35+pct*0.6})`:hr>100?`rgba(250,204,21,${0.3+pct*0.6})`:`rgba(52,211,153,${0.2+pct*0.5})`;
          return<div key={i} onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)} style={{width:6,height:12,borderRadius:1,backgroundColor:color,transform:hovered===i?'scaleY(1.5)':'scaleY(1)',transition:'transform 0.1s',cursor:'crosshair'}}/>;
        })}
      </div>
    </div>
  );
}

function SleepBar({deep,rem,light,wake}:{deep:number;rem:number;light:number;wake:number}) {
  const [hovered,setHovered]=useState<string|null>(null);
  const total=deep+rem+light+wake;
  if(!total)return<div className="h-3 rounded-full bg-zinc-800"/>;
  const segs=[
    {v:deep,color:'#818cf8',label:'Deep',desc:`${deep}min (${Math.round(deep/total*100)}%)`},
    {v:rem,color:'#c084fc',label:'REM',desc:`${rem}min (${Math.round(rem/total*100)}%)`},
    {v:light,color:'#334155',label:'Light',desc:`${light}min (${Math.round(light/total*100)}%)`},
    {v:wake,color:'#7f1d1d',label:'Awake',desc:`${wake}min (${Math.round(wake/total*100)}%)`},
  ].filter(s=>s.v>0);
  return(
    <div className="relative">
      {hovered&&<div className="absolute -top-8 left-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-[10px] font-black z-10 pointer-events-none text-zinc-200">{segs.find(s=>s.label===hovered)?.desc}</div>}
      <div className="flex h-4 rounded-full overflow-hidden gap-[1px]">
        {segs.map((s,i)=>(
          <div key={i} style={{flex:s.v,backgroundColor:s.color,cursor:'pointer',opacity:hovered&&hovered!==s.label?0.4:1,transition:'opacity 0.15s'}} onMouseEnter={()=>setHovered(s.label)} onMouseLeave={()=>setHovered(null)}/>
        ))}
      </div>
    </div>
  );
}

function MetricCard({label,value,unit,color,sub,icon,onClick,tooltip}:{label:string;value:any;unit?:string;color?:string;sub?:string;icon?:string;onClick?:()=>void;tooltip?:string;}) {
  return(
    <div onClick={onClick} className={`bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-4 flex flex-col gap-2 hover:border-zinc-700/60 transition-all ${onClick?'cursor-pointer hover:bg-zinc-900/80':''}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-zinc-500">{label}</span>
          {tooltip&&<InfoBtn text={tooltip}/>}
        </div>
        {icon&&<span className="text-base opacity-40">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1 mt-auto">
        <span className="text-[1.6rem] font-black leading-none tracking-tight" style={{color:color||'#f1f5f9'}}>{value??'--'}</span>
        {unit&&<span className="text-xs text-zinc-500 font-medium">{unit}</span>}
      </div>
      {sub&&<span className="text-[9px] text-zinc-600 font-medium">{sub}</span>}
    </div>
  );
}

function ScoreRing({value,max,color,label,sub,size=110,glossaryKey}:{value:number;max:number;color:string;label:string;sub?:string;size?:number;glossaryKey?:string;}) {
  return(
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{width:size,height:size}}>
        <div className="absolute inset-0"><Ring pct={value/max} color={color} size={size} strokeW={size*0.08}/></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-black text-zinc-100 leading-none" style={{fontSize:size*0.26}}>{isNaN(value)?'--':value}</span>
          {max!==100&&<span className="text-zinc-600 text-[9px] font-bold">/{max}</span>}
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">{label}</div>
          {glossaryKey&&GLOSSARY[glossaryKey]&&<InfoBtn text={GLOSSARY[glossaryKey]}/>}
        </div>
        {sub&&<div className="text-[9px] text-zinc-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function Tag({children,color='#10b981'}:{children:React.ReactNode;color?:string}) {
  return<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border" style={{color,borderColor:`${color}30`,backgroundColor:`${color}10`}}>{children}</span>;
}

function WorkoutRow({w,onClick}:{w:Workout;onClick:()=>void}) {
  const dur=getDurationMinutes(w);const dist=getDistance(w);const pace=calcPace(w);
  const date=typeof w.start_time==='string'?w.start_time.slice(0,10):w.date;
  const timeStr=typeof w.start_time==='string'?new Date(w.start_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
  return(
    <button onClick={onClick} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-800/40 transition-all text-left group">
      <span className="text-xl w-8 shrink-0 text-center">{getWorkoutIcon(w)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-zinc-100 uppercase tracking-tight truncate">{getWorkoutName(w)}</p>
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{date} {timeStr}</p>
      </div>
      <div className="flex gap-5 items-center shrink-0">
        <div className="text-right"><p className="text-sm font-black text-zinc-200">{fmtDuration(dur)}</p></div>
        {w.calories>0&&<div className="text-right hidden sm:block"><p className="text-sm font-black text-amber-400">{w.calories}<span className="text-[9px] text-zinc-600 ml-0.5">cal</span></p></div>}
        {w.avg_hr>0&&<div className="text-right hidden md:block"><p className="text-sm font-black text-rose-400">{w.avg_hr}<span className="text-[9px] text-zinc-600 ml-0.5">bpm</span></p></div>}
        {dist>0&&<div className="text-right hidden lg:block"><p className="text-sm font-black text-emerald-400">{(dist/1000).toFixed(1)}<span className="text-[9px] text-zinc-600 ml-0.5">km</span></p></div>}
        {pace&&isRunning(w)&&<div className="text-right hidden xl:block"><p className="text-sm font-black text-sky-400">{fmtPace(pace)}<span className="text-[9px] text-zinc-600 ml-0.5">/km</span></p></div>}
        <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
      </div>
    </button>
  );
}

// Robust HR parser — handles "ts,hr", "ts,ts,hr", comma-only, and semicolon-separated formats
function parseHRPoints(raw: string): number[] {
  if (!raw) return [];
  // Split by semicolons if present (Zepp format: "ts,hr;ts,hr;...")
  const segs = raw.includes(';') ? raw.split(';') : [raw];
  const out: number[] = [];
  for (const seg of segs) {
    const parts = seg.trim().split(',');
    // Walk backwards to find first value in 40-220 range (valid HR)
    let found = false;
    for (let i = parts.length - 1; i >= 0; i--) {
      const v = parseInt(parts[i], 10);
      if (v >= 40 && v <= 220) { out.push(v); found = true; break; }
    }
    // If semicolons not present, raw might be pure comma list of HR values
    if (!found && segs.length === 1 && parts.length > 10) {
      // Try treating every value as a potential HR
      for (const p of parts) {
        const v = parseInt(p, 10);
        if (v >= 40 && v <= 220) out.push(v);
      }
      break;
    }
  }
  return out;
}

function HRLineChart({ points, maxHR }: { points: number[]; maxHR: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!points.length) return null;
  const W=600;const H=110;const pL=28;const pR=8;const pT=6;const pB=20;
  const cW=W-pL-pR;const cH=H-pT-pB;
  const minV=Math.max(30,Math.min(...points)-8);
  const maxV=Math.min(220,Math.max(...points)+8);
  const range=maxV-minV||1;
  const MAX_HR=maxHR||199;
  const gX=(i:number)=>pL+(i/Math.max(points.length-1,1))*cW;
  const gY=(v:number)=>pT+(1-(v-minV)/range)*cH;
  const getColor=(hr:number)=>{
    const p=hr/MAX_HR;
    if(p>=0.90)return'#f43f5e';if(p>=0.80)return'#fb923c';
    if(p>=0.70)return'#fbbf24';if(p>=0.60)return'#60a5fa';return'#34d399';
  };
  const dur=Math.round(points.length/12); // ~5s per point
  return(
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:130}}>
        {/* Zone bands */}
        {[[0.60,'#34d399'],[0.70,'#60a5fa'],[0.80,'#fbbf24'],[0.90,'#fb923c'],[1.0,'#f43f5e']].map(([p,c],i,arr)=>{
          const lo=(i===0?0:Number(arr[i-1][0]))*MAX_HR;
          const hi=Number(p)*MAX_HR;
          const y1=gY(Math.min(hi,maxV));const y2=gY(Math.max(lo,minV));
          if(y2<=y1)return null;
          return<rect key={i} x={pL} y={y1} width={cW} height={y2-y1} fill={c as string} fillOpacity="0.05"/>;
        })}
        {/* BPM grid lines */}
        {[0.60,0.70,0.80,0.90].map((p,i)=>{
          const bpm=p*MAX_HR;if(bpm<minV||bpm>maxV)return null;
          const y=gY(bpm);const colors=['#34d399','#60a5fa','#fbbf24','#fb923c'];
          return<g key={i}><line x1={pL} y1={y} x2={W-pR} y2={y} stroke={colors[i]} strokeWidth="0.4" strokeDasharray="3,3" opacity="0.35"/><text x={pL-2} y={y+3} textAnchor="end" fill={colors[i]} fontSize="7" opacity="0.7">{Math.round(bpm)}</text></g>;
        })}
        {/* Min/max labels */}
        <text x={pL-2} y={gY(maxV)+3} textAnchor="end" fill="#52525b" fontSize="7">{Math.round(maxV)}</text>
        <text x={pL-2} y={gY(minV)-1} textAnchor="end" fill="#52525b" fontSize="7">{Math.round(minV)}</text>
        {/* Fill */}
        <polygon points={`${pL},${pT+cH} ${points.map((v,i)=>`${gX(i)},${gY(v)}`).join(' ')} ${gX(points.length-1)},${pT+cH}`} fill="#34d399" fillOpacity="0.06"/>
        {/* Colored line */}
        {points.slice(1).map((v,i)=><line key={i} x1={gX(i)} y1={gY(points[i])} x2={gX(i+1)} y2={gY(v)} stroke={getColor((points[i]+v)/2)} strokeWidth="1.6" strokeLinecap="round"/>)}
        {/* Hover */}
        {hovered!==null&&(<>
          <line x1={gX(hovered)} y1={pT} x2={gX(hovered)} y2={pT+cH} stroke="white" strokeWidth="0.4" opacity="0.15"/>
          <circle cx={gX(hovered)} cy={gY(points[hovered])} r="3" fill={getColor(points[hovered])} stroke="#0d0d0f" strokeWidth="1"/>
          <rect x={Math.min(Math.max(gX(hovered)-22,pL),W-52)} y={Math.max(gY(points[hovered])-20,2)} width={44} height={15} rx="3" fill="#09090b" opacity="0.9"/>
          <text x={Math.min(Math.max(gX(hovered),pL+22),W-30)} y={Math.max(gY(points[hovered])-9,13)} textAnchor="middle" fill={getColor(points[hovered])} fontSize="9" fontWeight="900">{points[hovered]} bpm</text>
        </>)}
        {/* Invisible hover zones */}
        {points.map((_,i)=><rect key={i} x={gX(i)-cW/points.length/2} y={pT} width={Math.max(2,cW/points.length)} height={cH} fill="transparent" onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)} style={{cursor:'crosshair'}}/>)}
        {/* X time labels */}
        {[0,0.25,0.5,0.75,1].map((pct,i)=>{
          const idx=Math.floor(pct*(points.length-1));
          return<text key={i} x={gX(idx)} y={H-4} textAnchor="middle" fill="#3f3f46" fontSize="7">{Math.round(pct*dur)}m</text>;
        })}
      </svg>
      <div className="flex gap-3 mt-1 flex-wrap">
        {[{l:'Z1 Recovery',c:'#34d399',p:0.60},{l:'Z2 Aerobic',c:'#60a5fa',p:0.70},{l:'Z3 Tempo',c:'#fbbf24',p:0.80},{l:'Z4 Threshold',c:'#fb923c',p:0.90},{l:'Z5 Anaerobic',c:'#f43f5e',p:1.0}].map((z,i)=>(
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{backgroundColor:z.c}}/>
            <span className="text-[8px] text-zinc-600 font-bold">{z.l} ·{i===0?'<':i===4?'>':''}{Math.round((i===0?z.p:[[0.60,0.70],[0.70,0.80],[0.80,0.90],[0.90,1.0]][i-1]?.[0]??z.p)*MAX_HR)}bpm</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkoutModal({w,onClose}:{w:Workout;onClose:()=>void}) {
  const dur=getDurationMinutes(w);const dist=getDistance(w);const pace=calcPace(w);

  const hrPoints=useMemo(()=>parseHRPoints(w.detail_heart_rate||''),[w.detail_heart_rate]);

  const hrZones=useMemo(()=>{
    if(!hrPoints.length)return null;
    const zones=[0,0,0,0,0];const MAX_HR=199;
    hrPoints.forEach(hr=>{const pct=hr/MAX_HR;if(pct<0.60)zones[0]++;else if(pct<0.70)zones[1]++;else if(pct<0.80)zones[2]++;else if(pct<0.90)zones[3]++;else zones[4]++;});
    const total=hrPoints.length;return zones.map(z=>Math.round(z/total*100));
  },[hrPoints]);
  return(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full md:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d0d0f] border border-zinc-800/60 rounded-t-3xl md:rounded-3xl">
        <div className="sticky top-0 bg-[#0d0d0f]/95 backdrop-blur border-b border-zinc-800/40 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getWorkoutIcon(w)}</span>
            <div>
              <h2 className="font-black text-zinc-100 uppercase tracking-tight">{getWorkoutName(w)}</h2>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{typeof w.start_time==='string'?new Date(w.start_time).toLocaleString([],{dateStyle:'medium',timeStyle:'short'}):w.date}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 transition-colors">✕</button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {[
              {label:'Duration',value:fmtDuration(dur),color:'#f1f5f9'},
              {label:'Calories',value:w.calories>0?`${w.calories}`:'--',unit:'kcal',color:'#fbbf24'},
              {label:'Avg HR',value:w.avg_hr>0?`${w.avg_hr}`:'--',unit:'bpm',color:'#f87171'},
              {label:'Max HR',value:w.max_hr>0?`${w.max_hr}`:'--',unit:'bpm',color:'#fb923c'},
              ...(dist>0?[{label:'Distance',value:`${(dist/1000).toFixed(2)}`,unit:'km',color:'#34d399'}]:[]),
              ...(pace?[{label:'Avg Pace',value:fmtPace(pace),unit:'/km',color:'#38bdf8'}]:[]),
              ...(w.elevation_gain?[{label:'Elevation',value:`+${Math.round(w.elevation_gain)}`,unit:'m',color:'#a78bfa'}]:[]),
              ...(w.avg_cadence?[{label:'Cadence',value:`${w.avg_cadence}`,unit:'spm',color:'#e879f9'}]:[]),
              ...(w.vo2max?[{label:'VO₂ Max',value:`${w.vo2max}`,unit:'ml/kg/min',color:'#10b981'}]:[]),
              ...(w.training_effect?[{label:'Training Effect',value:`${w.training_effect}`,color:'#6366f1'}]:[]),
              ...(w.steps?[{label:'Steps',value:w.steps.toLocaleString(),color:'#94a3b8'}]:[]),
              ...(w.min_hr?[{label:'Min HR',value:`${w.min_hr}`,unit:'bpm',color:'#94a3b8'}]:[]),
            ].map((s,i)=>(
              <div key={i} className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/40">
                <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{s.label}</div>
                <div className="font-black text-lg leading-none" style={{color:s.color}}>{s.value}<span className="text-[10px] text-zinc-500 ml-0.5">{(s as any).unit}</span></div>
              </div>
            ))}
          </div>
          {hrZones&&(
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">HR Zone Distribution</h3>
                <span className="text-[9px] text-zinc-600 font-bold">Max HR 199 bpm · age 21</span>
              </div>
              <div className="space-y-2">
                {[
                  {label:'Z1 Recovery',color:'#34d399',range:'<119'},
                  {label:'Z2 Aerobic',color:'#60a5fa',range:'119–139'},
                  {label:'Z3 Tempo',color:'#fbbf24',range:'139–159'},
                  {label:'Z4 Threshold',color:'#fb923c',range:'159–179'},
                  {label:'Z5 Anaerobic',color:'#f43f5e',range:'179+'}
                ].map((z,i)=>(
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-24 shrink-0">
                      <div className="text-[9px] font-black uppercase text-zinc-400">{z.label}</div>
                      <div className="text-[8px] text-zinc-600">{z.range} bpm</div>
                    </div>
                    <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{width:`${hrZones[i]}%`,backgroundColor:z.color}}/></div>
                    <span className="text-[11px] font-black w-10 text-right" style={{color:hrZones[i]>0?z.color:'#3f3f46'}}>{hrZones[i]}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {hrPoints.length>0&&(
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Heart Rate Timeline</h3>
                <span className="text-[9px] text-zinc-600 font-bold">{hrPoints.length} data points · hover to inspect</span>
              </div>
              <HRLineChart points={hrPoints} maxHR={199}/>
            </div>
          )}
          {isRunning(w)&&pace&&(
            <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">Running Analysis</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-[9px] text-zinc-500 uppercase font-bold">Avg Pace</span><p className="font-black text-sky-400 text-xl">{fmtPace(pace)} <span className="text-xs text-zinc-500">/km</span></p></div>
                <div><span className="text-[9px] text-zinc-500 uppercase font-bold">Aerobic Efficiency</span><p className="font-black text-emerald-400 text-xl">{w.avg_hr>0&&dist>0?((dist/1000)/(w.avg_hr/100)).toFixed(2):'--'}</p></div>
                {w.avg_cadence&&<div><span className="text-[9px] text-zinc-500 uppercase font-bold">Cadence</span><p className="font-black text-violet-400 text-xl">{w.avg_cadence} <span className="text-xs text-zinc-500">spm</span></p></div>}
                {w.avg_stride_length&&<div><span className="text-[9px] text-zinc-500 uppercase font-bold">Stride Length</span><p className="font-black text-pink-400 text-xl">{(w.avg_stride_length/100).toFixed(2)} <span className="text-xs text-zinc-500">m</span></p></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type TabId='overview'|'training'|'sleep'|'metabolic'|'history';

export default function SuperSenseDashboard() {
  const [tab,setTab]=useState<TabId>('overview');
  const [dailyData,setDailyData]=useState<DailyHealth[]>([]);
  const [workouts,setWorkouts]=useState<Workout[]>([]);
  const [loading,setLoading]=useState(true);
  const [syncTime,setSyncTime]=useState('');
  const [aiLoading,setAiLoading]=useState(false);
  const [aiMessage,setAiMessage]=useState('');
  const [selectedWorkout,setSelectedWorkout]=useState<Workout|null>(null);
  const [aiQuery,setAiQuery]=useState('');
  const [aiQueryAnswer,setAiQueryAnswer]=useState('');
  const [aiQueryLoading,setAiQueryLoading]=useState(false);

  const loadData=useCallback(async()=>{
    const [{data:liveHealth},{data:histActivity},{data:histSleep},{data:detailedWorkouts}]=await Promise.all([
      supabase.from('daily_health').select('*').order('date',{ascending:true}).limit(365),
      supabase.from('daily_activity').select('date, steps, calories, distance, active_minutes').order('date',{ascending:true}).limit(365),
      supabase.from('daily_sleep').select('*').order('date',{ascending:true}).limit(365),
      supabase.from('detailed_workouts').select('*').order('start_time',{ascending:false}).limit(500),
    ]);
    const map=new Map<string,DailyHealth>();
    const mergeInto=(items:any[],overwrite=false)=>{
      items?.forEach(item=>{
        if(!item.date)return;
        const existing=map.get(item.date)||{} as any;
        const merged:any={...existing};
        Object.entries(item).forEach(([k,v])=>{if(v!==null&&v!==undefined&&v!==0&&v!==''){if(overwrite||!merged[k])merged[k]=v;}});
        map.set(item.date,merged);
      });
    };
    const normalizedSleep=(histSleep||[]).map((s:any)=>({...s,sleep_deep_minutes:s.sleep_deep_minutes||s.deep_sleep_minutes||0,sleep_rem_minutes:s.sleep_rem_minutes||s.rem_sleep_minutes||0,sleep_light_minutes:s.sleep_light_minutes||s.shallow_sleep_minutes||0,sleep_wake_minutes:s.sleep_wake_minutes||s.wake_minutes||0,sleep_total_minutes:s.sleep_total_minutes||s.total_sleep_minutes||((s.deep_sleep_minutes||0)+(s.rem_sleep_minutes||0)+(s.shallow_sleep_minutes||0))}));
    mergeInto(normalizedSleep);mergeInto(histActivity||[]);mergeInto(liveHealth||[],true);
    setDailyData(Array.from(map.values()).sort((a,b)=>a.date.localeCompare(b.date)));
    setWorkouts(detailedWorkouts||[]);
    setSyncTime(new Date().toLocaleTimeString());
    setLoading(false);
  },[]);

  useEffect(()=>{loadData();const t=setInterval(loadData,5*60*1000);return()=>clearInterval(t);},[loadData]);

  const buildContext=(m:NonNullable<ReturnType<typeof computeMetrics>>)=>{
    const rp=m.racePredictions;
    return `Recovery ${m.recoveryScore}/100 | RHR ${m.latest.hr_resting}bpm (baseline ${m.rhrBaseline}, delta ${m.rhrDelta>0?'+':''}${m.rhrDelta}) | HRV ${m.estHRV}ms | Sleep ${m.latest.sleep_score}/100 (${(m.totalSleep/60).toFixed(1)}h, deep ${m.deepSleep}min, REM ${m.remSleep}min) | Stress ${m.latest.stress_current}/100 | Steps ${(m.latest.steps||0).toLocaleString()} | Strain ${m.strainScore}/21 | TSB ${m.tsb} (ATL ${m.atl} / CTL ${m.ctl})${rp?` | Best 5K ${rp.fiveK.time}`:''}`;
  };

  const runAI=async(m:NonNullable<ReturnType<typeof computeMetrics>>)=>{
    setAiLoading(true);
    try{
      const rp=m.racePredictions;
      const d7=new Date();d7.setDate(d7.getDate()-7);
      const recentWorkouts=workouts.filter(w=>new Date(w.date||String(w.start_time))>=d7).map(w=>{
        const dur=w.duration_minutes||Math.round((w.duration_seconds||0)/60);
        const dist=w.distance_meters||w.distance||0;
        const pace=dur&&dist>200?(dur/(dist/1000)).toFixed(2):null;
        return`${(w.date||'').slice(5)} ${w.type_name||w.type}: ${dur}min cal=${w.calories||0} hr=${w.avg_hr||'--'}/${w.max_hr||'--'}${dist>0?' '+((dist/1000).toFixed(1))+'km':''}${pace?' '+pace+'/km':''}`;
      }).join('\n');
      const sleepTrend=m.last30.slice(-14).map(d=>{
        const deep=d.sleep_deep_minutes||d.deep_sleep_minutes||0;const rem=d.sleep_rem_minutes||d.rem_sleep_minutes||0;
        const total=d.sleep_total_minutes||(deep+rem+(d.sleep_light_minutes||d.shallow_sleep_minutes||0));
        return`${(d.date||'').slice(5)}: ${(total/60).toFixed(1)}h score=${d.sleep_score||0} deep=${deep}m rem=${rem}m`;
      }).join('\n');
      const rhrTrend=m.last30.slice(-14).filter(d=>d.hr_resting>0).map(d=>`${(d.date||'').slice(5)}:${d.hr_resting}`).join(', ');
      const d30=new Date();d30.setDate(d30.getDate()-30);
      const prompt=[
        "You are an elite sports scientist and performance coach. Give deep, specific, data-driven insights. Reference actual numbers. Be direct like a coach who knows this athlete well.\n",
        `TODAY: Recovery ${m.recoveryScore}/100 | RHR ${m.latest.hr_resting}bpm (baseline ~${m.rhrBaseline}, delta ${m.rhrDelta>0?'+':''}${m.rhrDelta}) | HRV ${m.estHRV}ms`,
        `Sleep: ${m.latest.sleep_score}/100 | ${(m.totalSleep/60).toFixed(1)}h | Deep ${m.deepSleep}min | REM ${m.remSleep}min | Stress ${m.latest.stress_current}/100`,
        `Steps: ${(m.latest.steps||0).toLocaleString()} | Strain ${m.strainScore}/21 | TSB ${m.tsb} (ATL ${m.atl} / CTL ${m.ctl})\n`,
        "14-DAY SLEEP:",sleepTrend,"\n14-DAY RHR:",rhrTrend,
        `\nLAST 7 DAYS WORKOUTS:\n${recentWorkouts||'None'}`,
        `\nLAST 30 DAYS: ${workouts.filter(w=>new Date(w.date||String(w.start_time))>=d30).length} total sessions`,
        rp?`\nRUNNING: Best ${rp.bestPace.toFixed(2)}/km | 5K ${rp.fiveK.time} | 10K ${rp.tenK.time} | Half ${rp.half.time}`:'',
        "\n\nFormat:\n**Today:** [1-2 sentences on what to do today]\n\n**This Week:** [2-3 bullet points with emoji]\n\n**Watch:** [1 sentence on one thing to monitor]\n\nBe specific, reference numbers, no generic advice.",
      ].join('\n');
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});
      const data=await res.json();
      if(data.error)throw new Error(data.error);
      setAiMessage(data.text||m.insight);
    }catch(err:any){setAiMessage('AI error: '+(err?.message||String(err))+' — '+m.insight);}
    setAiLoading(false);
  };

  const runAIQuery=async(m:NonNullable<ReturnType<typeof computeMetrics>>)=>{
    if(!aiQuery.trim())return;
    const question=aiQuery;
    setAiQuery('');
    setAiQueryLoading(true);
    setAiQueryAnswer('');
    try{
      const context=buildContext(m);
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`You are an elite sports coach with access to this athlete's biometric data. Answer concisely and specifically — reference the actual numbers. No fluff.\n\nAthlete data: ${context}\n\nQuestion: ${question}`})});
      const data=await res.json();
      if(data.error)throw new Error(data.error);
      setAiQueryAnswer(data.text||'No response.');
    }catch(err:any){setAiQueryAnswer('Error: '+err.message);}
    setAiQueryLoading(false);
  };

  if(loading)return(
    <div className="min-h-screen bg-[#080809] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 rounded-full border border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto"/>
        <p className="text-[9px] font-black tracking-[0.4em] uppercase text-zinc-600 animate-pulse">Loading</p>
      </div>
    </div>
  );

  const m=computeMetrics(dailyData,workouts);
  if(!m)return<div className="min-h-screen bg-[#080809] flex items-center justify-center text-zinc-600 text-sm">No data yet.</div>;

  const{latest,recoveryScore,strainScore,estHRV,chartData,deepSleep,remSleep,lightSleep,wakeSleep,totalSleep,avgRHR7,avgSteps7,avgSleep7,atl,ctl,tsb,tdee,neat,exerciseBurn,BMR,todayWorkouts,insight,sorted,racePredictions,rhrBaseline,rhrDelta}=m;
  const displayInsight=aiMessage||insight;

  const TABS:{id:TabId;label:string;count?:number}[]=[
    {id:'overview',label:'Overview'},{id:'training',label:'Training',count:workouts.length},
    {id:'sleep',label:'Sleep'},{id:'metabolic',label:'Metabolic'},{id:'history',label:'History',count:sorted.length},
  ];

  const renderBold=(text:string)=>text.split(/\*\*(.*?)\*\*/g).map((part,j)=>j%2===1?<strong key={j} className="font-black text-zinc-100">{part}</strong>:<span key={j}>{part}</span>);

  return(
    <div className="min-h-screen bg-[#080809] text-zinc-100" style={{fontFamily:"'DM Sans', 'Figtree', sans-serif"}}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/[0.025] rounded-full blur-[120px]"/>
      </div>
      <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-6">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-[-0.03em] leading-none">Super<span className="text-emerald-400">Sense</span></h1>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-600 mt-1.5">{latest.date} · Amazfit Balance</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>runAI(m)} disabled={aiLoading} className="px-4 py-2 bg-zinc-900 border border-zinc-700/50 rounded-xl text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-all disabled:opacity-40 flex items-center gap-2">
              <span>{aiLoading?'⏳':'⚡'}</span>{aiLoading?'Analyzing...':'AI Analysis'}
            </button>
            <div className="flex items-center gap-2 text-[9px]">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"/>
              <span className="text-emerald-500 font-black uppercase tracking-widest">Live</span>
              <span className="text-zinc-700">{syncTime}</span>
            </div>
          </div>
        </header>

        {/* AI INSIGHT */}
        <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5 flex gap-4">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs shrink-0 mt-0.5">{aiLoading?'⏳':'🧠'}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.25em] mb-1.5">{aiMessage?'AI Analysis':'Local Analysis'}</p>
            {aiLoading?<p className="text-zinc-600 text-sm animate-pulse">Analyzing biometric patterns...</p>:(
              <div className="text-sm leading-relaxed font-light space-y-2">
                {displayInsight.split('\n').filter(l=>l.trim()).map((line,i)=>(
                  <p key={i} className={`text-zinc-300 ${line.startsWith('- ')||line.match(/^[•·–]/)?'pl-3':''}`}>{renderBold(line)}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI COACH CHAT */}
        <div className="space-y-3">
          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4 flex gap-3 items-center">
            <span className="text-base shrink-0">💬</span>
            <input type="text" value={aiQuery} onChange={e=>setAiQuery(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!aiQueryLoading&&runAIQuery(m)}
              placeholder="Ask your coach... e.g. should I run today? what's my weak spot? how's my sleep trend?"
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"/>
            <button onClick={()=>runAIQuery(m)} disabled={aiQueryLoading||!aiQuery.trim()}
              className="shrink-0 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-30 whitespace-nowrap">
              {aiQueryLoading?'...':'Ask'}
            </button>
          </div>
          {(aiQueryLoading||aiQueryAnswer)&&(
            <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5 flex gap-4">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs shrink-0 mt-0.5">🤖</div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.25em] mb-1.5">Coach Reply</p>
                {aiQueryLoading?<p className="text-zinc-600 text-sm animate-pulse">Thinking...</p>:(
                  <div className="text-sm leading-relaxed font-light space-y-1.5">
                    {aiQueryAnswer.split('\n').filter(l=>l.trim()).map((line,i)=>(
                      <p key={i} className="text-zinc-300">{renderBold(line)}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* HERO SCORES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {value:recoveryScore,max:100,color:'#10b981',label:'Recovery',sub:`RHR ${latest.hr_resting||'--'} bpm · baseline ${rhrBaseline}`,glossaryKey:'Recovery'},
            {value:strainScore,max:21,color:'#818cf8',label:'Strain',sub:`${todayWorkouts.length} sessions today`,glossaryKey:'Strain'},
            {value:latest.sleep_score||0,max:100,color:'#c084fc',label:'Sleep',sub:`${(totalSleep/60).toFixed(1)}h · score`},
            {value:estHRV,max:150,color:'#fb923c',label:'HRV',sub:`RHR ${latest.hr_resting||'--'} · score ${latest.sleep_score||'--'}`,glossaryKey:'HRV'},
          ].map((s,i)=>(
            <div key={i} className="bg-zinc-900/50 border border-zinc-800/40 rounded-2xl py-6 flex justify-center hover:border-zinc-700/50 transition-all">
              <ScoreRing {...s} size={100}/>
            </div>
          ))}
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
          <MetricCard label="Steps" value={(latest.steps||0).toLocaleString()} icon="👟" color={(latest.steps||0)>8000?'#10b981':'#94a3b8'} sub={`Goal: 10k · ${Math.round((latest.steps||0)/100)}%`}/>
          <MetricCard label="Calories" value={latest.calories||'--'} unit="kcal" icon="🔥" color="#fbbf24"/>
          <MetricCard label="SpO₂" value={latest.spo2_current||'--'} unit="%" icon="🫁" color={latest.spo2_current>=97?'#10b981':latest.spo2_current>=95?'#f59e0b':'#f43f5e'} tooltip={GLOSSARY.SpO2}/>
          <MetricCard label="Stress" value={latest.stress_current||'--'} icon="🧠" color={latest.stress_current<40?'#10b981':latest.stress_current<70?'#f59e0b':'#f43f5e'} sub={latest.stress_current<40?'Low':latest.stress_current<70?'Moderate':'High'}/>
          <MetricCard label="PAI Total" value={latest.pai_total||0} icon="📈" color={(latest.pai_total||0)>=100?'#10b981':'#818cf8'} sub={(latest.pai_total||0)>=100?'Optimal zone':`${100-(latest.pai_total||0)} to goal`} tooltip={GLOSSARY.PAI}/>
          <MetricCard label="Body Temp" value={latest.body_temp||'--'} unit="°C" icon="🌡" color={latest.body_temp>37.5?'#f43f5e':'#94a3b8'}/>
        </div>

        {/* HR HEATMAP */}
        {(()=>{
          const arr=latest.hr_today_array;
          const has=Array.isArray(arr)&&arr.length>0;
          return has?(
            <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Heart Rate · Today</h3>
                <span className="text-[9px] text-zinc-600 font-bold">{arr.length} readings · hover for time & bpm</span>
              </div>
              <HRHeatmap data={arr}/>
              <div className="flex gap-4 mt-3 flex-wrap">
                {[['#34d399','< 100 Rest'],['#fbbf24','100–120 Active'],['#fb923c','120–150 Cardio'],['#f43f5e','150+ Peak']].map(([c,l])=>(
                  <div key={l} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{backgroundColor:c}}/><span className="text-[8px] text-zinc-600 font-bold">{l}</span></div>
                ))}
              </div>
            </div>
          ):null;
        })()}

        {/* TABS */}
        <div>
          <div className="flex gap-0 border-b border-zinc-800/40 overflow-x-auto">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap border-b-2 -mb-px transition-all flex items-center gap-2 ${tab===t.id?'text-emerald-400 border-emerald-400':'text-zinc-600 border-transparent hover:text-zinc-400'}`}>
                {t.label}
                {t.count!==undefined&&<span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${tab===t.id?'bg-emerald-500/15 text-emerald-400':'bg-zinc-800 text-zinc-600'}`}>{t.count}</span>}
              </button>
            ))}
          </div>
          <div className="mt-6">

            {/* OVERVIEW */}
            {tab==='overview'&&(
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Training Load</h3>
                      <InfoBtn text="ATL = last 7 days avg. CTL = last 42 days avg. TSB = ATL − CTL. Positive = fresh, negative = fatigued/building."/>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[{v:atl,label:'ATL',sub:'Fatigue (7d)',color:'#fb923c',glossary:'ATL'},{v:ctl,label:'CTL',sub:'Fitness (42d)',color:'#10b981',glossary:'CTL'},{v:tsb,label:'TSB',sub:'Form',color:tsb>=0?'#38bdf8':'#f43f5e',glossary:'TSB'}].map(s=>(
                        <Tooltip key={s.label} content={GLOSSARY[s.glossary]}>
                          <div className="text-center p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/20 w-full cursor-help">
                            <div className="text-2xl font-black leading-none" style={{color:s.color}}>{s.v>0?'+':''}{s.v}</div>
                            <div className="text-[9px] font-black text-zinc-300 mt-1">{s.label}</div>
                            <div className="text-[8px] text-zinc-600 uppercase">{s.sub}</div>
                          </div>
                        </Tooltip>
                      ))}
                    </div>
                    <div className="text-[10px] text-zinc-500 leading-relaxed p-3 bg-zinc-800/20 rounded-xl">
                      {tsb>15?'✅ Tapered & fresh — peak performance window.':tsb<-20?'⚠️ High fatigue — deload recommended.':'📈 Building phase — maintain trajectory.'}
                    </div>
                  </div>
                  <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-4">7-Day Averages</h3>
                    <div className="space-y-3">
                      {[
                        {label:'Resting HR',value:avgRHR7,max:100,color:'#f43f5e',unit:'bpm',tip:GLOSSARY.RHR},
                        {label:'Daily Steps',value:Math.round(avgSteps7/1000*10)/10,max:20,color:'#10b981',unit:'k steps'},
                        {label:'Sleep Duration',value:avgSleep7,max:9,color:'#c084fc',unit:'h / night'},
                        {label:'PAI Score',value:latest.pai_total||0,max:150,color:'#818cf8',unit:'',tip:GLOSSARY.PAI},
                      ].map(s=>(
                        <div key={s.label} className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <div className="flex items-center gap-1">
                              <span className="text-zinc-500 font-bold uppercase tracking-wider">{s.label}</span>
                              {(s as any).tip&&<InfoBtn text={(s as any).tip}/>}
                            </div>
                            <span className="text-zinc-300 font-black">{s.value}{s.unit?` ${s.unit}`:''}</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{width:`${Math.min(100,(s.value/s.max)*100)}%`,backgroundColor:s.color}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-4">30-Day Biometric Trends</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[{key:'RHR' as const,label:'Resting HR',color:'#f43f5e',unit:'bpm'},{key:'Score' as const,label:'Sleep Score',color:'#c084fc',unit:'/100'},{key:'Stress' as const,label:'Stress Level',color:'#fbbf24',unit:''}].map(s=>{
                      const vals=chartData.map(d=>Number((d as any)[s.key])||0).filter(v=>v>0);
                      const avg=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;
                      return(
                        <div key={s.key}>
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-[9px] font-black uppercase tracking-wider" style={{color:s.color}}>{s.label}</span>
                            <span className="text-[10px] font-black text-zinc-400">avg {avg}{s.unit}</span>
                          </div>
                          <InteractiveSparkLine data={chartData} dataKey={s.key} color={s.color} height={48} fill unit={s.unit}/>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Daily Steps · 30 Days</h3>
                    <span className="text-[9px] text-zinc-500 font-black">7d avg {(avgSteps7/1000).toFixed(1)}k</span>
                  </div>
                  <InteractiveBarChart data={chartData} dataKey="Steps" color="#10b981" height={56} unit=" steps"/>
                  <div className="flex justify-between mt-1.5">{chartData.map((d,i)=><span key={i} className="text-[7px] text-zinc-700 font-bold">{d.date}</span>)}</div>
                </div>
                {chartData.some(d=>d.HRV>0)&&(
                  <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">HRV · 30 Days</h3>
                        <InfoBtn text={GLOSSARY.HRV}/>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-black">avg {Math.round(chartData.filter(d=>d.HRV>0).reduce((a,d)=>a+d.HRV,0)/chartData.filter(d=>d.HRV>0).length)}ms</span>
                    </div>
                    <InteractiveSparkLine data={chartData} dataKey="HRV" color="#fb923c" height={48} fill unit="ms"/>
                  </div>
                )}
              </div>
            )}

            {/* TRAINING */}
            {tab==='training'&&(
              <div className="space-y-5">
                {todayWorkouts.length>0&&(
                  <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-4">Today</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {todayWorkouts.map((w,i)=>{
                        const dur=getDurationMinutes(w);const dist=getDistance(w);const pace=calcPace(w);
                        return(
                          <button key={i} onClick={()=>setSelectedWorkout(w)} className="text-left p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/20 hover:border-zinc-600/40 transition-all">
                            <div className="flex justify-between items-start mb-3">
                              <div><p className="font-black text-zinc-100 uppercase text-sm">{getWorkoutName(w)}</p><p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5 font-bold">{typeof w.start_time==='string'?new Date(w.start_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}</p></div>
                              <span className="text-xl">{getWorkoutIcon(w)}</span>
                            </div>
                            <div className="flex gap-4">
                              <div><p className="text-lg font-black text-zinc-100">{fmtDuration(dur)}</p></div>
                              {w.calories>0&&<div><p className="text-lg font-black text-amber-400">{w.calories}<span className="text-[9px] text-zinc-500 ml-0.5">cal</span></p></div>}
                              {w.avg_hr>0&&<div><p className="text-lg font-black text-rose-400">{w.avg_hr}<span className="text-[9px] text-zinc-500 ml-0.5">bpm</span></p></div>}
                              {dist>0&&<div><p className="text-lg font-black text-emerald-400">{(dist/1000).toFixed(2)}<span className="text-[9px] text-zinc-500 ml-0.5">km</span></p></div>}
                              {pace&&<div><p className="text-lg font-black text-sky-400">{fmtPace(pace)}<span className="text-[9px] text-zinc-500 ml-0.5">/km</span></p></div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {racePredictions&&(
                  <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Race Time Predictions</h3>
                        <p className="text-[9px] text-zinc-600 mt-0.5">Riegel formula · based on {racePredictions.basedOn}</p>
                      </div>
                      <Tag color={racePredictions.confidence==='high'?'#10b981':racePredictions.confidence==='medium'?'#f59e0b':'#f43f5e'}>{racePredictions.confidence} confidence</Tag>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[{dist:'5 KM',...racePredictions.fiveK,color:'#34d399'},{dist:'10 KM',...racePredictions.tenK,color:'#38bdf8'},{dist:'Half',...racePredictions.half,color:'#818cf8'},{dist:'Marathon',...racePredictions.full,color:'#fb923c'}].map((r,i)=>(
                        <div key={i} className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/20 text-center">
                          <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-2">{r.dist}</div>
                          <div className="text-2xl font-black leading-none" style={{color:r.color}}>{r.time}</div>
                          <div className="text-[9px] text-zinc-500 mt-1.5 font-bold">{r.pace} /km pace</div>
                        </div>
                      ))}
                    </div>
                    {racePredictions.vo2max&&(
                      <div className="mt-3 pt-3 border-t border-zinc-800/40 flex items-center gap-3">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">VO₂ Max (device)</span>
                        <span className="text-lg font-black text-emerald-400">{racePredictions.vo2max}</span>
                        <span className="text-[9px] text-zinc-500">ml/kg/min</span>
                        <span className="text-[9px] text-zinc-600 ml-2">{racePredictions.vo2max>=55?'— Elite level':racePredictions.vo2max>=47?'— Superior':racePredictions.vo2max>=42?'— Excellent':racePredictions.vo2max>=35?'— Good':'— Average'}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-4">Activity Mix · All Time</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(workouts.reduce((acc,w)=>{const n=getWorkoutName(w);acc[n]=(acc[n]||0)+1;return acc;},{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([name,count])=>(
                      <div key={name} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/20">
                        <span className="text-sm">{WORKOUT_ICONS[name]||'⚡'}</span>
                        <span className="text-[9px] font-black text-zinc-300">{name}</span>
                        <span className="text-[9px] font-black text-zinc-500">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">All Sessions</h3>
                    <span className="text-[9px] text-zinc-600 font-black">{workouts.length} total</span>
                  </div>
                  {workouts.length===0?<p className="text-zinc-600 text-sm text-center py-8">No workouts synced yet.</p>:(
                    <div className="space-y-0.5">
                      {workouts.slice(0,30).map((w,i)=><WorkoutRow key={i} w={w} onClick={()=>setSelectedWorkout(w)}/>)}
                      {workouts.length>30&&<p className="text-center text-[9px] text-zinc-600 font-bold uppercase tracking-widest py-3">+ {workouts.length-30} more sessions</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SLEEP */}
            {tab==='sleep'&&(
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-4">Last Night's Architecture</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      {[{label:'Deep',v:deepSleep,color:'#818cf8',desc:'Physical repair',ideal:'15–25%'},{label:'REM',v:remSleep,color:'#c084fc',desc:'Memory & cognition',ideal:'20–25%'},{label:'Light',v:lightSleep,color:'#475569',desc:'Transition',ideal:'50–60%'},{label:'Awake',v:wakeSleep,color:'#7f1d1d',desc:'Disruptions',ideal:'<5%'}].map(s=>(
                        <div key={s.label} className="text-center p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/20">
                          <div className="text-2xl font-black leading-none" style={{color:s.color}}>{s.v||0}</div>
                          <div className="text-[8px] text-zinc-500 font-black uppercase mt-0.5">min</div>
                          <div className="text-[10px] font-black mt-2 text-zinc-200">{s.label}</div>
                          <div className="text-[8px] text-zinc-600 mt-0.5">{s.desc}</div>
                          <div className="text-[7px] text-zinc-700 mt-1">ideal {s.ideal}</div>
                        </div>
                      ))}
                    </div>
                    <SleepBar deep={deepSleep} rem={remSleep} light={lightSleep} wake={wakeSleep}/>
                    <div className="flex justify-between text-[8px] text-zinc-600 font-bold mt-1.5">
                      <span>{latest.sleep_start_time?new Date(latest.sleep_start_time*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Bedtime'}</span>
                      <span className="text-zinc-400 font-black">Total {(totalSleep/60).toFixed(1)}h</span>
                      <span>{latest.sleep_end_time?new Date(latest.sleep_end_time*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Wake'}</span>
                    </div>
                    <div className="mt-4 space-y-1.5 text-[10px] text-zinc-500 leading-relaxed">
                      {deepSleep>100&&<p className="text-emerald-400/80">✅ Excellent deep sleep — full physical recovery activated.</p>}
                      {deepSleep<60&&deepSleep>0&&<p className="text-rose-400/80">⚠️ Deep sleep deficit — try magnesium glycinate 400mg before bed. No screens after 21:00.</p>}
                      {remSleep<70&&remSleep>0&&<p className="text-violet-400/80">💭 Low REM — alcohol & late caffeine suppress REM. Target 20–25% of total sleep.</p>}
                    </div>
                  </div>
                  <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5 flex flex-col">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-4">Quality</h3>
                    <div className="flex justify-center my-4"><ScoreRing value={latest.sleep_score||0} max={100} color="#c084fc" label="Sleep Score" sub={`7d avg ${avgSleep7}h`} size={110}/></div>
                    <div className="space-y-3 mt-auto">
                      {[{label:'Deep %',value:totalSleep>0?Math.round(deepSleep/totalSleep*100):0,color:'#818cf8'},{label:'REM %',value:totalSleep>0?Math.round(remSleep/totalSleep*100):0,color:'#c084fc'},{label:'Efficiency',value:totalSleep>0?Math.round((totalSleep-wakeSleep)/totalSleep*100):0,color:'#10b981'}].map(s=>(
                        <div key={s.label} className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-zinc-500 font-bold uppercase tracking-wider">{s.label}</span>
                            <span className="font-black" style={{color:s.color}}>{s.value}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${s.value}%`,backgroundColor:s.color,transition:'width 1s ease'}}/></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-4">Sleep · 30-Day Trend</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-violet-400">Sleep Score</span>
                        <span className="text-[10px] font-black text-zinc-400">avg {Math.round(chartData.filter(d=>d.Score>0).reduce((a,d)=>a+d.Score,0)/(chartData.filter(d=>d.Score>0).length||1))}/100</span>
                      </div>
                      <InteractiveSparkLine data={chartData} dataKey="Score" color="#c084fc" height={56} fill unit="/100"/>
                    </div>
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400">Deep Sleep</span>
                        <span className="text-[10px] font-black text-zinc-400">avg {Math.round(chartData.filter(d=>d.Deep>0).reduce((a,d)=>a+d.Deep,0)/(chartData.filter(d=>d.Deep>0).length||1))}min</span>
                      </div>
                      <InteractiveSparkLine data={chartData} dataKey="Deep" color="#818cf8" height={56} fill unit="min"/>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* METABOLIC */}
            {tab==='metabolic'&&(
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Est. TDEE</h3>
                      <InfoBtn text={GLOSSARY.TDEE}/>
                    </div>
                    <div className="flex items-baseline gap-2 mb-5">
                      <span className="text-5xl font-black tracking-tight text-zinc-100">{tdee.toLocaleString()}</span>
                      <span className="text-zinc-500 font-bold">kcal</span>
                    </div>
                    <div className="space-y-3">
                      {[{label:'BMR',value:BMR,color:'#475569'},{label:'TEF (10%)',value:Math.round(BMR*0.1),color:'#1d4ed8'},{label:'NEAT (steps)',value:neat,color:'#10b981',tip:GLOSSARY.NEAT},{label:'Exercise',value:exerciseBurn,color:'#fbbf24'}].map(s=>(
                        <div key={s.label} className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <div className="flex items-center gap-1">
                              <span className="text-zinc-500 font-bold uppercase tracking-wider">{s.label}</span>
                              {(s as any).tip&&<InfoBtn text={(s as any).tip}/>}
                            </div>
                            <span className="text-zinc-300 font-black">{s.value.toLocaleString()} kcal</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${Math.round(s.value/tdee*100)}%`,backgroundColor:s.color,transition:'width 1s ease'}}/></div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-zinc-700 mt-3">BMR via Mifflin-St Jeor. NEAT = steps × 0.024kcal.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Blood Oxygen</h3>
                        <InfoBtn text={GLOSSARY.SpO2}/>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black" style={{color:latest.spo2_current>=97?'#10b981':latest.spo2_current>=95?'#f59e0b':'#f43f5e'}}>{latest.spo2_current||'--'}</span>
                        <span className="text-zinc-500 font-bold text-lg">%</span>
                        <span className="text-[9px] font-black uppercase ml-2" style={{color:latest.spo2_current>=97?'#10b981':'#f59e0b'}}>{!latest.spo2_current?'':latest.spo2_current>=97?'Optimal':latest.spo2_current>=95?'Slightly low':'Low — monitor'}</span>
                      </div>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">PAI Score</h3>
                          <InfoBtn text={GLOSSARY.PAI}/>
                        </div>
                        <Tag color={(latest.pai_total||0)>=100?'#10b981':'#f59e0b'}>{(latest.pai_total||0)>=100?'Optimal':'Below target'}</Tag>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-emerald-400">{latest.pai_total||0}</span>
                        <span className="text-zinc-500">/ 100 target</span>
                      </div>
                      <p className="text-[9px] text-zinc-600 mt-1.5">Research: 100+ PAI weekly linked to reduced cardiovascular risk.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <MetricCard label="Active Burn" value={exerciseBurn} unit="kcal" icon="🔥" color="#fbbf24"/>
                      <MetricCard label="NEAT" value={neat} unit="kcal" icon="🚶" color="#34d399" tooltip={GLOSSARY.NEAT}/>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-3">Active Calories · 30 Days</h3>
                  <InteractiveBarChart data={chartData} dataKey="Calories" color="#fbbf24" height={56} unit=" kcal"/>
                  <div className="flex justify-between mt-1.5">{chartData.map((d,i)=><span key={i} className="text-[7px] text-zinc-700 font-bold">{d.date}</span>)}</div>
                </div>
              </div>
            )}

            {/* HISTORY */}
            {tab==='history'&&(
              <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Daily Log</h3>
                  <span className="text-[9px] text-zinc-600 font-black">{sorted.length} days</span>
                </div>
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-zinc-800/60">
                        {['Date','RHR','Steps','Calories','Sleep','Deep','REM','Score','SpO₂','Stress','HRV'].map(h=>(
                          <th key={h} className="text-left py-2.5 px-2 text-[8px] font-black text-zinc-600 uppercase tracking-[0.12em] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...sorted].reverse().map((d,i)=>{
                        const dD=d.sleep_deep_minutes||d.deep_sleep_minutes||0;
                        const dR=d.sleep_rem_minutes||d.rem_sleep_minutes||0;
                        const dL=d.sleep_light_minutes||d.shallow_sleep_minutes||0;
                        const dT=d.sleep_total_minutes||(dD+dR+dL);
                        return(
                          <tr key={i} className="border-b border-zinc-800/20 hover:bg-zinc-800/20 transition-colors">
                            <td className="py-2 px-2 font-black text-zinc-400 whitespace-nowrap">{d.date}</td>
                            <td className="py-2 px-2 font-bold text-rose-400">{d.hr_resting||'--'}</td>
                            <td className="py-2 px-2 font-bold text-emerald-400">{d.steps?(d.steps/1000).toFixed(1)+'k':'--'}</td>
                            <td className="py-2 px-2 font-bold text-amber-400">{d.calories||'--'}</td>
                            <td className="py-2 px-2 font-bold text-violet-400">{dT?(dT/60).toFixed(1)+'h':'--'}</td>
                            <td className="py-2 px-2 font-bold text-indigo-400">{dD||'--'}</td>
                            <td className="py-2 px-2 font-bold text-purple-400">{dR||'--'}</td>
                            <td className="py-2 px-2 font-black" style={{color:(d.sleep_score||0)>80?'#10b981':(d.sleep_score||0)>60?'#f59e0b':'#f43f5e'}}>{d.sleep_score||'--'}</td>
                            <td className="py-2 px-2 font-bold text-cyan-400">{d.spo2_current||'--'}</td>
                            <td className="py-2 px-2 font-bold" style={{color:(d.stress_current||0)<40?'#10b981':(d.stress_current||0)<70?'#f59e0b':'#f43f5e'}}>{d.stress_current||'--'}</td>
                            <td className="py-2 px-2 font-bold text-orange-400">{(d as any).hrv||'--'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-zinc-800/20 pt-4 flex justify-between text-[8px] text-zinc-700 font-bold uppercase tracking-widest">
          <span>SuperSense v6 · Amazfit Balance</span>
          <span>Supabase · Zepp API</span>
        </footer>
      </div>
      {selectedWorkout&&<WorkoutModal w={selectedWorkout} onClose={()=>setSelectedWorkout(null)}/>}
    </div>
  );
}
