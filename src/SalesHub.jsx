import { useState, useEffect } from "react";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";

// ─── Microsoft 365 Auth Config ───────────────────────────────────────────────
const MSAL_CONFIG = {
  auth: {
    clientId:    "38c76329-7a64-4851-951f-467e18289eec",
    authority:   "https://login.microsoftonline.com/6d052b13-5a73-4ae7-90b4-a5b916b60e44",
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation:"sessionStorage", storeAuthStateInCookie:false },
};
const LOGIN_SCOPES = { scopes:["User.Read"] };
const msalInstance = new PublicClientApplication(MSAL_CONFIG);

// ─── Supabase Config ─────────────────────────────────────────────────────────
const SB_URL = "https://ikydiyzdzhghrcalsgwy.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlr" +
  "eWRpeXpkemhnaHJjYWxzZ3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODAzOTUsImV4cCI6" +
  "MjA4OTQ1NjM5NX0.pMZU3dChnZwgCjsPG9n7VaG3BC9pVoVmCeCwy6ECyCA";

const sbHeaders = { "Content-Type":"application/json", "apikey":SB_KEY, "Authorization":`Bearer ${SB_KEY}` };

// Generic Supabase helpers
const sbGet = async (table) => {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?select=*&order=updated_at.asc`, { headers:sbHeaders });
  if (!res.ok) {
    const err = await res.text().catch(()=>"");
    throw new Error(`[${table}] ${res.status}: ${err}`);
  }
  return res.json();
};
const sbUpsert = async (table, id, data) => {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method:"POST",
    headers:{ ...sbHeaders, "Prefer":"resolution=merge-duplicates" },
    body: JSON.stringify({ id, data }),
  });
  if (!res.ok) {
    const err = await res.text().catch(()=>"");
    console.error(`[sbUpsert:${table}] ${res.status}: ${err}`);
  }
};
const sbDelete = async (table, id) => {
  await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method:"DELETE", headers:sbHeaders });
};
// 연결 상태 확인
const sbPing = async () => {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/opps?select=id&limit=1`, { headers:sbHeaders });
    return res.ok;
  } catch { return false; }
};

// ─── Design Tokens (Light Theme) ───────────────────────────────────────────
const C = {
  bg:"#F1F5F9", surface:"#FFFFFF", surfaceUp:"#F8FAFC", border:"#E2E8F0",
  accent:"#3B6FE8", accentSoft:"rgba(59,111,232,0.08)", accentGlow:"rgba(59,111,232,0.20)",
  green:"#10B981", greenSoft:"rgba(16,185,129,0.09)",
  yellow:"#F59E0B", yellowSoft:"rgba(245,158,11,0.10)",
  red:"#EF4444", redSoft:"rgba(239,68,68,0.09)",
  purple:"#8B5CF6", purpleSoft:"rgba(139,92,246,0.09)",
  cyan:"#0891B2", cyanSoft:"rgba(8,145,178,0.09)",
  text:"#1E293B", textMuted:"#64748B", textDim:"#94A3B8",
};

// ─── Pipeline Stages ────────────────────────────────────────────────────────
const STAGES = [
  { id:"리드",     label:"리드",      prob:10,  color:"#64748B" },
  { id:"초기접촉", label:"초기 접촉", prob:20,  color:"#0891B2" },
  { id:"니즈파악", label:"니즈 파악", prob:35,  color:"#F59E0B" },
  { id:"제안",     label:"제안",      prob:55,  color:"#3B6FE8" },
  { id:"협상",     label:"협상",      prob:75,  color:"#8B5CF6" },
  { id:"계약완료", label:"계약완료",  prob:100, color:"#10B981" },
  { id:"손실",     label:"손실",      prob:0,   color:"#EF4444" },
];
// ─── Business Units ──────────────────────────────────────────────────────────
const BUSINESS_UNITS = [
  { id:"산업용S/G",        color:"#3B6FE8" },
  { id:"2차전지/반도체EPC", color:"#8B5CF6" },
  { id:"리튬소재",          color:"#10B981" },
  { id:"신사업",            color:"#F59E0B" },
];
const ACTIVE_STAGES = STAGES.filter(s=>s.id!=="손실");
const STAGE_MAP = Object.fromEntries(STAGES.map(s=>[s.id,s]));

const STAGE_STRATEGY = {
  "리드":    { icon:"🎯", tips:["잠재 고객 정보 조사 및 결정권자 파악","인트로 방법 결정 (소개/콜드콜/이벤트)","고객사 업황 및 Pain Point 사전 조사","연락처 확보 및 초기 접촉 시도"] },
  "초기접촉":{ icon:"🤝", tips:["첫 미팅/콜 목표 명확히 설정","회사 및 솔루션 간략 소개 자료 준비","고객 니즈 탐색 질문 리스트 작성","이해관계자 지도(Stakeholder Map) 파악"] },
  "니즈파악":{ icon:"🔍", tips:["BANT 확인 (예산·권한·니즈·타임라인)","핵심 Pain Point 문서화","경쟁사 현황 및 고객 평가 파악","솔루션 맵핑 및 차별화 포인트 정의"] },
  "제안":    { icon:"📋", tips:["고객 니즈 맞춤형 제안서 작성","ROI 및 비즈니스 임팩트 수치화","의사결정권자 포함 발표 일정 확보","Q&A 시나리오 및 대응 자료 준비"] },
  "협상":    { icon:"⚖️", tips:["양보 한계선 사전 설정 (가격·납기·조건)","경쟁사 대비 차별화 재강조","법무·구매팀 이슈 사전 해결","계약 체결 목표 일정 명시 후 클로징 시도"] },
  "계약완료":{ icon:"🎉", tips:["킥오프 미팅 일정 즉시 수립","온보딩 담당자 배정 및 인수인계","고객 성공 지표(KPI) 합의","레퍼런스·추가 영업 기회 탐색"] },
  "손실":    { icon:"📌", tips:["패인 원인 분석 (가격/경쟁/타이밍/니즈)","향후 재접촉 가능성 및 시점 평가","학습 포인트 팀 전체 공유","관계 유지 활동 지속 (뉴스레터, 행사)"] },
};

const ACT_TYPES = ["방문미팅","전화통화","화상회의","이메일","식사미팅","제안발표","협상미팅","계약서검토","기타"];
const PRI_CFG   = { "높음":C.red, "중간":C.yellow, "낮음":C.green };
const FILE_TYPES= ["제안서","계약서","견적서","기술자료","기타"];
const FILE_CLR  = { "제안서":C.accent,"계약서":C.green,"견적서":C.yellow,"기술자료":C.purple,"기타":C.textMuted };
const FILE_ICO  = { "제안서":"📄","계약서":"📋","견적서":"💰","기술자료":"🔬","기타":"📁" };
const DB_CONTACT_TYPES = ["방문미팅","전화통화","화상회의","이메일","식사미팅","계약체결","기타"];

// ─── Seed — Opportunities ───────────────────────────────────────────────────
const INIT_OPPS = [];

// ─── Seed — Accounts / DB / Meetings / Actions ──────────────────────────────
const INIT_CLIENTS = [];

const INIT_DB = {};

const INIT_MEETINGS = [];

const INIT_ACTIONS = [];

// ─── Quarterly Goals ─────────────────────────────────────────────────────────
const INIT_GOALS = {
  "2025": { Q1:0, Q2:0, Q3:0, Q4:0 },
  "2026": { Q1:0, Q2:0, Q3:0, Q4:0 },
};
const fmt    = n => n >= 100000000 ? `${(n/100000000).toFixed(1)}억` : `${(n/10000).toFixed(0)}만`;
const today  = () => new Date().toISOString().split("T")[0];
const isLate = d  => d && d < today();
const uid    = () => Math.random().toString(36).slice(2,9);

// ─── Atoms ────────────────────────────────────────────────────────────────────
function StagePill({ stage, size="sm" }) {
  const s = STAGE_MAP[stage] || {};
  const pad = size==="md" ? "4px 12px" : "3px 9px";
  const fs  = size==="md" ? 12 : 11;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:pad, borderRadius:20, fontSize:fs, fontWeight:700, color:s.color, background:`${s.color}18`, border:`1px solid ${s.color}40` }}>
    <span style={{ width:5, height:5, borderRadius:"50%", background:s.color, flexShrink:0 }}/>{s.label}
  </span>;
}

function ProbBar({ value, stage }) {
  const s = STAGE_MAP[stage] || {};
  return <div style={{ display:"flex", alignItems:"center", gap:8 }}>
    <div style={{ flex:1, height:4, background:C.border, borderRadius:2, overflow:"hidden" }}>
      <div style={{ width:`${value}%`, height:"100%", background:s.color||C.accent, borderRadius:2 }}/>
    </div>
    <span style={{ fontSize:11, color:s.color||C.accent, fontWeight:700, minWidth:34 }}>{value}%</span>
  </div>;
}

function Card({ children, style={}, onClick }) {
  const [h,sH] = useState(false);
  return <div onClick={onClick} onMouseEnter={()=>onClick&&sH(true)} onMouseLeave={()=>sH(false)} style={{
    background:C.surface, border:`1px solid ${h?C.accent:C.border}`, borderRadius:12, padding:"18px 22px",
    transition:"border-color .2s, box-shadow .2s", cursor:onClick?"pointer":"default",
    boxShadow:h?`0 0 0 2px ${C.accentGlow},0 8px 24px rgba(0,0,0,.10)`:"0 1px 4px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
    ...style,
  }}>{children}</div>;
}

function Modal({ title, onClose, children }) {
  return <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.45)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, width:"100%", maxWidth:700, maxHeight:"88vh", overflow:"auto", padding:"28px 32px", boxShadow:"0 24px 60px rgba(0,0,0,.18)" }} onClick={e=>e.stopPropagation()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.text }}>{title}</h2>
        <button onClick={onClose} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:20, padding:4 }}>✕</button>
      </div>
      {children}
    </div>
  </div>;
}

