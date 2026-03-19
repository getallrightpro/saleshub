import { useState } from "react";

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
const INIT_OPPS = [
  {
    id:"o1", name:"삼성전자 2025 반도체 소재 공급", accountId:1, owner:"김민준",
    stage:"협상", value:480000000, probability:75, closeDate:"2025-02-28",
    nextStep:"계약서 최종 검토 미팅", nextStepDate:"2025-01-20",
    competitors:"A소재㈜, 독일 Chemco GmbH", source:"기존 거래",
    strategyNote:"법무팀 우선 공략. 가격보다 납기 안정성과 품질 인증을 강조할 것. A사 대비 납기 2주 우위 확보.",
    stageHistory:[
      { id:"sh1", stage:"리드",     date:"2024-09-15", note:"기존 거래처 담당자 교체로 재영업 기회 포착", by:"김민준" },
      { id:"sh2", stage:"초기접촉", date:"2024-10-02", note:"신임 구매팀장 홍길동 과장과 첫 미팅. 긍정적 반응.", by:"김민준" },
      { id:"sh3", stage:"니즈파악", date:"2024-10-28", note:"2025 조달 물량 및 스펙 요건 상세 파악.", by:"김민준" },
      { id:"sh4", stage:"제안",     date:"2024-12-01", note:"제안서 v1 발표. 가격 조정 요청 수령.", by:"김민준" },
      { id:"sh5", stage:"협상",     date:"2025-01-05", note:"제안서 v2 제출. 납기·단가 조건 협의 중.", by:"김민준" },
    ],
    activities:[
      { id:"a1", date:"2025-01-10", type:"방문미팅",   content:"계약서 초안 조항별 검토. 법무팀 수정 요청 사항 정리.", by:"김민준" },
      { id:"a2", date:"2025-01-03", type:"전화통화",   content:"연초 인사 및 진행 일정 재확인. 1월 중 계약 목표 공유.", by:"김민준" },
    ],
    files:[{ id:"f1", name:"삼성전자_제안서_v2.pdf", url:"#", date:"2025-01-09", type:"제안서" }],
  },
  {
    id:"o2", name:"LG화학 화학 소재 연간 공급 계약", accountId:2, owner:"박서연",
    stage:"제안", value:220000000, probability:55, closeDate:"2025-02-15",
    nextStep:"제안서 피드백 수령 후 수정안 제출", nextStepDate:"2025-01-18",
    competitors:"B케미컬", source:"영업팀 발굴",
    strategyNote:"가격 민감도 매우 높음. 분기별 단가 연동 조건 제안으로 차별화. 구매팀보다 연구소장 라인 공략 필요.",
    stageHistory:[
      { id:"sh6", stage:"리드",     date:"2024-10-10", note:"학회에서 구매팀 접촉.", by:"박서연" },
      { id:"sh7", stage:"초기접촉", date:"2024-11-01", note:"화상 미팅 진행. 연간 소재 수요 확인.", by:"박서연" },
      { id:"sh8", stage:"니즈파악", date:"2024-11-20", note:"스펙 요건 및 예산 범위 확인.", by:"박서연" },
      { id:"sh9", stage:"제안",     date:"2025-01-07", note:"제안서 발표. 가격 10% 인하 요청.", by:"박서연" },
    ],
    activities:[
      { id:"a3", date:"2025-01-08", type:"방문미팅", content:"제안서 발표. 가격 10% 인하 요청 수령. 내부 검토 필요.", by:"박서연" },
    ],
    files:[{ id:"f2", name:"LG화학_제안서.pdf", url:"#", date:"2025-01-07", type:"제안서" }],
  },
  {
    id:"o3", name:"현대자동차 전기차 소재 공급", accountId:3, owner:"이준호",
    stage:"니즈파악", value:350000000, probability:35, closeDate:"2025-03-31",
    nextStep:"기술팀 스펙 검토 회의 진행", nextStepDate:"2025-01-22",
    competitors:"미정", source:"인바운드 문의",
    strategyNote:"기술 스펙 충족이 최우선. 기술팀과 구매팀 동시 공략 필요. EV 배터리 소재 인증 자료 준비 필수.",
    stageHistory:[
      { id:"sh10", stage:"리드",     date:"2024-11-15", note:"현대차 공식 홈페이지 문의로 인바운드 리드 발생.", by:"이준호" },
      { id:"sh11", stage:"초기접촉", date:"2024-12-01", note:"담당 구매팀 부장과 첫 대면 미팅.", by:"이준호" },
      { id:"sh12", stage:"니즈파악", date:"2024-12-20", note:"기술팀과 화상회의. 추가 샘플 테스트 요청.", by:"이준호" },
    ],
    activities:[
      { id:"a4", date:"2025-01-06", type:"화상회의", content:"기술팀과 스펙 논의. 추가 샘플 테스트 1월 말까지 제출 요청.", by:"이준호" },
    ],
    files:[],
  },
  {
    id:"o4", name:"카카오 IT인프라 소재 납품", accountId:4, owner:"정하윤",
    stage:"계약완료", value:150000000, probability:100, closeDate:"2025-01-15",
    nextStep:"킥오프 미팅 진행", nextStepDate:"2025-01-25",
    competitors:"없음", source:"레퍼런스 소개",
    strategyNote:"계약 완료. 성공적인 킥오프 및 온보딩으로 추가 수주 기반 마련. 내년 물량 확대 가능성 높음.",
    stageHistory:[
      { id:"sh13", stage:"리드",     date:"2024-09-01", note:"임원 소개로 리드 확보.", by:"정하윤" },
      { id:"sh14", stage:"초기접촉", date:"2024-09-20", note:"첫 미팅. 즉각적인 도입 의지 확인.", by:"정하윤" },
      { id:"sh15", stage:"니즈파악", date:"2024-10-05", note:"상세 스펙 및 납기 요건 확정.", by:"정하윤" },
      { id:"sh16", stage:"제안",     date:"2024-11-01", note:"제안서 제출.", by:"정하윤" },
      { id:"sh17", stage:"협상",     date:"2024-12-01", note:"최종 조건 합의.", by:"정하윤" },
      { id:"sh18", stage:"계약완료", date:"2025-01-15", note:"최종 계약서 서명 완료 🎉", by:"정하윤" },
    ],
    activities:[
      { id:"a5", date:"2025-01-15", type:"계약서검토", content:"최종 계약서 서명 완료.", by:"정하윤" },
    ],
    files:[{ id:"f3", name:"카카오_최종계약서.pdf", url:"#", date:"2025-01-15", type:"계약서" }],
  },
  {
    id:"o5", name:"롯데케미칼 소재 공급 검토", accountId:5, owner:"김민준",
    stage:"손실", value:90000000, probability:0, closeDate:"2025-01-31",
    nextStep:"2025년 Q2 재접촉 시도", nextStepDate:"2025-04-01",
    competitors:"C소재", source:"기존 거래",
    strategyNote:"내부 예산 삭감으로 이번 딜 손실. 경쟁사 C소재 선정. Q2 예산 재확보 시 재접촉 필요. 담당자 관계 유지 중요.",
    stageHistory:[
      { id:"sh19", stage:"리드",     date:"2024-10-01", note:"기존 거래처 추가 물량 확보 시도.", by:"김민준" },
      { id:"sh20", stage:"초기접촉", date:"2024-10-20", note:"구매팀 과장 미팅.", by:"김민준" },
      { id:"sh21", stage:"니즈파악", date:"2024-11-10", note:"물량 및 스펙 확인.", by:"김민준" },
      { id:"sh22", stage:"제안",     date:"2024-12-01", note:"제안서 제출.", by:"김민준" },
      { id:"sh23", stage:"손실",     date:"2024-12-15", note:"내부 예산 삭감으로 프로젝트 전면 보류 통보.", by:"김민준" },
    ],
    activities:[
      { id:"a6", date:"2024-12-15", type:"전화통화", content:"예산 삭감으로 1월 결정 불가 통보. 2분기 재논의 약속.", by:"김민준" },
    ],
    files:[{ id:"f4", name:"롯데케미칼_제안서.pdf", url:"#", date:"2024-12-01", type:"제안서" }],
  },
  {
    id:"o6", name:"SK하이닉스 신규 소재 공급", accountId:6, owner:"박서연",
    stage:"초기접촉", value:300000000, probability:20, closeDate:"2025-04-30",
    nextStep:"2차 미팅 일정 확정", nextStepDate:"2025-01-28",
    competitors:"미정", source:"전시회 접촉",
    strategyNote:"반도체 소재 전시회에서 확보한 리드. 구매팀 관심 있으나 아직 예산 미확정. 기술 레퍼런스 자료로 신뢰 구축 필요.",
    stageHistory:[
      { id:"sh24", stage:"리드",     date:"2024-12-05", note:"반도체 전시회 부스에서 명함 교환.", by:"박서연" },
      { id:"sh25", stage:"초기접촉", date:"2025-01-08", note:"첫 미팅. 회사 및 솔루션 소개 진행.", by:"박서연" },
    ],
    activities:[
      { id:"a7", date:"2025-01-08", type:"방문미팅", content:"회사 소개 및 주요 레퍼런스 설명. 기술 자료 추가 요청.", by:"박서연" },
    ],
    files:[],
  },
];

// ─── Seed — Accounts / DB / Meetings / Actions ──────────────────────────────
const INIT_CLIENTS = [
  { id:1, name:"삼성전자",  industry:"반도체", owner:"김민준" },
  { id:2, name:"LG화학",    industry:"화학",   owner:"박서연" },
  { id:3, name:"현대자동차",industry:"자동차", owner:"이준호" },
  { id:4, name:"카카오",    industry:"IT",     owner:"정하윤" },
  { id:5, name:"롯데케미칼",industry:"화학",   owner:"김민준" },
  { id:6, name:"SK하이닉스",industry:"반도체", owner:"박서연" },
];

const INIT_DB = {
  1:{ bizNo:"124-81-00998", address:"경기도 수원시 영통구 삼성로 129", size:"대기업", founded:"1969", website:"https://www.samsung.com", note:"반도체 사업부 중심. 구매팀+법무팀 동시 대응 필요.",
    contacts:[ { id:"c1", name:"홍길동", title:"구매팀 팀장", phone:"010-1234-5678", email:"hong@samsung.com", primary:true }, { id:"c2", name:"이수진", title:"법무팀 과장", phone:"010-2345-6789", email:"lee.sj@samsung.com", primary:false } ],
    history:[ { id:"h1", date:"2025-01-10", type:"방문미팅", content:"계약서 검토 미팅.", by:"김민준" } ], files:[ { id:"f1", name:"삼성전자_제안서_v2.pdf", url:"#", date:"2025-01-09", type:"제안서" } ] },
  2:{ bizNo:"110-81-21580", address:"서울시 영등포구 여의대로 128", size:"대기업", founded:"1947", website:"https://www.lgchem.com", note:"가격 민감도 높음.",
    contacts:[ { id:"c3", name:"박철수", title:"구매팀 차장", phone:"010-3456-7890", email:"park.cs@lgchem.com", primary:true } ],
    history:[ { id:"h3", date:"2025-01-08", type:"방문미팅", content:"제안서 발표. 가격 10% 인하 요청.", by:"박서연" } ], files:[] },
  3:{ bizNo:"120-81-01763", address:"서울시 서초구 헌릉로 12", size:"대기업", founded:"1967", website:"https://www.hyundai.com", note:"기술 스펙 충족이 핵심.",
    contacts:[ { id:"c4", name:"최민서", title:"구매기획 부장", phone:"010-4567-8901", email:"choi.ms@hyundai.com", primary:true } ],
    history:[ { id:"h4", date:"2025-01-06", type:"화상회의", content:"스펙 논의. 샘플 테스트 요청.", by:"이준호" } ], files:[] },
  4:{ bizNo:"120-81-47521", address:"경기도 성남시 분당구 판교역로 166", size:"대기업", founded:"2010", website:"https://www.kakaocorp.com", note:"계약 완료. 추가 수주 가능성 높음.",
    contacts:[ { id:"c6", name:"정지수", title:"IT인프라 팀장", phone:"010-6789-0123", email:"jung.js@kakao.com", primary:true } ],
    history:[ { id:"h5", date:"2025-01-15", type:"계약체결", content:"최종 서명 완료.", by:"정하윤" } ], files:[ { id:"f4", name:"카카오_최종계약서.pdf", url:"#", date:"2025-01-15", type:"계약서" } ] },
  5:{ bizNo:"107-81-05090", address:"서울시 송파구 올림픽로 300", size:"대기업", founded:"1958", website:"https://www.lottechem.com", note:"2분기 재접촉 예정.",
    contacts:[ { id:"c7", name:"오민준", title:"구매팀 과장", phone:"010-7890-1234", email:"oh.mj@lottechem.com", primary:true } ],
    history:[ { id:"h7", date:"2024-12-15", type:"전화통화", content:"예산 삭감 통보.", by:"김민준" } ], files:[] },
  6:{ bizNo:"130-81-12345", address:"경기도 이천시 부발읍 경충대로 2091", size:"대기업", founded:"1983", website:"https://www.skhynix.com", note:"신규 발굴 고객. 기술 레퍼런스 자료 신뢰 구축 중.",
    contacts:[ { id:"c8", name:"이강산", title:"구매팀 대리", phone:"010-8901-2345", email:"lee.ks@skhynix.com", primary:true } ],
    history:[ { id:"h8", date:"2025-01-08", type:"방문미팅", content:"첫 미팅. 회사 소개.", by:"박서연" } ], files:[] },
};