function Inp({ label, value, onChange, type="text", multiline, placeholder }) {
  const s = { width:"100%", background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:14, outline:"none", resize:multiline?"vertical":"none", minHeight:multiline?80:"auto", fontFamily:"inherit", boxSizing:"border-box" };
  return <div style={{ marginBottom:16 }}>
    {label&&<label style={{ display:"block", fontSize:11, color:C.textMuted, marginBottom:6, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" }}>{label}</label>}
    {multiline?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s}/>:<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s}/>}
  </div>;
}

function Sel({ label, value, onChange, options }) {
  return <div style={{ marginBottom:16 }}>
    {label&&<label style={{ display:"block", fontSize:11, color:C.textMuted, marginBottom:6, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" }}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:"100%", background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:14, outline:"none" }}>
      {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
    </select>
  </div>;
}

function Btn({ children, onClick, variant="primary", size="md", style:sty={} }) {
  const [h,sH]=useState(false);
  const base={ border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:size==="sm"?12:14, padding:size==="sm"?"5px 12px":"10px 20px", transition:"all .15s", fontFamily:"inherit", ...sty };
  const V={ primary:{background:h?"#2D5FD4":C.accent,color:"#fff"}, ghost:{background:h?"#F1F5F9":"transparent",color:C.textMuted,border:`1px solid ${C.border}`}, danger:{background:h?"#DC2626":C.red,color:"#fff"}, success:{background:h?"#059669":C.green,color:"#fff"} };
  return <button onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} onClick={onClick} style={{...base,...V[variant]}}>{children}</button>;
}

function SL({ children }) {
  return <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", marginBottom:12 }}>{children}</div>;
}

function TabBar({ tabs, active, onChange }) {
  return <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}`, marginBottom:24 }}>
    {tabs.map(t=><button key={t.id} onClick={()=>onChange(t.id)} style={{ padding:"10px 18px", background:"none", border:"none", cursor:"pointer", borderBottom:`2px solid ${active===t.id?C.accent:"transparent"}`, marginBottom:-1, color:active===t.id?C.accent:C.textMuted, fontWeight:active===t.id?700:500, fontSize:13, fontFamily:"inherit", whiteSpace:"nowrap" }}>
      {t.label}{t.count!=null?` (${t.count})`:""}
    </button>)}
  </div>;
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────

// Opportunity Form Modal
function ClientSearchInput({ clients, value, onChange }) {
  const [query,  setQuery]  = useState("");
  const [open,   setOpen]   = useState(false);
  const [focused,setFocus]  = useState(false);

  const selected = clients.find(c => String(c.id) === String(value));
  const filtered = clients.filter(c =>
    !query || c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.industry||"").toLowerCase().includes(query.toLowerCase()) ||
    (c.owner||"").toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  const handleSelect = (c) => {
    onChange(c.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div style={{ position:"relative", marginBottom:16 }}>
      <label style={{ display:"block", fontSize:11, color:C.textMuted, marginBottom:6, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" }}>고객사</label>
      {/* Input box */}
      <div style={{ display:"flex", alignItems:"center", background:C.surfaceUp, border:`1px solid ${focused?C.accent:C.border}`, borderRadius:8, padding:"10px 14px", gap:8, transition:"border-color .15s" }}>
        <span style={{ fontSize:13, color:C.textMuted }}>🔍</span>
        <input
          value={open ? query : (selected?.name || "")}
          onChange={e=>{ setQuery(e.target.value); setOpen(true); }}
          onFocus={()=>{ setFocus(true); setOpen(true); setQuery(""); }}
          onBlur={()=>{ setFocus(false); setTimeout(()=>setOpen(false), 150); }}
          placeholder="고객사명 검색..."
          style={{ background:"none", border:"none", outline:"none", fontSize:14, color:C.text, width:"100%", fontFamily:"inherit" }}
        />
        {selected && !open && (
          <span style={{ fontSize:10, background:C.accentSoft, color:C.accent, padding:"2px 8px", borderRadius:8, fontWeight:700, flexShrink:0 }}>
            {selected.industry}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,.12)", zIndex:300, overflow:"hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding:"16px", textAlign:"center", fontSize:13, color:C.textMuted }}>검색 결과 없음</div>
          ) : (
            filtered.map(c => (
              <div key={c.id} onMouseDown={()=>handleSelect(c)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${C.border}`, background: String(c.id)===String(value) ? C.accentSoft : "transparent" }}
                onMouseEnter={e=>e.currentTarget.style.background=C.surfaceUp}
                onMouseLeave={e=>e.currentTarget.style.background=String(c.id)===String(value)?C.accentSoft:"transparent"}
              >
                <div style={{ width:30, height:30, borderRadius:8, background:C.accentSoft, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:C.accent, flexShrink:0 }}>
                  {c.name[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{c.name}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{c.industry} · {c.owner} 담당</div>
                </div>
                {String(c.id)===String(value) && <span style={{ fontSize:12, color:C.accent }}>✓</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function OppFormModal({ opp, clients, onSave, onClose }) {
  const blank = { name:"", accountId:clients[0]?.id||"", owner:"", businessUnit:BUSINESS_UNITS[0].id, stage:"리드", value:"", probability:10, closeDate:"", nextStep:"", nextStepDate:"", competitors:"", source:"영업팀 발굴", strategyNote:"" };
  const [f,sF] = useState(opp ? { ...opp, value:String(opp.value) } : blank);
  const s=k=>v=>sF(p=>({...p,[k]:v}));
  const handleStageChange = (stage) => { sF(p=>({...p, stage, probability:STAGE_MAP[stage]?.prob||p.probability})); };
  return <Modal title={opp?"영업기회 수정":"영업기회 추가"} onClose={onClose}>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <div style={{ gridColumn:"1/-1" }}><Inp label="영업기회명" value={f.name} onChange={s("name")} placeholder="예: 삼성전자 2025 소재 공급"/></div>
      {/* 고객사 검색 */}
      <div style={{ gridColumn:"1/-1" }}>
        <ClientSearchInput clients={clients} value={f.accountId} onChange={v=>sF(p=>({...p,accountId:v}))}/>
      </div>
      <Inp label="담당자" value={f.owner} onChange={s("owner")}/>
      <Sel label="사업부" value={f.businessUnit||BUSINESS_UNITS[0].id} onChange={s("businessUnit")} options={BUSINESS_UNITS.map(b=>({value:b.id,label:b.id}))}/>
      <Sel label="영업 단계" value={f.stage} onChange={handleStageChange} options={STAGES.map(s=>s.id)}/>
      <Inp label="확률 (%)" type="number" value={f.probability} onChange={v=>sF(p=>({...p,probability:Number(v)||0}))}/>
      <Inp label="예상 금액 (원)" type="number" value={f.value} onChange={v=>sF(p=>({...p,value:v.replace(/[^0-9]/g,"")}))} placeholder="숫자만 입력 (예: 100000000)"/>
      <Inp label="예상 계약일" type="date" value={f.closeDate} onChange={s("closeDate")}/>
      <Inp label="경쟁사" value={f.competitors} onChange={s("competitors")} placeholder="A사, B사"/>
      <Sel label="영업 소스" value={f.source} onChange={s("source")} options={["영업팀 발굴","인바운드 문의","기존 거래","레퍼런스 소개","전시회 접촉","파트너사 소개"]}/>
      <div style={{ gridColumn:"1/-1" }}><Inp label="다음 액션" value={f.nextStep} onChange={s("nextStep")}/></div>
      <Inp label="다음 액션 일정" type="date" value={f.nextStepDate} onChange={s("nextStepDate")}/>
      <Inp label="매출 인식 예정일" type="date" value={f.revenueDate||""} onChange={s("revenueDate")} />
      <div style={{ gridColumn:"1/-1" }}><Inp label="영업 전략 메모" value={f.strategyNote} onChange={s("strategyNote")} multiline placeholder="이 딜의 핵심 전략, 유의사항 등"/></div>
    </div>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
      <Btn variant="ghost" onClick={onClose}>취소</Btn>
      <Btn onClick={()=>{
        const numVal = parseInt(String(f.value).replace(/[^0-9]/g,""), 10) || 0;
        onSave({
          ...f,
          value: numVal,
          probability: Number(f.probability)||0,
          id: opp?.id||uid(),
          stageHistory: opp?.stageHistory||[],
          activities:   opp?.activities||[],
          files:        opp?.files||[],
          stageStrategies: opp?.stageStrategies||{},
        });
      }}>저장</Btn>
    </div>
  </Modal>;
}

// Stage move modal
function StageMoveModal({ opp, onSave, onClose }) {
  const [newStage, setStage] = useState(opp.stage);
  const [note, setNote]      = useState("");
  const [prob, setProb]      = useState(STAGE_MAP[opp.stage]?.prob||opp.probability);
  const handleStage = s => { setStage(s); setProb(STAGE_MAP[s]?.prob||0); };
  return <Modal title="영업 단계 변경" onClose={onClose}>
    <div style={{ marginBottom:20 }}>
      <SL>현재 단계</SL>
      <StagePill stage={opp.stage} size="md"/>
    </div>
    <Sel label="변경할 단계" value={newStage} onChange={handleStage} options={STAGES.map(s=>s.id)}/>
    <Inp label="변경 확률 (%)" type="number" value={prob} onChange={v=>setProb(Number(v))}/>
    <Inp label="단계 변경 사유 / 메모" value={note} onChange={setNote} multiline placeholder="단계 변경 이유, 이 시점의 상황을 기록하세요"/>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
      <Btn variant="ghost" onClick={onClose}>취소</Btn>
      <Btn variant={newStage==="계약완료"?"success":newStage==="손실"?"danger":"primary"} onClick={()=>onSave(newStage, prob, note)}>단계 변경</Btn>
    </div>
  </Modal>;
}

// Activity Modal
function ActivityModal({ act, onSave, onClose }) {
  const [f,sF]=useState(act||{date:today(),type:"방문미팅",content:"",clientRequest:"",by:""});
  const s=k=>v=>sF(p=>({...p,[k]:v}));
  return <Modal title={act?"활동 수정":"활동 기록"} onClose={onClose}>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <Inp label="날짜" type="date" value={f.date} onChange={s("date")}/>
      <Sel label="유형" value={f.type} onChange={s("type")} options={ACT_TYPES}/>
      <div style={{ gridColumn:"1/-1" }}><Inp label="활동 내용" value={f.content} onChange={s("content")} multiline placeholder="미팅 내용, 논의 사항 등을 기록하세요"/></div>
      <div style={{ gridColumn:"1/-1" }}>
        <Inp label="고객사 요청사항" value={f.clientRequest||""} onChange={s("clientRequest")} multiline placeholder="고객사에서 요청한 사항, 질문, 피드백 등을 기록하세요 (선택)"/>
      </div>
      <Inp label="담당자" value={f.by} onChange={s("by")}/>
    </div>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
      <Btn variant="ghost" onClick={onClose}>취소</Btn>
      <Btn onClick={()=>onSave({...f,id:act?.id||uid()})}>저장</Btn>
    </div>
  </Modal>;
}

function FileModal2({ onSave, onClose }) {
  const [f,sF]=useState({name:"",url:"",type:"제안서",date:today()});
  const s=k=>v=>sF(p=>({...p,[k]:v}));
  return <Modal title="파일 추가" onClose={onClose}>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <Inp label="파일명" value={f.name} onChange={s("name")} placeholder="파일명.pdf"/>
      <Sel label="유형" value={f.type} onChange={s("type")} options={FILE_TYPES}/>
      <div style={{ gridColumn:"1/-1" }}><Inp label="링크 URL" value={f.url} onChange={s("url")} placeholder="https://drive.google.com/..."/></div>
      <Inp label="날짜" type="date" value={f.date} onChange={s("date")}/>
    </div>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
      <Btn variant="ghost" onClick={onClose}>취소</Btn>
      <Btn onClick={()=>f.name&&onSave({...f,id:uid()})}>추가</Btn>
    </div>
  </Modal>;
}

// ── KPI Grid (인라인 편집 가능) ───────────────────────────────────────────────
function KpiGrid({ opp, stageCfg, weighted, onUpdate }) {
  const [editing, setEditing] = useState(null); // "value" | "probability" | "closeDate" | null
  const [val, setVal]         = useState("");

  const startEdit = (field, current) => {
    setEditing(field);
    setVal(field==="value" ? String(opp.value) : String(current||""));
  };

  const save = () => {
    if (editing === "value") {
      const num = parseInt(String(val).replace(/[^0-9]/g,""), 10) || 0;
      onUpdate({ value: num });
    } else if (editing === "probability") {
      const num = Math.min(100, Math.max(0, parseInt(val)||0));
      onUpdate({ probability: num });
    } else if (editing === "closeDate") {
      onUpdate({ closeDate: val });
    }
    setEditing(null);
  };

  const handleKey = (e) => {
    if (e.key==="Enter") save();
    if (e.key==="Escape") setEditing(null);
  };

  const inputStyle = {
    background:"#fff", border:`1.5px solid ${C.accent}`, borderRadius:6,
    padding:"4px 8px", color:C.text, fontSize:15, fontWeight:700,
    outline:"none", width:"100%", fontFamily:"inherit", boxSizing:"border-box",
  };

  const cells = [
    {
      id:"value", label:"예상 수주 금액", color:C.accent, editable:true,
      display: fmt(opp.value),
      input: <input type="text" value={val} onChange={e=>setVal(e.target.value.replace(/[^0-9]/g,""))} onBlur={save} onKeyDown={handleKey} autoFocus style={inputStyle} placeholder="금액 (원)"/>,
    },
    {
      id:"weighted", label:"가중 매출", color:C.purple, editable:false,
      display: fmt(weighted),
    },
    {
      id:"probability", label:"성공 확률", color:stageCfg.color, editable:true,
      display: `${opp.probability}%`,
      input: <input type="number" min="0" max="100" value={val} onChange={e=>setVal(e.target.value)} onBlur={save} onKeyDown={handleKey} autoFocus style={{...inputStyle, width:80}} placeholder="0~100"/>,
    },
    {
      id:"closeDate", label:"예상 계약일", editable:true,
      color: isLate(opp.closeDate)&&opp.stage!=="계약완료" ? C.red : C.textMuted,
      display: opp.closeDate||"—",
      input: <input type="date" value={val} onChange={e=>setVal(e.target.value)} onBlur={save} onKeyDown={handleKey} autoFocus style={inputStyle}/>,
    },
    {
      id:"competitors", label:"경쟁사", color:C.textMuted, editable:false,
      display: opp.competitors||"—",
    },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
      {cells.map(cell=>(
        <div key={cell.id}
          onClick={()=>cell.editable&&editing!==cell.id&&startEdit(cell.id, cell.id==="closeDate"?opp.closeDate:cell.id==="probability"?opp.probability:opp.value)}
          style={{ background:C.surfaceUp, borderRadius:10, padding:"12px 14px", cursor:cell.editable?"pointer":"default", position:"relative", transition:"box-shadow .15s", border:`1px solid ${editing===cell.id?C.accent:"transparent"}` }}
          onMouseEnter={e=>{ if(cell.editable) e.currentTarget.style.boxShadow=`0 0 0 1px ${C.accentGlow}`; }}
          onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:6 }}>
            <div style={{ fontSize:10, color:C.textMuted, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase" }}>{cell.label}</div>
            {cell.editable && editing!==cell.id && <span style={{ fontSize:9, color:C.textDim }}>✏</span>}
          </div>
          {editing===cell.id ? (
            <div onClick={e=>e.stopPropagation()}>
              {cell.input}
              <div style={{ display:"flex", gap:4, marginTop:6 }}>
                <button onClick={save} style={{ flex:1, padding:"3px", background:C.accent, color:"#fff", border:"none", borderRadius:4, fontSize:10, cursor:"pointer", fontWeight:700 }}>저장</button>
                <button onClick={()=>setEditing(null)} style={{ flex:1, padding:"3px", background:C.border, color:C.textMuted, border:"none", borderRadius:4, fontSize:10, cursor:"pointer" }}>취소</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize:cell.id==="competitors"?12:16, fontWeight:700, color:cell.color, lineHeight:1.3 }}>{cell.display}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Strategy Editor ───────────────────────────────────────────────────────────
function StrategyEditor({ value, stageColor, tips, onSave, onCancel }) {
  const [text, setText] = useState(value || "");

  const applyTip = (tip) => {
    setText(prev => prev ? `${prev}\n• ${tip}` : `• ${tip}`);
  };

  return (
    <div>
      {/* Quick insert from tips */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:C.textMuted, marginBottom:6, fontWeight:600 }}>추천 전략에서 빠르게 추가:</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {tips.map((tip,i)=>(
            <button key={i} onClick={()=>applyTip(tip)} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${stageColor}30`, background:`${stageColor}08`, color:stageColor, fontSize:11, cursor:"pointer", fontWeight:500, textAlign:"left" }}>
              + {tip.length > 24 ? tip.slice(0,24)+"…" : tip}
            </button>
          ))}
        </div>
      </div>

      {/* Text area */}
      <textarea
        value={text}
        onChange={e=>setText(e.target.value)}
        placeholder={`이 단계에서의 구체적인 영업 전략을 작성하세요.\n\n예:\n• 핵심 결정권자 집중 공략\n• 경쟁사 대비 우리의 강점 강조\n• 주간 팔로우업 일정 수립`}
        autoFocus
        style={{
          width:"100%", minHeight:160, background:C.surfaceUp,
          border:`1.5px solid ${stageColor}`, borderRadius:10,
          padding:"12px 14px", color:C.text, fontSize:13,
          lineHeight:1.8, outline:"none", resize:"vertical",
          fontFamily:"inherit", boxSizing:"border-box",
        }}
      />
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:10 }}>
        <Btn variant="ghost" size="sm" onClick={onCancel}>취소</Btn>
        <Btn size="sm" onClick={()=>onSave(text)}>저장</Btn>
      </div>
    </div>
  );
}

// ── Opportunity Detail Page ───────────────────────────────────────────────────
function OppDetail({ opp, clients, onUpdate, onBack, actions, onUpdateActions, onArchive, isAdmin, onDelete, onNavigateToClient }) {
  const [subTab, setSubTab]   = useState("overview");
  const [actModal, setAM]     = useState(null);
  const [fileModal, setFM]    = useState(false);
  const [stageModal, setSM]   = useState(false);
  const [editing, setEdit]    = useState(false);
  const [editForm, setEF] = useState({ nextStep:opp.nextStep, nextStepDate:opp.nextStepDate, strategyNote:opp.strategyNote, competitors:opp.competitors, clientRequirements:opp.clientRequirements||"", businessUnit:opp.businessUnit||BUSINESS_UNITS[0].id, owner:opp.owner||"" });
  const [editingStage, setES] = useState(null);   // which stage is being edited
  const [showTips, setShowTips] = useState({});    // which stages show default tips

  const account   = clients.find(c=>c.id===opp.accountId)||{};
  const stageCfg  = STAGE_MAP[opp.stage]||{};
  const oppActions= actions.filter(a=>a.oppId===opp.id);
  const weighted  = Math.round(opp.value * opp.probability / 100);

  const update = patch => onUpdate(prev=>prev.map(o=>o.id===opp.id?{...o,...patch}:o));

  const handleStageMove = (newStage, prob, note) => {
    const entry = { id:uid(), stage:newStage, date:today(), note, by:opp.owner };
    update({ stage:newStage, probability:prob, stageHistory:[...opp.stageHistory, entry] });
    setSM(false);
  };

  const saveAct = a => {
    const ex=opp.activities.find(x=>x.id===a.id);
    update({ activities:ex?opp.activities.map(x=>x.id===a.id?a:x):[...opp.activities,a].sort((a,b)=>b.date.localeCompare(a.date)) });
    setAM(null);
  };
  const saveFile = f => { update({ files:[...opp.files,f] }); setFM(false); };

  const ACTIVE = STAGES.filter(s=>s.id!=="손실");
  const currentIdx = ACTIVE.findIndex(s=>s.id===opp.stage);

  const subTabs = [
    { id:"overview",  label:"개요"          },
    { id:"strategy",  label:"단계별 전략"   },
    { id:"stagelog",  label:"단계 히스토리", count:opp.stageHistory.length },
    { id:"activities",label:"활동 기록",     count:opp.activities.length   },
    { id:"files",     label:"파일",          count:opp.files.length        },
    { id:"actions",   label:"액션",          count:oppActions.filter(a=>!a.done).length },
    { id:"news",      label:"📰 뉴스"       },
  ];

  return <div>
    {/* Breadcrumb */}
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
      <button onClick={onBack} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:6, padding:0, fontFamily:"inherit" }}>← 파이프라인</button>
      <span style={{ color:C.textDim }}>/</span>
      <span style={{ fontSize:13, color:C.text, fontWeight:600 }}>{opp.name}</span>
    </div>

    {/* Hero */}
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:"26px 30px", marginBottom:24, boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:C.text, letterSpacing:"-.02em", marginBottom:6 }}>{opp.name}</div>
          <div style={{ fontSize:13, color:C.textMuted, display:"flex", alignItems:"center", gap:6 }}>
            {/* 고객사 클릭 → 고객사 DB로 이동 */}
            {account.name && onNavigateToClient ? (
              <button onClick={()=>onNavigateToClient(account)} style={{ background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit", fontSize:13, color:C.accent, fontWeight:600, textDecoration:"underline", textUnderlineOffset:2 }}>
                🏢 {account.name}
              </button>
            ) : (
              <span>{account.name}</span>
            )}
            <span>·</span>
            <span>{account.industry}</span>
            <span>·</span>
            <span>{opp.owner} 담당</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {opp.stage!=="계약완료"&&opp.stage!=="손실"&&<Btn variant="ghost" size="sm" onClick={()=>setSM(true)}>단계 변경 →</Btn>}
          {opp.stage==="계약완료"&&<span style={{ fontSize:13, color:C.green, fontWeight:700 }}>🎉 계약완료</span>}
          {opp.stage==="손실"&&<span style={{ fontSize:13, color:C.red, fontWeight:700 }}>📌 손실</span>}
          {onArchive && <Btn variant="ghost" size="sm" style={{ color:C.textMuted }} onClick={()=>{ if(window.confirm(`"${opp.name}"을 아카이브 하시겠습니까?\n아카이브된 딜은 파이프라인 > 아카이브 탭에서 확인할 수 있습니다.`)) { onArchive(opp); onBack(); } }}>📦 아카이브</Btn>}
          {isAdmin && onDelete && (
            <Btn variant="danger" size="sm" onClick={()=>{ if(window.confirm(`⚠️ "${opp.name}"을 영구 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) { onDelete(opp.id); onBack(); } }}>
              🗑 영구삭제
            </Btn>
          )}
        </div>
      </div>

      {/* Stage stepper */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          {ACTIVE.map((s,i)=>{
            const passed = currentIdx>i || opp.stage==="계약완료";
            const active = currentIdx===i && opp.stage!=="손실";
            const isLost = opp.stage==="손실";
            return <div key={s.id} style={{ display:"flex", alignItems:"center", flex:i<ACTIVE.length-1?1:"none" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:60 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:passed||active?(isLost&&!passed?C.textDim:s.color):"transparent", border:`2px solid ${passed||active?(isLost&&!passed?C.textDim:s.color):C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:passed||active?"#fff":C.textDim, transition:"all .3s" }}>
                  {passed&&!active?"✓":i+1}
                </div>
                <div style={{ fontSize:10, color:active?s.color:passed?C.textMuted:C.textDim, marginTop:5, fontWeight:active?700:400, whiteSpace:"nowrap" }}>{s.label}</div>
              </div>
              {i<ACTIVE.length-1&&<div style={{ flex:1, height:2, background:passed?s.color:C.border, marginBottom:16, transition:"background .3s" }}/>}
            </div>;
          })}
        </div>
        {opp.stage==="손실"&&<div style={{ marginTop:8, fontSize:12, color:C.red, fontWeight:600 }}>⚠ 이 영업기회는 손실 처리되었습니다</div>}
      </div>

      {/* KPI grid — 예상 금액/확률/계약일 인라인 수정 가능 */}
      {(()=>{
        return <KpiGrid opp={opp} stageCfg={stageCfg} weighted={weighted} onUpdate={update}/>;
      })()}

      {/* Next step banner */}
      {opp.nextStep&&<div style={{ marginTop:14, background:`${stageCfg.color}12`, border:`1px solid ${stageCfg.color}30`, borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:11, color:stageCfg.color, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", flexShrink:0 }}>다음 액션</span>
        <span style={{ fontSize:13, color:C.text, flex:1 }}>{opp.nextStep}</span>
        <span style={{ fontSize:12, color:isLate(opp.nextStepDate)?C.red:C.textMuted, fontWeight:isLate(opp.nextStepDate)?700:400 }}>
          {isLate(opp.nextStepDate)?"⚠ ":""}{opp.nextStepDate}
        </span>
      </div>}
    </div>

    {/* Sub tabs */}
    <TabBar tabs={subTabs} active={subTab} onChange={setSubTab}/>

    {/* ── 개요 ── */}
    {subTab==="overview"&&<div>
      {editing?<div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:11, color:C.textMuted, marginBottom:6, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" }}>사업부</label>
            <select value={editForm.businessUnit} onChange={e=>setEF(p=>({...p,businessUnit:e.target.value}))} style={{ width:"100%", background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:14, outline:"none" }}>
              {BUSINESS_UNITS.map(b=><option key={b.id} value={b.id}>{b.id}</option>)}
            </select>
          </div>
          <Inp label="담당자" value={editForm.owner} onChange={v=>setEF(p=>({...p,owner:v}))}/>
        </div>
        <Inp label="다음 액션" value={editForm.nextStep} onChange={v=>setEF(p=>({...p,nextStep:v}))}/>
        <Inp label="다음 액션 일정" type="date" value={editForm.nextStepDate} onChange={v=>setEF(p=>({...p,nextStepDate:v}))}/>
        <Inp label="경쟁사" value={editForm.competitors} onChange={v=>setEF(p=>({...p,competitors:v}))}/>
        <Inp label="영업 전략 메모" value={editForm.strategyNote} onChange={v=>setEF(p=>({...p,strategyNote:v}))} multiline/>
        <Inp label="고객 요구사항 / Spec" value={editForm.clientRequirements||""} onChange={v=>setEF(p=>({...p,clientRequirements:v}))} multiline placeholder="고객사의 기술 스펙, 납기 조건, 예산, 기타 요구사항을 상세히 기록하세요"/>
        <div style={{ display:"flex", gap:10 }}><Btn variant="ghost" onClick={()=>setEdit(false)}>취소</Btn><Btn onClick={()=>{update(editForm);setEdit(false);}}>저장</Btn></div>
      </div>:<div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          {[
            { label:"사업부",     val:opp.businessUnit, isBU:true },
            { label:"영업 소스",  val:opp.source      },
            { label:"고객사",     val:account.name    },
            { label:"담당자",     val:opp.owner       },
          ].map(it=>{
            const buCfg = it.isBU ? BUSINESS_UNITS.find(b=>b.id===it.val) : null;
            return <div key={it.label} style={{ background:buCfg?`${buCfg.color}10`:C.surface, border:`1px solid ${buCfg?buCfg.color+"40":C.border}`, borderRadius:10, padding:"12px 16px" }}>
              <div style={{ fontSize:10, color:buCfg?buCfg.color:C.textMuted, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:5 }}>{it.label}</div>
              <div style={{ fontSize:13, fontWeight:buCfg?700:400, color:buCfg?buCfg.color:it.val?C.text:C.textDim }}>{it.val||"—"}</div>
            </div>;
          })}
        </div>

        {/* 고객 요구사항 / Spec */}
        <div style={{ background:`${C.yellow}0D`, border:`1px solid ${C.yellow}30`, borderRadius:10, padding:"16px 18px", marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontSize:10, color:C.yellow, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase" }}>📋 고객 요구사항 / Spec</div>
          </div>
          {opp.clientRequirements ? (
            <div style={{ fontSize:13, color:C.text, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{opp.clientRequirements}</div>
          ) : (
            <div style={{ fontSize:13, color:C.textDim, fontStyle:"italic" }}>아직 기록된 요구사항이 없습니다. 수정 버튼을 눌러 추가하세요.</div>
          )}
        </div>

        {/* 영업 전략 메모 */}
        <div style={{ background:C.accentSoft, border:`1px solid ${C.accentGlow}`, borderRadius:10, padding:"16px 18px", marginBottom:12 }}>
          <div style={{ fontSize:10, color:C.accent, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>💡 영업 전략 메모</div>
          <div style={{ fontSize:13, color:C.text, lineHeight:1.7 }}>{opp.strategyNote||"—"}</div>
        </div>

        <Btn variant="ghost" size="sm" onClick={()=>{setEF({nextStep:opp.nextStep,nextStepDate:opp.nextStepDate,strategyNote:opp.strategyNote,competitors:opp.competitors,clientRequirements:opp.clientRequirements||"",businessUnit:opp.businessUnit||BUSINESS_UNITS[0].id,owner:opp.owner||""});setEdit(true);}}>✏ 수정</Btn>
      </div>}
    </div>}

    {/* ── 단계별 전략 ── */}
    {subTab==="strategy"&&<div>
      {/* 안내 배너 */}
      <div style={{ background:C.accentSoft, border:`1px solid ${C.accentGlow}`, borderRadius:10, padding:"12px 16px", marginBottom:20, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:16 }}>💡</span>
        <div style={{ fontSize:13, color:C.accent, lineHeight:1.6 }}>
          각 단계별로 <strong>우리 팀만의 영업 전략</strong>을 직접 작성하세요. 처음 시작할 때는 <strong>추천 전략 보기</strong>를 참고하실 수 있습니다.
        </div>
      </div>

      <div style={{ display:"grid", gap:16 }}>
        {STAGES.filter(s=>s.id!=="손실").map(s=>{
          const strat     = STAGE_STRATEGY[s.id];
          const isActive  = s.id === opp.stage;
          const histEntry = [...opp.stageHistory].reverse().find(h=>h.stage===s.id);
          const customStrat = (opp.stageStrategies||{})[s.id] || "";
          const isEditing   = editingStage === s.id;
          const tipsOpen    = showTips[s.id];

          return (
            <div key={s.id} style={{ background:isActive?`${s.color}08`:C.surface, border:`1.5px solid ${isActive?s.color:C.border}`, borderRadius:14, padding:"20px 22px", position:"relative" }}>

              {/* Stage header */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${s.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                  {strat?.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:isActive?s.color:C.text }}>{s.label}</span>
                    {isActive && <span style={{ fontSize:10, background:`${s.color}20`, color:s.color, padding:"2px 9px", borderRadius:10, fontWeight:700 }}>현재 단계</span>}
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>목표 확률 {s.prob}% {histEntry?`· 진입: ${histEntry.date}`:""}</div>
                </div>
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  {/* 추천 전략 토글 */}
                  <button onClick={()=>setShowTips(p=>({...p,[s.id]:!p[s.id]}))} style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", color:C.textMuted, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    {tipsOpen ? "추천 접기 ▲" : "추천 전략 ▼"}
                  </button>
                  {/* 편집 버튼 */}
                  {!isEditing && (
                    <button onClick={()=>setES(s.id)} style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${isActive?s.color:C.border}`, background:isActive?`${s.color}10`:"transparent", color:isActive?s.color:C.textMuted, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                      ✏ {customStrat?"수정":"작성"}
                    </button>
                  )}
                </div>
              </div>

              {/* 추천 전략 (접을 수 있음) */}
              {tipsOpen && (
                <div style={{ background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
                  <div style={{ fontSize:10, color:C.textMuted, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>📌 추천 전략 (참고용)</div>
                  <ul style={{ margin:0, padding:0, listStyle:"none", display:"grid", gap:6 }}>
                    {strat?.tips.map((tip,i)=>(
                      <li key={i} style={{ display:"flex", gap:8, fontSize:12, color:C.textMuted }}>
                        <span style={{ color:s.color, flexShrink:0, fontWeight:700 }}>›</span>
                        <span style={{ lineHeight:1.6 }}>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 담당자 작성 전략 */}
              {isEditing ? (
                <div>
                  <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", marginBottom:8 }}>우리 팀 전략 작성</div>
                  <StrategyEditor
                    value={customStrat}
                    stageColor={s.color}
                    tips={strat?.tips||[]}
                    onSave={val=>{
                      update({ stageStrategies:{ ...(opp.stageStrategies||{}), [s.id]:val } });
                      setES(null);
                    }}
                    onCancel={()=>setES(null)}
                  />
                </div>
              ) : (
                <div>
                  {customStrat ? (
                    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" }}>
                      <div style={{ fontSize:10, color:C.textMuted, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>✍ 우리 팀 전략</div>
                      <div style={{ fontSize:13, color:C.text, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{customStrat}</div>
                    </div>
                  ) : (
                    <div style={{ border:`1.5px dashed ${C.border}`, borderRadius:10, padding:"20px", textAlign:"center" }}>
                      <div style={{ fontSize:13, color:C.textDim, marginBottom:8 }}>아직 작성된 전략이 없습니다</div>
                      <button onClick={()=>setES(s.id)} style={{ padding:"6px 16px", borderRadius:8, border:`1px solid ${s.color}`, background:`${s.color}10`, color:s.color, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                        + 전략 작성하기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>}

    {/* ── 단계 히스토리 ── */}
    {subTab==="stagelog"&&<div>
      <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:13, color:C.textMuted }}>{opp.stageHistory.length}번의 단계 변경</span>
      </div>
      {opp.stageHistory.length===0&&<div style={{ textAlign:"center", padding:"60px 0", color:C.textMuted }}>단계 변경 기록이 없습니다</div>}
      {[...opp.stageHistory].sort((a,b)=>a.date.localeCompare(b.date)).map((h,i,arr)=>{
        const s=STAGE_MAP[h.stage]||{};
        return <div key={h.id} style={{ display:"flex", gap:16 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, paddingTop:4 }}>
            <div style={{ width:14, height:14, borderRadius:"50%", background:s.color, border:`2px solid ${s.color}50`, flexShrink:0 }}/>
            {i<arr.length-1&&<div style={{ width:2, flex:1, background:C.border, minHeight:28, marginTop:4, borderRadius:1 }}/>}
          </div>
          <div style={{ flex:1, paddingBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <StagePill stage={h.stage} size="md"/>
              <span style={{ fontSize:12, color:C.textMuted }}>{h.date}</span>
              <span style={{ fontSize:11, color:C.textDim }}>by {h.by}</span>
            </div>
            {h.note&&<div style={{ fontSize:13, color:C.text, lineHeight:1.6, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px" }}>{h.note}</div>}
          </div>
        </div>;
      })}
    </div>}

    {/* ── 활동 기록 ── */}
    {subTab==="activities"&&<div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <span style={{ fontSize:13, color:C.textMuted }}>{opp.activities.length}건의 활동</span>
        <Btn onClick={()=>setAM("new")}>+ 활동 기록</Btn>
      </div>
      {opp.activities.length===0&&<div style={{ textAlign:"center", padding:"60px 0", color:C.textMuted }}>기록된 활동이 없습니다</div>}
      {[...opp.activities].sort((a,b)=>b.date.localeCompare(a.date)).map((a,i,arr)=><div key={a.id} style={{ display:"flex", gap:16 }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, paddingTop:4 }}>
          <div style={{ width:12, height:12, borderRadius:"50%", background:C.accent, border:`2px solid ${C.accentGlow}` }}/>
          {i<arr.length-1&&<div style={{ width:2, flex:1, background:C.border, minHeight:24, marginTop:4, borderRadius:1 }}/>}
        </div>
        <div style={{ flex:1, paddingBottom:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{a.date}</span>
              <span style={{ fontSize:11, background:C.surfaceUp, color:C.textMuted, padding:"3px 9px", borderRadius:6, fontWeight:700 }}>{a.type}</span>
              <span style={{ fontSize:11, color:C.textDim }}>by {a.by}</span>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <Btn size="sm" variant="ghost" onClick={()=>setAM(a)}>수정</Btn>
              <Btn size="sm" variant="danger" onClick={()=>update({activities:opp.activities.filter(x=>x.id!==a.id)})}>삭제</Btn>
            </div>
          </div>
          <div style={{ fontSize:13, color:C.text, lineHeight:1.6, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px" }}>{a.content}</div>
          {a.clientRequest && (
            <div style={{ marginTop:8, background:C.yellowSoft, border:`1px solid ${C.yellow}30`, borderRadius:10, padding:"10px 16px" }}>
              <div style={{ fontSize:10, color:C.yellow, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:4 }}>💬 고객사 요청사항</div>
              <div style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>{a.clientRequest}</div>
            </div>
          )}
        </div>
      </div>)}
    </div>}

    {/* ── 파일 ── */}
    {subTab==="files"&&<div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <span style={{ fontSize:13, color:C.textMuted }}>{opp.files.length}개 파일</span>
        <Btn onClick={()=>setFM(true)}>+ 파일 추가</Btn>
      </div>
      {opp.files.length===0&&<div style={{ textAlign:"center", padding:"60px 0", color:C.textMuted }}>등록된 파일이 없습니다</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {opp.files.map(f=><div key={f.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px", display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ width:40, height:40, borderRadius:8, background:`${FILE_CLR[f.type]||C.textMuted}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{FILE_ICO[f.type]||"📁"}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</div>
            <div style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>{f.type} · {f.date}</div>
          </div>
          <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:C.accent, textDecoration:"none", padding:"4px 10px", border:`1px solid ${C.accentGlow}`, borderRadius:6 }}>열기 ↗</a>
          <Btn size="sm" variant="danger" onClick={()=>update({files:opp.files.filter(x=>x.id!==f.id)})}>삭제</Btn>
        </div>)}
      </div>
    </div>}

    {/* ── 액션 ── */}
    {subTab==="actions"&&<div>
      <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:13, color:C.textMuted }}>{oppActions.filter(a=>!a.done).length}개 진행 · {oppActions.filter(a=>a.done).length}개 완료</span>
        <Btn onClick={()=>setAM("addAction")}>+ 액션 추가</Btn>
      </div>
      {oppActions.length===0&&<div style={{ textAlign:"center", padding:"48px 0", color:C.textMuted }}>
        <div style={{ fontSize:32, marginBottom:12 }}>✓</div>
        <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:6 }}>등록된 액션이 없습니다</div>
        <div style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>이 영업기회에 필요한 액션을 추가해보세요</div>
        <Btn size="sm" onClick={()=>setAM("addAction")}>+ 첫 액션 추가</Btn>
      </div>}
      {oppActions.sort((a,b)=>a.done===b.done?0:a.done?1:-1).map(a=>{
        const ov=!a.done&&isLate(a.dueDate);
        return <div key={a.id} style={{ display:"flex", alignItems:"center", gap:14, background:C.surface, border:`1px solid ${ov?C.red+"40":C.border}`, borderRadius:10, padding:"13px 18px", marginBottom:8, opacity:a.done?.6:1 }}>
          <button onClick={()=>onUpdateActions(prev=>prev.map(x=>x.id===a.id?{...x,done:!x.done}:x))} style={{ width:22, height:22, borderRadius:6, border:`2px solid ${a.done?C.green:ov?C.red:C.border}`, background:a.done?C.green:"transparent", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11 }}>{a.done?"✓":""}</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, color:a.done?C.textMuted:C.text, textDecoration:a.done?"line-through":"none" }}>{a.title}</div>
            <div style={{ fontSize:11, color:C.textMuted }}>{a.owner} {a.dueDate && <span style={{ color:ov?C.red:C.textDim }}>· {ov?"⚠ ":""}{a.dueDate}</span>}</div>
          </div>
          <span style={{ fontSize:11, background:`${PRI_CFG[a.priority]}20`, color:PRI_CFG[a.priority], padding:"2px 9px", borderRadius:6, fontWeight:700 }}>{a.priority}</span>
          <div style={{ display:"flex", gap:6 }}>
            <Btn size="sm" variant="ghost" onClick={()=>setAM({...a, _editAction:true})}>수정</Btn>
            <Btn size="sm" variant="danger" onClick={()=>onUpdateActions(prev=>prev.filter(x=>x.id!==a.id))}>삭제</Btn>
          </div>
        </div>;
      })}
    </div>}

    {subTab==="news" && (
      <ClientNewsMonitor
        client={account}
        industry={account.industry}
      />
    )}

    {actModal&&actModal!=="addAction"&&!actModal._editAction&&<ActivityModal act={actModal==="new"?null:actModal} onSave={saveAct} onClose={()=>setAM(null)}/>}
    {(actModal==="addAction"||actModal?._editAction)&&<ActionForm
      action={actModal._editAction ? actModal : null}
      clients={clients}
      opps={[opp]}
      onClose={()=>setAM(null)}
      onSave={data=>{
        onUpdateActions(prev => actModal._editAction
          ? prev.map(a=>a.id===data.id?data:a)
          : [...prev, {...data, oppId:opp.id, clientId:opp.accountId}]
        );
        setAM(null);
      }}
    />}
    {fileModal&&<FileModal2 onSave={saveFile} onClose={()=>setFM(false)}/>}
    {stageModal&&<StageMoveModal opp={opp} onSave={handleStageMove} onClose={()=>setSM(false)}/>}
  </div>;
}

// ── Kanban Board ──────────────────────────────────────────────────────────────
function KanbanBoard({ opps, clients, onSelect, onUpdate }) {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDrop = (targetStage) => {
    if (!dragging || dragging.stage === targetStage) { setDragging(null); setDragOver(null); return; }
    const newProb = STAGE_MAP[targetStage]?.prob || 0;
    const entry = { id:uid(), stage:targetStage, date:today(), note:`칸반 보드에서 ${dragging.stage} → ${targetStage} 이동`, by:dragging.owner };
    onUpdate(prev=>prev.map(o=>o.id===dragging.id?{...o,stage:targetStage,probability:newProb,stageHistory:[...o.stageHistory,entry]}:o));
    setDragging(null); setDragOver(null);
  };

  const activeOpps = opps.filter(o=>o.stage!=="손실");
  const lostOpps   = opps.filter(o=>o.stage==="손실");

  return <div>
    <div style={{ overflowX:"auto", paddingBottom:12 }}>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${ACTIVE_STAGES.length},280px)`, gap:12, minWidth:ACTIVE_STAGES.length*292 }}>
        {ACTIVE_STAGES.map(stage=>{
          const stageOpps = activeOpps.filter(o=>o.stage===stage.id);
          const totalVal  = stageOpps.reduce((s,o)=>s+o.value,0);
          const isOver    = dragOver===stage.id;
          return <div key={stage.id}
            onDragOver={e=>{e.preventDefault();setDragOver(stage.id);}}
            onDragLeave={()=>setDragOver(null)}
            onDrop={()=>handleDrop(stage.id)}
            style={{ background:isOver?`${stage.color}08`:"#F8FAFC", border:`1px solid ${isOver?stage.color:C.border}`, borderRadius:12, padding:"14px 12px", height:700, display:"flex", flexDirection:"column", transition:"border-color .15s, background .15s" }}>
            <div style={{ marginBottom:14, flexShrink:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:stage.color, display:"block" }}/>
                  <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{stage.label}</span>
                  <span style={{ fontSize:11, background:`${stage.color}20`, color:stage.color, borderRadius:10, padding:"1px 7px", fontWeight:700 }}>{stageOpps.length}</span>
                </div>
                <span style={{ fontSize:11, color:C.textMuted }}>{stage.prob}%</span>
              </div>
              <div style={{ fontSize:12, color:stage.color, fontWeight:700 }}>{fmt(totalVal)}</div>
            </div>
            <div style={{ display:"grid", gap:8, alignContent:"start", overflowY:"auto", flex:1, paddingRight:2 }}>
              {stageOpps.map(o=>{
                const acc=clients.find(c=>c.id===o.accountId)||{};
                const late=isLate(o.nextStepDate);
                return <div key={o.id}
                  draggable
                  onDragStart={()=>setDragging(o)}
                  onDragEnd={()=>{setDragging(null);setDragOver(null);}}
                  onClick={()=>onSelect(o)}
                  style={{ background:C.surface, border:`1px solid ${dragging?.id===o.id?stage.color:C.border}`, borderRadius:10, padding:"12px 14px", cursor:"pointer", transition:"box-shadow .15s, border-color .15s", boxShadow:"0 1px 3px rgba(0,0,0,.07)", opacity:dragging?.id===o.id?.5:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4, lineHeight:1.3 }}>{o.name}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10, flexWrap:"wrap" }}>
                    <span style={{ fontSize:11, color:C.textMuted }}>{acc.name}</span>
                    {o.businessUnit&&(()=>{
                      const bu=BUSINESS_UNITS.find(b=>b.id===o.businessUnit);
                      return bu?<span style={{ fontSize:10, background:`${bu.color}18`, color:bu.color, padding:"1px 6px", borderRadius:6, fontWeight:700 }}>{bu.id}</span>:null;
                    })()}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:14, fontWeight:800, color:stage.color }}>{fmt(o.value)}</span>
                    <span style={{ fontSize:11, color:C.textMuted }}>{o.probability}%</span>
                  </div>
                  {o.nextStep&&<div style={{ fontSize:11, color:late?C.red:C.textMuted, borderTop:`1px solid ${C.border}`, paddingTop:8, display:"flex", gap:4 }}>
                    <span style={{ flexShrink:0 }}>{late?"⚠":"→"}</span>
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.nextStep}</span>
                  </div>}
                  <div style={{ fontSize:10, color:C.textDim, marginTop:6 }}>{o.closeDate} · {o.owner}</div>
                </div>;
              })}
              {stageOpps.length===0&&<div style={{ textAlign:"center", padding:"24px 0", color:C.textDim, fontSize:12 }}>딜 없음</div>}
            </div>
          </div>;
        })}
      </div>
    </div>
    {/* Lost opps strip */}
    {lostOpps.length>0&&<div style={{ marginTop:16, background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px" }}>
      <div style={{ fontSize:11, color:C.red, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>손실 ({lostOpps.length})</div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {lostOpps.map(o=>{
          const acc=clients.find(c=>c.id===o.accountId)||{};
          return <div key={o.id} onClick={()=>onSelect(o)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", cursor:"pointer", opacity:.7 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{o.name}</div>
            <div style={{ fontSize:11, color:C.textMuted }}>{acc.name} · {fmt(o.value)}</div>
          </div>;
        })}
      </div>
    </div>}
    <div style={{ marginTop:8, fontSize:11, color:C.textDim, textAlign:"right" }}>카드를 드래그해서 단계를 변경할 수 있습니다</div>
  </div>;
}

// ── List View ─────────────────────────────────────────────────────────────────
function OppListView({ opps, clients, onSelect }) {
  return <div style={{ display:"grid", gap:8 }}>
    {opps.map(o=>{
      const acc=clients.find(c=>c.id===o.accountId)||{};
      const s=STAGE_MAP[o.stage]||{};
      const late=isLate(o.nextStepDate);
      return <Card key={o.id} onClick={()=>onSelect(o)} style={{ display:"grid", gridTemplateColumns:"2.5fr 1fr 1fr 1.2fr 1.4fr 1fr", alignItems:"center", gap:16, padding:"14px 20px" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:2 }}>{o.name}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:C.textMuted }}>{acc.name} · {o.owner}</span>
            {o.businessUnit && (()=>{
              const bu = BUSINESS_UNITS.find(b=>b.id===o.businessUnit);
              return bu ? <span style={{ fontSize:10, background:`${bu.color}15`, color:bu.color, padding:"1px 7px", borderRadius:8, fontWeight:700 }}>{bu.id}</span> : null;
            })()}
          </div>
        </div>
        <StagePill stage={o.stage}/>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:s.color }}>{fmt(o.value)}</div>
          <div style={{ fontSize:11, color:C.textMuted }}>가중 {fmt(Math.round(o.value*o.probability/100))}</div>
        </div>
        <ProbBar value={o.probability} stage={o.stage}/>
        <div>
          <div style={{ fontSize:12, color:late&&o.stage!=="계약완료"?C.red:C.textMuted, fontWeight:late&&o.stage!=="계약완료"?700:400 }}>
            {late&&o.stage!=="계약완료"?"⚠ ":""}{o.nextStep||"—"}
          </div>
          <div style={{ fontSize:11, color:C.textDim }}>{o.nextStepDate}</div>
        </div>
        <div style={{ fontSize:12, color:C.textMuted }}>{o.closeDate||"—"}</div>
      </Card>;
    })}
    {opps.length===0&&<div style={{ textAlign:"center", padding:"60px 0", color:C.textMuted }}>영업기회가 없습니다</div>}
  </div>;
}

// ── Pipeline Main ─────────────────────────────────────────────────────────────
function Pipeline({ opps, onUpdateOpps, clients, actions, onUpdateActions, initialTarget, onClearTarget, meetings, onUpdateMeetings, archived, onArchive, onRestore, isAdmin, onNavigateToClient }) {
  const [pipeTab, setPipeTab]   = useState("pipeline");
  const [view, setView]         = useState("kanban");
  const [selected, setSelected] = useState(initialTarget || null);
  const [addModal, setAddModal] = useState(false);
  const [ownerFilter,  setOwner] = useState("전체");
  const [stageFilter,  setStage] = useState("활성");
  const [buFilter,     setBU]    = useState("전체"); // 사업부 필터
  const [archSearch,   setAS]    = useState("");

  useEffect(() => {
    if (initialTarget) { setSelected(initialTarget); onClearTarget && onClearTarget(); }
  }, [initialTarget]);

  if (selected) return <OppDetail opp={opps.find(o=>o.id===selected.id)||selected} clients={clients} onUpdate={onUpdateOpps} onBack={()=>setSelected(null)} actions={actions} onUpdateActions={onUpdateActions} onArchive={onArchive} isAdmin={isAdmin} onDelete={id=>{ onUpdateOpps(prev=>prev.filter(o=>o.id!==id)); }} onNavigateToClient={onNavigateToClient}/>;

  const owners    = ["전체",...new Set(opps.map(o=>o.owner).filter(Boolean))];
  const activeOpps = opps.filter(o=>stageFilter==="활성"?o.stage!=="계약완료"&&o.stage!=="손실":stageFilter==="계약완료"?o.stage==="계약완료":stageFilter==="손실"?o.stage==="손실":true);
  const filtered  = activeOpps
    .filter(o=>ownerFilter==="전체"||o.owner===ownerFilter)
    .filter(o=>buFilter==="전체"||o.businessUnit===buFilter);

  const allActive  = opps.filter(o=>o.stage!=="계약완료"&&o.stage!=="손실");
  const totalPipe  = allActive.reduce((s,o)=>s+o.value,0);
  const weighted   = allActive.reduce((s,o)=>s+Math.round(o.value*o.probability/100),0);
  const wonTotal   = opps.filter(o=>o.stage==="계약완료").reduce((s,o)=>s+o.value,0);
  const wonCount   = opps.filter(o=>o.stage==="계약완료").length;
  const closedCount= opps.filter(o=>o.stage==="계약완료"||o.stage==="손실").length;
  const winRate    = closedCount>0?Math.round(wonCount/closedCount*100):0;

  return <div>
    {/* ── Pipeline sub-tab bar ── */}
    <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:24, borderBottom:`1px solid ${C.border}` }}>
      {[
        { id:"pipeline", label:"영업기회 보드" },
        { id:"meetings", label:`회의록 (${meetings?.length||0})` },
        { id:"archive",  label:`아카이브 (${archived?.length||0})` },
      ].map(t => (
        <button key={t.id} onClick={()=>setPipeTab(t.id)} style={{
          padding:"10px 22px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
          borderBottom:`2px solid ${pipeTab===t.id?C.accent:"transparent"}`, marginBottom:-1,
          color:pipeTab===t.id?C.accent:C.textMuted, fontWeight:pipeTab===t.id?700:500, fontSize:14,
        }}>{t.label}</button>
      ))}
    </div>

    {/* ── 영업기회 보드 ── */}
    {pipeTab==="pipeline" && <div>
      {/* Metrics row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:16 }}>
        {[
          { label:"활성 파이프라인", val:fmt(totalPipe),  sub:`${allActive.length}개 딜`, color:C.accent  },
          { label:"가중 예상 매출",  val:fmt(weighted),   sub:"확률 반영",                color:C.purple  },
          { label:"누적 계약완료",   val:fmt(wonTotal),   sub:`${wonCount}건`,            color:C.green   },
          { label:"승률",            val:`${winRate}%`,   sub:`${closedCount}건 마감 기준`,color:winRate>=50?C.green:C.yellow },
        ].map(m=><Card key={m.label}>
          <div style={{ fontSize:11, color:C.textMuted, fontWeight:600, letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>{m.label}</div>
          <div style={{ fontSize:26, fontWeight:900, color:m.color, marginBottom:4 }}>{m.val}</div>
          <div style={{ fontSize:12, color:C.textMuted }}>{m.sub}</div>
        </Card>)}
      </div>

      {/* 사업부별 지표 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
        {BUSINESS_UNITS.map(bu=>{
          const buOpps    = opps.filter(o=>o.businessUnit===bu.id&&o.stage!=="손실");
          const buActive  = buOpps.filter(o=>o.stage!=="계약완료");
          const buWon     = buOpps.filter(o=>o.stage==="계약완료");
          const buPipe    = buActive.reduce((s,o)=>s+o.value,0);
          const buWonVal  = buWon.reduce((s,o)=>s+o.value,0);
          const isSelected = buFilter===bu.id;
          return (
            <div key={bu.id} onClick={()=>setBU(isSelected?"전체":bu.id)}
              style={{ background:isSelected?`${bu.color}10`:C.surface, border:`1.5px solid ${isSelected?bu.color:C.border}`, borderRadius:12, padding:"14px 16px", cursor:"pointer", transition:"all .15s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:bu.color }}/>
                <span style={{ fontSize:12, fontWeight:700, color:isSelected?bu.color:C.text }}>{bu.id}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                <div>
                  <div style={{ fontSize:10, color:C.textMuted, marginBottom:2 }}>파이프라인</div>
                  <div style={{ fontSize:13, fontWeight:800, color:bu.color }}>{fmt(buPipe)}</div>
                  <div style={{ fontSize:10, color:C.textMuted }}>{buActive.length}건</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.textMuted, marginBottom:2 }}>계약완료</div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.green }}>{fmt(buWonVal)}</div>
                  <div style={{ fontSize:10, color:C.textMuted }}>{buWon.length}건</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage funnel bar */}
      <Card style={{ marginBottom:20, padding:"16px 22px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <span style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", flexShrink:0 }}>단계별 현황</span>
          <div style={{ display:"flex", gap:12, flex:1, flexWrap:"wrap" }}>
            {STAGES.map(s=>{
              const cnt=opps.filter(o=>o.stage===s.id).length;
              const val=opps.filter(o=>o.stage===s.id).reduce((x,o)=>x+o.value,0);
              return <div key={s.id} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
                <span style={{ fontSize:12, color:C.textMuted }}>{s.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:s.color }}>{cnt}</span>
                <span style={{ fontSize:11, color:C.textDim }}>({fmt(val)})</span>
              </div>;
            })}
          </div>
        </div>
      </Card>

      {/* Controls */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:12 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {["활성","계약완료","손실","전체"].map(f=><button key={f} onClick={()=>setStage(f)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${stageFilter===f?C.accent:C.border}`, background:stageFilter===f?C.accentSoft:"transparent", color:stageFilter===f?C.accent:C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>{f}</button>)}
          <span style={{ width:1, height:20, background:C.border, alignSelf:"center" }}/>
          {/* 사업부 필터 */}
          {buFilter!=="전체" && <button onClick={()=>setBU("전체")} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${C.border}`, background:"transparent", color:C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>전체 사업부</button>}
          <span style={{ width:1, height:20, background:C.border, alignSelf:"center" }}/>
          {owners.map(o=><button key={o} onClick={()=>setOwner(o)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${ownerFilter===o?C.yellow:C.border}`, background:ownerFilter===o?C.yellowSoft:"transparent", color:ownerFilter===o?C.yellow:C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>{o}</button>)}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ display:"flex", background:C.surfaceUp, borderRadius:8, border:`1px solid ${C.border}`, overflow:"hidden" }}>
            {[{id:"kanban",label:"칸반"},{id:"list",label:"리스트"}].map(v=><button key={v.id} onClick={()=>setView(v.id)} style={{ padding:"7px 14px", background:view===v.id?C.accent:"transparent", color:view===v.id?"#fff":C.textMuted, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>{v.label}</button>)}
          </div>
          <Btn onClick={()=>setAddModal(true)}>+ 영업기회 추가</Btn>
        </div>
      </div>

      {view==="kanban"
        ? <KanbanBoard opps={filtered} clients={clients} onSelect={setSelected} onUpdate={onUpdateOpps}/>
        : <OppListView opps={filtered} clients={clients} onSelect={setSelected}/>}

      {addModal&&<OppFormModal clients={clients} onClose={()=>setAddModal(false)} onSave={data=>{onUpdateOpps(prev=>[...prev,data]);setAddModal(false);}}/>}
    </div>}

    {/* ── 회의록 ── */}
    {pipeTab==="meetings" && <Meetings meetings={meetings||[]} onUpdate={onUpdateMeetings}/>}

    {/* ── 아카이브 ── */}
    {pipeTab==="archive" && <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:2 }}>아카이브된 영업기회</div>
          <div style={{ fontSize:12, color:C.textMuted }}>삭제 대신 보관된 딜 · 복원하면 파이프라인으로 돌아옵니다</div>
        </div>
        <input value={archSearch} onChange={e=>setAS(e.target.value)} placeholder="검색..." style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", color:C.text, fontSize:13, outline:"none", width:200 }}/>
      </div>

      {(!archived||archived.length===0) && (
        <Card style={{ textAlign:"center", padding:"60px 32px" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📦</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:6 }}>아카이브가 비어 있습니다</div>
          <div style={{ fontSize:13, color:C.textMuted }}>영업기회 상세 페이지에서 📦 아카이브 버튼을 누르면 여기 보관됩니다</div>
        </Card>
      )}

      <div style={{ display:"grid", gap:10 }}>
        {(archived||[])
          .filter(o => !archSearch || o.name.includes(archSearch) || (clients.find(c=>c.id===o.accountId)?.name||"").includes(archSearch))
          .map(o => {
            const cl = clients.find(c=>c.id===o.accountId)||{};
            const s  = STAGE_MAP[o.stage]||{};
            return (
              <div key={o.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:16, opacity:.85 }}>
                {/* Archive icon */}
                <div style={{ width:40, height:40, borderRadius:10, background:C.surfaceUp, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>📦</div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:2 }}>{o.name}</div>
                  <div style={{ fontSize:12, color:C.textMuted }}>
                    {cl.name} · {o.owner}
                    {o.archivedAt && <span style={{ marginLeft:10, color:C.textDim }}>아카이브: {o.archivedAt}</span>}
                  </div>
                </div>

                {/* Stage pill */}
                <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, color:s.color, background:`${s.color}15`, flexShrink:0 }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:s.color }}/>{o.stage}
                </span>

                {/* Value */}
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:s.color }}>{fmt(o.value)}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{o.probability}%</div>
                </div>

                {/* Restore + Admin delete */}
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <Btn size="sm" variant="ghost" onClick={()=>{ if(window.confirm(`"${o.name}"을 파이프라인으로 복원하시겠습니까?`)) onRestore(o); }}>
                    ↩ 복원
                  </Btn>
                  {isAdmin && (
                    <Btn size="sm" variant="danger" onClick={()=>{ if(window.confirm(`⚠️ "${o.name}"을 영구 삭제하시겠습니까?\n되돌릴 수 없습니다.`)) onRestore && onRestore({...o, _permDelete:true}); }}>
                      🗑 삭제
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>}
  </div>;
}

// ─── CLIENT DB ────────────────────────────────────────────────────────────────
const INFLUENCE_LEVELS = ["결정권자", "강한 영향력", "검토자", "정보 수집자", "참고인"];
const INFLUENCE_COLOR  = { "결정권자":"#A8253A", "강한 영향력":"#8B5CF6", "검토자":"#3B6FE8", "정보 수집자":"#F59E0B", "참고인":"#64748B" };
const DEPT_LIST = ["구매팀","법무팀","기술팀","경영진","재무팀","IT팀","연구소","영업팀","기타"];

function ContactModal({ contact, contacts, onSave, onClose }) {
  const blank = { name:"", title:"", dept:"구매팀", phone:"", email:"", primary:false,
    address:"", birthday:"", hobby:"", family:"", keyNote:"", influence:"검토자", reportsTo:"" };
  const [f,sF] = useState(contact ? { ...blank, ...contact } : blank);
  const [tab, setTab] = useState("basic");
  const s = k => v => sF(p=>({...p,[k]:v}));

  const tabStyle = (id) => ({
    padding:"8px 16px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
    borderBottom:`2px solid ${tab===id?C.accent:"transparent"}`, color:tab===id?C.accent:C.textMuted,
    fontWeight:tab===id?700:500, fontSize:13, marginBottom:-1,
  });

  // contacts excluding self for reportsTo
  const others = (contacts||[]).filter(c => c.id !== contact?.id);

  return <Modal title={contact?"담당자 수정":"담당자 추가"} onClose={onClose}>
    {/* Sub-tabs */}
    <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
      <button style={tabStyle("basic")}    onClick={()=>setTab("basic")}>기본 정보</button>
      <button style={tabStyle("personal")} onClick={()=>setTab("personal")}>개인 정보</button>
      <button style={tabStyle("relation")} onClick={()=>setTab("relation")}>관계 & 영향력</button>
    </div>

    {tab==="basic" && <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <Inp label="이름"     value={f.name}  onChange={s("name")}/>
        <Inp label="직책"     value={f.title} onChange={s("title")}/>
        <Sel label="부서"     value={f.dept}  onChange={s("dept")} options={DEPT_LIST}/>
        <Inp label="전화번호" value={f.phone} onChange={s("phone")} placeholder="010-0000-0000"/>
        <div style={{ gridColumn:"1/-1" }}>
          <Inp label="이메일" value={f.email} onChange={s("email")} placeholder="name@company.com"/>
        </div>
      </div>
      <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:8 }}>
        <input type="checkbox" checked={f.primary} onChange={e=>sF(p=>({...p,primary:e.target.checked}))}/>
        <span style={{ fontSize:13, color:C.text }}>주 담당자로 설정</span>
      </label>
    </div>}

    {tab==="personal" && <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <Inp label="자택 주소"  value={f.address}  onChange={s("address")}  placeholder="서울시 강남구..."/>
        <Inp label="생년월일"   value={f.birthday} onChange={s("birthday")} type="date"/>
        <div style={{ gridColumn:"1/-1" }}>
          <Inp label="취미 / 관심사" value={f.hobby} onChange={s("hobby")} placeholder="골프, 와인, 독서 등"/>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <Inp label="가족 사항 (자녀 등)" value={f.family} onChange={s("family")} multiline
            placeholder="예: 자녀 2명 (초등학생), 배우자 의사 직종, 장남 미국 유학 중"/>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <Inp label="주요 사항 / 특이사항" value={f.keyNote} onChange={s("keyNote")} multiline
            placeholder="예: 매주 금요일 골프, 전 직장 삼성SDI 출신, 가격보다 신뢰 중시"/>
        </div>
      </div>
    </div>}

    {tab==="relation" && <div>
      <Sel label="영향력 수준" value={f.influence} onChange={s("influence")} options={INFLUENCE_LEVELS}/>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, color:C.textMuted, marginBottom:6, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" }}>영향력 설명</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {INFLUENCE_LEVELS.map(lv => (
            <div key={lv} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background:`${INFLUENCE_COLOR[lv]}15`, border:`1px solid ${INFLUENCE_COLOR[lv]}30` }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:INFLUENCE_COLOR[lv], flexShrink:0 }}/>
              <span style={{ fontSize:11, color:INFLUENCE_COLOR[lv], fontWeight:700 }}>{lv}</span>
            </div>
          ))}
        </div>
      </div>
      {others.length > 0 && <div style={{ marginBottom:16 }}>
        <label style={{ display:"block", fontSize:11, color:C.textMuted, marginBottom:6, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" }}>상위 보고 대상 (Reports To)</label>
        <select value={f.reportsTo} onChange={e=>s("reportsTo")(e.target.value)} style={{ width:"100%", background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:14, outline:"none" }}>
          <option value="">— 없음 (최상위) —</option>
          {others.map(c => <option key={c.id} value={c.id}>{c.name} ({c.title})</option>)}
        </select>
      </div>}
    </div>}

    <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
      <Btn variant="ghost" onClick={onClose}>취소</Btn>
      <Btn onClick={()=>onSave({...f, id:contact?.id||uid()})}>저장</Btn>
    </div>
  </Modal>;
}

function ContactsTab({ contacts, onEdit, onDelete }) {
  const [cView, setCView] = useState("card");
  return (
    <div>
      <div style={{ display:"flex", background:C.surfaceUp, borderRadius:8, border:`1px solid ${C.border}`, overflow:"hidden", marginBottom:16, width:"fit-content" }}>
        {[{id:"card",label:"카드 보기"},{id:"org",label:"조직도"}].map(v=>(
          <button key={v.id} onClick={()=>setCView(v.id)} style={{ padding:"7px 16px", background:cView===v.id?C.accent:"transparent", color:cView===v.id?"#fff":C.textMuted, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>{v.label}</button>
        ))}
      </div>

      {cView==="card" && <div>
        {contacts.length===0&&<div style={{ textAlign:"center", padding:"50px 0", color:C.textMuted }}>담당자 없음</div>}
        <div style={{ display:"grid", gap:14 }}>
          {contacts.map(c=>{
            const iColor = INFLUENCE_COLOR[c.influence||"검토자"] || C.textMuted;
            return <div key={c.id} style={{ background:C.surface, border:`1px solid ${c.primary?iColor:C.border}`, borderLeft:`4px solid ${iColor}`, borderRadius:12, padding:"18px 20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:`${iColor}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:iColor }}>{c.name[0]}</div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{c.name}</span>
                      {c.primary&&<span style={{ fontSize:10, background:C.accentSoft, color:C.accent, padding:"2px 8px", borderRadius:10, fontWeight:700 }}>주담당</span>}
                      {c.influence&&<span style={{ fontSize:10, background:`${iColor}15`, color:iColor, padding:"2px 9px", borderRadius:10, fontWeight:700 }}>{c.influence}</span>}
                    </div>
                    <div style={{ fontSize:12, color:C.textMuted, marginTop:3 }}>{c.title}{c.dept?` · ${c.dept}`:""}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <Btn size="sm" variant="ghost" onClick={()=>onEdit(c)}>수정</Btn>
                  <Btn size="sm" variant="danger" onClick={()=>onDelete(c.id)}>삭제</Btn>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:(c.hobby||c.family||c.keyNote)?12:0 }}>
                {c.phone&&<a href={`tel:${c.phone}`} style={{ fontSize:12, color:C.textMuted, textDecoration:"none" }}>📞 {c.phone}</a>}
                {c.email&&<a href={`mailto:${c.email}`} style={{ fontSize:12, color:C.textMuted, textDecoration:"none" }}>✉ {c.email}</a>}
                {c.address&&<div style={{ fontSize:12, color:C.textMuted }}>🏠 {c.address}</div>}
                {c.birthday&&<div style={{ fontSize:12, color:C.textMuted }}>🎂 {c.birthday}</div>}
              </div>
              {(c.hobby||c.family||c.keyNote)&&<div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, display:"flex", flexDirection:"column", gap:6 }}>
                {c.hobby  &&<div style={{ fontSize:12, color:C.text }}><span style={{ color:C.textMuted, fontWeight:600 }}>취미/관심사</span>　{c.hobby}</div>}
                {c.family &&<div style={{ fontSize:12, color:C.text }}><span style={{ color:C.textMuted, fontWeight:600 }}>가족 사항</span>　　{c.family}</div>}
                {c.keyNote&&<div style={{ fontSize:12, color:C.text, background:C.yellowSoft, borderRadius:6, padding:"6px 10px", marginTop:2 }}><span style={{ color:C.yellow, fontWeight:700 }}>📌 주요사항</span>　{c.keyNote}</div>}
              </div>}
              {c.reportsTo&&(()=>{const mgr=contacts.find(x=>x.id===c.reportsTo); return mgr?<div style={{ marginTop:10, fontSize:11, color:C.textMuted }}>↑ 보고 대상: <strong style={{ fontWeight:600, color:C.text }}>{mgr.name} ({mgr.title})</strong></div>:null;})()}
            </div>;
          })}
        </div>
      </div>}

      {cView==="org" && <OrgChart contacts={contacts}/>}
    </div>
  );
}
function OrgChart({ contacts }) {
  const [expanded, setExpanded] = useState({});

  if (contacts.length === 0) return (
    <div style={{ textAlign:"center", padding:"50px 0", color:C.textMuted }}>담당자를 추가하면 조직도가 표시됩니다</div>
  );

  // Build hierarchy tree
  const roots = contacts.filter(c => !c.reportsTo || !contacts.find(x => x.id === c.reportsTo));
  const getChildren = (parentId) => contacts.filter(c => c.reportsTo === parentId);

  const renderNode = (c, depth = 0) => {
    const children  = getChildren(c.id);
    const influence = c.influence || "검토자";
    const iColor    = INFLUENCE_COLOR[influence] || C.textMuted;
    const isEx      = expanded[c.id] !== false; // expanded by default

    return (
      <div key={c.id} style={{ marginLeft: depth > 0 ? 32 : 0, marginBottom: depth === 0 ? 16 : 8 }}>
        <div style={{ display:"flex", alignItems:"stretch", gap:0 }}>
          {/* Tree line */}
          {depth > 0 && (
            <div style={{ display:"flex", alignItems:"center", marginRight:12 }}>
              <div style={{ width:20, height:2, background:C.border }}/>
            </div>
          )}
          {/* Node card */}
          <div style={{
            flex:1, background:C.surface, border:`1.5px solid ${c.primary?iColor:C.border}`,
            borderLeft:`4px solid ${iColor}`, borderRadius:10, padding:"12px 16px",
            boxShadow: c.primary ? `0 2px 12px ${iColor}20` : "none",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:`${iColor}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:iColor, flexShrink:0 }}>
                  {c.name[0]}
                </div>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.text }}>{c.name}</span>
                    {c.primary && <span style={{ fontSize:10, background:C.accentSoft, color:C.accent, padding:"2px 7px", borderRadius:10, fontWeight:700 }}>주담당</span>}
                    <span style={{ fontSize:10, background:`${iColor}15`, color:iColor, padding:"2px 8px", borderRadius:10, fontWeight:700 }}>{influence}</span>
                  </div>
                  <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{c.title}{c.dept ? ` · ${c.dept}` : ""}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize:11, color:C.textMuted, textDecoration:"none" }}>📞</a>}
                {c.email && <a href={`mailto:${c.email}`} style={{ fontSize:11, color:C.textMuted, textDecoration:"none" }}>✉</a>}
                {children.length > 0 && (
                  <button onClick={()=>setExpanded(e=>({...e,[c.id]:!isEx}))} style={{ background:"none", border:"none", cursor:"pointer", color:C.textMuted, fontSize:13, padding:"2px 6px" }}>
                    {isEx ? "▲" : "▼"} {children.length}
                  </button>
                )}
              </div>
            </div>

            {/* Personal details snippet */}
            {(c.hobby || c.keyNote || c.family) && (
              <div style={{ marginTop:10, paddingTop:8, borderTop:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:4 }}>
                {c.hobby    && <div style={{ fontSize:11, color:C.textMuted }}>🎯 <strong style={{ fontWeight:600 }}>취미:</strong> {c.hobby}</div>}
                {c.family   && <div style={{ fontSize:11, color:C.textMuted }}>👨‍👩‍👧 <strong style={{ fontWeight:600 }}>가족:</strong> {c.family}</div>}
                {c.keyNote  && <div style={{ fontSize:11, color:C.textMuted }}>📌 <strong style={{ fontWeight:600 }}>주요사항:</strong> {c.keyNote}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {isEx && children.length > 0 && (
          <div style={{ marginLeft: 16, marginTop:8, paddingLeft:16, borderLeft:`2px dashed ${C.border}` }}>
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Unattached contacts (reportsTo set but target not found)
  const allRendered = new Set();
  const collectIds = (c) => { allRendered.add(c.id); getChildren(c.id).forEach(collectIds); };
  roots.forEach(collectIds);
  const orphans = contacts.filter(c => !allRendered.has(c.id));

  return (
    <div>
      {/* Legend */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20, padding:"10px 14px", background:C.surfaceUp, borderRadius:8, border:`1px solid ${C.border}` }}>
        <span style={{ fontSize:11, color:C.textMuted, fontWeight:700, marginRight:4 }}>영향력:</span>
        {INFLUENCE_LEVELS.map(lv => (
          <div key={lv} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:INFLUENCE_COLOR[lv], flexShrink:0 }}/>
            <span style={{ fontSize:11, color:INFLUENCE_COLOR[lv], fontWeight:700 }}>{lv}</span>
          </div>
        ))}
      </div>

      {/* Tree */}
      {roots.map(r => renderNode(r, 0))}

      {/* Orphans */}
      {orphans.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>기타 (계층 미설정)</div>
          {orphans.map(c => renderNode(c, 0))}
        </div>
      )}
    </div>
  );
}

function DBHistoryModal({ item, onSave, onClose }) {
  const [f,sF]=useState(item||{date:today(),type:"방문미팅",content:"",by:""});
  const s=k=>v=>sF(p=>({...p,[k]:v}));
  return <Modal title={item?"히스토리 수정":"미팅/접촉 기록"} onClose={onClose}>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <Inp label="날짜" type="date" value={f.date} onChange={s("date")}/>
      <Sel label="유형" value={f.type} onChange={s("type")} options={DB_CONTACT_TYPES}/>
      <div style={{ gridColumn:"1/-1" }}><Inp label="내용" value={f.content} onChange={s("content")} multiline/></div>
      <Inp label="작성자" value={f.by} onChange={s("by")}/>
    </div>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}><Btn variant="ghost" onClick={onClose}>취소</Btn><Btn onClick={()=>onSave({...f,id:item?.id||uid()})}>저장</Btn></div>
  </Modal>;
}

function DBFileModal({ onSave, onClose }) {
  const [f,sF]=useState({name:"",url:"",type:"제안서",date:today()});
  const s=k=>v=>sF(p=>({...p,[k]:v}));
  return <Modal title="파일 추가" onClose={onClose}>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <Inp label="파일명" value={f.name} onChange={s("name")} placeholder="파일명.pdf"/>
      <Sel label="유형" value={f.type} onChange={s("type")} options={FILE_TYPES}/>
      <div style={{ gridColumn:"1/-1" }}><Inp label="링크 URL" value={f.url} onChange={s("url")} placeholder="https://..."/></div>
      <Inp label="날짜" type="date" value={f.date} onChange={s("date")}/>
    </div>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}><Btn variant="ghost" onClick={onClose}>취소</Btn><Btn onClick={()=>f.name&&onSave({...f,id:uid()})}>추가</Btn></div>
  </Modal>;
}

// ─── CLIENT NEWS MONITOR ─────────────────────────────────────────────────────
function ClientNewsMonitor({ client, industry }) {
  const [news,       setNews]    = useState(null);   // { summary, articles, salesTips }
  const [loading,    setLoading] = useState(false);
  const [lastFetched,setLF]      = useState(null);
  const [category,   setCat]     = useState("전체"); // 전체 | 경영 | 재무 | 산업 | ESG

  const fetchNews = async () => {
    setLoading(true);
    setNews(null);

    const prompt = `당신은 영업 인텔리전스 전문가입니다.
"${client.name}" (업종: ${industry||client.industry||"일반"})에 대해 최근 동향을 분석해주세요.

웹 검색을 통해 다음을 조사하고 영업 담당자에게 유용한 형식으로 정리해주세요:

1. 최근 주요 뉴스 및 이슈 (최근 3개월 기준)
2. 경영/재무 동향 (투자, 실적, 조직 변화 등)
3. 산업/시장 동향 (시장 트렌드, 규제 변화 등)
4. 영업 기회 포인트 (이 뉴스가 우리 영업에 어떤 의미인지)

반드시 아래 JSON 형식으로만 답변하세요. 다른 텍스트 없이 JSON만 출력하세요:
{
  "summary": "2~3줄 핵심 요약",
  "articles": [
    {
      "category": "경영|재무|산업|ESG 중 하나",
      "title": "뉴스 제목",
      "content": "2~3줄 내용 요약",
      "date": "YYYY-MM 또는 최근",
      "impact": "high|medium|low",
      "impactDesc": "영업 관점에서의 의미"
    }
  ],
  "salesTips": [
    "이 고객사에 접근할 때 활용할 수 있는 구체적인 영업 포인트 1",
    "영업 포인트 2",
    "영업 포인트 3"
  ],
  "lastUpdated": "${new Date().toISOString().slice(0,10)}"
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-5",
          max_tokens:2000,
          tools:[{ type:"web_search_20250305", name:"web_search" }],
          messages:[{ role:"user", content:prompt }]
        })
      });
      const data = await res.json();

      // web_search 사용 시 여러 content 블록이 섞임 — text 블록만 합치기
      const textBlocks = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");

      // JSON 추출 — 코드펜스 안에 있을 수도, 그냥 텍스트일 수도 있음
      const jsonMatch = textBlocks.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON not found in response");
      const parsed = JSON.parse(jsonMatch[0]);
      setNews(parsed);
      setLF(new Date().toLocaleString("ko-KR"));
    } catch(e) {
      console.error("News fetch error:", e);
      setNews({ error: true, summary:`뉴스를 불러오는 데 실패했습니다. (${e.message}) 잠시 후 다시 시도해주세요.` });
    }
    setLoading(false);
  };

  const impactColor = { high:C.red, medium:C.yellow, low:C.green };
  const impactLabel = { high:"높음", medium:"중간", low:"낮음" };
  const categories  = ["전체","경영","재무","산업","ESG"];

  const filtered = news?.articles?.filter(a => category==="전체" || a.category===category) || [];

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:4 }}>
            📰 {client.name} 뉴스 모니터링
          </div>
          <div style={{ fontSize:12, color:C.textMuted }}>
            AI가 웹을 검색하여 최신 동향과 영업 인사이트를 제공합니다
            {lastFetched && <span style={{ marginLeft:10, color:C.textDim }}>마지막 업데이트: {lastFetched}</span>}
          </div>
        </div>
        <Btn onClick={fetchNews} style={{ minWidth:120 }}>
          {loading ? "검색 중..." : news ? "🔄 새로고침" : "🔍 뉴스 검색"}
        </Btn>
      </div>

      {/* Initial state */}
      {!news && !loading && (
        <Card style={{ textAlign:"center", padding:"60px 32px" }}>
          <div style={{ fontSize:40, marginBottom:16 }}>📰</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:8 }}>{client.name} 최신 동향을 검색해보세요</div>
          <div style={{ fontSize:13, color:C.textMuted, marginBottom:24, lineHeight:1.7 }}>
            AI가 실시간으로 웹을 검색하여<br/>
            경영·재무·산업 동향과 영업 포인트를 정리해드립니다
          </div>
          <Btn onClick={fetchNews}>🔍 지금 검색하기</Btn>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card style={{ textAlign:"center", padding:"60px 32px" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
            <div style={{ width:40, height:40, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
            <div style={{ fontSize:15, fontWeight:600, color:C.text }}>AI가 웹을 검색 중입니다...</div>
            <div style={{ fontSize:13, color:C.textMuted }}>최신 뉴스와 영업 인사이트를 분석하고 있습니다</div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </Card>
      )}

      {/* Error */}
      {news?.error && (
        <Card style={{ padding:"32px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <span style={{ fontSize:24 }}>⚠️</span>
            <div style={{ fontSize:14, fontWeight:700, color:C.red }}>뉴스 로드 실패</div>
          </div>
          <div style={{ fontSize:13, color:C.textMuted, marginBottom:16 }}>{news.summary}</div>
          <Btn onClick={fetchNews}>다시 시도</Btn>
        </Card>
      )}

      {/* Results */}
      {news && !news.error && !loading && (
        <div style={{ display:"grid", gap:16 }}>

          {/* Summary card */}
          <Card style={{ background:`${C.accent}08`, border:`1px solid ${C.accentGlow}` }}>
            <div style={{ fontSize:11, color:C.accent, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>핵심 요약</div>
            <div style={{ fontSize:14, color:C.text, lineHeight:1.8 }}>{news.summary}</div>
          </Card>

          {/* Sales tips */}
          {news.salesTips?.length > 0 && (
            <Card style={{ background:`${C.green}08`, border:`1px solid ${C.green}25` }}>
              <div style={{ fontSize:11, color:C.green, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:12 }}>💼 영업 활용 포인트</div>
              <div style={{ display:"grid", gap:8 }}>
                {news.salesTips.map((tip,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <div style={{ width:22, height:22, borderRadius:6, background:`${C.green}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:C.green, flexShrink:0 }}>{i+1}</div>
                    <div style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>{tip}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Category filter */}
          <div style={{ display:"flex", gap:8 }}>
            {categories.map(cat=>(
              <button key={cat} onClick={()=>setCat(cat)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${category===cat?C.accent:C.border}`, background:category===cat?C.accentSoft:"transparent", color:category===cat?C.accent:C.textMuted, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                {cat} {cat!=="전체"&&news.articles?.filter(a=>a.category===cat).length > 0 ? `(${news.articles.filter(a=>a.category===cat).length})` : ""}
              </button>
            ))}
          </div>

          {/* Articles */}
          <div style={{ display:"grid", gap:12 }}>
            {filtered.length===0 && <div style={{ textAlign:"center", padding:"32px 0", color:C.textMuted }}>해당 카테고리 뉴스가 없습니다</div>}
            {filtered.map((article,i)=>{
              const ic = impactColor[article.impact] || C.textMuted;
              return (
                <Card key={i} style={{ padding:"18px 20px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, background:`${ic}15`, color:ic, padding:"2px 9px", borderRadius:10, fontWeight:700 }}>
                        영향도 {impactLabel[article.impact]||"—"}
                      </span>
                      <span style={{ fontSize:11, background:C.surfaceUp, color:C.textMuted, padding:"2px 9px", borderRadius:10, fontWeight:600, border:`1px solid ${C.border}` }}>
                        {article.category}
                      </span>
                      {article.date && <span style={{ fontSize:11, color:C.textDim }}>{article.date}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:8, lineHeight:1.5 }}>{article.title}</div>
                  <div style={{ fontSize:13, color:C.textMuted, lineHeight:1.7, marginBottom:10 }}>{article.content}</div>
                  {article.impactDesc && (
                    <div style={{ display:"flex", gap:8, padding:"8px 12px", background:C.surfaceUp, borderRadius:8, borderLeft:`3px solid ${ic}` }}>
                      <span style={{ fontSize:11, color:ic, fontWeight:700, flexShrink:0 }}>영업 시사점</span>
                      <span style={{ fontSize:12, color:C.text }}>{article.impactDesc}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientDetail({ client, db, onUpdateDb, onBack, opps, onNavigateToPipeline }) {
  const data=db[client.id]||{bizNo:"",address:"",size:"",founded:"",website:"",note:"",contacts:[],history:[],files:[]};
  const [subTab,setST]=useState("info");
  const [cModal,setCM]=useState(null);
  const [hModal,setHM]=useState(null);
  const [fModal,setFM]=useState(false);
  const [editing,setEdit]=useState(false);
  const [form,setForm]=useState({bizNo:data.bizNo,address:data.address,size:data.size,founded:data.founded,website:data.website,note:data.note});
  const update=patch=>onUpdateDb(prev=>({...prev,[client.id]:{...data,...patch}}));
  const clientOpps=opps.filter(o=>o.accountId===client.id);
  const subTabs=[
    {id:"info",    label:"기본 정보"},
    {id:"contacts",label:`담당자 (${data.contacts.length})`},
    {id:"history", label:`히스토리 (${data.history.length})`},
    {id:"files",   label:`파일 (${data.files.length})`},
    {id:"opps",    label:`영업기회 (${clientOpps.length})`},
    {id:"news",    label:"📰 뉴스 모니터링"},
  ];
  return <div>
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
      <button onClick={onBack} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:13, padding:0, fontFamily:"inherit" }}>← 고객사 DB</button>
      <span style={{ color:C.textDim }}>/</span>
      <span style={{ fontSize:13, color:C.text, fontWeight:600 }}>{client.name}</span>
    </div>
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:"22px 28px", marginBottom:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:50, height:50, borderRadius:14, background:C.accentSoft, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:C.accent }}>{client.name[0]}</div>
        <div><div style={{ fontSize:20, fontWeight:900, color:C.text }}>{client.name}</div><div style={{ fontSize:13, color:C.textMuted, marginTop:2 }}>{client.industry} · {client.owner} 담당</div></div>
      </div>
    </div>
    <TabBar tabs={subTabs} active={subTab} onChange={setST}/>
    {subTab==="info"&&(editing?<div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <Inp label="사업자등록번호" value={form.bizNo} onChange={v=>setForm(p=>({...p,bizNo:v}))}/><Inp label="설립연도" value={form.founded} onChange={v=>setForm(p=>({...p,founded:v}))}/>
        <Inp label="기업규모" value={form.size} onChange={v=>setForm(p=>({...p,size:v}))}/><Inp label="웹사이트" value={form.website} onChange={v=>setForm(p=>({...p,website:v}))}/>
        <div style={{ gridColumn:"1/-1" }}><Inp label="주소" value={form.address} onChange={v=>setForm(p=>({...p,address:v}))}/></div>
        <div style={{ gridColumn:"1/-1" }}><Inp label="영업 메모" value={form.note} onChange={v=>setForm(p=>({...p,note:v}))} multiline/></div>
      </div>
      <div style={{ display:"flex", gap:10 }}><Btn variant="ghost" onClick={()=>setEdit(false)}>취소</Btn><Btn onClick={()=>{update(form);setEdit(false);}}>저장</Btn></div>
    </div>:<div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:14 }}>
        {[{label:"사업자번호",value:data.bizNo},{label:"기업규모",value:data.size},{label:"설립연도",value:data.founded?`${data.founded}년`:""},{label:"웹사이트",value:data.website,link:true}].map(it=><div key={it.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px" }}>
          <div style={{ fontSize:10, color:C.textMuted, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:5 }}>{it.label}</div>
          {it.link&&it.value?<a href={it.value} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:C.accent, textDecoration:"none" }}>{it.value}</a>:<div style={{ fontSize:13, color:it.value?C.text:C.textDim }}>{it.value||"—"}</div>}
        </div>)}
      </div>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", marginBottom:12 }}><div style={{ fontSize:10, color:C.textMuted, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:5 }}>주소</div><div style={{ fontSize:13, color:data.address?C.text:C.textDim }}>{data.address||"—"}</div></div>
      <div style={{ background:C.accentSoft, border:`1px solid ${C.accentGlow}`, borderRadius:10, padding:"14px 16px", marginBottom:16 }}><div style={{ fontSize:10, color:C.accent, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:6 }}>영업 메모</div><div style={{ fontSize:13, color:C.text, lineHeight:1.7 }}>{data.note||"—"}</div></div>
      <Btn variant="ghost" size="sm" onClick={()=>{setForm({bizNo:data.bizNo,address:data.address,size:data.size,founded:data.founded,website:data.website,note:data.note});setEdit(true);}}>✏ 수정</Btn>
    </div>)}
    {subTab==="contacts"&&<div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <span style={{ fontSize:13, color:C.textMuted }}>{data.contacts.length}명 등록</span>
        <Btn onClick={()=>setCM("new")}>+ 담당자 추가</Btn>
      </div>
      <ContactsTab
        contacts={data.contacts}
        onEdit={c=>setCM(c)}
        onDelete={id=>update({contacts:data.contacts.filter(x=>x.id!==id)})}
      />
    </div>}
    {subTab==="history"&&<div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}><span style={{ fontSize:13, color:C.textMuted }}>{data.history.length}건</span><Btn onClick={()=>setHM("new")}>+ 기록</Btn></div>
      {data.history.length===0&&<div style={{ textAlign:"center", padding:"50px 0", color:C.textMuted }}>히스토리 없음</div>}
      {[...data.history].sort((a,b)=>b.date.localeCompare(a.date)).map((h,i,arr)=><div key={h.id} style={{ display:"flex", gap:14 }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, paddingTop:4 }}>
          <div style={{ width:12, height:12, borderRadius:"50%", background:C.accent, border:`2px solid ${C.accentGlow}` }}/>
          {i<arr.length-1&&<div style={{ width:2, flex:1, background:C.border, minHeight:24, marginTop:4, borderRadius:1 }}/>}
        </div>
        <div style={{ flex:1, paddingBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{h.date}</span>
              <span style={{ fontSize:11, background:C.surfaceUp, color:C.textMuted, padding:"3px 9px", borderRadius:6, fontWeight:700 }}>{h.type}</span>
              <span style={{ fontSize:11, color:C.textDim }}>by {h.by}</span>
            </div>
            <div style={{ display:"flex", gap:6 }}><Btn size="sm" variant="ghost" onClick={()=>setHM(h)}>수정</Btn><Btn size="sm" variant="danger" onClick={()=>update({history:data.history.filter(x=>x.id!==h.id)})}>삭제</Btn></div>
          </div>
          <div style={{ fontSize:13, color:C.text, lineHeight:1.6, background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"11px 14px" }}>{h.content}</div>
        </div>
      </div>)}
    </div>}
    {subTab==="files"&&<div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}><span style={{ fontSize:13, color:C.textMuted }}>{data.files.length}건</span><Btn onClick={()=>setFM(true)}>+ 파일</Btn></div>
      {data.files.length===0&&<div style={{ textAlign:"center", padding:"50px 0", color:C.textMuted }}>파일 없음</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {data.files.map(f=><div key={f.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px", display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ width:38, height:38, borderRadius:8, background:`${FILE_CLR[f.type]||C.textMuted}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{FILE_ICO[f.type]}</div>
          <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:13, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</div><div style={{ fontSize:11, color:C.textMuted }}>{f.type} · {f.date}</div></div>
          <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:C.accent, textDecoration:"none" }}>열기↗</a>
          <Btn size="sm" variant="danger" onClick={()=>update({files:data.files.filter(x=>x.id!==f.id)})}>삭제</Btn>
        </div>)}
      </div>
    </div>}
    {subTab==="opps"&&<div>
      <div style={{ fontSize:13, color:C.textMuted, marginBottom:16 }}>{client.name}의 영업기회 {clientOpps.length}건</div>
      {clientOpps.length===0&&<div style={{ textAlign:"center", padding:"50px 0", color:C.textMuted }}>연결된 영업기회 없음</div>}
      <div style={{ display:"grid", gap:8 }}>
        {clientOpps.map(o=>{
          const s=STAGE_MAP[o.stage]||{};
          return <div key={o.id} onClick={()=>onNavigateToPipeline&&onNavigateToPipeline(o)}
            style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:16, cursor:onNavigateToPipeline?"pointer":"default", transition:"border-color .15s, box-shadow .15s" }}
            onMouseEnter={e=>{if(onNavigateToPipeline){e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.boxShadow=`0 0 0 1px ${C.accentGlow}`;}}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{o.name}</div>
              <div style={{ fontSize:12, color:C.textMuted }}>{o.owner} · {o.closeDate}</div>
            </div>
            <StagePill stage={o.stage}/>
            <span style={{ fontSize:15, fontWeight:800, color:s.color }}>{fmt(o.value)}</span>
            {onNavigateToPipeline && <span style={{ fontSize:12, color:C.accent }}>→</span>}
          </div>;
        })}
      </div>
    </div>}

    {subTab==="news"&&<ClientNewsMonitor client={client} industry={data.industry||client.industry}/>}

    {cModal&&<ContactModal contact={cModal==="new"?null:cModal} contacts={data.contacts} onSave={c=>{const ex=data.contacts.find(x=>x.id===c.id);update({contacts:ex?data.contacts.map(x=>x.id===c.id?c:x):[...data.contacts,c]});setCM(null);}} onClose={()=>setCM(null)}/>}
    {hModal&&<DBHistoryModal item={hModal==="new"?null:hModal} onSave={h=>{const ex=data.history.find(x=>x.id===h.id);const list=ex?data.history.map(x=>x.id===h.id?h:x):[...data.history,h];update({history:list.sort((a,b)=>b.date.localeCompare(a.date))});setHM(null);}} onClose={()=>setHM(null)}/>}
    {fModal&&<DBFileModal onSave={f=>{update({files:[...data.files,f]});setFM(false);}} onClose={()=>setFM(false)}/>}
  </div>;
}

function ClientFormModal({ client, onSave, onClose }) {
  const blank = { name:"", industry:"", owner:"" };
  const [f, sF] = useState(client || blank);
  const s = k => v => sF(p => ({...p, [k]:v}));
  return <Modal title={client ? "고객사 수정" : "고객사 추가"} onClose={onClose}>
    <Inp label="고객사명" value={f.name} onChange={s("name")} placeholder="예: 삼성전자"/>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <Inp label="업종" value={f.industry} onChange={s("industry")} placeholder="예: 반도체, 화학"/>
      <Inp label="영업 담당자" value={f.owner} onChange={s("owner")} placeholder="예: 김민준"/>
    </div>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
      <Btn variant="ghost" onClick={onClose}>취소</Btn>
      <Btn onClick={() => f.name && onSave({...f, id: client?.id || uid()})}>저장</Btn>
    </div>
  </Modal>;
}

function ClientDB({ clients, onUpdateClients, db, onUpdateDb, opps, archivedClients, archivedDb, onArchiveClient, onRestoreClient, isAdmin, onNavigateToPipeline, initialClient, onClearClient }) {
  const [selected,   setSelected] = useState(initialClient || null);
  const [search,     setSearch]   = useState("");
  const [indFilter,  setInd]      = useState("전체");
  const [modal,      setModal]    = useState(null);
  const [clientTab,  setCTab]     = useState("active");
  const [archSearch, setAS]       = useState("");

  useEffect(() => {
    if (initialClient) { setSelected(initialClient); onClearClient && onClearClient(); }
  }, [initialClient]);

  if (selected) return <ClientDetail client={selected} db={db} onUpdateDb={onUpdateDb} onBack={()=>setSelected(null)} opps={opps} onNavigateToPipeline={onNavigateToPipeline}/>;

  const industries = ["전체", ...new Set(clients.map(c => c.industry).filter(Boolean))];
  const list = clients
    .filter(c => indFilter==="전체" || c.industry===indFilter)
    .filter(c => c.name.includes(search) || (c.owner||"").includes(search));

  const handleSave = (data) => {
    if (modal === "add") {
      onUpdateClients && onUpdateClients(prev => [...prev, data]);
    } else {
      onUpdateClients && onUpdateClients(prev => prev.map(c => c.id===data.id ? data : c));
    }
    setModal(null);
  };

  return <div>
    {/* Sub-tabs */}
    <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
      {[
        { id:"active",   label:`활성 고객사 (${clients.length})` },
        { id:"archived", label:`아카이브 (${archivedClients?.length||0})` },
      ].map(t=>(
        <button key={t.id} onClick={()=>setCTab(t.id)} style={{
          padding:"10px 22px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
          borderBottom:`2px solid ${clientTab===t.id?C.accent:"transparent"}`, marginBottom:-1,
          color:clientTab===t.id?C.accent:C.textMuted, fontWeight:clientTab===t.id?700:500, fontSize:14,
        }}>{t.label}</button>
      ))}
    </div>

    {/* ── 활성 고객사 ── */}
    {clientTab==="active" && <div>
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="고객사명 / 담당자 검색..." style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 14px", color:C.text, fontSize:14, outline:"none", width:260 }}/>
        {industries.map(ind=><button key={ind} onClick={()=>setInd(ind)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${indFilter===ind?C.accent:C.border}`, background:indFilter===ind?C.accentSoft:"transparent", color:indFilter===ind?C.accent:C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>{ind}</button>)}
        <span style={{ marginLeft:"auto", fontSize:12, color:C.textMuted }}>{list.length}개</span>
        <Btn onClick={()=>setModal("add")}>+ 고객사 추가</Btn>
      </div>

      {list.length === 0 && (
        <Card style={{ textAlign:"center", padding:"60px 32px" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🏢</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:8 }}>고객사가 없습니다</div>
          <div style={{ fontSize:13, color:C.textMuted, marginBottom:24 }}>고객사를 추가하고 담당자, 히스토리, 파일을 관리해보세요</div>
          <Btn onClick={()=>setModal("add")}>+ 첫 고객사 추가</Btn>
        </Card>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
        {list.map(c=>{
          const d    = db[c.id]||{contacts:[],history:[],files:[]};
          const p    = d.contacts?.find(x=>x.primary)||d.contacts?.[0];
          const cOpps= opps.filter(o=>o.accountId===c.id);
          return <Card key={c.id} onClick={()=>setSelected(c)} style={{ padding:"20px 22px" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:C.accentSoft, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:900, color:C.accent, flexShrink:0 }}>{c.name[0]}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{c.name}</div>
                <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{c.industry} · {c.owner} 담당</div>
              </div>
              <div style={{ display:"flex", gap:4 }} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>setModal(c)} style={{ background:"none", border:"none", cursor:"pointer", color:C.textMuted, fontSize:13, padding:"2px 6px", borderRadius:4 }} title="수정">✏</button>
                <button onClick={()=>{ if(window.confirm(`"${c.name}"을 아카이브 하시겠습니까?\n담당자, 히스토리, 파일 등 모든 정보가 함께 보관됩니다.`)) onArchiveClient(c); }} style={{ background:"none", border:"none", cursor:"pointer", color:C.textMuted, fontSize:13, padding:"2px 6px", borderRadius:4 }} title="아카이브">📦</button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:12 }}>
              {[
                {label:"담당자",   val:d.contacts?.length||0,  color:(d.contacts?.length)?C.accent:C.textDim},
                {label:"히스토리", val:d.history?.length||0,   color:(d.history?.length)?C.yellow:C.textDim},
                {label:"파일",     val:d.files?.length||0,     color:(d.files?.length)?C.green:C.textDim},
                {label:"영업기회", val:cOpps.length,           color:cOpps.length?C.purple:C.textDim},
              ].map(it=><div key={it.label} style={{ background:C.surfaceUp, borderRadius:8, padding:"7px 8px", textAlign:"center" }}>
                <div style={{ fontSize:16, fontWeight:800, color:it.color }}>{it.val}</div>
                <div style={{ fontSize:10, color:C.textMuted }}>{it.label}</div>
              </div>)}
            </div>
            {p?<div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:C.surfaceUp, borderRadius:8, marginBottom:10 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:C.accentSoft, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:C.accent, flexShrink:0 }}>{p.name[0]}</div>
              <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:12, color:C.text, fontWeight:600 }}>{p.name}</div><div style={{ fontSize:10, color:C.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</div></div>
            </div>:<div style={{ padding:"8px 10px", background:C.surfaceUp, borderRadius:8, marginBottom:10, fontSize:12, color:C.textDim, textAlign:"center" }}>담당자 미등록</div>}
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, fontSize:11, color:d.history?.[0]?C.textMuted:C.textDim }}>
              {d.history?.[0]?<span><span style={{ color:C.textDim }}>최근</span> · {d.history[0].date} {d.history[0].type}</span>:"접촉 기록 없음"}
            </div>
          </Card>;
        })}
      </div>
    </div>}

    {/* ── 아카이브 ── */}
    {clientTab==="archived" && <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:2 }}>아카이브된 고객사</div>
          <div style={{ fontSize:12, color:C.textMuted }}>담당자·히스토리·파일 등 모든 데이터 보존 · 복원 시 활성 목록으로 이동</div>
        </div>
        <input value={archSearch} onChange={e=>setAS(e.target.value)} placeholder="검색..." style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", color:C.text, fontSize:13, outline:"none", width:200 }}/>
      </div>

      {(!archivedClients||archivedClients.length===0) && (
        <Card style={{ textAlign:"center", padding:"60px 32px" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📦</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:6 }}>아카이브가 비어 있습니다</div>
          <div style={{ fontSize:13, color:C.textMuted }}>고객사 카드의 📦 버튼을 누르면 여기 보관됩니다</div>
        </Card>
      )}

      <div style={{ display:"grid", gap:12 }}>
        {(archivedClients||[])
          .filter(c => !archSearch || c.name.includes(archSearch) || (c.owner||"").includes(archSearch))
          .map(c => {
            const adb   = archivedDb?.[c.id] || {};
            const cOpps = opps.filter(o => o.accountId === c.id);
            return (
              <div key={c.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", display:"flex", alignItems:"center", gap:16, opacity:.85 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:C.surfaceUp, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, color:C.textMuted, flexShrink:0 }}>{c.name[0]}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:2 }}>{c.name}</div>
                  <div style={{ fontSize:12, color:C.textMuted, marginBottom:6 }}>{c.industry} · {c.owner} 담당</div>
                  <div style={{ display:"flex", gap:12 }}>
                    {[
                      {label:"담당자",   val:adb.contacts?.length||0},
                      {label:"히스토리", val:adb.history?.length||0},
                      {label:"파일",     val:adb.files?.length||0},
                      {label:"영업기회", val:cOpps.length},
                    ].map(it=>(
                      <span key={it.label} style={{ fontSize:11, color:C.textMuted }}>
                        <strong style={{ color:C.text }}>{it.val}</strong> {it.label}
                      </span>
                    ))}
                  </div>
                </div>
                {c.archivedAt && <div style={{ fontSize:11, color:C.textDim, textAlign:"center", flexShrink:0 }}>
                  <div>아카이브</div><div style={{ fontWeight:600, color:C.textMuted }}>{c.archivedAt}</div>
                </div>}
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <Btn size="sm" variant="ghost" onClick={()=>{ if(window.confirm(`"${c.name}"을 복원하시겠습니까?`)) onRestoreClient(c, false); }}>↩ 복원</Btn>
                  {isAdmin && <Btn size="sm" variant="danger" onClick={()=>{ if(window.confirm(`⚠️ "${c.name}"을 영구 삭제하시겠습니까?`)) onRestoreClient(c, true); }}>🗑 삭제</Btn>}
                </div>
              </div>
            );
          })}
      </div>
    </div>}

    {modal && <ClientFormModal client={modal==="add"?null:modal} onClose={()=>setModal(null)} onSave={handleSave}/>}
  </div>;
}


// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ opps, actions, meetings, clients }) {
  const [dashTab, setDashTab] = useState("overview");

  const activeOpps=opps.filter(o=>o.stage!=="계약완료"&&o.stage!=="손실");
  const totalPipe=activeOpps.reduce((s,o)=>s+o.value,0);
  const weighted=activeOpps.reduce((s,o)=>s+Math.round(o.value*o.probability/100),0);
  const won=opps.filter(o=>o.stage==="계약완료");
  const pending=actions.filter(a=>!a.done);
  const late=pending.filter(a=>isLate(a.dueDate));

  return <div>
    {/* Dashboard sub-tab bar */}
    <div style={{ display:"flex", gap:0, marginBottom:24, borderBottom:`1px solid ${C.border}` }}>
      {[
        { id:"overview", label:"영업 현황" },
        { id:"report",   label:"주간 리포트" },
      ].map(t=>(
        <button key={t.id} onClick={()=>setDashTab(t.id)} style={{
          padding:"10px 22px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
          borderBottom:`2px solid ${dashTab===t.id?C.accent:"transparent"}`, marginBottom:-1,
          color:dashTab===t.id?C.accent:C.textMuted, fontWeight:dashTab===t.id?700:500, fontSize:14,
        }}>{t.label}</button>
      ))}
    </div>

    {/* ── 영업 현황 ── */}
    {dashTab==="overview" && <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
        {[
          { label:"총 파이프라인",  val:fmt(totalPipe), sub:`${activeOpps.length}개 활성 딜`,         color:C.accent },
          { label:"가중 예상 매출", val:fmt(weighted),  sub:"확률 반영",                              color:C.purple },
          { label:"계약 완료",      val:fmt(won.reduce((s,o)=>s+o.value,0)), sub:`${won.length}건`,   color:C.green  },
          { label:"진행 중 액션",   val:pending.length, sub:`${late.length}개 기한 초과`,             color:late.length?C.red:C.yellow },
        ].map(m=><Card key={m.label}><div style={{ fontSize:11, color:C.textMuted, fontWeight:600, letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>{m.label}</div><div style={{ fontSize:26, fontWeight:900, color:m.color, marginBottom:4 }}>{m.val}</div><div style={{ fontSize:12, color:C.textMuted }}>{m.sub}</div></Card>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <Card>
          <SL>단계별 파이프라인</SL>
          {STAGES.map(s=>{
            const list=opps.filter(o=>o.stage===s.id);
            if(!list.length)return null;
            return <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
              <span style={{ fontSize:13, color:C.text, flex:1 }}>{s.label}</span>
              <span style={{ fontSize:12, color:C.textMuted }}>{list.length}건</span>
              <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{fmt(list.reduce((x,o)=>x+o.value,0))}</span>
            </div>;
          })}
        </Card>
        <Card>
          <SL>기한 임박 액션</SL>
          {pending.slice(0,5).map(a=>{
            const opp=opps.find(o=>o.id===a.oppId)||{};
            const cl=clients.find(c=>c.id===a.clientId)||{};
            const ov=isLate(a.dueDate);
            return <div key={a.id} style={{ display:"flex", gap:10, marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${C.border}` }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:PRI_CFG[a.priority], marginTop:5, flexShrink:0 }}/>
              <div style={{ flex:1 }}><div style={{ fontSize:13, color:C.text }}>{a.title}</div><div style={{ fontSize:11, color:C.textMuted }}>{cl.name||opp.name} · {a.owner}</div></div>
              <span style={{ fontSize:11, color:ov?C.red:C.textMuted, fontWeight:ov?700:400 }}>{ov?"⚠ ":""}{a.dueDate}</span>
            </div>;
          })}
          {pending.length===0&&<div style={{ color:C.textMuted, fontSize:13 }}>모든 액션 완료 ✓</div>}
        </Card>
      </div>
    </div>}

    {/* ── 주간 리포트 ── */}
    {dashTab==="report" && <WeeklyReport opps={opps} actions={actions} meetings={meetings} clients={clients}/>}
  </div>;
}

// ─── MEETINGS ─────────────────────────────────────────────────────────────────
function MeetingForm({ meeting, onSave, onClose }) {
  const blank={weekOf:today(),title:"주간 영업 회의",attendees:"",agenda:"",notes:"",decisions:"",nextWeekFocus:""};
  const toF=m=>m?{...m,attendees:m.attendees.join(", "),decisions:m.decisions.join("\n")}:blank;
  const [f,sF]=useState(toF(meeting)); const s=k=>v=>sF(p=>({...p,[k]:v}));
  return <Modal title={meeting?"회의록 수정":"새 회의록"} onClose={onClose}>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <Inp label="주차 날짜" type="date" value={f.weekOf} onChange={s("weekOf")}/><Inp label="제목" value={f.title} onChange={s("title")}/>
      <div style={{ gridColumn:"1/-1" }}><Inp label="참석자 (쉼표 구분)" value={f.attendees} onChange={s("attendees")}/></div>
      <div style={{ gridColumn:"1/-1" }}><Inp label="아젠다" value={f.agenda} onChange={s("agenda")} multiline/></div>
      <div style={{ gridColumn:"1/-1" }}><Inp label="회의 내용" value={f.notes} onChange={s("notes")} multiline/></div>
      <div style={{ gridColumn:"1/-1" }}><Inp label="결정 사항 (줄바꿈)" value={f.decisions} onChange={s("decisions")} multiline/></div>
      <div style={{ gridColumn:"1/-1" }}><Inp label="다음 주 포커스" value={f.nextWeekFocus} onChange={s("nextWeekFocus")} multiline/></div>
    </div>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
      <Btn variant="ghost" onClick={onClose}>취소</Btn>
      <Btn onClick={()=>onSave({...f,id:meeting?.id||uid(),attendees:f.attendees.split(",").map(x=>x.trim()).filter(Boolean),decisions:f.decisions.split("\n").map(x=>x.trim()).filter(Boolean)})}>저장</Btn>
    </div>
  </Modal>;
}

function Meetings({ meetings, onUpdate }) {
  const [modal,sM]=useState(null);const [exp,sE]=useState(null);
  return <div>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}><span style={{ fontSize:13, color:C.textMuted }}>{meetings.length}개 회의록</span><Btn onClick={()=>sM("add")}>+ 회의록 작성</Btn></div>
    <div style={{ display:"grid", gap:12 }}>
      {[...meetings].sort((a,b)=>b.weekOf.localeCompare(a.weekOf)).map(m=><Card key={m.id}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}><span style={{ background:C.accentSoft, color:C.accent, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{m.weekOf}</span><span style={{ fontSize:15, fontWeight:700, color:C.text }}>{m.title}</span></div>
            <div style={{ fontSize:12, color:C.textMuted, marginBottom:exp!==m.id?6:0 }}>참석: {m.attendees.join(", ")}</div>
            {exp!==m.id&&<div style={{ fontSize:13, color:C.textMuted, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", maxWidth:600 }}>{m.agenda}</div>}
          </div>
          <div style={{ display:"flex", gap:8 }}><Btn size="sm" variant="ghost" onClick={()=>sM(m)}>수정</Btn><Btn size="sm" variant="ghost" onClick={()=>sE(exp===m.id?null:m.id)}>{exp===m.id?"접기":"보기"}</Btn></div>
        </div>
        {exp===m.id&&<div style={{ marginTop:18, borderTop:`1px solid ${C.border}`, paddingTop:18 }}>
          {[["아젠다",m.agenda],["회의 내용",m.notes]].map(([l,v])=><div key={l} style={{ marginBottom:12 }}><SL>{l}</SL><div style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>{v}</div></div>)}
          {m.decisions.length>0&&<div style={{ marginBottom:12 }}><SL>결정 사항</SL>{m.decisions.map((d,i)=><div key={i} style={{ display:"flex", gap:8, marginBottom:5 }}><span style={{ color:C.green, fontWeight:700 }}>✓</span><span style={{ fontSize:13, color:C.text }}>{d}</span></div>)}</div>}
          <div style={{ background:C.accentSoft, borderRadius:8, padding:"12px 16px", border:`1px solid ${C.accentGlow}` }}><SL>다음 주 포커스</SL><div style={{ fontSize:13, color:C.text }}>{m.nextWeekFocus}</div></div>
        </div>}
      </Card>)}
    </div>
    {(modal==="add"||(modal&&modal.id))&&<MeetingForm meeting={modal==="add"?null:modal} onClose={()=>sM(null)} onSave={data=>{onUpdate(prev=>modal==="add"?[...prev,data]:prev.map(m=>m.id===data.id?data:m));sM(null);}}/>}
  </div>;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

// ── 액션 템플릿 데이터 ──
const ACTION_TEMPLATES = [
  {
    id:"t1", name:"리드 → 초기접촉", stage:"리드", color:"#64748B",
    actions:[
      { title:"고객사 기본 정보 조사 및 Pain Point 분석",  priority:"높음", dayOffset:1 },
      { title:"결정권자 및 이해관계자 파악",               priority:"높음", dayOffset:2 },
      { title:"초기 미팅 일정 요청",                       priority:"높음", dayOffset:3 },
    ]
  },
  {
    id:"t2", name:"제안 준비", stage:"니즈파악", color:"#3B6FE8",
    actions:[
      { title:"고객 니즈 맞춤형 제안서 작성",              priority:"높음", dayOffset:3 },
      { title:"ROI 및 비즈니스 임팩트 수치화",             priority:"높음", dayOffset:4 },
      { title:"제안 발표 일정 확보",                       priority:"중간", dayOffset:2 },
      { title:"Q&A 시나리오 및 대응 자료 준비",            priority:"중간", dayOffset:5 },
    ]
  },
  {
    id:"t3", name:"협상 클로징", stage:"협상", color:"#8B5CF6",
    actions:[
      { title:"최종 계약 조건 정리 및 내부 승인 요청",     priority:"높음", dayOffset:2 },
      { title:"계약서 초안 검토 및 수정 사항 반영",        priority:"높음", dayOffset:3 },
      { title:"법무팀 계약서 최종 검토 요청",              priority:"높음", dayOffset:4 },
      { title:"계약 체결 일정 확정",                       priority:"높음", dayOffset:5 },
    ]
  },
  {
    id:"t4", name:"계약 후 온보딩", stage:"계약완료", color:"#10B981",
    actions:[
      { title:"킥오프 미팅 일정 수립 및 아젠다 준비",      priority:"높음", dayOffset:3 },
      { title:"온보딩 담당자 배정 및 인수인계",            priority:"높음", dayOffset:5 },
      { title:"고객 성공 지표(KPI) 합의",                  priority:"중간", dayOffset:7 },
      { title:"첫 납품/서비스 일정 확인",                  priority:"중간", dayOffset:10 },
    ]
  },
  {
    id:"t5", name:"주간 follow-up", stage:"전체", color:"#F59E0B",
    actions:[
      { title:"고객사 최근 동향 체크 및 뉴스 모니터링",    priority:"낮음", dayOffset:1 },
      { title:"담당자 안부 연락 (전화/이메일)",            priority:"중간", dayOffset:2 },
      { title:"미팅 내용 정리 및 다음 액션 확인",          priority:"높음", dayOffset:1 },
    ]
  },
];

function TemplateModal({ opps, clients, onSave, onClose }) {
  const [selTmpl, setSelTmpl] = useState(null);
  const [selOpp,  setSelOpp]  = useState(opps[0]?.id || "");
  const [owner,   setOwner]   = useState("");
  const [baseDate,setBase]    = useState(today());

  const addDays = (d, n) => {
    const dt = new Date(d); dt.setDate(dt.getDate() + n);
    return dt.toISOString().split("T")[0];
  };

  const handleApply = () => {
    if (!selTmpl || !selOpp) return;
    const opp = opps.find(o => o.id === selOpp);
    const newActions = selTmpl.actions.map(a => ({
      id: uid(), oppId: selOpp,
      clientId: opp?.accountId || "",
      title: a.title, owner, priority: a.priority,
      dueDate: addDays(baseDate, a.dayOffset), done: false,
    }));
    onSave(newActions);
    onClose();
  };

  return <Modal title="액션 템플릿 적용" onClose={onClose}>
    {/* Template list */}
    <SL>템플릿 선택</SL>
    <div style={{ display:"grid", gap:8, marginBottom:20 }}>
      {ACTION_TEMPLATES.map(t => (
        <div key={t.id} onClick={() => setSelTmpl(t)} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 14px", background:selTmpl?.id===t.id ? `${t.color}12` : C.surfaceUp, border:`1.5px solid ${selTmpl?.id===t.id ? t.color : C.border}`, borderRadius:10, cursor:"pointer", transition:"all .15s" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:t.color, flexShrink:0, marginTop:4 }}/>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{t.name}</span>
              <span style={{ fontSize:10, background:`${t.color}18`, color:t.color, padding:"1px 8px", borderRadius:10, fontWeight:700 }}>{t.actions.length}개 액션</span>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {t.actions.map((a,i) => (
                <span key={i} style={{ fontSize:11, color:C.textMuted }}>• {a.title}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>

    {selTmpl && <>
      <div style={{ background:C.accentSoft, border:`1px solid ${C.accentGlow}`, borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
        <div style={{ fontSize:11, color:C.accent, fontWeight:700, marginBottom:6 }}>선택된 템플릿: {selTmpl.name}</div>
        {selTmpl.actions.map((a,i) => (
          <div key={i} style={{ fontSize:12, color:C.text, marginBottom:3 }}>
            <span style={{ color:PRI_CFG[a.priority], fontWeight:700 }}>●</span> {a.title}
            <span style={{ color:C.textMuted }}> (+{a.dayOffset}일)</span>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:11, color:C.textMuted, marginBottom:6, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" }}>영업기회</label>
          <select value={selOpp} onChange={e=>setSelOpp(e.target.value)} style={{ width:"100%", background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:14, outline:"none" }}>
            {opps.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <Inp label="담당자" value={owner} onChange={setOwner} placeholder="이름 입력"/>
        <Inp label="시작일 (기준일)" type="date" value={baseDate} onChange={setBase}/>
      </div>
    </>}

    <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
      <Btn variant="ghost" onClick={onClose}>취소</Btn>
      <Btn onClick={handleApply} style={{ opacity: selTmpl&&selOpp ? 1 : .5 }}>적용 ({selTmpl?.actions.length||0}개 액션 생성)</Btn>
    </div>
  </Modal>;
}

function ActionForm({ action, clients, opps, onSave, onClose }) {
  const [f,sF]=useState(action||{title:"",oppId:opps[0]?.id||"",clientId:clients[0]?.id||"",owner:"",dueDate:"",priority:"중간",done:false,note:""});
  const s=k=>v=>sF(p=>({...p,[k]:v}));
  return <Modal title={action?"액션 수정":"액션 추가"} onClose={onClose}>
    <Inp label="액션 내용" value={f.title} onChange={s("title")}/>
    <Sel label="영업기회" value={f.oppId} onChange={v=>sF(p=>({...p,oppId:v,clientId:opps.find(o=>o.id===v)?.accountId||p.clientId}))} options={[{value:"",label:"— 선택 —"},...opps.map(o=>({value:o.id,label:o.name}))]}/>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <Inp label="담당자" value={f.owner} onChange={s("owner")}/>
      <Inp label="마감일" type="date" value={f.dueDate} onChange={s("dueDate")}/>
      <Sel label="우선순위" value={f.priority} onChange={s("priority")} options={["높음","중간","낮음"]}/>
    </div>
    <Inp label="진행 메모 (선택)" value={f.note||""} onChange={s("note")} multiline placeholder="진행 상황, 참고사항 등"/>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}><Btn variant="ghost" onClick={onClose}>취소</Btn><Btn onClick={()=>onSave({...f,id:action?.id||uid()})}>저장</Btn></div>
  </Modal>;
}

function Actions({ actions, clients, opps, onUpdate, onUpdateOpps }) {
  const [modal,    sM]  = useState(null);
  const [tmplModal,sTM] = useState(false);
  const [filter,   sF]  = useState("전체");
  const [dateFilter,sDF]= useState("전체"); // 전체|오늘|이번주|기한초과
  const [ownerF,   sOF] = useState("전체");

  const owners = ["전체",...new Set(actions.map(a=>a.owner).filter(Boolean))];

  const todayStr   = today();
  const weekEnd    = (() => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return d.toISOString().split("T")[0]; })();

  // Auto-log to opp activities when completing an action
  const tog = (id) => {
    const action = actions.find(a => a.id === id);
    if (!action) return;
    const completing = !action.done; // true = about to mark done

    // Update actions state
    onUpdate(prev => prev.map(a => a.id === id ? {...a, done: !a.done} : a));

    // If completing → log to opp activities
    if (completing && action.oppId && onUpdateOpps) {
      const logEntry = {
        id: uid(),
        date: todayStr,
        type: "액션완료",
        content: `[액션 완료] ${action.title}${action.note ? ` — ${action.note}` : ""}`,
        by: action.owner || "—",
      };
      onUpdateOpps(prev => prev.map(o =>
        o.id === action.oppId
          ? { ...o, activities: [logEntry, ...(o.activities || [])] }
          : o
      ));
    }
  };

  const del = id => onUpdate(prev => prev.filter(a => a.id !== id));

  const applyTemplate = (newActions) => {
    onUpdate(prev => [...prev, ...newActions]);
  };

  // Filtering
  const list = actions
    .filter(a => filter==="전체" ? true : filter==="완료" ? a.done : !a.done)
    .filter(a => {
      if (dateFilter==="오늘")    return !a.done && a.dueDate === todayStr;
      if (dateFilter==="이번주")  return !a.done && a.dueDate >= todayStr && a.dueDate <= weekEnd;
      if (dateFilter==="기한초과") return !a.done && a.dueDate && a.dueDate < todayStr;
      return true;
    })
    .filter(a => ownerF==="전체" ? true : a.owner===ownerF)
    .sort((a,b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (isLate(a.dueDate) && !isLate(b.dueDate)) return -1;
      if (!isLate(a.dueDate) && isLate(b.dueDate)) return 1;
      return ({높음:0,중간:1,낮음:2}[a.priority]||0) - ({높음:0,중간:1,낮음:2}[b.priority]||0);
    });

  // Stats
  const lateCount  = actions.filter(a=>!a.done&&isLate(a.dueDate)).length;
  const todayCount = actions.filter(a=>!a.done&&a.dueDate===todayStr).length;
  const doneCount  = actions.filter(a=>a.done).length;

  return <div>
    {/* Stats strip */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
      {[
        { label:"전체 진행중",  val:actions.filter(a=>!a.done).length, color:C.accent  },
        { label:"오늘 마감",    val:todayCount,  color:todayCount>0?C.yellow:C.textMuted },
        { label:"기한 초과",    val:lateCount,   color:lateCount>0?C.red:C.textMuted    },
        { label:"완료",         val:doneCount,   color:C.green                           },
      ].map(s=>(
        <div key={s.label} onClick={()=>{ if(s.label==="오늘 마감"){sDF("오늘");sF("진행중");} else if(s.label==="기한 초과"){sDF("기한초과");sF("진행중");} else if(s.label==="완료"){sF("완료");sDF("전체");} else {sF("진행중");sDF("전체");} }} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", cursor:"pointer", transition:"border-color .15s" }}>
          <div style={{ fontSize:11, color:C.textMuted, fontWeight:600, letterSpacing:".07em", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
          <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{s.val}</div>
        </div>
      ))}
    </div>

    {/* Controls */}
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
        {/* Status filter */}
        {["전체","진행중","완료"].map(s=>(
          <button key={s} onClick={()=>{sF(s);if(s!=="진행중")sDF("전체");}} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${filter===s?C.accent:C.border}`, background:filter===s?C.accentSoft:"transparent", color:filter===s?C.accent:C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>{s}</button>
        ))}
        <span style={{ width:1, height:20, background:C.border }}/>
        {/* Date quick filter */}
        {[
          { id:"전체", label:"전체 날짜" },
          { id:"오늘", label:"오늘" },
          { id:"이번주", label:"이번 주" },
          { id:"기한초과", label:"⚠ 기한 초과" },
        ].map(d=>(
          <button key={d.id} onClick={()=>{sDF(d.id);if(d.id!=="전체")sF("진행중");}} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${dateFilter===d.id?(d.id==="기한초과"?C.red:C.accent):C.border}`, background:dateFilter===d.id?(d.id==="기한초과"?C.redSoft:C.accentSoft):"transparent", color:dateFilter===d.id?(d.id==="기한초과"?C.red:C.accent):C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>{d.label}</button>
        ))}
        <span style={{ width:1, height:20, background:C.border }}/>
        {/* Owner filter */}
        {owners.map(o=>(
          <button key={o} onClick={()=>sOF(o)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${ownerF===o?C.yellow:C.border}`, background:ownerF===o?C.yellowSoft:"transparent", color:ownerF===o?C.yellow:C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>{o}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <Btn variant="ghost" onClick={()=>sTM(true)}>📋 템플릿 적용</Btn>
        <Btn onClick={()=>sM("add")}>+ 액션 추가</Btn>
      </div>
    </div>

    {/* Action list */}
    <div style={{ display:"grid", gap:8 }}>
      {list.map(a=>{
        const opp = opps.find(o=>o.id===a.oppId)||{};
        const ov  = !a.done && isLate(a.dueDate);
        const isToday = !a.done && a.dueDate === todayStr;
        return <Card key={a.id} style={{ padding:"13px 18px", opacity:a.done?.55:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            {/* Checkbox */}
            <button onClick={()=>tog(a.id)} style={{ width:22, height:22, borderRadius:6, border:`2px solid ${a.done?C.green:ov?C.red:C.border}`, background:a.done?C.green:"transparent", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11 }}>{a.done?"✓":""}</button>

            {/* Title + sub */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, color:a.done?C.textMuted:C.text, textDecoration:a.done?"line-through":"none", marginBottom:2 }}>{a.title}</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, color:C.textMuted }}>{opp.name||"—"}</span>
                {a.owner && <span style={{ fontSize:11, color:C.textMuted }}>· {a.owner}</span>}
                {a.done && <span style={{ fontSize:10, background:C.greenSoft, color:C.green, padding:"1px 7px", borderRadius:10, fontWeight:700 }}>완료 → 활동 자동 기록됨</span>}
              </div>
              {/* Progress note */}
              {a.note && !a.done && <div style={{ fontSize:11, color:C.textMuted, marginTop:4, padding:"4px 8px", background:C.surfaceUp, borderRadius:6 }}>📝 {a.note}</div>}
            </div>

            {/* Priority */}
            <span style={{ fontSize:11, background:`${PRI_CFG[a.priority]}20`, color:PRI_CFG[a.priority], padding:"2px 9px", borderRadius:6, fontWeight:700, flexShrink:0 }}>{a.priority}</span>

            {/* Due date */}
            <span style={{ fontSize:12, color:ov?C.red:isToday?C.yellow:C.textMuted, fontWeight:ov||isToday?700:400, whiteSpace:"nowrap" }}>
              {ov?"⚠ ":isToday?"🔔 ":""}{a.dueDate||"기한 없음"}
            </span>

            {/* Actions */}
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              <Btn size="sm" variant="ghost" onClick={()=>sM(a)}>수정</Btn>
              <Btn size="sm" variant="danger" onClick={()=>del(a.id)}>삭제</Btn>
            </div>
          </div>
        </Card>;
      })}
      {list.length===0 && (
        <div style={{ textAlign:"center", padding:"56px 0", color:C.textMuted }}>
          <div style={{ fontSize:32, marginBottom:12 }}>✓</div>
          <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>해당하는 액션이 없습니다</div>
          <div style={{ fontSize:12, color:C.textMuted }}>필터를 바꾸거나 새 액션을 추가해보세요</div>
        </div>
      )}
    </div>

    {/* Modals */}
    {tmplModal && <TemplateModal opps={opps} clients={clients} onSave={applyTemplate} onClose={()=>sTM(false)}/>}
    {(modal==="add"||(modal&&modal.id)) && <ActionForm action={modal==="add"?null:modal} clients={clients} opps={opps} onClose={()=>sM(null)} onSave={data=>{onUpdate(prev=>modal==="add"?[...prev,data]:prev.map(a=>a.id===data.id?data:a));sM(null);}}/>}
  </div>;
}

// ─── WEEKLY REPORT ────────────────────────────────────────────────────────────
function WeeklyReport({ opps, actions, meetings, clients }) {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // Week range helper
  const getWeekRange = (offset = 0) => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day) + offset * 7;
    const mon = new Date(now); mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const fmt2 = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const fmtKo = d => `${d.getMonth()+1}월 ${d.getDate()}일`;
    return { start: fmt2(mon), end: fmt2(sun), label: `${fmtKo(mon)} ~ ${fmtKo(sun)}` };
  };

  const week = getWeekRange(weekOffset);

  // Build snapshot data for the AI
  const buildSnapshot = () => {
    const activeOpps   = opps.filter(o => o.stage !== "손실");
    const wonOpps      = opps.filter(o => o.stage === "계약완료");
    const lostOpps     = opps.filter(o => o.stage === "손실");
    const totalPipe    = activeOpps.reduce((s,o) => s + o.value, 0);
    const weighted     = activeOpps.reduce((s,o) => s + Math.round(o.value * o.probability / 100), 0);
    const pendingActs  = actions.filter(a => !a.done);
    const doneActs     = actions.filter(a => a.done);
    const lateActs     = pendingActs.filter(a => a.dueDate && a.dueDate < week.start);
    const weekActs     = pendingActs.filter(a => a.dueDate >= week.start && a.dueDate <= week.end);
    const lastMeeting  = [...meetings].sort((a,b) => b.weekOf.localeCompare(a.weekOf))[0];

    const oppsSummary = activeOpps.map(o => {
      const cl = clients.find(c => c.id === o.accountId) || {};
      return `- ${o.name} (${cl.name||""}) | 단계:${o.stage} | ${fmt(o.value)} | 확률:${o.probability}% | 다음:${o.nextStep||"없음"} (${o.nextStepDate||""}) | 담당:${o.owner}`;
    }).join('\n');

    const actsSummary = pendingActs.map(a => {
      const o = opps.find(x => x.id === a.oppId) || {};
      return `- ${a.title} | ${o.name||""} | ${a.owner} | 마감:${a.dueDate} | 우선순위:${a.priority}${a.dueDate < week.start ? ' ⚠기한초과' : ''}`;
    }).join('\n');

    return {
      weekLabel: week.label,
      totalPipe: fmt(totalPipe),
      weighted: fmt(weighted),
      wonCount: wonOpps.length,
      wonValue: fmt(wonOpps.reduce((s,o)=>s+o.value,0)),
      lostCount: lostOpps.length,
      activeCount: activeOpps.length,
      pendingActCount: pendingActs.length,
      doneActCount: doneActs.length,
      lateActCount: lateActs.length,
      weekActCount: weekActs.length,
      oppsSummary,
      actsSummary,
      lastMeetingFocus: lastMeeting?.nextWeekFocus || "없음",
      lastMeetingDecisions: lastMeeting?.decisions?.join(', ') || "없음",
    };
  };

  const generateReport = async () => {
    setLoading(true);
    setReport(null);
    const snap = buildSnapshot();

    const prompt = `당신은 강원에너지 영업팀의 주간 리포트를 작성하는 전문 영업 어시스턴트입니다.
아래 데이터를 바탕으로 ${snap.weekLabel} 주간 영업 리포트를 작성해주세요.

=== 파이프라인 현황 ===
활성 딜 수: ${snap.activeCount}개
총 파이프라인: ${snap.totalPipe}
가중 예상 매출: ${snap.weighted}
계약완료: ${snap.wonCount}건 (${snap.wonValue})
손실: ${snap.lostCount}건

=== 영업기회 상세 ===
${snap.oppsSummary}

=== 액션 현황 ===
진행중: ${snap.pendingActCount}개 / 완료: ${snap.doneActCount}개 / 기한초과: ${snap.lateActCount}개 / 이번주 마감: ${snap.weekActCount}개

=== 진행중 액션 목록 ===
${snap.actsSummary}

=== 지난 주 회의 결정사항 ===
${snap.lastMeetingDecisions}

=== 지난 주 다음주 포커스 ===
${snap.lastMeetingFocus}

다음 형식으로 리포트를 작성해주세요. 각 섹션은 명확하게 구분하고 실질적이고 구체적인 내용으로 작성해주세요:

## 📊 이번 주 파이프라인 요약
(파이프라인 규모, 주요 변화, 핵심 지표 3~4줄 요약)

## ✅ 주요 성과
(이번 주 눈에 띄는 진전, 완료된 딜, 긍정적 신호 등)

## ⚠️ 주의가 필요한 딜
(기한 초과 액션, 단계가 오래 멈춘 딜, 리스크 요소 등)

## 🎯 이번 주 핵심 액션
(이번 주 반드시 완료해야 할 액션 Top 5, 우선순위 포함)

## 📅 다음 주 전략 포커스
(다음 주 집중해야 할 영업 전략과 방향 3~4가지)

## 💡 영업팀 제언
(데이터 기반의 구체적인 영업 전략 조언 2~3가지)

한국어로 작성하고, 실무에서 바로 쓸 수 있는 수준으로 구체적으로 작성해주세요.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "리포트 생성에 실패했습니다.";
      setReport(text);
    } catch(e) {
      setReport("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    const snap = buildSnapshot();
    win.document.write(`
      <html><head><title>주간 영업 리포트 ${snap.weekLabel}</title>
      <style>
        body { font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 800px; margin: 40px auto; color: #1E293B; line-height: 1.7; }
        h1 { font-size: 22px; border-bottom: 2px solid #3B6FE8; padding-bottom: 12px; color: #003; }
        h2 { font-size: 16px; margin-top: 28px; color: #1E293B; }
        pre { white-space: pre-wrap; font-family: inherit; }
      </style></head>
      <body>
        <h1>강원에너지 주간 영업 리포트</h1>
        <p style="color:#64748B;margin-bottom:24px;">${snap.weekLabel}</p>
        <pre>${report}</pre>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  // Render markdown-like text
  const renderReport = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <div key={i} style={{ fontSize:15, fontWeight:700, color:C.text, marginTop:24, marginBottom:10, paddingBottom:8, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
          {line.replace('## ','')}
        </div>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <div key={i} style={{ display:"flex", gap:10, marginBottom:6, paddingLeft:4 }}>
          <span style={{ color:C.accent, fontWeight:700, flexShrink:0, marginTop:1 }}>›</span>
          <span style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>{line.replace(/^[-*] /,'')}</span>
        </div>;
      }
      if (line.match(/^\d+\./)) {
        const num = line.match(/^(\d+)\./)[1];
        return <div key={i} style={{ display:"flex", gap:10, marginBottom:6, paddingLeft:4 }}>
          <span style={{ color:"#fff", background:C.accent, borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0, marginTop:2 }}>{num}</span>
          <span style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>{line.replace(/^\d+\. /,'')}</span>
        </div>;
      }
      if (line.trim() === '') return <div key={i} style={{ height:6 }}/>;
      return <p key={i} style={{ fontSize:13, color:C.text, lineHeight:1.7, margin:"4px 0" }}>{line}</p>;
    });
  };

  return <div>
    {/* Header */}
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
      <div>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:C.text }}>주간 영업 리포트</h2>
        <p style={{ margin:"4px 0 0", fontSize:13, color:C.textMuted }}>AI가 현재 파이프라인과 액션 데이터를 분석해 리포트를 자동 생성합니다</p>
      </div>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        {/* Week navigator */}
        <div style={{ display:"flex", alignItems:"center", gap:8, background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 14px" }}>
          <button onClick={()=>setWeekOffset(w=>w-1)} style={{ background:"none", border:"none", cursor:"pointer", color:C.textMuted, fontSize:16, padding:"0 4px" }}>‹</button>
          <span style={{ fontSize:13, color:C.text, fontWeight:600, minWidth:140, textAlign:"center" }}>{week.label}</span>
          <button onClick={()=>setWeekOffset(w=>w+1)} style={{ background:"none", border:"none", cursor:"pointer", color:C.textMuted, fontSize:16, padding:"0 4px" }}>›</button>
        </div>
        <Btn onClick={generateReport} style={{ minWidth:140 }}>
          {loading ? "생성 중..." : "리포트 생성"}
        </Btn>
      </div>
    </div>

    {/* Snapshot cards */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
      {(() => {
        const snap = buildSnapshot();
        return [
          { label:"활성 파이프라인", val:snap.totalPipe,       sub:`${snap.activeCount}개 딜`,          color:C.accent  },
          { label:"가중 예상 매출",  val:snap.weighted,        sub:"확률 반영",                         color:C.purple  },
          { label:"진행중 액션",     val:snap.pendingActCount, sub:`${snap.lateActCount}개 기한초과`,    color:snap.lateActCount>0?C.red:C.yellow },
          { label:"이번 주 마감",    val:snap.weekActCount,    sub:"액션",                              color:C.cyan    },
        ].map(m=><Card key={m.label}>
          <div style={{ fontSize:11, color:C.textMuted, fontWeight:600, letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>{m.label}</div>
          <div style={{ fontSize:24, fontWeight:900, color:m.color, marginBottom:2 }}>{m.val}</div>
          <div style={{ fontSize:12, color:C.textMuted }}>{m.sub}</div>
        </Card>);
      })()}
    </div>

    {/* ── 주간 활동 Summary ── */}
    {(() => {
      // Collect all opps that had ANY activity this week
      const weeklyActive = opps.map(opp => {
        const cl = clients.find(c => c.id === opp.accountId) || {};
        const s  = STAGE_MAP[opp.stage] || {};

        // Activities logged this week
        const weekActivities = (opp.activities || [])
          .filter(a => a.date >= week.start && a.date <= week.end)
          .sort((a,b) => b.date.localeCompare(a.date));

        // Stage changes this week
        const weekStageChanges = (opp.stageHistory || [])
          .filter(h => h.date >= week.start && h.date <= week.end)
          .sort((a,b) => b.date.localeCompare(a.date));

        // Actions completed this week (dueDate in range + done)
        const weekDoneActions = actions
          .filter(a => a.oppId === opp.id && a.done && a.dueDate >= week.start && a.dueDate <= week.end);

        // Actions due this week (pending)
        const weekPendingActions = actions
          .filter(a => a.oppId === opp.id && !a.done && a.dueDate >= week.start && a.dueDate <= week.end);

        const totalEvents = weekActivities.length + weekStageChanges.length + weekDoneActions.length;
        if (totalEvents === 0) return null;

        return { opp, cl, s, weekActivities, weekStageChanges, weekDoneActions, weekPendingActions, totalEvents };
      }).filter(Boolean).sort((a,b) => b.totalEvents - a.totalEvents);

      if (weeklyActive.length === 0) return (
        <Card style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text }}>금주 활동 Summary</div>
            <span style={{ fontSize:11, background:C.accentSoft, color:C.accent, borderRadius:10, padding:"2px 8px", fontWeight:700 }}>{week.label}</span>
          </div>
          <div style={{ textAlign:"center", padding:"32px 0", color:C.textMuted, fontSize:13 }}>이번 주 기록된 활동이 없습니다</div>
        </Card>
      );

      return (
        <Card style={{ marginBottom:24 }}>
          {/* Section header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text }}>금주 활동 Summary</div>
              <span style={{ fontSize:11, background:C.accentSoft, color:C.accent, borderRadius:10, padding:"2px 9px", fontWeight:700 }}>{week.label}</span>
            </div>
            <span style={{ fontSize:12, color:C.textMuted }}>활동 있는 딜 {weeklyActive.length}건</span>
          </div>

          {/* Per-opp activity cards */}
          <div style={{ display:"grid", gap:14 }}>
            {weeklyActive.map(({ opp, cl, s, weekActivities, weekStageChanges, weekDoneActions, weekPendingActions }) => (
              <div key={opp.id} style={{ background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px" }}>

                {/* Opp header row */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:C.accentSoft, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:C.accent, flexShrink:0 }}>
                      {cl.name?.[0] || "?"}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{opp.name}</div>
                      <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{cl.name} · {opp.owner} 담당</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, color:s.color, background:`${s.color}15` }}>
                      <span style={{ width:5, height:5, borderRadius:"50%", background:s.color }}/>
                      {opp.stage}
                    </span>
                    <span style={{ fontSize:14, fontWeight:800, color:s.color }}>{fmt(opp.value)}</span>
                  </div>
                </div>

                {/* Activity timeline */}
                <div style={{ display:"grid", gap:6 }}>

                  {/* Stage changes */}
                  {weekStageChanges.map(h => {
                    const sc = STAGE_MAP[h.stage] || {};
                    return (
                      <div key={h.id} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                        <div style={{ width:22, height:22, borderRadius:6, background:`${sc.color}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                          <span style={{ fontSize:9, fontWeight:800, color:sc.color }}>단계</span>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                            <span style={{ fontSize:12, fontWeight:700, color:sc.color }}>단계 변경 → {h.stage}</span>
                            <span style={{ fontSize:11, color:C.textDim }}>{h.date}</span>
                            <span style={{ fontSize:11, color:C.textDim }}>by {h.by}</span>
                          </div>
                          {h.note && <div style={{ fontSize:12, color:C.textMuted, lineHeight:1.5 }}>{h.note}</div>}
                        </div>
                      </div>
                    );
                  })}

                  {/* Activities logged */}
                  {weekActivities.map(a => (
                    <div key={a.id} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                      <div style={{ width:22, height:22, borderRadius:6, background:C.accentSoft, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                        <span style={{ fontSize:9, fontWeight:800, color:C.accent }}>활동</span>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                          <span style={{ fontSize:11, background:C.surfaceUp, border:`1px solid ${C.border}`, color:C.textMuted, padding:"1px 7px", borderRadius:6, fontWeight:700 }}>{a.type}</span>
                          <span style={{ fontSize:11, color:C.textDim }}>{a.date}</span>
                          <span style={{ fontSize:11, color:C.textDim }}>by {a.by}</span>
                        </div>
                        <div style={{ fontSize:12, color:C.text, lineHeight:1.5 }}>{a.content}</div>
                      </div>
                    </div>
                  ))}

                  {/* Completed actions */}
                  {weekDoneActions.map(a => (
                    <div key={a.id} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                      <div style={{ width:22, height:22, borderRadius:6, background:`${C.green}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                        <span style={{ fontSize:11, color:C.green, fontWeight:800 }}>✓</span>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:12, color:C.green, fontWeight:700, textDecoration:"line-through" }}>{a.title}</span>
                          <span style={{ fontSize:11, color:C.textDim }}>{a.owner}</span>
                          <span style={{ fontSize:10, background:`${C.green}15`, color:C.green, padding:"1px 7px", borderRadius:10, fontWeight:700 }}>완료</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* This week's pending actions footer */}
                {weekPendingActions.length > 0 && (
                  <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>이번 주 마감 예정</div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {weekPendingActions.map(a => {
                        const late = a.dueDate < today();
                        return (
                          <span key={a.id} style={{ fontSize:11, background:late?C.redSoft:C.accentSoft, color:late?C.red:C.accent, border:`1px solid ${late?C.red:C.accent}30`, padding:"3px 10px", borderRadius:20, fontWeight:600 }}>
                            {late?"⚠ ":""}{a.title} ({a.owner})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      );
    })()}

    {/* ── AI 주간 리포트 ── */}
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
      <div>
        <div style={{ fontSize:15, fontWeight:700, color:C.text }}>AI 주간 리포트</div>
        <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>데이터 기반 영업 분석 및 전략 제언</div>
      </div>
      <Btn onClick={generateReport} style={{ minWidth:140 }}>
        {loading ? "생성 중..." : report ? "재생성" : "리포트 생성"}
      </Btn>
    </div>

    {!report && !loading && (
      <Card style={{ textAlign:"center", padding:"56px 32px" }}>
        <div style={{ fontSize:36, marginBottom:14 }}>📋</div>
        <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:8 }}>리포트를 생성해보세요</div>
        <div style={{ fontSize:13, color:C.textMuted, marginBottom:24, lineHeight:1.7 }}>
          파이프라인·액션·회의록을 AI가 분석하여<br/>
          회의 전 바로 공유할 수 있는 리포트를 자동 작성합니다
        </div>
        <Btn onClick={generateReport}>리포트 생성하기</Btn>
      </Card>
    )}

    {loading && (
      <Card style={{ textAlign:"center", padding:"56px 32px" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
          <div style={{ width:40, height:40, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
          <div style={{ fontSize:15, fontWeight:600, color:C.text }}>AI가 데이터를 분석 중입니다...</div>
          <div style={{ fontSize:13, color:C.textMuted }}>파이프라인과 액션을 기반으로 리포트를 작성하고 있습니다</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </Card>
    )}

    {report && !loading && (
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:C.text }}>강원에너지 주간 영업 리포트</div>
            <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{week.label} · AI 자동 생성</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="ghost" size="sm" onClick={handleCopy}>{copied ? "✓ 복사됨" : "복사"}</Btn>
            <Btn variant="ghost" size="sm" onClick={handlePrint}>인쇄 / PDF</Btn>
            <Btn size="sm" onClick={generateReport}>재생성</Btn>
          </div>
        </div>
        <div style={{ lineHeight:1.7 }}>
          {renderReport(report)}
        </div>
      </Card>
    )}
  </div>;
}

// ─── QUARTERLY TRACKER ────────────────────────────────────────────────────────
const QTR_RANGES = {
  Q1:{ months:[1,2,3],  label:"Q1 (1~3월)",  color:"#3B6FE8" },
  Q2:{ months:[4,5,6],  label:"Q2 (4~6월)",  color:"#8B5CF6" },
  Q3:{ months:[7,8,9],  label:"Q3 (7~9월)",  color:"#F59E0B" },
  Q4:{ months:[10,11,12],label:"Q4 (10~12월)",color:"#10B981" },
};

function getQtr(dateStr) {
  if (!dateStr) return null;
  const m = new Date(dateStr).getMonth() + 1;
  if (m <= 3)  return "Q1";
  if (m <= 6)  return "Q2";
  if (m <= 9)  return "Q3";
  return "Q4";
}
function getYear(dateStr) {
  if (!dateStr) return null;
  return String(new Date(dateStr).getFullYear());
}

function QuarterlyTracker({ opps, clients, goals, onUpdateGoals, onEditRevDate }) {
  const curYear = String(new Date().getFullYear());
  const [year, setYear]       = useState(curYear);
  const [editGoals, setEG]    = useState(false);
  const [goalForm, setGF]     = useState({});
  const [selQ, setSelQ]       = useState(null); // drill-down quarter

  const yearGoals  = goals[year] || { Q1:0, Q2:0, Q3:0, Q4:0 };
  const years      = [...new Set(["2024","2025","2026",...Object.keys(goals)])].sort();

  // Compute per-quarter actuals and forecast
  const qData = Object.entries(QTR_RANGES).map(([q, cfg]) => {
    const rd = (o) => o.revenueDate || o.closeDate || "";
    const won      = opps.filter(o => o.stage === "계약완료" && getYear(rd(o)) === year && getQtr(rd(o)) === q);
    const forecast = opps.filter(o => o.stage !== "계약완료" && o.stage !== "손실" && getYear(rd(o)) === year && getQtr(rd(o)) === q);
    const actualVal   = won.reduce((s,o) => s + o.value, 0);
    const forecastVal = forecast.reduce((s,o) => s + Math.round(o.value * o.probability / 100), 0);
    const target      = yearGoals[q] || 0;
    const achRate     = target > 0 ? Math.min(Math.round(actualVal / target * 100), 100) : 0;
    const forecastRate= target > 0 ? Math.min(Math.round((actualVal + forecastVal) / target * 100), 100) : 0;
    return { q, ...cfg, target, actualVal, forecastVal, achRate, forecastRate, won, forecast };
  });

  const totalTarget   = Object.values(yearGoals).reduce((s,v) => s+v, 0);
  const totalActual   = qData.reduce((s,d) => s + d.actualVal, 0);
  const totalForecast = qData.reduce((s,d) => s + d.forecastVal, 0);

  // Revenue date edit modal
  const RevDateModal = ({ opp, onSave, onClose }) => {
    const [d, setD] = useState(opp.revenueDate || opp.closeDate || "");
    return <Modal title="매출 인식 예정일 수정" onClose={onClose}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{opp.name}</div>
        <div style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>{fmt(opp.value)} · {opp.owner}</div>
        <Inp label="매출 인식 예정일" type="date" value={d} onChange={setD}/>
        <div style={{ fontSize:12, color:C.textMuted }}>※ 계약 체결 후 실제 매출이 인식되는 날짜 (closeDate와 다를 수 있습니다)</div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
        <Btn variant="ghost" onClick={onClose}>취소</Btn>
        <Btn onClick={() => onSave(d)}>저장</Btn>
      </div>
    </Modal>;
  };

  // Drill-down quarter detail
  const DrillDown = ({ qd }) => {
    const allOpps = [...qd.won, ...qd.forecast].sort((a,b) => (a.revenueDate||a.closeDate||"").localeCompare(b.revenueDate||b.closeDate||""));
    return (
      <Card style={{ marginTop:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
          <div>
            <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{year} {qd.label} 파이프라인 상세</span>
            <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>
              확정 {fmt(qd.actualVal)} · 예상 {fmt(qd.forecastVal)} · 목표 {fmt(qd.target)}
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setSelQ(null)}>닫기</Btn>
        </div>

        {allOpps.length === 0 && <div style={{ textAlign:"center", padding:"32px 0", color:C.textMuted }}>이 분기에 배정된 파이프라인이 없습니다</div>}

        {/* Timeline header */}
        {allOpps.length > 0 && <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 80px", gap:12, padding:"8px 14px", background:C.surfaceUp, borderRadius:8, marginBottom:10, fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:".06em" }}>
          <div>영업기회</div><div>매출 예정일</div><div>금액</div><div>단계</div><div>담당자</div><div>수정</div>
        </div>}

        <div style={{ display:"grid", gap:6 }}>
          {allOpps.map(o => {
            const cl  = clients.find(c => c.id === o.accountId) || {};
            const s   = STAGE_MAP[o.stage] || {};
            const rd  = o.revenueDate || o.closeDate || "";
            const won = o.stage === "계약완료";
            return (
              <div key={o.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 80px", gap:12, alignItems:"center", padding:"12px 14px", background:won ? C.greenSoft : C.surface, border:`1px solid ${won ? C.green+"40" : C.border}`, borderRadius:10 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{o.name}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{cl.name}</div>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color: rd ? C.text : C.textDim }}>{rd || "미설정"}</div>
                  <div style={{ fontSize:10, color:C.textMuted }}>{getQtr(rd) || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color: won ? C.green : s.color }}>{fmt(o.value)}</div>
                  {!won && <div style={{ fontSize:10, color:C.textMuted }}>가중 {fmt(Math.round(o.value * o.probability / 100))}</div>}
                </div>
                <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:700, color:s.color, background:`${s.color}15`, width:"fit-content" }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:s.color }}/>{o.stage}
                </span>
                <div style={{ fontSize:12, color:C.textMuted }}>{o.owner}</div>
                <Btn size="sm" variant="ghost" onClick={() => onEditRevDate(o)}>수정</Btn>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:C.text }}>분기별 목표 & 실적</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.textMuted }}>분기 목표 설정 · 파이프라인 매출 일정 관리 · 달성률 트래킹</p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {/* Year selector */}
          <div style={{ display:"flex", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
            {years.map(y => (
              <button key={y} onClick={() => setYear(y)} style={{ padding:"8px 18px", background:year===y?C.accent:"transparent", color:year===y?"#fff":C.textMuted, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit" }}>{y}년</button>
            ))}
          </div>
          <Btn variant="ghost" onClick={() => { setGF({...yearGoals}); setEG(true); }}>목표 설정</Btn>
        </div>
      </div>

      {/* Year summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
        {[
          { label:"연간 목표",      val:fmt(totalTarget),              sub:`${year}년 전체`,         color:C.accent  },
          { label:"확정 매출",      val:fmt(totalActual),              sub:`목표 대비 ${totalTarget>0?Math.round(totalActual/totalTarget*100):0}%`, color:C.green },
          { label:"예상 추가 매출", val:fmt(totalForecast),            sub:"가중치 반영 파이프라인",  color:C.purple  },
        ].map(m => (
          <Card key={m.label}>
            <div style={{ fontSize:11, color:C.textMuted, fontWeight:600, letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>{m.label}</div>
            <div style={{ fontSize:26, fontWeight:900, color:m.color, marginBottom:4 }}>{m.val}</div>
            <div style={{ fontSize:12, color:C.textMuted }}>{m.sub}</div>
          </Card>
        ))}
      </div>

      {/* Quarter cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        {qData.map(qd => {
          const isSelected = selQ === qd.q;
          const overAch    = qd.achRate >= 100;
          return (
            <div key={qd.q} onClick={() => setSelQ(isSelected ? null : qd.q)} style={{ background:C.surface, border:`2px solid ${isSelected ? qd.color : C.border}`, borderRadius:14, padding:"20px", cursor:"pointer", transition:"border-color .2s, box-shadow .2s", boxShadow: isSelected ? `0 0 0 1px ${qd.color}30, 0 8px 24px rgba(0,0,0,.08)` : "0 1px 4px rgba(0,0,0,.06)" }}>
              {/* Q label */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:10, height:10, borderRadius:"50%", background:qd.color, display:"block" }}/>
                  <span style={{ fontSize:16, fontWeight:900, color:qd.color }}>{qd.q}</span>
                  <span style={{ fontSize:11, color:C.textMuted }}>{qd.label.split(" ")[1]}</span>
                </div>
                {overAch && <span style={{ fontSize:10, background:C.greenSoft, color:C.green, padding:"2px 8px", borderRadius:10, fontWeight:700 }}>달성!</span>}
              </div>

              {/* Target */}
              <div style={{ fontSize:11, color:C.textMuted, marginBottom:4 }}>목표</div>
              <div style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:14 }}>{qd.target > 0 ? fmt(qd.target) : "미설정"}</div>

              {/* Progress bar — actual */}
              <div style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.textMuted, marginBottom:4 }}>
                  <span>확정 매출</span><span style={{ fontWeight:700, color:qd.color }}>{qd.achRate}%</span>
                </div>
                <div style={{ height:8, background:C.border, borderRadius:4, overflow:"hidden" }}>
                  <div style={{ width:`${qd.achRate}%`, height:"100%", background:qd.color, borderRadius:4, transition:"width .6s ease" }}/>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:qd.color, marginTop:4 }}>{fmt(qd.actualVal)}</div>
              </div>

              {/* Forecast bar */}
              {qd.forecastVal > 0 && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.textMuted, marginBottom:4 }}>
                    <span>파이프라인 예상</span><span style={{ fontWeight:700, color:C.purple }}>{qd.forecastRate}%</span>
                  </div>
                  <div style={{ height:5, background:C.border, borderRadius:4, overflow:"hidden" }}>
                    <div style={{ width:`${qd.forecastRate}%`, height:"100%", background:C.purple, borderRadius:4, opacity:.7 }}/>
                  </div>
                  <div style={{ fontSize:11, color:C.purple, marginTop:3 }}>+{fmt(qd.forecastVal)} 예상</div>
                </div>
              )}

              {/* Deal count */}
              <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${C.border}`, display:"flex", gap:12 }}>
                <span style={{ fontSize:11, color:C.textMuted }}>완료 <strong style={{ color:C.green }}>{qd.won.length}</strong></span>
                <span style={{ fontSize:11, color:C.textMuted }}>진행 <strong style={{ color:qd.color }}>{qd.forecast.length}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drill-down */}
      {selQ && <DrillDown qd={qData.find(d => d.q === selQ)}/>}

      {/* All pipeline revenue schedule */}
      <Card style={{ marginTop: selQ ? 20 : 0 }}>
        <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:4 }}>전체 파이프라인 매출 일정</div>
        <div style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>매출 인식 예정일 기준 정렬 · 클릭하여 날짜 수정</div>

        {/* Group by quarter */}
        {Object.entries(QTR_RANGES).map(([q, cfg]) => {
          const rd = o => o.revenueDate || o.closeDate || "";
          const qOpps = opps
            .filter(o => o.stage !== "손실" && getYear(rd(o)) === year && getQtr(rd(o)) === q)
            .sort((a,b) => rd(a).localeCompare(rd(b)));
          if (qOpps.length === 0) return null;
          return (
            <div key={q} style={{ marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:cfg.color }}/>
                <span style={{ fontSize:13, fontWeight:700, color:cfg.color }}>{q}</span>
                <span style={{ fontSize:12, color:C.textMuted }}>{cfg.label}</span>
                <span style={{ fontSize:11, background:`${cfg.color}15`, color:cfg.color, padding:"1px 8px", borderRadius:10, fontWeight:700 }}>{qOpps.length}건</span>
                <span style={{ fontSize:12, color:cfg.color, fontWeight:700, marginLeft:"auto" }}>{fmt(qOpps.reduce((s,o) => s+(o.stage==="계약완료"?o.value:Math.round(o.value*o.probability/100)),0))}</span>
              </div>
              <div style={{ display:"grid", gap:6 }}>
                {qOpps.map(o => {
                  const cl  = clients.find(c => c.id === o.accountId) || {};
                  const s   = STAGE_MAP[o.stage] || {};
                  const won = o.stage === "계약완료";
                  const rdStr = rd(o);
                  return (
                    <div key={o.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 14px", background: won ? C.greenSoft : C.surfaceUp, border:`1px solid ${won ? C.green+"30" : C.border}`, borderRadius:8 }}>
                      <div style={{ width:4, height:32, borderRadius:2, background:s.color, flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.name}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>{cl.name} · {o.owner}</div>
                      </div>
                      <div style={{ textAlign:"center", minWidth:80 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{rdStr || "미설정"}</div>
                        <div style={{ fontSize:10, color:C.textMuted }}>매출 예정일</div>
                      </div>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, color:s.color, background:`${s.color}15` }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:s.color }}/>{o.stage}
                      </span>
                      <div style={{ textAlign:"right", minWidth:70 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:won ? C.green : s.color }}>{fmt(won ? o.value : Math.round(o.value*o.probability/100))}</div>
                        {!won && <div style={{ fontSize:10, color:C.textMuted }}>가중치</div>}
                      </div>
                      <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onEditRevDate(o); }}>날짜 수정</Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Unscheduled */}
        {(() => {
          const unscheduled = opps.filter(o => {
            if (o.stage === "손실") return false;
            const rd = o.revenueDate || o.closeDate || "";
            return !rd || getYear(rd) !== year;
          });
          if (unscheduled.length === 0) return null;
          return (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:C.textDim }}/>
                <span style={{ fontSize:13, fontWeight:700, color:C.textMuted }}>일정 미배정</span>
                <span style={{ fontSize:11, background:`${C.textDim}20`, color:C.textMuted, padding:"1px 8px", borderRadius:10, fontWeight:700 }}>{unscheduled.length}건</span>
              </div>
              <div style={{ display:"grid", gap:6 }}>
                {unscheduled.map(o => {
                  const cl = clients.find(c => c.id === o.accountId) || {};
                  const s  = STAGE_MAP[o.stage] || {};
                  return (
                    <div key={o.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 14px", background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:8, opacity:.75 }}>
                      <div style={{ width:4, height:32, borderRadius:2, background:C.textDim, flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{o.name}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>{cl.name} · {o.owner}</div>
                      </div>
                      <span style={{ fontSize:12, color:C.textDim }}>날짜 미설정</span>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, color:s.color, background:`${s.color}15` }}>
                        {o.stage}
                      </span>
                      <div style={{ fontSize:13, fontWeight:800, color:s.color }}>{fmt(o.value)}</div>
                      <Btn size="sm" variant="ghost" onClick={() => onEditRevDate(o)}>날짜 배정</Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Goal edit modal */}
      {editGoals && (
        <Modal title={`${year}년 분기별 목표 설정`} onClose={() => setEG(false)}>
          <div style={{ marginBottom:16, padding:"10px 14px", background:C.accentSoft, borderRadius:8, fontSize:13, color:C.accent }}>
            각 분기의 매출 목표를 설정하세요. 파이프라인 달성률 계산에 사용됩니다.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            {["Q1","Q2","Q3","Q4"].map(q => (
              <Inp key={q} label={`${q} 목표 (원) — ${QTR_RANGES[q].label}`}
                type="number"
                value={goalForm[q] || ""}
                onChange={v => setGF(p => ({...p, [q]: Number(v)}))}
                placeholder="예: 1000000000"
              />
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
            <Btn variant="ghost" onClick={() => setEG(false)}>취소</Btn>
            <Btn onClick={() => { onUpdateGoals(prev => ({...prev, [year]: goalForm})); setEG(false); }}>저장</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Helper: standalone RevDateModal outside QuarterlyTracker
function RevDateEditModal({ opp, onSave, onClose }) {
  const [d, setD] = useState(opp.revenueDate || opp.closeDate || "");
  return <Modal title="매출 인식 예정일 수정" onClose={onClose}>
    <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{opp.name}</div>
    <div style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>{fmt(opp.value)} · {opp.owner}</div>
    <Inp label="매출 인식 예정일" type="date" value={d} onChange={setD}/>
    <div style={{ fontSize:12, color:C.textMuted, marginBottom:20 }}>※ 계약 체결 후 실제 매출이 인식되는 날짜입니다</div>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
      <Btn variant="ghost" onClick={onClose}>취소</Btn>
      <Btn onClick={() => onSave(d)}>저장</Btn>
    </div>
  </Modal>;
}
function GlobalSearch({ opps, clients, actions, onNavigate }) {
  const [query, setQuery]   = useState("");
  const [open, setOpen]     = useState(false);
  const [focused, setFocus] = useState(false);
  const inputRef = useState(null);

  const q = query.trim().toLowerCase();

  const results = q.length < 1 ? [] : (() => {
    const out = [];

    // Opportunities
    opps.forEach(o => {
      const cl = clients.find(c => c.id === o.accountId) || {};
      const match =
        o.name.toLowerCase().includes(q) ||
        (cl.name||"").toLowerCase().includes(q) ||
        o.owner.toLowerCase().includes(q) ||
        o.stage.toLowerCase().includes(q) ||
        (o.strategyNote||"").toLowerCase().includes(q) ||
        (o.nextStep||"").toLowerCase().includes(q) ||
        (o.competitors||"").toLowerCase().includes(q);
      if (match) out.push({ type:"opp", id:o.id, title:o.name, sub:`${cl.name||""} · ${o.stage} · ${o.owner}`, meta:fmt(o.value), color:STAGE_MAP[o.stage]?.color||C.accent, opp:o });
    });

    // Clients
    clients.forEach(c => {
      const match = c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q);
      if (match) out.push({ type:"client", id:c.id, title:c.name, sub:`${c.industry} · ${c.owner} 담당`, meta:"고객사", color:C.purple });
    });

    // Actions
    actions.forEach(a => {
      const o = opps.find(x => x.id === a.oppId) || {};
      const match = a.title.toLowerCase().includes(q) || a.owner.toLowerCase().includes(q);
      if (match) out.push({ type:"action", id:a.id, title:a.title, sub:`${o.name||""} · ${a.owner} · ${a.dueDate}`, meta:a.priority, color:a.done?C.green:isLate(a.dueDate)?C.red:C.yellow });
    });

    return out.slice(0, 8);
  })();

  const typeLabel = { opp:"영업기회", client:"고객사", action:"액션" };
  const typeIcon  = { opp:"◉", client:"▣", action:"◎" };

  const handleSelect = (item) => {
    if (item.type === "opp")    onNavigate("pipeline", item.opp);
    if (item.type === "client") onNavigate("clientdb", null);
    if (item.type === "action") onNavigate("actions",  null);
    setQuery(""); setOpen(false);
  };

  return (
    <div style={{ position:"relative", width:260 }}>
      {/* Search input */}
      <div style={{ display:"flex", alignItems:"center", gap:8, background:focused?C.surface:C.surfaceUp, border:`1px solid ${focused?C.accent:C.border}`, borderRadius:8, padding:"7px 12px", transition:"border-color .15s, background .15s" }}>
        <span style={{ fontSize:13, color:C.textMuted, flexShrink:0 }}>🔍</span>
        <input
          value={query}
          onChange={e=>{ setQuery(e.target.value); setOpen(true); }}
          onFocus={()=>{ setFocus(true); setOpen(true); }}
          onBlur={()=>{ setFocus(false); setTimeout(()=>setOpen(false), 150); }}
          placeholder="영업기회, 고객사, 액션 검색..."
          style={{ background:"none", border:"none", outline:"none", fontSize:13, color:C.text, width:"100%", fontFamily:"inherit" }}
        />
        {query && <button onClick={()=>{ setQuery(""); setOpen(false); }} style={{ background:"none", border:"none", cursor:"pointer", color:C.textMuted, fontSize:14, padding:0, lineHeight:1 }}>✕</button>}
      </div>

      {/* Dropdown */}
      {open && q.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, boxShadow:"0 8px 32px rgba(0,0,0,.12)", zIndex:999, overflow:"hidden", minWidth:340 }}>
          {results.length === 0 ? (
            <div style={{ padding:"20px 16px", textAlign:"center", fontSize:13, color:C.textMuted }}>
              "{query}" 검색 결과 없음
            </div>
          ) : (
            <div>
              {/* Group by type */}
              {["opp","client","action"].map(type => {
                const group = results.filter(r => r.type === type);
                if (!group.length) return null;
                return (
                  <div key={type}>
                    <div style={{ padding:"8px 14px 4px", fontSize:10, color:C.textDim, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", background:C.surfaceUp, borderBottom:`1px solid ${C.border}` }}>
                      {typeIcon[type]} {typeLabel[type]} ({group.length})
                    </div>
                    {group.map(item => (
                      <div
                        key={`${item.type}-${item.id}`}
                        onMouseDown={()=>handleSelect(item)}
                        style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${C.border}`, transition:"background .1s" }}
                        onMouseEnter={e=>e.currentTarget.style.background=C.surfaceUp}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      >
                        {/* Color dot */}
                        <div style={{ width:8, height:8, borderRadius:"50%", background:item.color, flexShrink:0 }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          {/* Highlight matching text */}
                          <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize:11, color:C.textMuted, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {item.sub}
                          </div>
                        </div>
                        <span style={{ fontSize:11, background:`${item.color}15`, color:item.color, padding:"2px 8px", borderRadius:10, fontWeight:700, flexShrink:0 }}>
                          {item.meta}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
              <div style={{ padding:"8px 14px", fontSize:11, color:C.textDim, textAlign:"right" }}>
                총 {results.length}건 · Enter로 이동
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MOBILE APP ───────────────────────────────────────────────────────────────
const MC = {
  bg:"#F8F9FA", surface:"#FFFFFF", border:"#EBEBEB",
  accent:"#3B6FE8", accentSoft:"rgba(59,111,232,0.08)",
  green:"#10B981", greenSoft:"rgba(16,185,129,0.09)",
  yellow:"#F59E0B", yellowSoft:"rgba(245,158,11,0.10)",
  red:"#EF4444", redSoft:"rgba(239,68,68,0.09)",
  text:"#1A1A2E", textMuted:"#6B7494", textDim:"#C0C4D0",
};

// Quick activity log modal (mobile)
function MobileLogModal({ opps, onSave, onClose }) {
  const [oppId,   setOpp]  = useState(opps[0]?.id || "");
  const [type,    setType] = useState("방문미팅");
  const [content, setCont] = useState("");
  const [by,      setBy]   = useState("");

  const save = () => {
    if (!content.trim()) return;
    const entry = { id:uid(), date:today(), type, content, by };
    onSave(oppId, entry);
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:900, display:"flex", flexDirection:"column", justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ background:MC.surface, borderRadius:"20px 20px 0 0", padding:"24px 20px 36px", boxShadow:"0 -8px 32px rgba(0,0,0,.12)" }} onClick={e=>e.stopPropagation()}>
        {/* Handle bar */}
        <div style={{ width:40, height:4, background:MC.border, borderRadius:2, margin:"0 auto 20px" }}/>
        <div style={{ fontSize:16, fontWeight:700, color:MC.text, marginBottom:16 }}>활동 기록</div>

        {/* Opp select */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:MC.textMuted, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>영업기회</div>
          <select value={oppId} onChange={e=>setOpp(e.target.value)} style={{ width:"100%", background:MC.bg, border:`1px solid ${MC.border}`, borderRadius:10, padding:"12px 14px", color:MC.text, fontSize:15, outline:"none" }}>
            {opps.filter(o=>o.stage!=="손실").map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        {/* Type */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:MC.textMuted, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>유형</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["방문미팅","전화통화","화상회의","이메일","기타"].map(t=>(
              <button key={t} onClick={()=>setType(t)} style={{ padding:"8px 14px", borderRadius:20, border:`1px solid ${type===t?MC.accent:MC.border}`, background:type===t?MC.accentSoft:"transparent", color:type===t?MC.accent:MC.textMuted, fontSize:13, fontWeight:600, cursor:"pointer" }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:MC.textMuted, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>내용</div>
          <textarea value={content} onChange={e=>setCont(e.target.value)} placeholder="미팅 내용을 간략히 기록하세요..." style={{ width:"100%", background:MC.bg, border:`1px solid ${MC.border}`, borderRadius:10, padding:"12px 14px", color:MC.text, fontSize:15, outline:"none", resize:"none", minHeight:90, fontFamily:"inherit", boxSizing:"border-box" }}/>
        </div>

        {/* By */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, color:MC.textMuted, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>작성자</div>
          <input value={by} onChange={e=>setBy(e.target.value)} placeholder="이름" style={{ width:"100%", background:MC.bg, border:`1px solid ${MC.border}`, borderRadius:10, padding:"12px 14px", color:MC.text, fontSize:15, outline:"none", boxSizing:"border-box" }}/>
        </div>

        <button onClick={save} style={{ width:"100%", background:MC.accent, color:"#fff", border:"none", borderRadius:12, padding:"16px", fontSize:15, fontWeight:700, cursor:"pointer" }}>
          기록 저장
        </button>
      </div>
    </div>
  );
}

function MobileApp({ opps, onUpdateOpps, actions, onUpdateActions, clients, db }) {
  const [mTab, setMTab]   = useState("actions"); // actions | pipeline | contacts
  const [logModal, setLM] = useState(false);
  const [search, setSearch] = useState("");
  const [dateF, setDateF]   = useState("오늘"); // 오늘 | 이번주 | 전체

  const todayStr = today();
  const weekEnd  = (() => { const d=new Date(); d.setDate(d.getDate()+(7-d.getDay())); return d.toISOString().split("T")[0]; })();

  // Actions filtered
  const filteredActs = actions
    .filter(a => !a.done)
    .filter(a => {
      if (dateF==="오늘")   return a.dueDate === todayStr;
      if (dateF==="이번주") return a.dueDate >= todayStr && a.dueDate <= weekEnd;
      return true;
    })
    .sort((a,b)=>({높음:0,중간:1,낮음:2}[a.priority]||0)-({높음:0,중간:1,낮음:2}[b.priority]||0));

  // Toggle action done + auto-log
  const toggleAction = (id) => {
    const act = actions.find(a=>a.id===id);
    if (!act) return;
    onUpdateActions(prev=>prev.map(a=>a.id===id?{...a,done:true}:a));
    if (act.oppId) {
      const entry = { id:uid(), date:todayStr, type:"액션완료", content:`[액션 완료] ${act.title}`, by:act.owner||"—" };
      onUpdateOpps(prev=>prev.map(o=>o.id===act.oppId?{...o,activities:[entry,...(o.activities||[])]}:o));
    }
  };

  // Save activity log
  const saveLog = (oppId, entry) => {
    onUpdateOpps(prev=>prev.map(o=>o.id===oppId?{...o,activities:[entry,...(o.activities||[])]}:o));
  };

  // Contacts search
  const allContacts = clients.flatMap(cl => {
    const d = db[cl.id]||{contacts:[]};
    return d.contacts.map(c=>({...c, clientName:cl.name, clientIndustry:cl.industry}));
  }).filter(c => !search || c.name.includes(search) || c.clientName.includes(search) || (c.title||"").includes(search));

  // Pipeline top deals
  const activeOpps = opps
    .filter(o=>o.stage!=="손실"&&o.stage!=="계약완료")
    .sort((a,b)=>b.value*b.probability/100 - a.value*a.probability/100);
  const wonOpps = opps.filter(o=>o.stage==="계약완료");

  const lateCount  = actions.filter(a=>!a.done&&isLate(a.dueDate)).length;
  const todayCount = actions.filter(a=>!a.done&&a.dueDate===todayStr).length;

  const tabItems = [
    { id:"actions",   label:"액션",    icon:"✓" },
    { id:"pipeline",  label:"파이프라인", icon:"◉" },
    { id:"contacts",  label:"연락처",  icon:"👤" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:MC.bg, fontFamily:"'DM Sans','Pretendard','Apple SD Gothic Neo',sans-serif", color:MC.text, paddingBottom:80 }}>

      {/* Mobile Header */}
      <div style={{ background:MC.surface, borderBottom:`1px solid ${MC.border}`, padding:"14px 20px", position:"sticky", top:0, zIndex:100, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:MC.accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:12, fontWeight:900, color:"#fff" }}>S</span>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:MC.text, letterSpacing:"-.02em" }}>SalesHub</div>
            <div style={{ fontSize:9, color:MC.textMuted, letterSpacing:".08em", textTransform:"uppercase" }}>Kangwon Energy</div>
          </div>
        </div>
        <div style={{ fontSize:12, color:MC.textMuted }}>{new Date().toLocaleDateString("ko-KR",{month:"short",day:"numeric",weekday:"short"})}</div>
      </div>

      {/* Content */}
      <div style={{ padding:"16px 16px 0" }}>

        {/* ── 액션 탭 ── */}
        {mTab==="actions" && <div>
          {/* Quick stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { label:"오늘 마감",  val:todayCount,  color:todayCount>0?MC.yellow:MC.textMuted, bg:todayCount>0?MC.yellowSoft:"transparent" },
              { label:"기한 초과",  val:lateCount,   color:lateCount>0?MC.red:MC.textMuted,    bg:lateCount>0?MC.redSoft:"transparent"    },
            ].map(s=>(
              <div key={s.label} style={{ background:MC.surface, border:`1px solid ${s.color}30`, borderRadius:12, padding:"14px 16px" }}>
                <div style={{ fontSize:11, color:MC.textMuted, fontWeight:600, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Date filter pills */}
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {["오늘","이번주","전체"].map(f=>(
              <button key={f} onClick={()=>setDateF(f)} style={{ padding:"7px 16px", borderRadius:20, border:`1px solid ${dateF===f?MC.accent:MC.border}`, background:dateF===f?MC.accentSoft:"transparent", color:dateF===f?MC.accent:MC.textMuted, fontSize:13, fontWeight:600, cursor:"pointer" }}>{f}</button>
            ))}
          </div>

          {/* Action list */}
          {filteredActs.length === 0 && (
            <div style={{ textAlign:"center", padding:"48px 0", color:MC.textMuted }}>
              <div style={{ fontSize:36, marginBottom:8 }}>✓</div>
              <div style={{ fontSize:15, fontWeight:600, color:MC.text }}>모든 액션 완료!</div>
            </div>
          )}
          <div style={{ display:"grid", gap:10 }}>
            {filteredActs.map(a=>{
              const opp = opps.find(o=>o.id===a.oppId)||{};
              const ov  = isLate(a.dueDate);
              const priColor = PRI_CFG[a.priority]||MC.textMuted;
              return (
                <div key={a.id} style={{ background:MC.surface, border:`1px solid ${ov?MC.red+"40":MC.border}`, borderRadius:14, padding:"14px 16px", display:"flex", gap:14, alignItems:"flex-start" }}>
                  {/* Check button */}
                  <button onClick={()=>toggleAction(a.id)} style={{ width:26, height:26, borderRadius:8, border:`2px solid ${MC.border}`, background:"transparent", cursor:"pointer", flexShrink:0, marginTop:2, display:"flex", alignItems:"center", justifyContent:"center" }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:600, color:MC.text, marginBottom:4 }}>{a.title}</div>
                    <div style={{ fontSize:12, color:MC.textMuted, marginBottom:8 }}>{opp.name||"—"} · {a.owner}</div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:11, background:`${priColor}18`, color:priColor, padding:"2px 9px", borderRadius:10, fontWeight:700 }}>{a.priority}</span>
                      <span style={{ fontSize:12, color:ov?MC.red:MC.textMuted, fontWeight:ov?700:400 }}>{ov?"⚠ ":""}{a.dueDate}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {/* ── 파이프라인 탭 ── */}
        {mTab==="pipeline" && <div>
          {/* Summary pills */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { label:"활성 딜",  val:activeOpps.length,  color:MC.accent  },
              { label:"계약완료", val:wonOpps.length,     color:MC.green   },
              { label:"파이프라인", val:fmt(activeOpps.reduce((s,o)=>s+o.value,0)), color:MC.text },
            ].map(s=>(
              <div key={s.label} style={{ background:MC.surface, border:`1px solid ${MC.border}`, borderRadius:12, padding:"12px 14px" }}>
                <div style={{ fontSize:10, color:MC.textMuted, fontWeight:600, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:18, fontWeight:900, color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Deal list */}
          <div style={{ display:"grid", gap:10 }}>
            {activeOpps.map(o=>{
              const cl = clients.find(c=>c.id===o.accountId)||{};
              const s  = STAGE_MAP[o.stage]||{};
              const late = isLate(o.nextStepDate);
              return (
                <div key={o.id} style={{ background:MC.surface, border:`1px solid ${MC.border}`, borderRadius:14, padding:"16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:MC.text, marginBottom:2 }}>{o.name}</div>
                      <div style={{ fontSize:12, color:MC.textMuted }}>{cl.name} · {o.owner}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                      <div style={{ fontSize:16, fontWeight:900, color:s.color }}>{fmt(o.value)}</div>
                      <div style={{ fontSize:10, color:MC.textMuted }}>{o.probability}%</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, color:s.color, background:`${s.color}15` }}>
                      <span style={{ width:5, height:5, borderRadius:"50%", background:s.color }}/>{o.stage}
                    </span>
                    {o.nextStep && (
                      <div style={{ fontSize:11, color:late?MC.red:MC.textMuted, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"right" }}>
                        {late?"⚠ ":""}{o.nextStep}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {activeOpps.length===0&&<div style={{ textAlign:"center", padding:"48px 0", color:MC.textMuted }}>활성 딜이 없습니다</div>}
          </div>
        </div>}

        {/* ── 연락처 탭 ── */}
        {mTab==="contacts" && <div>
          {/* Search */}
          <div style={{ display:"flex", alignItems:"center", gap:10, background:MC.surface, border:`1px solid ${MC.border}`, borderRadius:12, padding:"12px 16px", marginBottom:16 }}>
            <span style={{ fontSize:16, color:MC.textMuted }}>🔍</span>
            <input
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="이름, 고객사, 직책 검색..."
              style={{ background:"none", border:"none", outline:"none", fontSize:15, color:MC.text, width:"100%", fontFamily:"inherit" }}
            />
            {search&&<button onClick={()=>setSearch("")} style={{ background:"none", border:"none", color:MC.textMuted, fontSize:16, cursor:"pointer", padding:0 }}>✕</button>}
          </div>

          {/* Contact list */}
          <div style={{ display:"grid", gap:10 }}>
            {allContacts.length===0&&<div style={{ textAlign:"center", padding:"48px 0", color:MC.textMuted }}>{search?"검색 결과 없음":"등록된 담당자가 없습니다"}</div>}
            {allContacts.map((c,i)=>{
              const iColor = INFLUENCE_COLOR[c.influence||"검토자"]||MC.textMuted;
              return (
                <div key={`${c.id}-${i}`} style={{ background:MC.surface, border:`1px solid ${MC.border}`, borderRadius:14, padding:"16px" }}>
                  <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10 }}>
                    <div style={{ width:44, height:44, borderRadius:"50%", background:`${iColor}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:iColor, flexShrink:0 }}>{c.name[0]}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                        <span style={{ fontSize:15, fontWeight:700, color:MC.text }}>{c.name}</span>
                        {c.primary&&<span style={{ fontSize:10, background:MC.accentSoft, color:MC.accent, padding:"1px 7px", borderRadius:8, fontWeight:700 }}>주담당</span>}
                      </div>
                      <div style={{ fontSize:12, color:MC.textMuted }}>{c.title} · {c.clientName}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10, paddingTop:10, borderTop:`1px solid ${MC.border}` }}>
                    {c.phone&&(
                      <a href={`tel:${c.phone}`} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px", background:MC.accentSoft, borderRadius:10, textDecoration:"none", color:MC.accent, fontSize:13, fontWeight:600 }}>
                        📞 전화
                      </a>
                    )}
                    {c.email&&(
                      <a href={`mailto:${c.email}`} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px", background:`${MC.green}12`, borderRadius:10, textDecoration:"none", color:MC.green, fontSize:13, fontWeight:600 }}>
                        ✉ 이메일
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>}
      </div>

      {/* FAB — 활동 기록 (액션/파이프라인 탭에서만) */}
      {(mTab==="actions"||mTab==="pipeline") && (
        <button onClick={()=>setLM(true)} style={{ position:"fixed", bottom:88, right:20, width:56, height:56, borderRadius:"50%", background:MC.accent, color:"#fff", border:"none", cursor:"pointer", fontSize:24, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(59,111,232,.45)", zIndex:200 }}>
          +
        </button>
      )}

      {/* Bottom Tab Bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:MC.surface, borderTop:`1px solid ${MC.border}`, display:"flex", zIndex:100, paddingBottom:"env(safe-area-inset-bottom, 0px)" }}>
        {tabItems.map(t=>(
          <button key={t.id} onClick={()=>setMTab(t.id)} style={{ flex:1, padding:"10px 0 12px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, fontFamily:"inherit" }}>
            <span style={{ fontSize:20, lineHeight:1 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight:mTab===t.id?700:500, color:mTab===t.id?MC.accent:MC.textMuted, letterSpacing:".02em" }}>{t.label}</span>
            {t.id==="actions"&&actions.filter(a=>!a.done&&a.dueDate===todayStr).length>0&&(
              <span style={{ position:"absolute", top:8, width:7, height:7, borderRadius:"50%", background:MC.red }}/>
            )}
          </button>
        ))}
      </div>

      {/* Activity log modal */}
      {logModal && <MobileLogModal opps={opps.filter(o=>o.stage!=="손실")} onSave={saveLog} onClose={()=>setLM(false)}/>}
    </div>
  );
}
function useIsMobile() {
  const [mobile, setMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

const TABS = [
  { id:"dashboard", label:"대시보드",   icon:"◈" },
  { id:"pipeline",  label:"파이프라인", icon:"◉" },
  { id:"tracker",   label:"목표 트래킹", icon:"▦" },
  { id:"clientdb",  label:"고객사 DB",  icon:"▣" },
  { id:"actions",   label:"액션",       icon:"◎" },
];

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage() {
  const { instance } = useMsal();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleLogin = async () => {
    setLoading(true); setError("");
    try {
      await instance.loginPopup(LOGIN_SCOPES);
    } catch(e) {
      if (e.errorCode !== "user_cancelled") setError("로그인에 실패했습니다. 다시 시도해주세요.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Pretendard','Apple SD Gothic Neo',sans-serif" }}>
      <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:20, padding:"48px 44px", width:"100%", maxWidth:400, boxShadow:"0 8px 40px rgba(0,0,0,.08)", textAlign:"center" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:32 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"#3B6FE8", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:20, fontWeight:900, color:"#fff" }}>S</span>
          </div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:20, fontWeight:900, color:"#1E293B", letterSpacing:"-.03em" }}>SalesHub</div>
            <div style={{ fontSize:10, color:"#64748B", letterSpacing:".10em", textTransform:"uppercase" }}>Kangwon Energy</div>
          </div>
        </div>

        <div style={{ fontSize:22, fontWeight:800, color:"#1E293B", marginBottom:8 }}>로그인</div>
        <div style={{ fontSize:14, color:"#64748B", marginBottom:32, lineHeight:1.6 }}>
          강원에너지 Microsoft 365 계정으로<br/>로그인하세요
        </div>

        {/* MS Login Button */}
        <button onClick={handleLogin} disabled={loading} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:12, padding:"14px 20px", background:loading?"#E2E8F0":"#fff", border:"1.5px solid #E2E8F0", borderRadius:12, cursor:loading?"not-allowed":"pointer", fontSize:15, fontWeight:600, color:"#1E293B", transition:"all .15s" }}>
          {/* Microsoft Logo SVG */}
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
          </svg>
          {loading ? "로그인 중..." : "Microsoft 365로 로그인"}
        </button>

        {error && <div style={{ marginTop:16, padding:"10px 14px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, fontSize:13, color:"#DC2626" }}>{error}</div>}

        <div style={{ marginTop:28, fontSize:12, color:"#94A3B8", lineHeight:1.6 }}>
          강원에너지 임직원만 접근 가능합니다.<br/>
          문의: IT팀
        </div>
      </div>
    </div>
  );
}

// ─── AUTH WRAPPER — Access Control ───────────────────────────────────────────
function AuthenticatedApp() {
  const isAuthenticated = useIsAuthenticated();
  const { accounts }    = useMsal();
  const [accessStatus, setStatus] = useState("checking"); // checking | approved | pending | denied
  const [pendingUsers,  setPending] = useState([]);
  const account = accounts[0];
  const email   = (account?.username || account?.idTokenClaims?.email || account?.idTokenClaims?.preferred_username || "").toLowerCase().trim();
  const name    = account?.name || email;

  // Check access on login
  useEffect(() => {
    if (!isAuthenticated || !email) return;
    (async () => {
      try {
        const res  = await fetch(`${SB_URL}/rest/v1/allowed_users?email=eq.${encodeURIComponent(email)}&select=email,approved,role`, { headers:sbHeaders });
        const rows = await res.json();
        if (rows.length > 0 && rows[0].approved) {
          setStatus("approved");
        } else if (rows.length > 0 && !rows[0].approved) {
          setStatus("pending");
        } else {
          // First time — auto-register as pending
          await fetch(`${SB_URL}/rest/v1/allowed_users`, {
            method:"POST",
            headers:{ ...sbHeaders, "Prefer":"resolution=merge-duplicates" },
            body: JSON.stringify({ email, name: email, role:"member", approved:false }),
          });
          setStatus("pending");
        }
      } catch(e) { setStatus("approved"); }
    })();
  }, [isAuthenticated, email]);

  if (!isAuthenticated) return <LoginPage/>;
  if (accessStatus === "checking") return <AccessCheckingPage/>;
  if (accessStatus === "pending")  return <AccessPendingPage email={email} name={name}/>;
  if (accessStatus === "denied")   return <AccessDeniedPage/>;
  return <App/>;
}

function AccessCheckingPage() {
  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Pretendard',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, border:`3px solid #E2E8F0`, borderTop:`3px solid #3B6FE8`, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 20px" }}/>
        <div style={{ fontSize:16, fontWeight:600, color:"#1E293B" }}>접근 권한 확인 중...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

function AccessPendingPage({ email, name }) {
  const { instance } = useMsal();
  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Pretendard',sans-serif" }}>
      <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:20, padding:"48px 44px", width:"100%", maxWidth:420, boxShadow:"0 8px 40px rgba(0,0,0,.08)", textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"#FEF9C3", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 20px" }}>⏳</div>
        <div style={{ fontSize:22, fontWeight:800, color:"#1E293B", marginBottom:8 }}>승인 대기 중</div>
        <div style={{ fontSize:14, color:"#64748B", marginBottom:24, lineHeight:1.7 }}>
          <strong style={{ color:"#1E293B" }}>{name}</strong>님의 계정이<br/>
          관리자 승인을 기다리고 있습니다.<br/><br/>
          <span style={{ fontSize:12, color:"#94A3B8" }}>{email}</span>
        </div>
        <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:12, padding:"14px 16px", marginBottom:24, fontSize:13, color:"#64748B", lineHeight:1.6 }}>
          관리자(jyshin@psmgroup.co.kr)에게<br/>
          접근 승인을 요청해주세요.
        </div>
        <button onClick={()=>instance.logoutPopup()} style={{ width:"100%", padding:"12px", background:"transparent", border:"1px solid #E2E8F0", borderRadius:10, fontSize:14, color:"#64748B", cursor:"pointer" }}>
          로그아웃
        </button>
      </div>
    </div>
  );
}

function AccessDeniedPage() {
  const { instance } = useMsal();
  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Pretendard',sans-serif" }}>
      <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:20, padding:"48px 44px", width:"100%", maxWidth:420, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🚫</div>
        <div style={{ fontSize:22, fontWeight:800, color:"#1E293B", marginBottom:8 }}>접근 거부됨</div>
        <div style={{ fontSize:14, color:"#64748B", marginBottom:24 }}>이 계정은 SalesHub 접근이 허용되지 않습니다.</div>
        <button onClick={()=>instance.logoutPopup()} style={{ width:"100%", padding:"12px", background:"#EF4444", border:"none", borderRadius:10, fontSize:14, color:"#fff", cursor:"pointer", fontWeight:600 }}>
          로그아웃
        </button>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ onClose }) {
  const [users, setUsers]   = useState([]);
  const [loading, setLoad]  = useState(true);
  const [filter, setFilter] = useState("pending"); // pending | approved | all

  const loadUsers = async () => {
    setLoad(true);
    const res  = await fetch(`${SB_URL}/rest/v1/allowed_users?select=*&order=added_at.desc`, { headers:sbHeaders });
    const rows = await res.json();
    setUsers(Array.isArray(rows) ? rows : []);
    setLoad(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const approve = async (email) => {
    await fetch(`${SB_URL}/rest/v1/allowed_users?email=eq.${encodeURIComponent(email)}`, {
      method:"PATCH", headers:sbHeaders,
      body: JSON.stringify({ approved:true }),
    });
    setUsers(prev => prev.map(u => u.email===email ? {...u, approved:true} : u));
  };

  const deny = async (email) => {
    if (!window.confirm(`${email} 접근을 거부하시겠습니까?`)) return;
    await fetch(`${SB_URL}/rest/v1/allowed_users?email=eq.${encodeURIComponent(email)}`, {
      method:"DELETE", headers:sbHeaders,
    });
    setUsers(prev => prev.filter(u => u.email !== email));
  };

  const pendingCount  = users.filter(u => !u.approved).length;
  const approvedCount = users.filter(u => u.approved).length;

  const filtered = users.filter(u =>
    filter === "all"     ? true :
    filter === "pending" ? !u.approved :
    u.approved
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, width:"100%", maxWidth:640, maxHeight:"80vh", overflow:"auto", padding:"28px 32px", boxShadow:"0 24px 60px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:C.text }}>사용자 관리</div>
            <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>SalesHub 접근 권한 승인 · 관리자 전용</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:20 }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
          {[
            { label:"전체",     val:users.length,   color:C.text,   id:"all"      },
            { label:"승인 대기", val:pendingCount,  color:C.yellow, id:"pending"  },
            { label:"승인 완료", val:approvedCount, color:C.green,  id:"approved" },
          ].map(s=>(
            <div key={s.id} onClick={()=>setFilter(s.id)} style={{ background:filter===s.id?C.accentSoft:C.surfaceUp, border:`1px solid ${filter===s.id?C.accent:C.border}`, borderRadius:10, padding:"12px 14px", cursor:"pointer", textAlign:"center" }}>
              <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* User list */}
        {loading && <div style={{ textAlign:"center", padding:"32px 0", color:C.textMuted }}>로딩 중...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 0", color:C.textMuted }}>
            {filter==="pending" ? "대기 중인 사용자가 없습니다" : "해당하는 사용자가 없습니다"}
          </div>
        )}
        <div style={{ display:"grid", gap:10 }}>
          {filtered.map(u => (
            <div key={u.email} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:12 }}>
              {/* Avatar */}
              <div style={{ width:40, height:40, borderRadius:"50%", background:u.approved?C.greenSoft:C.yellowSoft, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:u.approved?C.green:C.yellow, flexShrink:0 }}>
                {(u.name||u.email)[0].toUpperCase()}
              </div>
              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{u.name || "—"}</div>
                <div style={{ fontSize:11, color:C.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                <div style={{ fontSize:10, color:C.textDim, marginTop:1 }}>가입: {u.added_at?.slice(0,10)}</div>
              </div>
              {/* Status badge */}
              <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:700, background:u.approved?C.greenSoft:C.yellowSoft, color:u.approved?C.green:C.yellow, flexShrink:0 }}>
                {u.approved ? "승인됨" : "대기 중"}
              </span>
              {/* Actions */}
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                {!u.approved && (
                  <button onClick={()=>approve(u.email)} style={{ padding:"6px 14px", background:C.green, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    승인
                  </button>
                )}
                {u.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
                  <button onClick={()=>deny(u.email)} style={{ padding:"6px 14px", background:"transparent", color:C.red, border:`1px solid ${C.red}30`, borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    {u.approved ? "차단" : "거부"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Refresh */}
        <div style={{ textAlign:"right", marginTop:16 }}>
          <button onClick={loadUsers} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:13 }}>↻ 새로고침</button>
        </div>
      </div>
    </div>
  );
}

// ─── USER MENU (nav bar) ──────────────────────────────────────────────────────
function UserMenu() {
  const { instance, accounts } = useMsal();
  const [open, setOpen]      = useState(false);
  const [adminPanel, setAP]  = useState(false);
  const account  = accounts[0];
  const name     = account?.name || account?.username || "사용자";
  const email    = account?.username || "";
  const initials = name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() || "U";
  const isAdmin  = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handleLogout = () => {
    instance.logoutPopup({ postLogoutRedirectUri: window.location.origin });
  };

  return (
    <div style={{ position:"relative" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:"4px 8px", borderRadius:8 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"#fff" }}>{initials}</div>
        <div style={{ textAlign:"left" }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.text, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</div>
          <div style={{ fontSize:10, color:C.textMuted, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{email}</div>
        </div>
        <span style={{ fontSize:10, color:C.textMuted }}>▾</span>
      </button>

      {open && <>
        <div onClick={()=>setOpen(false)} style={{ position:"fixed", inset:0, zIndex:199 }}/>
        <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"6px", boxShadow:"0 8px 24px rgba(0,0,0,.12)", zIndex:200, minWidth:200 }}>
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`, marginBottom:6 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{name}</div>
            <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{email}</div>
            {isAdmin && <span style={{ fontSize:10, background:C.accentSoft, color:C.accent, padding:"1px 7px", borderRadius:8, fontWeight:700, marginTop:4, display:"inline-block" }}>관리자</span>}
          </div>
          {isAdmin && (
            <button onClick={()=>{ setOpen(false); setAP(true); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"none", border:"none", cursor:"pointer", borderRadius:8, fontSize:13, color:C.text, fontFamily:"inherit", textAlign:"left" }}>
              👥 사용자 관리
            </button>
          )}
          <button onClick={handleLogout} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"none", border:"none", cursor:"pointer", borderRadius:8, fontSize:13, color:C.red, fontFamily:"inherit", textAlign:"left" }}>
            → 로그아웃
          </button>
        </div>
      </>}

      {adminPanel && <AdminPanel onClose={()=>setAP(false)}/>}
    </div>
  );
}

export default function AppRoot() {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthenticatedApp/>
    </MsalProvider>
  );
}

// ─── Admin config ────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "jyshin@psmgroup.co.kr";

function App() {
  const isMobile = useIsMobile();
  const { accounts } = useMsal();
  const isAdmin = (accounts[0]?.username || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const [tab, sT]         = useState("dashboard");
  const [opps, sO]        = useState(INIT_OPPS);
  const [archived, sArch] = useState([]);
  const [clients, sCl]         = useState(INIT_CLIENTS);
  const [archivedClients, sACl] = useState([]); // archived clients
  const [db, sDb]               = useState(INIT_DB);
  const [archivedDb, sADb]      = useState({}); // archived clients_db
  const [meetings, sMt]   = useState(INIT_MEETINGS);
  const [actions, sAc]    = useState(INIT_ACTIONS);
  const [goals, sGoals]   = useState(INIT_GOALS);
  const [searchTarget, setST]   = useState(null);
  const [clientTarget, setCT]   = useState(null); // client to jump to in clientdb
  const [revEditOpp, setRE]     = useState(null);

  // ── 탭 간 네비게이션 ──
  const handleNavigateToClient = (client) => {
    setCT(client);
    sT("clientdb");
  };
  const handleNavigateToPipeline = (opp) => {
    setST(opp);
    sT("pipeline");
  };
  const [dbReady, setDbReady] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [dbError, setDbError] = useState(""); // DB 에러 메시지

  // ── Load from Supabase on mount ──
  useEffect(() => {
    (async () => {
      // 1. 연결 확인
      const connected = await sbPing();
      if (!connected) {
        setDbError("Supabase 연결 실패 — 프로젝트가 일시정지 상태일 수 있습니다. supabase.com에서 확인해주세요.");
        setDbReady(true);
        return;
      }

      // 2. 데이터 로드 (테이블별 개별 처리 — 하나 실패해도 나머지 로드)
      const load = async (table) => { try { return await sbGet(table); } catch(e) { console.error(e); return []; } };

      const [oppRows, dbRows, meetRows, actRows, goalRows, archRows, clRows, aclRows, adbRows] = await Promise.all([
        load("opps"), load("clients_db"), load("meetings"),
        load("actions"), load("goals"), load("archived_opps"),
        load("clients"), load("archived_clients"), load("archived_clients_db"),
      ]);

      if (oppRows.length)  sO(oppRows.map(r=>r.data));
      if (dbRows.length)   sDb(Object.fromEntries(dbRows.map(r=>[r.id, r.data])));
      if (meetRows.length) sMt(meetRows.map(r=>r.data));
      if (actRows.length)  sAc(actRows.map(r=>r.data));
      if (goalRows.length) sGoals(goalRows[0]?.data || INIT_GOALS);
      if (archRows.length) sArch(archRows.map(r=>r.data));
      if (clRows.length)   sCl(clRows.map(r=>r.data));
      if (aclRows.length)  sACl(aclRows.map(r=>r.data));
      if (adbRows.length)  sADb(Object.fromEntries(adbRows.map(r=>[r.id, r.data])));

      setDbReady(true);
    })();
  }, []);

  // ── Save helpers ──
  const saveOpps = async (updater) => {
    sO(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setSaving(true);
      Promise.all(next.map(o => sbUpsert("opps", o.id, o)))
        .finally(() => setSaving(false));
      return next;
    });
  };
  const saveClients = async (updater) => {
    sCl(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setSaving(true);
      Promise.all(next.map(c => sbUpsert("clients", String(c.id), c)))
        .finally(() => setSaving(false));
      return next;
    });
  };
  const saveDb = async (updater) => {
    sDb(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setSaving(true);
      Promise.all(Object.entries(next).map(([id, data]) => sbUpsert("clients_db", id, data)))
        .finally(() => setSaving(false));
      return next;
    });
  };
  const saveMeetings = async (updater) => {
    sMt(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setSaving(true);
      Promise.all(next.map(m => sbUpsert("meetings", m.id, m)))
        .finally(() => setSaving(false));
      return next;
    });
  };
  const saveActions = async (updater) => {
    sAc(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setSaving(true);
      Promise.all(next.map(a => sbUpsert("actions", a.id, a)))
        .finally(() => setSaving(false));
      return next;
    });
  };
  const saveGoals = async (updater) => {
    sGoals(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setSaving(true);
      sbUpsert("goals", "goals_main", next).finally(() => setSaving(false));
      return next;
    });
  };
  const archiveOpp = (opp) => {
    const entry = { ...opp, archivedAt: today() };
    sO(prev => prev.filter(o => o.id !== opp.id));
    sArch(prev => [entry, ...prev]);
    sbDelete("opps", opp.id);
    sbUpsert("archived_opps", opp.id, entry);
  };
  const restoreOpp = (opp) => {
    if (opp._permDelete) {
      sArch(prev => prev.filter(o => o.id !== opp.id));
      sbDelete("archived_opps", opp.id);
    } else {
      const restored = { ...opp, archivedAt: undefined };
      sArch(prev => prev.filter(o => o.id !== opp.id));
      sO(prev => [...prev, restored]);
      sbDelete("archived_opps", opp.id);
      sbUpsert("opps", restored.id, restored);
    }
  };

  // ── Client archive / restore ──
  const archiveClient = (client) => {
    const entry    = { ...client, archivedAt: today() };
    const clientDb = db[client.id] || {};
    // Remove from active
    sCl(prev => prev.filter(c => c.id !== client.id));
    sDb(prev => { const n={...prev}; delete n[client.id]; return n; });
    // Add to archived
    sACl(prev => [entry, ...prev]);
    sADb(prev => ({ ...prev, [client.id]: clientDb }));
    // Supabase
    sbDelete("clients", String(client.id));
    sbDelete("clients_db", String(client.id));
    sbUpsert("archived_clients",    String(client.id), entry);
    sbUpsert("archived_clients_db", String(client.id), clientDb);
  };

  const restoreClient = (client, permDelete = false) => {
    if (permDelete) {
      sACl(prev => prev.filter(c => c.id !== client.id));
      sADb(prev => { const n={...prev}; delete n[client.id]; return n; });
      sbDelete("archived_clients",    String(client.id));
      sbDelete("archived_clients_db", String(client.id));
    } else {
      const restored  = { ...client, archivedAt: undefined };
      const clientDb  = archivedDb[client.id] || {};
      sACl(prev => prev.filter(c => c.id !== client.id));
      sADb(prev => { const n={...prev}; delete n[client.id]; return n; });
      sCl(prev => [...prev, restored]);
      sDb(prev => ({ ...prev, [client.id]: clientDb }));
      sbDelete("archived_clients",    String(client.id));
      sbDelete("archived_clients_db", String(client.id));
      sbUpsert("clients",    String(client.id), restored);
      sbUpsert("clients_db", String(client.id), clientDb);
    }
  };

  // ── 모바일 뷰 ──
  if (isMobile) {
    return <MobileApp opps={opps} onUpdateOpps={saveOpps} actions={actions} onUpdateActions={saveActions} clients={clients} db={db}/>;
  }

  const pending   = actions.filter(a=>!a.done).length;
  const lateCount = actions.filter(a=>!a.done&&isLate(a.dueDate)).length;

  const handleSearchNav = (targetTab, opp) => { sT(targetTab); if (opp) setST(opp); };

  return <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans','Pretendard','Apple SD Gothic Neo',sans-serif", color:C.text }}>
    <div style={{ borderBottom:`1px solid ${C.border}`, padding:"0 32px", background:C.surface, position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
      <div style={{ maxWidth:1400, margin:"0 auto", display:"flex", alignItems:"center" }}>
        <div style={{ padding:"14px 0", marginRight:40, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:C.accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:14, fontWeight:900, color:"#fff" }}>S</span>
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:900, letterSpacing:"-.03em", color:C.text }}>SalesHub</div>
            <div style={{ fontSize:9, color:C.textMuted, letterSpacing:".10em", textTransform:"uppercase", marginTop:-1 }}>Kangwon Energy</div>
          </div>
        </div>
        {TABS.map(t=><button key={t.id} onClick={()=>sT(t.id)} style={{ padding:"18px 16px", background:"none", border:"none", cursor:"pointer", borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`, color:tab===t.id?C.accent:C.textMuted, fontWeight:tab===t.id?700:500, fontSize:13, display:"flex", alignItems:"center", gap:6, transition:"color .15s", fontFamily:"inherit" }}>
          <span style={{ fontSize:10 }}>{t.icon}</span>{t.label}
          {t.id==="actions"&&pending>0&&<span style={{ background:lateCount>0?C.red:C.accent, color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:800 }}>{pending}</span>}
        </button>)}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:14 }}>
          {/* DB status indicator */}
          {!dbReady && <span style={{ fontSize:11, color:C.textMuted, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:C.yellow, display:"inline-block" }}/>데이터 로딩 중...
          </span>}
          {dbReady && dbError && (
            <span style={{ fontSize:11, color:C.red, display:"flex", alignItems:"center", gap:5, cursor:"pointer", maxWidth:200 }} title={dbError}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:C.red, display:"inline-block", flexShrink:0 }}/>
              DB 연결 오류 — <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={{ color:C.red, fontWeight:700 }}>확인하기</a>
            </span>
          )}
          {dbReady && !dbError && saving && <span style={{ fontSize:11, color:C.textMuted, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:C.accent, display:"inline-block" }}/>저장 중...
          </span>}
          {dbReady && !dbError && !saving && <span style={{ fontSize:11, color:C.green, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:C.green, display:"inline-block" }}/>저장됨
          </span>}
          <GlobalSearch opps={opps} clients={clients} actions={actions} onNavigate={handleSearchNav}/>
          <span style={{ fontSize:12, color:C.textMuted }}>{new Date().toLocaleDateString("ko-KR",{weekday:"short",month:"long",day:"numeric"})}</span>
          <UserMenu/>
        </div>
      </div>
    </div>

    <div style={{ maxWidth:1400, margin:"0 auto", padding:"28px 32px" }}>
      {tab==="dashboard"&&<Dashboard opps={opps} actions={actions} meetings={meetings} clients={clients}/>}
      {tab==="pipeline" &&<Pipeline  opps={opps} onUpdateOpps={saveOpps} clients={clients} actions={actions} onUpdateActions={saveActions} initialTarget={searchTarget} onClearTarget={()=>setST(null)} meetings={meetings} onUpdateMeetings={saveMeetings} archived={archived} onArchive={archiveOpp} onRestore={restoreOpp} isAdmin={isAdmin} onNavigateToClient={handleNavigateToClient}/>}
      {tab==="tracker"  &&<QuarterlyTracker opps={opps} clients={clients} goals={goals} onUpdateGoals={saveGoals} onEditRevDate={o=>setRE(o)}/>}
      {tab==="clientdb" &&<ClientDB  clients={clients} onUpdateClients={saveClients} db={db} onUpdateDb={saveDb} opps={opps} archivedClients={archivedClients} archivedDb={archivedDb} onArchiveClient={archiveClient} onRestoreClient={restoreClient} isAdmin={isAdmin} onNavigateToPipeline={handleNavigateToPipeline} initialClient={clientTarget} onClearClient={()=>setCT(null)}/>}
      {tab==="actions"  &&<Actions   actions={actions} clients={clients} opps={opps} onUpdate={saveActions} onUpdateOpps={saveOpps}/>}
    </div>
    {revEditOpp && <RevDateEditModal opp={revEditOpp} onClose={()=>setRE(null)}
      onSave={d=>{ saveOpps(prev=>prev.map(o=>o.id===revEditOpp.id?{...o,revenueDate:d}:o)); setRE(null); }}
    />}
  </div>;
}