const INIT_MEETINGS = [{
  id:1, weekOf:"2025-01-13", title:"주간 영업 회의", attendees:["김민준","박서연","이준호","정하윤"],
  agenda:"삼성전자 협상 현황 / LG화학 제안 피드백 / 현대차 기술 검토 일정",
  notes:"삼성전자: 법무팀 검토 중. LG화학: 가격 재협의 필요. 현대차: 기술팀 스케줄 조율 중.",
  decisions:["삼성 계약서 수정본 18일까지 발송","LG 10% 가격 인하 검토","현대차 기술 미팅 22일 확정"],
  nextWeekFocus:"삼성 계약 클로징 / LG 가격안 확정 / SK하이닉스 2차 미팅",
}];

const INIT_ACTIONS = [
  { id:1, oppId:"o1", clientId:1, title:"계약서 수정본 발송",    owner:"김민준", dueDate:"2025-01-18", priority:"높음", done:false },
  { id:2, oppId:"o2", clientId:2, title:"가격 조정안 내부 검토", owner:"박서연", dueDate:"2025-01-17", priority:"높음", done:false },
  { id:3, oppId:"o3", clientId:3, title:"기술팀 스케줄 조율",    owner:"이준호", dueDate:"2025-01-19", priority:"중간", done:true  },
  { id:4, oppId:"o4", clientId:4, title:"킥오프 아젠다 준비",    owner:"정하윤", dueDate:"2025-01-24", priority:"중간", done:false },
  { id:5, oppId:"o6", clientId:6, title:"SK하이닉스 2차 미팅 일정 확정", owner:"박서연", dueDate:"2025-01-28", priority:"중간", done:false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
function OppFormModal({ opp, clients, onSave, onClose }) {
  const blank = { name:"", accountId:clients[0]?.id||"", owner:"", stage:"리드", value:"", probability:10, closeDate:"", nextStep:"", nextStepDate:"", competitors:"", source:"영업팀 발굴", strategyNote:"" };
  const [f,sF] = useState(opp ? { ...opp, value:String(opp.value) } : blank);
  const s=k=>v=>sF(p=>({...p,[k]:v}));
  const handleStageChange = (stage) => { sF(p=>({...p, stage, probability:STAGE_MAP[stage]?.prob||p.probability})); };
  return <Modal title={opp?"영업기회 수정":"영업기회 추가"} onClose={onClose}>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <div style={{ gridColumn:"1/-1" }}><Inp label="영업기회명" value={f.name} onChange={s("name")} placeholder="예: 삼성전자 2025 소재 공급"/></div>
      <Sel label="고객사" value={f.accountId} onChange={v=>sF(p=>({...p,accountId:Number(v)||v}))} options={clients.map(c=>({value:c.id,label:c.name}))}/>
      <Inp label="담당자" value={f.owner} onChange={s("owner")}/>
      <Sel label="영업 단계" value={f.stage} onChange={handleStageChange} options={STAGES.map(s=>s.id)}/>
      <Inp label="확률 (%)" type="number" value={f.probability} onChange={v=>sF(p=>({...p,probability:Number(v)}))}/>
      <Inp label="예상 금액 (원)" type="number" value={f.value} onChange={s("value")}/>
      <Inp label="예상 계약일" type="date" value={f.closeDate} onChange={s("closeDate")}/>
      <Inp label="경쟁사" value={f.competitors} onChange={s("competitors")} placeholder="A사, B사"/>
      <Sel label="영업 소스" value={f.source} onChange={s("source")} options={["영업팀 발굴","인바운드 문의","기존 거래","레퍼런스 소개","전시회 접촉","파트너사 소개"]}/>
      <div style={{ gridColumn:"1/-1" }}><Inp label="다음 액션" value={f.nextStep} onChange={s("nextStep")}/></div>
      <Inp label="다음 액션 일정" type="date" value={f.nextStepDate} onChange={s("nextStepDate")}/>
      <div style={{ gridColumn:"1/-1" }}><Inp label="영업 전략 메모" value={f.strategyNote} onChange={s("strategyNote")} multiline placeholder="이 딜의 핵심 전략, 유의사항 등"/></div>
    </div>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
      <Btn variant="ghost" onClick={onClose}>취소</Btn>
      <Btn onClick={()=>onSave({...f,value:Number(f.value),id:opp?.id||uid(),stageHistory:opp?.stageHistory||[],activities:opp?.activities||[],files:opp?.files||[]})}>저장</Btn>
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
  const [f,sF]=useState(act||{date:today(),type:"방문미팅",content:"",by:""});
  const s=k=>v=>sF(p=>({...p,[k]:v}));
  return <Modal title={act?"활동 수정":"활동 기록"} onClose={onClose}>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <Inp label="날짜" type="date" value={f.date} onChange={s("date")}/>
      <Sel label="유형" value={f.type} onChange={s("type")} options={ACT_TYPES}/>
      <div style={{ gridColumn:"1/-1" }}><Inp label="내용" value={f.content} onChange={s("content")} multiline placeholder="활동 내용을 상세히 기록하세요"/></div>
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

// ── Opportunity Detail Page ───────────────────────────────────────────────────
function OppDetail({ opp, clients, onUpdate, onBack, actions, onUpdateActions }) {
  const [subTab, setSubTab] = useState("overview");
  const [actModal, setAM]   = useState(null);
  const [fileModal, setFM]  = useState(false);
  const [stageModal, setSM] = useState(false);
  const [editing, setEdit]  = useState(false);
  const [editForm, setEF]   = useState({ nextStep:opp.nextStep, nextStepDate:opp.nextStepDate, strategyNote:opp.strategyNote, competitors:opp.competitors });

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
          <div style={{ fontSize:13, color:C.textMuted }}>{account.name} · {account.industry} · {opp.owner} 담당</div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {opp.stage!=="계약완료"&&opp.stage!=="손실"&&<Btn variant="ghost" size="sm" onClick={()=>setSM(true)}>단계 변경 →</Btn>}
          {opp.stage==="계약완료"&&<span style={{ fontSize:13, color:C.green, fontWeight:700 }}>🎉 계약완료</span>}
          {opp.stage==="손실"&&<span style={{ fontSize:13, color:C.red, fontWeight:700 }}>📌 손실</span>}
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

      {/* KPI grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
        {[
          { label:"예상 금액",   val:fmt(opp.value),   color:C.accent   },
          { label:"가중 매출",   val:fmt(weighted),    color:C.purple   },
          { label:"성공 확률",   val:`${opp.probability}%`, color:stageCfg.color },
          { label:"예상 계약일", val:opp.closeDate||"—", color:isLate(opp.closeDate)&&opp.stage!=="계약완료"?C.red:C.textMuted },
          { label:"경쟁사",      val:opp.competitors||"—", color:C.textMuted },
        ].map(it=><div key={it.label} style={{ background:C.surfaceUp, borderRadius:10, padding:"12px 14px" }}>
          <div style={{ fontSize:10, color:C.textMuted, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:6 }}>{it.label}</div>
          <div style={{ fontSize:it.label==="경쟁사"?12:16, fontWeight:700, color:it.color, lineHeight:1.3 }}>{it.val}</div>
        </div>)}
      </div>

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
        <Inp label="다음 액션" value={editForm.nextStep} onChange={v=>setEF(p=>({...p,nextStep:v}))}/>
        <Inp label="다음 액션 일정" type="date" value={editForm.nextStepDate} onChange={v=>setEF(p=>({...p,nextStepDate:v}))}/>
        <Inp label="경쟁사" value={editForm.competitors} onChange={v=>setEF(p=>({...p,competitors:v}))}/>
        <Inp label="영업 전략 메모" value={editForm.strategyNote} onChange={v=>setEF(p=>({...p,strategyNote:v}))} multiline/>
        <div style={{ display:"flex", gap:10 }}><Btn variant="ghost" onClick={()=>setEdit(false)}>취소</Btn><Btn onClick={()=>{update(editForm);setEdit(false);}}>저장</Btn></div>
      </div>:<div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          {[
            { label:"영업 소스",  val:opp.source      },
            { label:"고객사",     val:account.name    },
            { label:"업종",       val:account.industry},
            { label:"담당자",     val:opp.owner       },
          ].map(it=><div key={it.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px" }}>
            <div style={{ fontSize:10, color:C.textMuted, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:5 }}>{it.label}</div>
            <div style={{ fontSize:13, color:it.val?C.text:C.textDim }}>{it.val||"—"}</div>
          </div>)}
        </div>
        <div style={{ background:C.accentSoft, border:`1px solid ${C.accentGlow}`, borderRadius:10, padding:"16px 18px", marginBottom:12 }}>
          <div style={{ fontSize:10, color:C.accent, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>영업 전략 메모</div>
          <div style={{ fontSize:13, color:C.text, lineHeight:1.7 }}>{opp.strategyNote||"—"}</div>
        </div>
        <Btn variant="ghost" size="sm" onClick={()=>{setEF({nextStep:opp.nextStep,nextStepDate:opp.nextStepDate,strategyNote:opp.strategyNote,competitors:opp.competitors});setEdit(true);}}>✏ 수정</Btn>
      </div>}
    </div>}

    {/* ── 단계별 전략 ── */}
    {subTab==="strategy"&&<div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {STAGES.map(s=>{
          const strat = STAGE_STRATEGY[s.id];
          const isActive = s.id===opp.stage;
          const histEntry = [...opp.stageHistory].reverse().find(h=>h.stage===s.id);
          return <div key={s.id} style={{ background:isActive?`${s.color}10`:C.surface, border:`1px solid ${isActive?s.color:C.border}`, borderRadius:12, padding:"18px 20px", position:"relative" }}>
            {isActive&&<div style={{ position:"absolute", top:12, right:12, fontSize:10, background:`${s.color}25`, color:s.color, padding:"2px 8px", borderRadius:10, fontWeight:700 }}>현재 단계</div>}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <span style={{ fontSize:18 }}>{strat?.icon}</span>
              <span style={{ fontSize:14, fontWeight:800, color:isActive?s.color:C.text }}>{s.label}</span>
              <span style={{ fontSize:11, color:C.textMuted, marginLeft:"auto" }}>목표 확률 {s.prob}%</span>
            </div>
            <ul style={{ margin:0, padding:"0 0 0 16px", listStyle:"none" }}>
              {strat?.tips.map((tip,i)=><li key={i} style={{ fontSize:12, color:isActive?C.text:C.textMuted, marginBottom:6, display:"flex", gap:6 }}>
                <span style={{ color:isActive?s.color:C.textDim, flexShrink:0 }}>›</span>{tip}
              </li>)}
            </ul>
            {histEntry&&<div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${C.border}`, fontSize:11, color:C.textMuted }}>
              <span style={{ color:C.textDim }}>기록: </span>{histEntry.date} — {histEntry.note}
            </div>}
          </div>;
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
      <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:13, color:C.textMuted }}>{oppActions.filter(a=>!a.done).length}개 진행 · {oppActions.filter(a=>a.done).length}개 완료</span>
      </div>
      {oppActions.length===0&&<div style={{ textAlign:"center", padding:"60px 0", color:C.textMuted }}>등록된 액션이 없습니다<br/><span style={{ fontSize:12 }}>액션 탭에서 이 영업기회에 액션을 추가하세요</span></div>}
      {oppActions.sort((a,b)=>a.done===b.done?0:a.done?1:-1).map(a=>{
        const ov=!a.done&&isLate(a.dueDate);
        return <div key={a.id} style={{ display:"flex", alignItems:"center", gap:14, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 18px", marginBottom:8, opacity:a.done?.6:1 }}>
          <button onClick={()=>onUpdateActions(prev=>prev.map(x=>x.id===a.id?{...x,done:!x.done}:x))} style={{ width:20, height:20, borderRadius:5, border:`2px solid ${a.done?C.green:C.border}`, background:a.done?C.green:"transparent", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11 }}>{a.done?"✓":""}</button>
          <div style={{ flex:1 }}><div style={{ fontSize:13, color:a.done?C.textMuted:C.text, textDecoration:a.done?"line-through":"none" }}>{a.title}</div><div style={{ fontSize:11, color:C.textMuted }}>{a.owner}</div></div>
          <span style={{ fontSize:11, background:`${PRI_CFG[a.priority]}20`, color:PRI_CFG[a.priority], padding:"2px 9px", borderRadius:6, fontWeight:700 }}>{a.priority}</span>
          <span style={{ fontSize:12, color:ov?C.red:C.textMuted, fontWeight:ov?700:400 }}>{ov?"⚠ ":""}{a.dueDate}</span>
        </div>;
      })}
    </div>}

    {actModal&&<ActivityModal act={actModal==="new"?null:actModal} onSave={saveAct} onClose={()=>setAM(null)}/>}
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
                  <div style={{ fontSize:11, color:C.textMuted, marginBottom:10 }}>{acc.name}</div>
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
          <div style={{ fontSize:12, color:C.textMuted }}>{acc.name} · {o.owner}</div>
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
function Pipeline({ opps, onUpdateOpps, clients, actions, onUpdateActions }) {
  const [view, setView]         = useState("kanban"); // kanban | list
  const [selected, setSelected] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [ownerFilter, setOwner] = useState("전체");
  const [stageFilter, setStage] = useState("활성");

  if (selected) return <OppDetail opp={opps.find(o=>o.id===selected.id)||selected} clients={clients} onUpdate={onUpdateOpps} onBack={()=>setSelected(null)} actions={actions} onUpdateActions={onUpdateActions}/>;

  const owners = ["전체",...new Set(opps.map(o=>o.owner))];
  const activeOpps = opps.filter(o=>stageFilter==="활성"?o.stage!=="계약완료"&&o.stage!=="손실":stageFilter==="계약완료"?o.stage==="계약완료":stageFilter==="손실"?o.stage==="손실":true);
  const filtered = activeOpps.filter(o=>ownerFilter==="전체"||o.owner===ownerFilter);

  // Metrics
  const allActive  = opps.filter(o=>o.stage!=="계약완료"&&o.stage!=="손실");
  const totalPipe  = allActive.reduce((s,o)=>s+o.value,0);
  const weighted   = allActive.reduce((s,o)=>s+Math.round(o.value*o.probability/100),0);
  const wonTotal   = opps.filter(o=>o.stage==="계약완료").reduce((s,o)=>s+o.value,0);
  const wonCount   = opps.filter(o=>o.stage==="계약완료").length;
  const closedCount= opps.filter(o=>o.stage==="계약완료"||o.stage==="손실").length;
  const winRate    = closedCount>0?Math.round(wonCount/closedCount*100):0;

  return <div>
    {/* Metrics row */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
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
        {/* Stage filter */}
        {["활성","계약완료","손실","전체"].map(f=><button key={f} onClick={()=>setStage(f)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${stageFilter===f?C.accent:C.border}`, background:stageFilter===f?C.accentSoft:"transparent", color:stageFilter===f?C.accent:C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>{f}</button>)}
        <span style={{ width:1, background:C.border }}/>
        {owners.map(o=><button key={o} onClick={()=>setOwner(o)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${ownerFilter===o?C.yellow:C.border}`, background:ownerFilter===o?C.yellowSoft:"transparent", color:ownerFilter===o?C.yellow:C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>{o}</button>)}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        {/* View toggle */}
        <div style={{ display:"flex", background:C.surfaceUp, borderRadius:8, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          {[{id:"kanban",label:"칸반"},{ id:"list", label:"리스트"}].map(v=><button key={v.id} onClick={()=>setView(v.id)} style={{ padding:"7px 14px", background:view===v.id?C.accent:"transparent", color:view===v.id?"#fff":C.textMuted, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>{v.label}</button>)}
        </div>
        <Btn onClick={()=>setAddModal(true)}>+ 영업기회 추가</Btn>
      </div>
    </div>

    {/* Board / List */}
    {view==="kanban"
      ? <KanbanBoard opps={filtered} clients={clients} onSelect={setSelected} onUpdate={onUpdateOpps}/>
      : <OppListView opps={filtered} clients={clients} onSelect={setSelected}/>}

    {addModal&&<OppFormModal clients={clients} onClose={()=>setAddModal(false)} onSave={data=>{onUpdateOpps(prev=>[...prev,data]);setAddModal(false);}}/>}
  </div>;
}

// ─── CLIENT DB (unchanged) ────────────────────────────────────────────────────
function ContactModal({ contact, onSave, onClose }) {
  const [f,sF]=useState(contact||{name:"",title:"",phone:"",email:"",primary:false});
  const s=k=>v=>sF(p=>({...p,[k]:v}));
  return <Modal title={contact?"담당자 수정":"담당자 추가"} onClose={onClose}>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <Inp label="이름" value={f.name} onChange={s("name")}/><Inp label="직책" value={f.title} onChange={s("title")}/>
      <Inp label="전화번호" value={f.phone} onChange={s("phone")} placeholder="010-0000-0000"/>
      <Inp label="이메일" value={f.email} onChange={s("email")} placeholder="name@company.com"/>
    </div>
    <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:20 }}>
      <input type="checkbox" checked={f.primary} onChange={e=>sF(p=>({...p,primary:e.target.checked}))}/>
      <span style={{ fontSize:13, color:C.text }}>주 담당자로 설정</span>
    </label>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}><Btn variant="ghost" onClick={onClose}>취소</Btn><Btn onClick={()=>onSave({...f,id:contact?.id||uid()})}>저장</Btn></div>
  </Modal>;
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

function ClientDetail({ client, db, onUpdateDb, onBack, opps }) {
  const data=db[client.id]||{bizNo:"",address:"",size:"",founded:"",website:"",note:"",contacts:[],history:[],files:[]};
  const [subTab,setST]=useState("info");
  const [cModal,setCM]=useState(null);
  const [hModal,setHM]=useState(null);
  const [fModal,setFM]=useState(false);
  const [editing,setEdit]=useState(false);
  const [form,setForm]=useState({bizNo:data.bizNo,address:data.address,size:data.size,founded:data.founded,website:data.website,note:data.note});
  const update=patch=>onUpdateDb(prev=>({...prev,[client.id]:{...data,...patch}}));
  const clientOpps=opps.filter(o=>o.accountId===client.id);
  const subTabs=[{id:"info",label:"기본 정보"},{id:"contacts",label:`담당자 (${data.contacts.length})`},{id:"history",label:`히스토리 (${data.history.length})`},{id:"files",label:`파일 (${data.files.length})`},{id:"opps",label:`영업기회 (${clientOpps.length})`}];
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
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}><span style={{ fontSize:13, color:C.textMuted }}>{data.contacts.length}명</span><Btn onClick={()=>setCM("new")}>+ 추가</Btn></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {data.contacts.length===0&&<div style={{ gridColumn:"1/-1", textAlign:"center", padding:"50px 0", color:C.textMuted }}>담당자 없음</div>}
        {data.contacts.map(c=><div key={c.id} style={{ background:C.surface, border:`1px solid ${c.primary?C.accentGlow:C.border}`, borderRadius:12, padding:"18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:c.primary?C.accentSoft:C.surfaceUp, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:c.primary?C.accent:C.textMuted }}>{c.name[0]}</div>
              <div><div style={{ display:"flex", alignItems:"center", gap:7 }}><span style={{ fontSize:14, fontWeight:700, color:C.text }}>{c.name}</span>{c.primary&&<span style={{ fontSize:10, background:C.accentSoft, color:C.accent, padding:"2px 7px", borderRadius:10, fontWeight:700 }}>주담당</span>}</div><div style={{ fontSize:12, color:C.textMuted, marginTop:1 }}>{c.title}</div></div>
            </div>
            <div style={{ display:"flex", gap:6 }}><Btn size="sm" variant="ghost" onClick={()=>setCM(c)}>수정</Btn><Btn size="sm" variant="danger" onClick={()=>update({contacts:data.contacts.filter(x=>x.id!==c.id)})}>삭제</Btn></div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
            {c.phone&&<a href={`tel:${c.phone}`} style={{ fontSize:12, color:C.textMuted, textDecoration:"none" }}>📞 {c.phone}</a>}
            {c.email&&<a href={`mailto:${c.email}`} style={{ fontSize:12, color:C.textMuted, textDecoration:"none" }}>✉ {c.email}</a>}
          </div>
        </div>)}
      </div>
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
          return <div key={o.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700, color:C.text }}>{o.name}</div><div style={{ fontSize:12, color:C.textMuted }}>{o.owner} · {o.closeDate}</div></div>
            <StagePill stage={o.stage}/>
            <span style={{ fontSize:15, fontWeight:800, color:s.color }}>{fmt(o.value)}</span>
          </div>;
        })}
      </div>
    </div>}
    {cModal&&<ContactModal contact={cModal==="new"?null:cModal} onSave={c=>{const ex=data.contacts.find(x=>x.id===c.id);update({contacts:ex?data.contacts.map(x=>x.id===c.id?c:x):[...data.contacts,c]});setCM(null);}} onClose={()=>setCM(null)}/>}
    {hModal&&<DBHistoryModal item={hModal==="new"?null:hModal} onSave={h=>{const ex=data.history.find(x=>x.id===h.id);const list=ex?data.history.map(x=>x.id===h.id?h:x):[...data.history,h];update({history:list.sort((a,b)=>b.date.localeCompare(a.date))});setHM(null);}} onClose={()=>setHM(null)}/>}
    {fModal&&<DBFileModal onSave={f=>{update({files:[...data.files,f]});setFM(false);}} onClose={()=>setFM(false)}/>}
  </div>;
}

function ClientDB({ clients, db, onUpdateDb, opps }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [indFilter, setInd]     = useState("전체");
  if (selected) return <ClientDetail client={selected} db={db} onUpdateDb={onUpdateDb} onBack={()=>setSelected(null)} opps={opps}/>;
  const industries=["전체",...new Set(clients.map(c=>c.industry))];
  const list=clients.filter(c=>indFilter==="전체"||c.industry===indFilter).filter(c=>c.name.includes(search)||c.owner.includes(search));
  return <div>
    <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="고객사명 / 담당자 검색..." style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 14px", color:C.text, fontSize:14, outline:"none", width:260 }}/>
      {industries.map(ind=><button key={ind} onClick={()=>setInd(ind)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${indFilter===ind?C.accent:C.border}`, background:indFilter===ind?C.accentSoft:"transparent", color:indFilter===ind?C.accent:C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>{ind}</button>)}
      <span style={{ marginLeft:"auto", fontSize:12, color:C.textMuted }}>{list.length}개</span>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
      {list.map(c=>{
        const d=db[c.id]||{contacts:[],history:[],files:[]};
        const p=d.contacts.find(x=>x.primary)||d.contacts[0];
        const cOpps=opps.filter(o=>o.accountId===c.id);
        return <Card key={c.id} onClick={()=>setSelected(c)} style={{ padding:"20px 22px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:C.accentSoft, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:900, color:C.accent, flexShrink:0 }}>{c.name[0]}</div>
            <div><div style={{ fontSize:15, fontWeight:800, color:C.text }}>{c.name}</div><div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{c.industry} · {c.owner} 담당</div></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            {[{label:"담당자",val:d.contacts.length,color:d.contacts.length?C.accent:C.textDim},{label:"히스토리",val:d.history.length,color:d.history.length?C.yellow:C.textDim},{label:"파일",val:d.files.length,color:d.files.length?C.green:C.textDim},{label:"영업기회",val:cOpps.length,color:cOpps.length?C.purple:C.textDim}].map(it=><div key={it.label} style={{ background:C.surfaceUp, borderRadius:8, padding:"7px 8px", textAlign:"center" }}><div style={{ fontSize:16, fontWeight:800, color:it.color }}>{it.val}</div><div style={{ fontSize:10, color:C.textMuted }}>{it.label}</div></div>)}
          </div>
          {p?<div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:C.surfaceUp, borderRadius:8, marginBottom:10 }}>
            <div style={{ width:24, height:24, borderRadius:"50%", background:C.accentSoft, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:C.accent, flexShrink:0 }}>{p.name[0]}</div>
            <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:12, color:C.text, fontWeight:600 }}>{p.name}</div><div style={{ fontSize:10, color:C.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</div></div>
          </div>:<div style={{ padding:"8px 10px", background:C.surfaceUp, borderRadius:8, marginBottom:10, fontSize:12, color:C.textDim, textAlign:"center" }}>담당자 미등록</div>}
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, fontSize:11, color:d.history[0]?C.textMuted:C.textDim }}>
            {d.history[0]?<span><span style={{ color:C.textDim }}>최근</span> · {d.history[0].date} {d.history[0].type}</span>:"접촉 기록 없음"}
          </div>
        </Card>;
      })}
    </div>
  </div>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ opps, actions, meetings, clients }) {
  const activeOpps=opps.filter(o=>o.stage!=="계약완료"&&o.stage!=="손실");
  const totalPipe=activeOpps.reduce((s,o)=>s+o.value,0);
  const weighted=activeOpps.reduce((s,o)=>s+Math.round(o.value*o.probability/100),0);
  const won=opps.filter(o=>o.stage==="계약완료");
  const pending=actions.filter(a=>!a.done);
  const late=pending.filter(a=>isLate(a.dueDate));
  return <div>
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
function ActionForm({ action, clients, opps, onSave, onClose }) {
  const [f,sF]=useState(action||{title:"",oppId:opps[0]?.id||"",clientId:clients[0]?.id||"",owner:"",dueDate:"",priority:"중간",done:false});
  const s=k=>v=>sF(p=>({...p,[k]:v}));
  return <Modal title={action?"액션 수정":"액션 추가"} onClose={onClose}>
    <Inp label="액션 내용" value={f.title} onChange={s("title")}/>
    <Sel label="영업기회" value={f.oppId} onChange={v=>sF(p=>({...p,oppId:v,clientId:opps.find(o=>o.id===v)?.accountId||p.clientId}))} options={[{value:"",label:"— 선택 —"},...opps.map(o=>({value:o.id,label:o.name}))]}/>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
      <Inp label="담당자" value={f.owner} onChange={s("owner")}/>
      <Inp label="마감일" type="date" value={f.dueDate} onChange={s("dueDate")}/>
      <Sel label="우선순위" value={f.priority} onChange={s("priority")} options={["높음","중간","낮음"]}/>
    </div>
    <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}><Btn variant="ghost" onClick={onClose}>취소</Btn><Btn onClick={()=>onSave({...f,id:action?.id||uid()})}>저장</Btn></div>
  </Modal>;
}

function Actions({ actions, clients, opps, onUpdate }) {
  const [modal,sM]=useState(null);const [filter,sF]=useState("전체");const [ownerF,sOF]=useState("전체");
  const owners=["전체",...new Set(actions.map(a=>a.owner))];
  const list=actions.filter(a=>filter==="전체"?true:filter==="완료"?a.done:!a.done).filter(a=>ownerF==="전체"?true:a.owner===ownerF).sort((a,b)=>{ if(a.done!==b.done)return a.done?1:-1;return({높음:0,중간:1,낮음:2}[a.priority]||0)-({높음:0,중간:1,낮음:2}[b.priority]||0); });
  const tog=id=>onUpdate(prev=>prev.map(a=>a.id===id?{...a,done:!a.done}:a));
  const del=id=>onUpdate(prev=>prev.filter(a=>a.id!==id));
  return <div>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {["전체","진행중","완료"].map(s=><button key={s} onClick={()=>sF(s)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${filter===s?C.accent:C.border}`, background:filter===s?C.accentSoft:"transparent", color:filter===s?C.accent:C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>{s}</button>)}
        <span style={{ width:1, background:C.border }}/>
        {owners.map(o=><button key={o} onClick={()=>sOF(o)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${ownerF===o?C.yellow:C.border}`, background:ownerF===o?C.yellowSoft:"transparent", color:ownerF===o?C.yellow:C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600 }}>{o}</button>)}
      </div>
      <Btn onClick={()=>sM("add")}>+ 액션 추가</Btn>
    </div>
    <div style={{ display:"grid", gap:8 }}>
      {list.map(a=>{
        const opp=opps.find(o=>o.id===a.oppId)||{};
        const ov=!a.done&&isLate(a.dueDate);
        return <Card key={a.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 18px", opacity:a.done?.55:1 }}>
          <button onClick={()=>tog(a.id)} style={{ width:22, height:22, borderRadius:6, border:`2px solid ${a.done?C.green:C.border}`, background:a.done?C.green:"transparent", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11 }}>{a.done?"✓":""}</button>
          <div style={{ flex:1 }}><div style={{ fontSize:14, color:a.done?C.textMuted:C.text, textDecoration:a.done?"line-through":"none" }}>{a.title}</div><div style={{ fontSize:11, color:C.textMuted }}>{opp.name||"—"} · {a.owner}</div></div>
          <span style={{ fontSize:11, background:`${PRI_CFG[a.priority]}20`, color:PRI_CFG[a.priority], padding:"2px 9px", borderRadius:6, fontWeight:700 }}>{a.priority}</span>
          <span style={{ fontSize:12, color:ov?C.red:C.textMuted, fontWeight:ov?700:400 }}>{ov?"⚠ ":""}{a.dueDate||"기한 없음"}</span>
          <div style={{ display:"flex", gap:6 }}><Btn size="sm" variant="ghost" onClick={()=>sM(a)}>수정</Btn><Btn size="sm" variant="danger" onClick={()=>del(a.id)}>삭제</Btn></div>
        </Card>;
      })}
      {list.length===0&&<div style={{ textAlign:"center", padding:"48px 0", color:C.textMuted }}>해당하는 액션이 없습니다</div>}
    </div>
    {(modal==="add"||(modal&&modal.id))&&<ActionForm action={modal==="add"?null:modal} clients={clients} opps={opps} onClose={()=>sM(null)} onSave={data=>{onUpdate(prev=>modal==="add"?[...prev,data]:prev.map(a=>a.id===data.id?data:a));sM(null);}}/>}
  </div>;
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
const TABS = [
  { id:"dashboard", label:"대시보드",   icon:"◈" },
  { id:"pipeline",  label:"파이프라인", icon:"◉" },
  { id:"clientdb",  label:"고객사 DB",  icon:"▣" },
  { id:"meetings",  label:"회의록",     icon:"◇" },
  { id:"actions",   label:"액션",       icon:"◎" },
];

export default function App() {
  const [tab, sT]      = useState("dashboard");
  const [opps, sO]     = useState(INIT_OPPS);
  const [clients, _sCl] = useState(INIT_CLIENTS);
  const [db, sDb]      = useState(INIT_DB);
  const [meetings, sMt]= useState(INIT_MEETINGS);
  const [actions, sAc] = useState(INIT_ACTIONS);

  const pending   = actions.filter(a=>!a.done).length;
  const lateCount = actions.filter(a=>!a.done&&isLate(a.dueDate)).length;

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
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12, color:C.textMuted }}>{new Date().toLocaleDateString("ko-KR",{weekday:"short",month:"long",day:"numeric"})}</span>
          <div style={{ width:32, height:32, borderRadius:"50%", background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff" }}>팀</div>
        </div>
      </div>
    </div>

    <div style={{ maxWidth:1400, margin:"0 auto", padding:"28px 32px" }}>
      {tab==="dashboard"&&<Dashboard opps={opps} actions={actions} meetings={meetings} clients={clients}/>}
      {tab==="pipeline" &&<Pipeline  opps={opps} onUpdateOpps={sO} clients={clients} actions={actions} onUpdateActions={sAc}/>}
      {tab==="clientdb" &&<ClientDB  clients={clients} db={db} onUpdateDb={sDb} opps={opps}/>}
      {tab==="meetings" &&<Meetings  meetings={meetings} onUpdate={sMt}/>}
      {tab==="actions"  &&<Actions   actions={actions} clients={clients} opps={opps} onUpdate={sAc}/>}
    </div>
  </div>;
}
