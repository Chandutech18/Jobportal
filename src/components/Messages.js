import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { API, SOCKET_URL } from "../config";
let   socket = null;
const mkRoom = (a, b) => [String(a), String(b)].sort().join("_");
const CALL_IDLE = { phase:"idle", mode:"video", peerId:null, peerName:"", muted:false, cameraOff:false };
const normalizeId = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
};

const sameReplyTarget = (a, b) => {
  const left  = typeof a === "object" ? a?._id || a?.text || "" : a || "";
  const right = typeof b === "object" ? b?._id || b?.text || "" : b || "";
  return String(left) === String(right);
};

const isPendingMatch = (pending, incoming) => {
  if (!pending?._tempId || !incoming?._id) return false;
  if (String(pending.roomId) !== String(incoming.roomId)) return false;
  if (String(pending.senderId) !== String(incoming.senderId)) return false;
  if (String(pending.type || "text") !== String(incoming.type || "text")) return false;
  if ((pending.text || "").trim() !== (incoming.text || "").trim()) return false;
  return sameReplyTarget(pending.replyTo, incoming.replyTo);
};

const upsertMessage = (list, incoming) => {
  if (!incoming) return list;

  const exactIndex = list.findIndex((msg) => String(msg._id) === String(incoming._id));
  if (exactIndex >= 0) {
    const next = [...list];
    next[exactIndex] = { ...next[exactIndex], ...incoming };
    return next;
  }

  const pendingIndex = list.findIndex((msg) => isPendingMatch(msg, incoming));
  if (pendingIndex >= 0) {
    const next = [...list];
    next[pendingIndex] = incoming;
    return next.filter((msg, idx) => idx === pendingIndex || String(msg._id) !== String(incoming._id));
  }

  return [...list, incoming];
};

// ─────────────────────────────────────────────────────
//  Tiny helpers
// ─────────────────────────────────────────────────────
const fmtTime = (iso) => {
  if (!iso) return "";
  const d   = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)  return "Just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  if (diff < 86400*2) return `Yesterday, ${d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`;
  return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
};
const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date(); const yday = new Date(today); yday.setDate(today.getDate()-1);
  if (d.toDateString()===today.toDateString()) return "Today";
  if (d.toDateString()===yday.toDateString())  return "Yesterday";
  return d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
};
const fmtSize = (b) => b>1e6 ? `${(b/1e6).toFixed(1)} MB` : `${(b/1e3).toFixed(0)} KB`;
const fileIco = (t) => ({image:"🖼️",video:"🎬",audio:"🎵",pdf:"📕",file:"📎"}[t]||"📎");
const AVATAR_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4","#d4af37"];
const getColor = (name) => AVATAR_COLORS[(name||"U").charCodeAt(0) % AVATAR_COLORS.length];
const EMOJIS   = ["👍","❤️","😂","😮","😢","🔥","✅","🎉","💯","🙏","👏","😍","🤝","💼"];
const QUICK_REACT = ["👍","❤️","😂","😮","😢","🔥",];

// ─────────────────────────────────────────────────────
//  Avatar component
// ─────────────────────────────────────────────────────
const Avatar = ({ name, size=40, online=false, onClick }) => {
  const c = getColor(name);
  const l = (name||"U")[0].toUpperCase();
  return (
    <div onClick={onClick} style={{ position:"relative", flexShrink:0, cursor:onClick?"pointer":"default" }}>
      <div style={{ width:size, height:size, borderRadius:"50%", background:`linear-gradient(135deg,${c},${c}99)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:size*0.4, color:"#fff", boxShadow:online?`0 0 0 2px #22c55e, 0 0 0 3px var(--cb-surface)`:`0 2px 8px rgba(0,0,0,0.08)`, transition:"box-shadow 0.3s" }}>
        {l}
      </div>
      {online && <div style={{ position:"absolute", bottom:1, right:1, width:size*0.27, height:size*0.27, borderRadius:"50%", background:"#22c55e", border:`2px solid var(--cb-surface)` }}/>}
    </div>
  );
};

// ─────────────────────────────────────────────────────
//  Profile modal (Instagram-like)
// ─────────────────────────────────────────────────────
const ProfileModal = ({ profile, onClose, onMessage }) => {
  if (!profile) return null;
  const uname = profile.username || (profile.name||"U").toLowerCase().replace(/[^a-z0-9]/g,"");
  const c     = getColor(profile.name);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(12px)" }} onClick={onClose}>
      <div style={{ background:"var(--cb-surface)", border:"1px solid var(--cb-border)", borderRadius:24, width:"100%", maxWidth:420, maxHeight:"90vh", overflowY:"auto", position:"relative", boxShadow:"0 40px 100px rgba(0,0,0,0.2)" }} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute", top:14, right:14, background:"rgba(0,0,0,0.05)", border:"1px solid var(--cb-border)", color:"var(--cb-text)", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:15, zIndex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        <div style={{ height:110, background:`linear-gradient(135deg,${c}66,var(--cb-card))`, borderRadius:"24px 24px 0 0", position:"relative" }}>
          <div style={{ position:"absolute", bottom:-38, left:22 }}>
            <Avatar name={profile.name} size={76} online={false}/>
          </div>
        </div>
        <div style={{ padding:"50px 22px 24px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontSize:21, fontWeight:800, color:"var(--cb-text)" }}>{profile.name}</div>
              <div style={{ fontSize:12, color:"var(--cb-muted)", fontFamily:"monospace" }}>@{uname}</div>
              {profile.location && <div style={{ fontSize:12, color:"var(--cb-muted)", marginTop:3 }}>📍 {profile.location}</div>}
              {(profile.organisation||profile.org) && <div style={{ fontSize:12, color:"var(--cb-muted)" }}>🏢 {profile.organisation||profile.org}</div>}
            </div>
            <button onClick={()=>{ onMessage(profile); onClose(); }}
              style={{ background:"linear-gradient(135deg,var(--cb-accent),var(--cb-accent2))", color:"#fff", border:"none", borderRadius:12, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:"0 4px 16px rgba(37,99,235,0.2)" }}>
              💬 Message
            </button>
          </div>
          {profile.bio && <p style={{ fontSize:13, color:"var(--cb-muted)", lineHeight:1.7, padding:12, background:"var(--cb-card)", borderRadius:12, marginBottom:14 }}>{profile.bio}</p>}
          <div style={{ display:"flex", background:"var(--cb-card)", borderRadius:12, overflow:"hidden", marginBottom:16 }}>
            {[{l:"Connections",v:profile.connections||0},{l:"Skills",v:(profile.skills||[]).length}].map((st,i,arr)=>(
              <div key={i} style={{ flex:1, textAlign:"center", padding:14, borderRight:i<arr.length-1?"1px solid var(--cb-border)":"none" }}>
                <div style={{ fontSize:22, fontWeight:900, color:"var(--cb-text)" }}>{st.v}</div>
                <div style={{ fontSize:11, color:"var(--cb-muted)" }}>{st.l}</div>
              </div>
            ))}
          </div>
          {(profile.skills||[]).length>0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--cb-gold)", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Skills</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {(profile.skills||[]).map((sk,si)=>(
                  <span key={sk} style={{ fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:50, background:`${AVATAR_COLORS[si%8]}18`, color:AVATAR_COLORS[si%8] }}>{sk}</span>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop:16, background:"rgba(217,119,6,0.06)", border:"1px solid rgba(217,119,6,0.15)", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:"var(--cb-gold)", fontFamily:"monospace" }}>🔗 careerbharat.in/profile/{uname}</span>
            <button onClick={()=>navigator.clipboard?.writeText(`https://careerbharat.in/profile/${uname}`)} style={{ background:"none", border:"none", color:"var(--cb-muted)", cursor:"pointer", fontSize:11 }}>Copy</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────
//  Interview Scheduler modal
// ─────────────────────────────────────────────────────
const InterviewModal = ({ onSend, onClose, recipientName }) => {
  const [form,setForm] = useState({ date:"", time:"", mode:"online", link:"", note:"" });
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(12px)" }} onClick={onClose}>
      <div style={{ background:"var(--cb-surface)", border:"1px solid var(--cb-border)", borderRadius:20, width:"100%", maxWidth:420, padding:28 }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:18, fontWeight:800, color:"var(--cb-text)", marginBottom:4 }}>📅 Schedule Interview</div>
        <div style={{ fontSize:13, color:"var(--cb-muted)", marginBottom:22 }}>Inviting: {recipientName}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[["Interview Date","date","date",""],["Interview Time","time","time",""],["Video/Meet Link","link","url","https://meet.google.com/..."],["Additional Note","note","text","e.g. Please bring your CV"]].map(([label,key,type,ph])=>(
            <div key={key}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--cb-muted)", marginBottom:5 }}>{label}</label>
              <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}
                style={{ width:"100%", background:"var(--cb-card)", border:"1px solid var(--cb-border)", borderRadius:10, padding:"11px 14px", color:"var(--cb-text)", fontSize:13, outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" }}/>
            </div>
          ))}
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--cb-muted)", marginBottom:6 }}>Interview Mode</label>
            <div style={{ display:"flex", gap:8 }}>
              {["online","offline"].map(m=>(
                <button key={m} onClick={()=>setForm({...form,mode:m})}
                  style={{ flex:1, padding:"10px", borderRadius:9, border:`1px solid ${form.mode===m?"var(--cb-accent)":"var(--cb-border)"}`, background:form.mode===m?"rgba(37,99,235,0.08)":"transparent", color:form.mode===m?"var(--cb-accent)":"var(--cb-muted)", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", textTransform:"capitalize" }}>
                  {m==="online"?"🖥️ Online":"🏢 In-Person"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            <button onClick={onClose} style={{ flex:1, background:"transparent", border:"1px solid var(--cb-border)", color:"var(--cb-muted)", borderRadius:10, padding:12, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
            <button onClick={()=>form.date&&form.time&&onSend(form)} disabled={!form.date||!form.time}
              style={{ flex:2, background:"linear-gradient(135deg,var(--cb-gold),#f59e0b)", color:"#fff", border:"none", borderRadius:10, padding:12, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", opacity:!form.date||!form.time?0.5:1 }}>
              📅 Send Invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────
//  Context menu (right-click on conversation)
// ─────────────────────────────────────────────────────
const ContextMenu = ({ x, y, conv, onClose, onDelete }) => (
  <div style={{ position:"fixed", top:y, left:x, background:"var(--cb-surface)", border:"1px solid var(--cb-border)", borderRadius:12, padding:"6px 0", zIndex:9000, boxShadow:"0 16px 48px rgba(0,0,0,0.08)", minWidth:200 }} onClick={e=>e.stopPropagation()}>
    {[
      { label:"Mark as unread", ico:"🔵" },
      { label:"Archive chat",   ico:"📂" },
      { label:"Mute notifications", ico:"🔇" },
      { label:"Delete chat messages", ico:"🗑️", danger:false, action:()=>{ onDelete(conv,"messages"); onClose(); } },
      { label:"Delete contact",      ico:"🗑️", danger:true,  action:()=>{ onDelete(conv,"contact"); onClose(); } },
    ].map((item,i)=>(
      <button key={i} onClick={item.action||(()=>onClose())}
        style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 16px", background:"none", border:"none", color:item.danger?"var(--cb-danger)":"var(--cb-text)", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"background 0.15s" }}
        onMouseEnter={e=>e.currentTarget.style.background="var(--cb-card)"}
        onMouseLeave={e=>e.currentTarget.style.background="none"}>
        <span style={{ fontSize:15 }}>{item.ico}</span>{item.label}
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────
//  Delete confirmation dialog
// ─────────────────────────────────────────────────────
const DeleteDialog = ({ type, name, onConfirm, onCancel }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:10001, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
    <div style={{ background:"var(--cb-surface)", border:`1px solid ${type==="contact"?"rgba(220,38,38,0.2)":"var(--cb-border)"}`, borderRadius:20, width:"100%", maxWidth:380, padding:28, textAlign:"center" }}>
      <div style={{ fontSize:40, marginBottom:14 }}>{type==="contact"?"⚠️":"🗑️"}</div>
      <div style={{ fontSize:18, fontWeight:800, color:"var(--cb-text)", marginBottom:8 }}>
        {type==="contact"?"Delete Contact Permanently?":"Delete Chat History?"}
      </div>
      <div style={{ fontSize:13, color:"var(--cb-muted)", lineHeight:1.7, marginBottom:20 }}>
        {type==="contact"
          ? <>🚨 <strong style={{color:"var(--cb-danger)"}}>This cannot be undone!</strong><br/>✗ All messages will be deleted<br/>✗ Contact removed from list<br/>✗ Cannot receive their messages</>
          : <>⚠️ This will delete all messages with <strong style={{color:"var(--cb-text)"}}>{name}</strong><br/>✓ Contact stays in your list<br/>✓ You can still receive new messages<br/>✗ This cannot be undone</>}
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onCancel} style={{ flex:1, background:"var(--cb-card)", border:"1px solid var(--cb-border)", color:"var(--cb-muted)", borderRadius:10, padding:"12px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
        <button onClick={onConfirm} style={{ flex:1, background:type==="contact"?"rgba(220,38,38,0.08)":"rgba(220,38,38,0.05)", border:`1px solid ${type==="contact"?"rgba(220,38,38,0.3)":"rgba(220,38,38,0.2)"}`, color:"var(--cb-danger)", borderRadius:10, padding:"12px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
          {type==="contact"?"Delete Contact":"Delete Messages"}
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────
//  Main Messages Component
// ─────────────────────────────────────────────────────
const CallOverlay = ({
  callState,
  incomingCall,
  localVideoRef,
  remoteVideoRef,
  peerLabel,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
}) => {
  if (callState.phase === "idle" && !incomingCall) return null;

  const label = incomingCall
    ? `${incomingCall.fromName || "Someone"} is calling`
    : callState.phase === "outgoing"
      ? `Calling ${peerLabel || "user"}...`
      : callState.phase === "connecting"
        ? `Connecting to ${peerLabel || "user"}...`
        : `In call with ${peerLabel || "user"}`;

  const showVideo = (incomingCall?.callType || callState.mode) === "video";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(3,7,18,0.84)", zIndex:12000, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(10px)" }}>
      <div style={{ width:"100%", maxWidth:900, background:"linear-gradient(180deg,#091326,#111827)", border:"1px solid rgba(148,163,184,0.2)", borderRadius:26, overflow:"hidden", boxShadow:"0 30px 90px rgba(0,0,0,0.45)" }}>
        <div style={{ padding:"18px 22px", borderBottom:"1px solid rgba(148,163,184,0.14)", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#fff" }}>{peerLabel || incomingCall?.fromName || "Online call"}</div>
            <div style={{ fontSize:13, color:"#94a3b8", marginTop:3 }}>{label}</div>
          </div>
          <div style={{ fontSize:11, fontWeight:700, color:showVideo ? "#93c5fd" : "#86efac", padding:"6px 10px", borderRadius:999, background:showVideo ? "rgba(37,99,235,0.14)" : "rgba(22,163,74,0.14)", border:`1px solid ${showVideo ? "rgba(37,99,235,0.24)" : "rgba(22,163,74,0.24)"}` }}>
            {showVideo ? "VIDEO CALL" : "VOICE CALL"}
          </div>
        </div>

        <div style={{ position:"relative", minHeight:420, padding:18, background:"radial-gradient(circle at top, rgba(37,99,235,0.12), transparent 35%), #020617" }}>
          {showVideo ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline style={{ width:"100%", height:420, objectFit:"cover", borderRadius:20, background:"#0f172a" }} />
              <video ref={localVideoRef} autoPlay playsInline muted style={{ position:"absolute", right:32, bottom:30, width:180, height:120, objectFit:"cover", borderRadius:18, background:"#0f172a", border:"1px solid rgba(255,255,255,0.12)" }} />
            </>
          ) : (
            <div style={{ minHeight:420, borderRadius:22, background:"linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.88))", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
              <div style={{ width:112, height:112, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:44, fontWeight:900 }}>
                {(peerLabel || incomingCall?.fromName || "U")[0].toUpperCase()}
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>{peerLabel || incomingCall?.fromName || "Online call"}</div>
              <div style={{ fontSize:13, color:"#94a3b8" }}>{label}</div>
              <audio ref={remoteVideoRef} autoPlay />
            </div>
          )}
        </div>

        <div style={{ padding:"16px 22px 22px", display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap", background:"rgba(2,6,23,0.94)" }}>
          {incomingCall ? (
            <>
              <button onClick={onReject} style={{ background:"rgba(220,38,38,0.16)", border:"1px solid rgba(220,38,38,0.28)", color:"#fca5a5", borderRadius:999, padding:"12px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                Decline
              </button>
              <button onClick={()=>onAccept(incomingCall.callType || "audio")} style={{ background:"linear-gradient(135deg,#16a34a,#22c55e)", border:"none", color:"#fff", borderRadius:999, padding:"12px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                Accept {showVideo ? "Video" : "Voice"}
              </button>
            </>
          ) : (
            <>
              <button onClick={onToggleMute} style={{ background:"rgba(148,163,184,0.12)", border:"1px solid rgba(148,163,184,0.18)", color:"#e2e8f0", borderRadius:999, padding:"12px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                {callState.muted ? "Unmute" : "Mute"}
              </button>
              {showVideo && (
                <button onClick={onToggleCamera} style={{ background:"rgba(148,163,184,0.12)", border:"1px solid rgba(148,163,184,0.18)", color:"#e2e8f0", borderRadius:999, padding:"12px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  {callState.cameraOff ? "Camera On" : "Camera Off"}
                </button>
              )}
              <button onClick={onEnd} style={{ background:"linear-gradient(135deg,#dc2626,#ef4444)", border:"none", color:"#fff", borderRadius:999, padding:"12px 22px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                End Call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Messages({ user, preSelectedTarget, onClearTarget }) {
  const [convs,        setConvs]        = useState([]);
  const [activeRoom,   setActiveRoom]   = useState(null);
  const [msgs,         setMsgs]         = useState([]);
  const [input,        setInput]        = useState("");
  const [search,       setSearch]       = useState("");
  const [msgSearch,    setMsgSearch]    = useState("");
  const [showMsgSearch,setShowMsgSearch]= useState(false);
  const [online,       setOnline]       = useState([]);
  const [userStatuses, setUserStatuses] = useState({});
  const [typing,       setTyping]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [msgLoading,   setMsgLoading]   = useState(false);
  const [sending,      setSending]      = useState(false);
  const [emojiOpen,    setEmojiOpen]    = useState(false);
  const [reactTarget,  setReactTarget]  = useState(null); // msgId for reaction bar
  const [editingMsg,   setEditingMsg]   = useState(null); // {id, text}
  const [replyTo,      setReplyTo]      = useState(null);
  const [viewProfile,  setViewProfile]  = useState(null);
  const [showInterview,setShowInterview]= useState(false);
  const [toast,        setToast]        = useState("");
  const [ctxMenu,      setCtxMenu]      = useState(null); // {x,y,conv}
  const [deleteDialog, setDeleteDialog] = useState(null); // {type,conv}
  const [uploadProg,   setUploadProg]   = useState(0);
  const [callState,    setCallState]    = useState(CALL_IDLE);
  const [incomingCall, setIncomingCall] = useState(null);
  const [viewportW,    setViewportW]    = useState(() => window.innerWidth);

  const endRef      = useRef(null);
  const inputRef    = useRef(null);
  const fileRef     = useRef(null);
  const typingTimer = useRef(null);
  const activeRef   = useRef(null);
  const processedIncomingRef = useRef(new Map());
  const peerRef     = useRef(null);
  const localStreamRef  = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIceRef   = useRef([]);
  const localVideoRef   = useRef(null);
  const remoteVideoRef  = useRef(null);
  const callStateRef    = useRef(CALL_IDLE);
  const incomingCallRef = useRef(null);
  const token       = localStorage.getItem("token");
  const selfId      = normalizeId(user?.id, user?._id, user?.email);
  const isMobile    = viewportW < 820;
  const isTablet    = viewportW < 1100;
  const mediaPreviewWidth = Math.max(160, Math.min(240, viewportW - (isMobile ? 132 : 360)));

  useEffect(()=>{ activeRef.current = activeRoom; }, [activeRoom]);
  useEffect(()=>{ callStateRef.current = callState; }, [callState]);
  useEffect(()=>{ incomingCallRef.current = incomingCall; }, [incomingCall]);
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(()=>{
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current || null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current || null;
  }, [callState.phase, incomingCall]);

  const showToast = (msg, dur=3000) => { setToast(msg); setTimeout(()=>setToast(""),dur); };
  const rememberIncomingMessage = (messageId) => {
    if (!messageId) return false;
    const now = Date.now();
    for (const [key, seenAt] of processedIncomingRef.current.entries()) {
      if (now - seenAt > 120000) processedIncomingRef.current.delete(key);
    }
    const key = String(messageId);
    const lastSeen = processedIncomingRef.current.get(key);
    processedIncomingRef.current.set(key, now);
    return Boolean(lastSeen && now - lastSeen < 10000);
  };

  const resetMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks?.().forEach((track) => track.stop?.());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingIceRef.current = [];
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const endCurrentCall = useCallback((notifyPeer = true, reason = "") => {
    const targetId = callStateRef.current.peerId || incomingCallRef.current?.from;
    if (notifyPeer && targetId) socket?.emit("call_end", { to: targetId });
    resetMedia();
    setIncomingCall(null);
    setCallState(CALL_IDLE);
    if (reason) showToast(reason);
  }, [resetMedia]);

  const flushPendingIce = useCallback(async () => {
    if (!peerRef.current?.remoteDescription?.type || pendingIceRef.current.length === 0) return;
    while (pendingIceRef.current.length) {
      const candidate = pendingIceRef.current.shift();
      try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    }
  }, []);

  const createPeer = useCallback((targetId) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls:"stun:stun.l.google.com:19302" }],
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) socket?.emit("ice_candidate", { to:targetId, candidate:event.candidate });
    };

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      remoteStreamRef.current = stream || remoteStreamRef.current;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current || stream || null;
      setCallState((prev) => ({ ...prev, phase:"connected" }));
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setCallState((prev) => ({ ...prev, phase:"connected" }));
      }
      if (["failed","disconnected","closed"].includes(peer.connectionState)) {
        endCurrentCall(false, "Call ended");
      }
    };

    peerRef.current = peer;
    return peer;
  }, [endCurrentCall]);

  const getUserMediaStream = useCallback(async (mode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Calling is not supported in this browser.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true, video:mode === "video" });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, []);

  const startCall = useCallback(async (mode) => {
    if (!activeRoom?.otherId) return;
    if (!isOnline(activeRoom.otherId)) {
      showToast(`${activeRoom.otherName || "User"} is offline right now.`);
      return;
    }

    try {
      resetMedia();
      const stream = await getUserMediaStream(mode);
      const peer = createPeer(activeRoom.otherId);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      setCallState({
        phase:"outgoing",
        mode,
        peerId:activeRoom.otherId,
        peerName:activeRoom.otherName,
        muted:false,
        cameraOff:mode !== "video",
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket?.emit("call_offer", {
        to: activeRoom.otherId,
        offer,
        from: selfId,
        fromName: user.name,
        callType: mode,
      });
    } catch (err) {
      resetMedia();
      setCallState(CALL_IDLE);
      showToast(err.message || "Could not start the call.");
    }
  }, [activeRoom, createPeer, getUserMediaStream, online, resetMedia, selfId, user.name]);

  const acceptCall = useCallback(async (mode = incomingCall?.callType || "video") => {
    if (!incomingCall) return;

    try {
      resetMedia();
      const stream = await getUserMediaStream(mode);
      const peer = createPeer(incomingCall.from);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      setCallState({
        phase:"connecting",
        mode,
        peerId:incomingCall.from,
        peerName:incomingCall.fromName,
        muted:false,
        cameraOff:mode !== "video",
      });

      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      await flushPendingIce();

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket?.emit("call_answer", { to:incomingCall.from, answer });
      setIncomingCall(null);
    } catch (err) {
      showToast(err.message || "Could not join the call.");
      endCurrentCall(false);
    }
  }, [createPeer, endCurrentCall, flushPendingIce, getUserMediaStream, incomingCall, resetMedia]);

  const rejectCall = useCallback(() => {
    if (incomingCall?.from) socket?.emit("call_rejected", { to:incomingCall.from });
    setIncomingCall(null);
    showToast("Call declined");
  }, [incomingCall]);

  const toggleMute = () => {
    const enabled = !(localStreamRef.current?.getAudioTracks?.()[0]?.enabled);
    localStreamRef.current?.getAudioTracks?.().forEach((track) => { track.enabled = enabled; });
    setCallState((prev) => ({ ...prev, muted:!enabled }));
  };

  const toggleCamera = () => {
    const videoTracks = localStreamRef.current?.getVideoTracks?.() || [];
    const enabled = !(videoTracks[0]?.enabled);
    videoTracks.forEach((track) => { track.enabled = enabled; });
    setCallState((prev) => ({ ...prev, cameraOff:!enabled }));
  };

  // ── Socket ────────────────────────────────────────────
  useEffect(()=>{
      socket = io(SOCKET_URL, { auth:{token}, transports:["websocket","polling"], reconnection:true });
    window._cbSocket = socket;

    socket.on("connect",()=>{
      socket.emit("user_online", selfId);
    });
    socket.on("online_users",   (u)=>setOnline(u));
    socket.on("user_status",    (d)=>setUserStatuses(p=>({...p,[d.userId]:{status:d.status,lastSeen:d.lastSeen}})));
    socket.on("user_typing",    ({name})=>setTyping(name));
    socket.on("user_stop_typing",()=>setTyping(null));

    socket.on("join_room_request",(roomId)=>{ socket.emit("join_room",roomId); });

    socket.on("receive_message",(msg)=>{
      if (rememberIncomingMessage(msg._id)) return;
      const current = activeRef.current;
      if (current?.roomId===msg.roomId) {
        setMsgs((prev)=>upsertMessage(prev, msg));
        fetch(`${API}/api/messages/${current.roomId}/seen-all`,{method:"PUT",headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});
      }
      setConvs(p=>{
        const text = msg.type==="text" ? msg.text : `${msg.type} file`;
        const ex   = p.find(c=>c.roomId===msg.roomId);
        if (ex) return [
          {...ex, lastMsg:text, lastTime:msg.createdAt, unread: current?.roomId===msg.roomId ? 0 : (ex.unread||0)+1 },
          ...p.filter(c=>c.roomId!==msg.roomId)
        ];
        const ids     = msg.roomId.split("_");
        const otherId = ids.find(id=>id!==selfId)||ids[0];
        return [{
          roomId:msg.roomId,
          otherId,
          otherName:current?.roomId===msg.roomId ? current.otherName : msg.senderName,
          otherUsername:current?.roomId===msg.roomId ? current.otherUsername : "",
          otherRole:current?.roomId===msg.roomId ? current.otherRole : "",
          otherOrg:current?.roomId===msg.roomId ? current.otherOrg : "",
          lastMsg:text,
          lastTime:msg.createdAt,
          unread: current?.roomId===msg.roomId ? 0 : 1,
        }, ...p];
      });
    });

    socket.on("message_seen",    ({messageId})=>setMsgs(p=>p.map(m=>String(m._id)===String(messageId)?{...m,status:"seen"}:m)));
    socket.on("message_reaction",({messageId,reactions})=>setMsgs(p=>p.map(m=>String(m._id)===String(messageId)?{...m,reactions}:m)));
    socket.on("message_edited",  ({messageId,text})=>setMsgs(p=>p.map(m=>String(m._id)===String(messageId)?{...m,text,edited:true}:m)));
    socket.on("message_deleted", ({messageId})=>setMsgs(p=>p.map(m=>String(m._id)===String(messageId)?{...m,deletedForAll:true,text:"This message was deleted"}:m)));
    socket.on("interview_updated",({messageId,status})=>setMsgs(p=>p.map(m=>String(m._id)===String(messageId)?{...m,interview:{...m.interview,status}}:m)));
    socket.on("incoming_call", ({ from, fromName, offer, callType="video" })     => {
      if (callStateRef.current.phase !== "idle" || incomingCallRef.current) {
        socket.emit("call_rejected", { to:from });
        return;
      }
      setIncomingCall({ from, fromName, offer, callType });
    });
    socket.on("call_answered", async ({ answer }) => {
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer)).catch(()=>{});
      await flushPendingIce();
      setCallState((prev) => ({ ...prev, phase:"connecting" }));
    });
    socket.on("ice_candidate", async ({ candidate }) => {
      if (!candidate) return;
      if (!peerRef.current?.remoteDescription?.type) {
        pendingIceRef.current.push(candidate);
        return;
      }
      await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(()=>{});
    });
    socket.on("call_ended", () => endCurrentCall(false, "Call ended"));
    socket.on("call_rejected", () => endCurrentCall(false, "Call declined"));

    loadConvs();
    return ()=>{
      resetMedia();
      socket?.disconnect();
      window._cbSocket=null;
    };
  },[]);

  useEffect(()=>{
    if (normalizeId(preSelectedTarget?.id, preSelectedTarget?._id, preSelectedTarget?.email, preSelectedTarget?.userId)) {
      openConv(preSelectedTarget);
      if(onClearTarget) onClearTarget();
    }
  },[preSelectedTarget]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);
  useEffect(()=>{ const fn=()=>setCtxMenu(null); document.addEventListener("click",fn); return()=>document.removeEventListener("click",fn); },[]);

  const loadConvs = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/messages/rooms/list`,{headers:{Authorization:`Bearer ${token}`}});
      const data = await res.json();
      if (data.rooms) setConvs(data.rooms);
    } catch {}
    setLoading(false);
  };

  const openConv = async (target) => {
    const targetId = normalizeId(target?.id, target?._id, target?.email, target?.userId);
    if (!targetId) {
      showToast("Could not open this conversation.");
      return;
    }
    const room = mkRoom(selfId, targetId);
    const rd   = { roomId:room, otherId:targetId, otherName:target.name||"User", otherUsername:target.username||(target.name||"").toLowerCase().replace(/[^a-z0-9]/g,""), otherRole:target.role||"other", otherOrg:target.org||target.organisation||"", otherProfile:{...target,id:targetId} };
    setActiveRoom(rd); activeRef.current=rd;
    setMsgs([]); setMsgLoading(true); setReplyTo(null); setEditingMsg(null);
    socket?.emit("join_room", room);

    try {
      const res  = await fetch(`${API}/api/messages/${room}`,{headers:{Authorization:`Bearer ${token}`}});
      const data = await res.json();
      if (data.messages) setMsgs(data.messages);
      await fetch(`${API}/api/messages/${room}/seen-all`,{method:"PUT",headers:{Authorization:`Bearer ${token}`}});
    } catch {}
    setMsgLoading(false);
    setConvs(p=>p.map(c=>c.roomId===room?{...c,unread:0}:c));
    setTimeout(()=>inputRef.current?.focus(),100);
  };

  const sendMsg = async () => {
    if (editingMsg) { await saveEdit(); return; }
    if (!input.trim()||!activeRoom||sending) return;
    const text=input.trim(); const tempId=`tmp_${Date.now()}`;
    setInput(""); setSending(true); setReplyTo(null); setEmojiOpen(false);

    const optimistic = { _id:tempId, _tempId:tempId, roomId:activeRoom.roomId, senderId:selfId, senderName:user.name, text, type:"text", status:"sent", createdAt:new Date().toISOString(), replyTo:replyTo||null };
    setMsgs(p=>[...p,optimistic]);
    socket?.emit("stop_typing",{roomId:activeRoom.roomId});

    try {
      const res  = await fetch(`${API}/api/messages`,{ method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({ roomId:activeRoom.roomId, text, recipientId:activeRoom.otherId, replyTo:replyTo?._id }) });
      const data = await res.json();
      if (data.message) setMsgs((prev)=>upsertMessage(prev, data.message));
    } catch {
      socket?.emit("send_message_fallback",{roomId:activeRoom.roomId,message:optimistic,recipientId:activeRoom.otherId});
    }
    setSending(false);
  };

  const sendFile = async (file) => {
    if (!activeRoom||!file) return;
    setUploadProg(1);
    const fd = new FormData();
    fd.append("file",file); fd.append("roomId",activeRoom.roomId); fd.append("recipientId",activeRoom.otherId||"");
    try {
      const res  = await fetch(`${API}/api/messages/upload`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd});
      const data = await res.json();
      if (data.message) setMsgs((prev)=>upsertMessage(prev, data.message));
    } catch { showToast("❌ Upload failed"); }
    setUploadProg(0);
  };

  const sendInterview = async (form) => {
    const text = `📅 Interview Invitation\n📆 ${form.date} at ${form.time}\n🖥️ ${form.mode==="online"?"Online":"In-Person"}${form.link?`\n🔗 ${form.link}`:""}${form.note?`\n📝 ${form.note}`:""}`;
    const tempId=`tmp_${Date.now()}`;
    const msg = { _id:tempId,_tempId:tempId,roomId:activeRoom.roomId,senderId:selfId,senderName:user.name,text,type:"interview",status:"sent",interview:{...form,status:"pending"},createdAt:new Date().toISOString() };
    setMsgs(p=>[...p,msg]);
    try {
      const res  = await fetch(`${API}/api/messages`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({roomId:activeRoom.roomId,text,type:"interview",interview:form,recipientId:activeRoom.otherId})});
      const data = await res.json();
      if(data.message) setMsgs((prev)=>upsertMessage(prev, data.message));
    } catch {}
    setShowInterview(false);
    showToast("📅 Interview invitation sent!");
  };

  const saveEdit = async () => {
    if (!editingMsg||!input.trim()) return;
    setMsgs(p=>p.map(m=>String(m._id)===editingMsg.id?{...m,text:input,edited:true}:m));
    await fetch(`${API}/api/messages/${editingMsg.id}/edit`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({text:input})}).catch(()=>{});
    setEditingMsg(null); setInput(""); inputRef.current?.focus();
  };

  const deleteMsg = async (msgId, forEveryone) => {
    setMsgs(p=>p.map(m=>String(m._id)===msgId?{...m,deletedForAll:forEveryone,text:"This message was deleted"}:m));
    await fetch(`${API}/api/messages/${msgId}?forEveryone=${forEveryone}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});
    showToast(forEveryone?"🗑️ Deleted for everyone":"🗑️ Message deleted");
  };

  const react = async (msgId, emoji) => {
    setReactTarget(null);
    setMsgs(p=>p.map(m=>{
      if(String(m._id)!==msgId) return m;
      const uid = selfId;
      const reacts=[...(m.reactions||[])];
      const idx=reacts.findIndex(r=>String(r.userId)===uid);
      if(idx>=0){ if(reacts[idx].emoji===emoji) reacts.splice(idx,1); else reacts[idx]={...reacts[idx],emoji}; }
      else reacts.push({userId:selfId,userName:user.name,emoji});
      return {...m,reactions:reacts};
    }));
    await fetch(`${API}/api/messages/${msgId}/react`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({emoji})}).catch(()=>{});
  };

  const handleTyping=(val)=>{
    setInput(val);
    if(!activeRoom)return;
    socket?.emit("typing",{roomId:activeRoom.roomId,name:user.name});
    clearTimeout(typingTimer.current);
    typingTimer.current=setTimeout(()=>socket?.emit("stop_typing",{roomId:activeRoom.roomId}),1500);
  };

  const isOnline = (id) => {
    const targetId = normalizeId(id);
    return online.some((onlineId) => normalizeId(onlineId) === targetId);
  };
  const getStatus= (id) => {
    if(isOnline(id)) return {text:"Online",color:"var(--cb-success)"};
    const ls=userStatuses[String(id)]?.lastSeen;
    return {text:ls?`Last seen ${fmtTime(ls)}`:"Offline",color:"var(--cb-muted)"};
  };

  const filteredConvs = convs.filter(c=>!search||c.otherName?.toLowerCase().includes(search.toLowerCase()));
  const displayMsgs   = showMsgSearch&&msgSearch ? msgs.filter(m=>m.text?.toLowerCase().includes(msgSearch.toLowerCase())) : msgs;
  const totalUnread   = convs.reduce((a,c)=>a+(c.unread||0),0);
  const showConversationPane = !isMobile || !activeRoom;
  const showChatPane = !isMobile || Boolean(activeRoom);

  const renderBubble = (msg, i) => {
    const isMine  = normalizeId(msg.senderId)===selfId || msg.senderName===user.name;
    const isDel   = msg.deletedForAll;
    const msgId   = String(msg._id||msg._tempId||i);

    return (
      <div key={msgId}
        style={{ display:"flex", flexDirection:"column", alignItems:isMine?"flex-end":"flex-start", gap:3, marginBottom:8, position:"relative" }}
        onMouseLeave={()=>reactTarget===msgId&&setReactTarget(null)}>

        {!isMine && <div style={{ fontSize:11, color:"var(--cb-muted)", fontWeight:600, paddingLeft:4 }}>{msg.senderName}</div>}

        {msg.replyTo&&!isDel&&(
          <div style={{ maxWidth:isMobile ? "84%" : "65%", padding:"5px 10px", background:"var(--cb-card)", borderLeft:`3px solid var(--cb-accent)`, borderRadius:8, fontSize:12, color:"var(--cb-muted)", marginBottom:3 }}>
            ↩ {typeof msg.replyTo==="object"?(msg.replyTo?.text||"Message unavailable"):msg.replyTo}
          </div>
        )}

        <div style={{ display:"flex", alignItems:"flex-end", gap:isMobile ? 4 : 6, flexDirection:isMine?"row-reverse":"row", maxWidth:isMobile ? "94%" : "80%" }}>
          {!isMine && !isMobile && <Avatar name={msg.senderName} size={28}/>}
          <div style={{ minWidth:0, maxWidth:"100%", flexShrink:1 }}>
          <div
            onDoubleClick={()=>!isDel&&setReactTarget(reactTarget===msgId?null:msgId)}
            style={{ padding:isDel ? "8px 14px" : isMobile ? "10px 13px" : "11px 16px", borderRadius:18, fontSize:isMobile ? 13 : 14, lineHeight:1.55, wordBreak:"break-word", overflowWrap:"anywhere", whiteSpace:"normal", cursor:"pointer", transition:"transform 0.1s",
              ...(isDel ? { background:"var(--cb-card)", color:"var(--cb-muted)", fontStyle:"italic", border:"1px solid var(--cb-border)" }
                : isMine ? { background:"linear-gradient(135deg,var(--cb-accent),var(--cb-accent2))", color:"#fff", borderBottomRightRadius:4, boxShadow:"0 2px 12px rgba(37,99,235,0.2)" }
                : { background:"var(--cb-card)", border:"1px solid var(--cb-border)", color:"var(--cb-text)", borderBottomLeftRadius:4 })
            }}>

            {!isDel&&msg.type!=="text"&&msg.type!=="interview"&&(
              <div style={{ marginBottom:msg.text&&msg.type==="image"?6:0 }}>
                {msg.type==="image"&&msg.fileUrl&&(
                  <img src={`${API}${msg.fileUrl}`} alt={msg.fileName} style={{ maxWidth:mediaPreviewWidth, maxHeight:isMobile ? 150 : 180, borderRadius:10, display:"block" }} onError={e=>e.target.style.display="none"}/>
                )}
                {msg.type==="audio"&&<audio controls src={`${API}${msg.fileUrl}`} style={{ maxWidth:mediaPreviewWidth }}/>}
                {msg.type==="video"&&<video controls src={`${API}${msg.fileUrl}`} style={{ maxWidth:mediaPreviewWidth, maxHeight:isMobile ? 140 : 160, borderRadius:10 }}/>}
                {["pdf","file","doc"].includes(msg.type)&&(
                  <a href={`${API}${msg.fileUrl}`} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(0,0,0,0.03)", borderRadius:12, textDecoration:"none", color:"var(--cb-text)" }}>
                    <span style={{ fontSize:26 }}>{fileIco(msg.type)}</span>
                    <div><div style={{ fontSize:13, fontWeight:600 }}>{msg.fileName}</div><div style={{ fontSize:11, opacity:0.6 }}>{msg.fileSize?fmtSize(msg.fileSize):msg.type.toUpperCase()}</div></div>
                  </a>
                )}
              </div>
            )}

            {!isDel&&msg.type==="interview"&&(
              <div style={{ background:"rgba(217,119,6,0.06)", border:"1px solid rgba(217,119,6,0.2)", borderRadius:12, padding:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--cb-gold)", marginBottom:8 }}>📅 Interview Invitation</div>
                <div style={{ fontSize:12, color:"var(--cb-text)", lineHeight:1.7, whiteSpace:"pre-line" }}>{msg.text}</div>
                {msg.interview&&!isMine&&msg.interview.status==="pending"&&(
                  <div style={{ display:"flex", gap:8, marginTop:12, flexDirection:isMobile ? "column" : "row" }}>
                    {[["accepted","✅ Accept","rgba(22,163,74,0.08)","rgba(22,163,74,0.2)","var(--cb-success)"],["declined","❌ Decline","rgba(220,38,38,0.05)","rgba(220,38,38,0.15)","var(--cb-danger)"]].map(([st,lbl,bg,bd,c])=>(
                      <button key={st} onClick={()=>fetch(`${API}/api/messages/interview/${msg._id}`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({status:st})}).then(()=>setMsgs(p=>p.map(m=>String(m._id)===String(msg._id)?{...m,interview:{...m.interview,status:st}}:m)))}
                        style={{ flex:1, background:bg, border:`1px solid ${bd}`, color:c, borderRadius:8, padding:"8px 0", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                )}
                {msg.interview?.status&&msg.interview.status!=="pending"&&(
                  <div style={{ marginTop:8, fontSize:12, fontWeight:700, color:msg.interview.status==="accepted"?"var(--cb-success)":"var(--cb-danger)" }}>
                    {msg.interview.status==="accepted"?"✅ Accepted":"❌ Declined"}
                  </div>
                )}
              </div>
            )}

            {!isDel&&msg.type==="text"&&<span style={{ whiteSpace:"pre-wrap", wordBreak:"break-word", overflowWrap:"anywhere" }}>{msg.text}</span>}
            {isDel&&<div style={{ display:"block" }}>🚫 This message was deleted</div>}
            {msg.edited&&!isDel&&<span style={{ fontSize:10, opacity:0.55, marginLeft:6 }}>✏️ edited</span>}
          </div>
          </div>
        </div>

        {(msg.reactions||[]).length>0&&!isDel&&(
          <div style={{ display:"flex", gap:3, marginTop:2, flexDirection:isMine?"row-reverse":"row", paddingLeft:isMine?0:36 }}>
            {Object.entries((msg.reactions||[]).reduce((a,r)=>({...a,[r.emoji]:(a[r.emoji]||0)+1}),{})).map(([emoji,count])=>(
              <button key={emoji} onClick={()=>react(msgId,emoji)}
                style={{ background:"var(--cb-card)", border:"1px solid var(--cb-border)", borderRadius:50, padding:"2px 8px", fontSize:12, cursor:"pointer", color:"var(--cb-text)" }}>
                {emoji}{count>1?` ${count}`:""}
              </button>
            ))}
          </div>
        )}

        <div style={{ fontSize:10, color:"var(--cb-muted)", display:"flex", alignItems:"center", gap:3, flexDirection:isMine?"row-reverse":"row", paddingLeft:isMine?0:36 }}>
          <span>{fmtTime(msg.createdAt)}</span>
          {isMine&&!isDel&&(
            <span style={{ fontSize:13, color:msg.status==="seen"?"var(--cb-accent)":msg.status==="delivered"?"var(--cb-muted)":"var(--cb-muted)" }}>
              {msg._tempId?"⏳":msg.status==="seen"?"✓✓":msg.status==="delivered"?"✓✓":"✓"}
            </span>
          )}
        </div>

        {reactTarget===msgId&&!isDel&&(
          <div style={{ position:"absolute", [isMine?"right":"left"]:0, top:isMobile ? -38 : -44, background:"var(--cb-surface)", border:"1px solid var(--cb-border)", borderRadius:50, padding:isMobile ? "4px 8px" : "5px 10px", display:"flex", gap:4, zIndex:100, boxShadow:"0 8px 24px rgba(0,0,0,0.08)", maxWidth:isMobile ? "92vw" : "none", overflowX:"auto" }}>
            {QUICK_REACT.map(e=>(
              <button key={e} onClick={()=>react(msgId,e)}
                style={{ background:"none", border:"none", fontSize:19, cursor:"pointer", lineHeight:1 }}
                onMouseEnter={ev=>ev.currentTarget.style.transform="scale(1.35)"} onMouseLeave={ev=>ev.currentTarget.style.transform="scale(1)"}>
                {e}
              </button>
            ))}
            <div style={{ width:1, background:"var(--cb-border)", margin:"2px 3px" }}/>
            {isMine&&<>
              <button onClick={()=>{setEditingMsg({id:msgId,text:msg.text});setInput(msg.text);setReactTarget(null);inputRef.current?.focus();}} style={{ background:"none", border:"none", fontSize:14, cursor:"pointer", color:"var(--cb-muted)" }}>✏️</button>
              <button onClick={()=>{setReplyTo(msg);setReactTarget(null);}} style={{ background:"none", border:"none", fontSize:14, cursor:"pointer", color:"var(--cb-muted)" }}>↩</button>
              <button onClick={()=>{deleteMsg(msgId,true);setReactTarget(null);}} style={{ background:"none", border:"none", fontSize:14, cursor:"pointer", color:"var(--cb-danger)" }}>🗑️</button>
            </>}
            {!isMine&&<button onClick={()=>{setReplyTo(msg);setReactTarget(null);}} style={{ background:"none", border:"none", fontSize:14, cursor:"pointer", color:"var(--cb-muted)" }}>↩</button>}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        .conv-row:hover{background:var(--cb-card)!important}
        .conv-row.active{background:rgba(37,99,235,0.08)!important;border-left:3px solid var(--cb-accent)!important}
        .hbtn:hover{background:rgba(0,0,0,0.05)!important;color:var(--cb-text)!important}
        .ibtn:hover{background:rgba(0,0,0,0.05)!important}
        textarea::-webkit-scrollbar{width:4px} textarea::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);border-radius:2px}
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.08);border-radius:3px}
      `}</style>

      {viewProfile  && <ProfileModal  profile={viewProfile}  onClose={()=>setViewProfile(null)}  onMessage={(p)=>{openConv(p);setViewProfile(null);}}/>}
      {showInterview && <InterviewModal onClose={()=>setShowInterview(false)} onSend={sendInterview} recipientName={activeRoom?.otherName}/>}
      <CallOverlay
        callState={callState}
        incomingCall={incomingCall}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        peerLabel={callState.peerName || incomingCall?.fromName}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={()=>endCurrentCall(true)}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
      />
      {ctxMenu      && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} conv={ctxMenu.conv} onClose={()=>setCtxMenu(null)} onDelete={(conv,type)=>setDeleteDialog({type,conv})}/>}
      {deleteDialog && (
        <DeleteDialog type={deleteDialog.type} name={deleteDialog.conv?.otherName}
          onCancel={()=>setDeleteDialog(null)}
          onConfirm={()=>{
            if(deleteDialog.type==="messages") setConvs(p=>p.map(c=>c.roomId===deleteDialog.conv.roomId?{...c,lastMsg:"",unread:0}:c));
            else setConvs(p=>p.filter(c=>c.roomId!==deleteDialog.conv.roomId));
            if(activeRoom?.roomId===deleteDialog.conv.roomId){setActiveRoom(null);setMsgs([]);}
            setDeleteDialog(null);
            showToast(`✅ ${deleteDialog.type==="contact"?"Contact":"Messages"} deleted successfully`);
          }}/>
      )}

      {toast&&(
        <div style={{ position:"fixed", bottom:isMobile ? 26 : 80, left:"50%", transform:"translateX(-50%)", background:"var(--cb-accent)", border:"1px solid rgba(37,99,235,0.5)", color:"#fff", padding:isMobile ? "10px 16px" : "10px 20px", borderRadius:50, fontSize:13, fontWeight:600, zIndex:9999, boxShadow:"0 8px 24px rgba(0,0,0,0.1)", whiteSpace:isMobile ? "normal" : "nowrap", maxWidth:isMobile ? "calc(100vw - 28px)" : "none", textAlign:"center", animation:"fadeUp 0.3s ease" }}>
          {toast}
        </div>
      )}

      <div style={{ height:isMobile ? "calc(100dvh - 124px)" : "calc(100vh - 110px)", minHeight:isMobile ? 520 : "auto", display:"flex", background:isMobile ? "linear-gradient(180deg,rgba(7,16,34,0.98),rgba(8,18,36,1))" : "var(--cb-bg)", border:"1px solid var(--cb-border)", borderRadius:isMobile ? 18 : 20, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.04)", fontFamily:"'DM Sans',sans-serif" }}>

        {/* LEFT SIDEBAR */}
        {showConversationPane && (
        <div style={{ width:isMobile ? "100%" : isTablet ? 300 : 320, flexShrink:0, borderRight:isMobile ? "none" : "1px solid var(--cb-border)", display:"flex", flexDirection:"column", background:isMobile ? "linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))" : "var(--cb-surface)" }}>
          <div style={{ padding:isMobile ? "14px 14px 10px" : "16px 18px 12px", borderBottom:"1px solid var(--cb-border)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:isMobile ? 8 : 12 }}>
              <div style={{ fontSize:isMobile ? 20 : 18, fontWeight:800, color:"var(--cb-text)", letterSpacing:"-0.5px" }}>
                {isMobile ? "Messaging" : "Messages"}
                {totalUnread>0&&<span style={{ marginLeft:8, background:"var(--cb-danger)", color:"#fff", fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:50, boxShadow:"0 0 8px rgba(220,38,38,0.3)" }}>{totalUnread}</span>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--cb-success)", boxShadow:"0 0 6px var(--cb-success)" }}/>
                <span style={{ fontSize:11, color:"var(--cb-success)", fontWeight:600 }}>{online.length} online</span>
              </div>
            </div>
            {isMobile && <div style={{ fontSize:12, color:"var(--cb-muted)", marginBottom:10 }}>A clean inbox, styled for quick replies.</div>}
            <div style={{ display:"flex", alignItems:"center", gap:8, background:isMobile ? "rgba(255,255,255,0.05)" : "var(--cb-card)", border:"1px solid var(--cb-border)", borderRadius:isMobile ? 16 : 12, padding:isMobile ? "11px 14px" : "9px 14px" }}>
              <span style={{ fontSize:14, color:"var(--cb-muted)" }}>🔍</span>
              <input style={{ background:"transparent", border:"none", outline:"none", color:"var(--cb-text)", fontSize:13, flex:1, fontFamily:"'DM Sans',sans-serif" }}
                placeholder="Search contacts or company name..."
                value={search} onChange={e=>setSearch(e.target.value)}/>
              {search&&<button onClick={()=>setSearch("")} style={{ background:"none", border:"none", color:"var(--cb-muted)", cursor:"pointer", fontSize:13 }}>✕</button>}
            </div>
          </div>

          <div style={{ margin:isMobile ? "10px 12px 8px" : "10px 14px", padding:isMobile ? "12px 14px" : "10px 14px", background:isMobile ? "linear-gradient(135deg,rgba(37,99,235,0.12),rgba(37,99,235,0.04))" : "rgba(37,99,235,0.04)", border:"1px solid rgba(37,99,235,0.12)", borderRadius:isMobile ? 16 : 11, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>💬</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--cb-accent)" }}>{isMobile ? "Start a new chat" : "Start a new conversation"}</div>
              <div style={{ fontSize:11, color:"var(--cb-muted)", marginTop:1 }}>{isMobile ? "Message people from Jobs or Profiles." : "Go to Jobs or Profiles → click 💬 Message"}</div>
            </div>
          </div>

          <div style={{ flex:1, overflowY:"auto" }}>
            {loading&&<div style={{ textAlign:"center", padding:30, color:"var(--cb-muted)", fontSize:13 }}>Loading...</div>}
            {!loading&&filteredConvs.length===0&&(
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>💬</div>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--cb-text)", marginBottom:6 }}>No contacts found</div>
                <div style={{ fontSize:12, color:"var(--cb-muted)", lineHeight:1.6 }}>
                  {search ? `No contacts match "${search}"` : user.role==="seeker" ? "Click 💬 Message on any recruiter in Browse Jobs" : "Click 💬 Message on any candidate in Candidate Pool"}
                </div>
              </div>
            )}
            {filteredConvs.map((conv,i)=>{
              const isActive = activeRoom?.roomId===conv.roomId;
              return (
                <div key={conv.roomId||i} className={`conv-row${isActive?" active":""}`}
                  onClick={()=>openConv({id:conv.otherId||conv.roomId,name:conv.otherName||"User",username:conv.otherUsername,role:"other",org:""})}
                  onContextMenu={e=>{e.preventDefault();setCtxMenu({x:e.clientX,y:e.clientY,conv});}}
                  style={{ display:"flex", gap:12, padding:isMobile ? "14px" : "13px 16px", cursor:"pointer", borderBottom:isMobile ? "none" : "1px solid var(--cb-border)", borderLeft:isMobile ? "none" : "3px solid transparent", transition:"all 0.2s", animation:"fadeUp 0.3s ease", margin:isMobile ? "0 10px 10px" : 0, borderRadius:isMobile ? 18 : 0, background:isMobile ? (isActive ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.03)") : undefined, border:isMobile ? `1px solid ${isActive ? "rgba(37,99,235,0.24)" : "rgba(255,255,255,0.06)"}` : undefined, boxShadow:isMobile && isActive ? "0 10px 28px rgba(37,99,235,0.12)" : "none" }}>
                  <Avatar name={conv.otherName} size={44} online={isOnline(conv.otherId)}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:"var(--cb-text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:isMobile ? 190 : 160 }}>{conv.otherName||"User"}</span>
                      <span style={{ fontSize:11, color:isActive?"var(--cb-accent)":"var(--cb-muted)", flexShrink:0, marginLeft:6 }}>{fmtTime(conv.lastTime)}</span>
                    </div>
                    <div style={{ fontSize:12, color:isActive?"var(--cb-accent)":"var(--cb-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:isMobile ? 4 : 0 }}>{typeof conv.lastMsg==="string"?conv.lastMsg:(conv.lastMsg?.text||"No messages yet")}</div>
                    {isMobile && <div style={{ fontSize:10, color:isOnline(conv.otherId) ? "var(--cb-success)" : "var(--cb-subtle)", fontWeight:600 }}>{isOnline(conv.otherId) ? "Active now" : "Offline"}</div>}
                  </div>
                  {(conv.unread||0)>0&&(
                    <div style={{ minWidth:20, height:20, borderRadius:50, background:"var(--cb-accent)", color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 5px", boxShadow:"0 0 8px rgba(37,99,235,0.4)", flexShrink:0 }}>
                      {conv.unread}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* MAIN CHAT PANEL */}
        {showChatPane && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, background:isMobile ? "linear-gradient(180deg,rgba(4,12,28,0.96),rgba(7,18,35,1))" : "var(--cb-bg)" }}>
          {!activeRoom ? (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:isMobile ? 24 : 40, textAlign:"center" }}>
              <div style={{ fontSize:isMobile ? 58 : 80, marginBottom:20, opacity:0.5 }}>💬</div>
              <h3 style={{ fontSize:isMobile ? 20 : 24, fontWeight:800, color:"var(--cb-text)", marginBottom:10, fontFamily:"'Playfair Display',serif" }}>
                {user.role==="recruiter" ? "Recruiter ↔ Candidate Chat" : "JobSeeker Messenger"}
              </h3>
              <p style={{ fontSize:isMobile ? 13 : 14, color:"var(--cb-muted)", lineHeight:1.8, maxWidth:340, textAlign:"center", marginBottom:28 }}>
                {user.role==="recruiter"
                  ? "Go to Candidate Pool → click 💬 Message on any profile to start a real-time conversation saved in MongoDB."
                  : "Go to Browse Jobs → click 💬 Message on any recruiter to connect instantly."}
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", maxWidth:500 }}>
                {["⚡ Real-time","🗄️ MongoDB","📎 File Sharing","📅 Interview Scheduling","😊 Reactions","✏️ Edit & Delete","↩ Reply","🔍 Search Messages"].map(f=>(
                  <span key={f} style={{ background:"rgba(37,99,235,0.06)", border:"1px solid rgba(37,99,235,0.12)", color:"var(--cb-accent)", padding:"7px 14px", borderRadius:50, fontSize:12, fontWeight:600 }}>{f}</span>
                ))}
              </div>
              <div style={{ marginTop:20, fontSize:12, color:"var(--cb-muted)" }}>✅ Messages are end-to-end saved · ✅ Your privacy is protected</div>
            </div>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:isMobile ? "center" : "center", gap:isMobile ? 10 : 12, padding:isMobile ? "12px 12px 10px" : "13px 18px", borderBottom:"1px solid var(--cb-border)", background:isMobile ? "rgba(15,23,42,0.92)" : "var(--cb-surface)", backdropFilter:isMobile ? "blur(12px)" : "none", flexShrink:0, flexWrap:"nowrap" }}>
                <button onClick={()=>{setActiveRoom(null);activeRef.current=null;setMsgs([]);}}
                  style={{ background:"transparent", border:"1px solid var(--cb-border)", color:"var(--cb-muted)", borderRadius:isMobile ? 12 : 9, padding:isMobile ? "9px 10px" : "7px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>
                  {isMobile ? "←" : "← Back"}
                </button>
                <Avatar name={activeRoom.otherName} size={42} online={isOnline(activeRoom.otherId)} onClick={()=>setViewProfile(activeRoom.otherProfile||{name:activeRoom.otherName,username:activeRoom.otherUsername,role:activeRoom.otherRole,id:activeRoom.otherId})}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:isMobile ? 15 : 16, fontWeight:700, color:"var(--cb-text)", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", lineHeight:1.2 }}>
                    {activeRoom.otherName}
                    {!isMobile && activeRoom.otherOrg&&<span style={{ fontSize:12, color:"var(--cb-muted)", fontWeight:400 }}>· {activeRoom.otherOrg}</span>}
                  </div>
                  <div style={{ fontSize:12, marginTop:isMobile ? 2 : 0 }}>
                    {typing
                      ? <span style={{ color:"var(--cb-gold)", fontStyle:"italic", fontWeight:500 }}>✍️ {activeRoom.otherName.split(" ")[0]} is typing...</span>
                      : <span style={{ color:getStatus(activeRoom.otherId).color }}>{getStatus(activeRoom.otherId).text}</span>}
                    {activeRoom.otherUsername&&<span style={{ color:"var(--cb-muted)", marginLeft:isMobile ? 0 : 8, display:isMobile ? "block" : "inline", marginTop:isMobile ? 2 : 0, fontFamily:"monospace", fontSize:10 }}>@{activeRoom.otherUsername}</span>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"nowrap", marginLeft:0, overflowX:isMobile ? "auto" : "visible", paddingBottom:isMobile ? 2 : 0, flexShrink:0 }}>
                  {[
                    { ico:"🔍", tip:"Search messages",    fn:()=>setShowMsgSearch(!showMsgSearch) },
                    ...(!isMobile ? [{ ico:"📅", tip:"Schedule interview",  fn:()=>setShowInterview(true) }] : []),
                    { ico:"📞", tip:"Start voice call",    fn:()=>startCall("audio") },
                    { ico:"📹", tip:"Start video call",    fn:()=>startCall("video") },
                    ...(!isMobile ? [{ ico:"👤", tip:"View profile", fn:()=>setViewProfile(activeRoom.otherProfile||{name:activeRoom.otherName,username:activeRoom.otherUsername,role:activeRoom.otherRole,id:activeRoom.otherId}) }] : []),
                  ].map(({ico,tip,fn})=>(
                    <button key={ico} onClick={fn} className="hbtn" title={tip}
                      style={{ background:"transparent", border:"1px solid var(--cb-border)", color:"var(--cb-muted)", borderRadius:isMobile ? 12 : 10, width:isMobile ? 38 : "auto", minWidth:isMobile ? 38 : "auto", padding:isMobile ? "8px 0" : "8px 12px", fontSize:16, cursor:"pointer", transition:"all 0.2s", flexShrink:0 }}>
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              {showMsgSearch&&(
                <div style={{ padding:isMobile ? "8px 12px" : "8px 16px", background:"rgba(37,99,235,0.04)", borderBottom:"1px solid rgba(37,99,235,0.12)", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:14 }}>🔍</span>
                  <input style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"var(--cb-text)", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}
                    placeholder="Search in conversation..." value={msgSearch} onChange={e=>setMsgSearch(e.target.value)} autoFocus/>
                  <button onClick={()=>{setShowMsgSearch(false);setMsgSearch("");}} style={{ background:"none", border:"none", color:"var(--cb-muted)", cursor:"pointer" }}>✕</button>
                </div>
              )}

              {uploadProg>0&&(
                <div style={{ padding:isMobile ? "8px 12px" : "8px 16px", background:"rgba(37,99,235,0.04)", borderBottom:"1px solid rgba(37,99,235,0.1)", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, color:"var(--cb-accent)" }}>📤 Uploading...</span>
                  <div style={{ flex:1, height:3, background:"rgba(0,0,0,0.05)", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ width:"60%", height:"100%", background:"linear-gradient(90deg,var(--cb-accent),var(--cb-accent2))", borderRadius:2, animation:"pulse 1s infinite" }}/>
                  </div>
                </div>
              )}

              <div style={{ flex:1, overflowY:"auto", padding:isMobile ? "14px 12px 10px" : "14px 20px 8px", display:"flex", flexDirection:"column", background:isMobile ? "linear-gradient(180deg,rgba(7,18,35,0.72),rgba(6,14,28,0.96))" : "transparent" }}>
                {msgLoading&&<div style={{ textAlign:"center", padding:20, color:"var(--cb-muted)", fontSize:13 }}>Loading messages...</div>}
                {!msgLoading&&msgs.length===0&&(
                  <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ fontSize:44, marginBottom:12 }}>👋</div>
                    <div style={{ fontSize:15, fontWeight:700, color:"var(--cb-text)", marginBottom:6 }}>Say hi to {activeRoom.otherName}!</div>
                    <div style={{ fontSize:12, color:"var(--cb-muted)" }}>Messages saved in MongoDB · Real-time via Socket.io</div>
                  </div>
                )}
                {displayMsgs.reduce((acc,msg,i)=>{
                  const date=fmtDate(msg.createdAt), prev=i>0?fmtDate(displayMsgs[i-1].createdAt):null;
                  if(date!==prev){
                    acc.push(
                      <div key={`d_${i}`} style={{ display:"flex", alignItems:"center", gap:12, margin:"14px 0" }}>
                        <div style={{ flex:1, height:1, background:"var(--cb-border)" }}/>
                        <span style={{ fontSize:11, color:"var(--cb-muted)", fontWeight:600, padding:"4px 14px", background:"var(--cb-card)", borderRadius:50, border:"1px solid var(--cb-border)", whiteSpace:"nowrap" }}>{date}</span>
                        <div style={{ flex:1, height:1, background:"var(--cb-border)" }}/>
                      </div>
                    );
                  }
                  acc.push(renderBubble(msg,i));
                  return acc;
                },[])}
                <div ref={endRef}/>
              </div>

              {replyTo&&(
                <div style={{ padding:isMobile ? "8px 12px" : "8px 16px", background:"rgba(37,99,235,0.04)", borderTop:"1px solid rgba(37,99,235,0.1)", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ flex:1, borderLeft:`3px solid var(--cb-accent)`, paddingLeft:10 }}>
                    <div style={{ fontSize:11, color:"var(--cb-accent)", fontWeight:700 }}>Replying to {replyTo.senderName}</div>
                    <div style={{ fontSize:12, color:"var(--cb-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{replyTo.text}</div>
                  </div>
                  <button onClick={()=>setReplyTo(null)} style={{ background:"none", border:"none", color:"var(--cb-muted)", cursor:"pointer", fontSize:16 }}>✕</button>
                </div>
              )}

              {editingMsg&&(
                <div style={{ padding:isMobile ? "8px 12px" : "8px 16px", background:"rgba(217,119,6,0.04)", borderTop:"1px solid rgba(217,119,6,0.12)", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:12, color:"var(--cb-gold)", fontWeight:700 }}>✏️ Editing message</span>
                  <button onClick={()=>{setEditingMsg(null);setInput("");}} style={{ marginLeft:"auto", background:"none", border:"none", color:"var(--cb-muted)", cursor:"pointer" }}>✕</button>
                </div>
              )}

              {emojiOpen&&(
                <div style={{ padding:isMobile ? "10px 12px" : "10px 16px", borderTop:"1px solid var(--cb-border)", display:"flex", flexWrap:"wrap", gap:4, background:"var(--cb-surface)", maxHeight:isMobile ? 118 : "none", overflowY:isMobile ? "auto" : "visible" }}>
                  {EMOJIS.map(e=>(
                    <button key={e} onClick={()=>{setInput(p=>p+e);inputRef.current?.focus();}}
                      style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", padding:"3px", borderRadius:8 }}
                      onMouseEnter={ev=>ev.target.style.background="var(--cb-card)"} onMouseLeave={ev=>ev.target.style.background="none"}>
                      {e}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"row", gap:8, padding:isMobile ? "10px 10px 12px" : "10px 14px 12px", borderTop:"1px solid var(--cb-border)", background:isMobile ? "rgba(15,23,42,0.94)" : "var(--cb-surface)", alignItems:"flex-end", flexShrink:0 }}>
                <div style={{ display:"flex", gap:8, flexShrink:0, alignItems:"center" }}>
                  <label className="ibtn" title="Attach file" style={{ background:"transparent", border:"1px solid var(--cb-border)", color:"var(--cb-muted)", borderRadius:12, padding:isMobile ? "10px 12px" : "11px 14px", fontSize:16, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
                    📎<input ref={fileRef} type="file" style={{display:"none"}} onChange={e=>sendFile(e.target.files[0])}/>
                  </label>

                  <button onClick={()=>setEmojiOpen(!emojiOpen)} className="ibtn"
                    style={{ background:emojiOpen?"rgba(217,119,6,0.08)":"transparent", border:`1px solid ${emojiOpen?"rgba(217,119,6,0.3)":"var(--cb-border)"}`, color:emojiOpen?"var(--cb-gold)":"var(--cb-muted)", borderRadius:12, padding:isMobile ? "10px 12px" : "11px 14px", fontSize:16, cursor:"pointer", flexShrink:0, transition:"all 0.2s" }}>
                    😊
                  </button>

                  {!isMobile && (
                    <button onClick={()=>setShowInterview(true)} className="ibtn"
                      style={{ background:"transparent", border:"1px solid var(--cb-border)", color:"var(--cb-muted)", borderRadius:12, padding:"11px 14px", fontSize:16, cursor:"pointer", flexShrink:0, transition:"all 0.2s" }}
                      title="Schedule Interview">
                      📅
                    </button>
                  )}
                </div>

                <div style={{ display:"flex", gap:8, alignItems:"flex-end", minWidth:0, flex:1 }}>
                  <div style={{ flex:1, background:"var(--cb-card)", border:"1px solid var(--cb-border)", borderRadius:isMobile ? 18 : 14, display:"flex", alignItems:"flex-end", minHeight:46 }}>
                    <textarea ref={inputRef}
                      style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"var(--cb-text)", fontSize:14, fontFamily:"'DM Sans',sans-serif", resize:"none", padding:isMobile ? "12px 14px" : "12px 14px", lineHeight:1.5, maxHeight:120, overflowY:"auto" }}
                      placeholder={editingMsg ? "Edit message..." : "Type a message..."}
                      value={input}
                      onChange={e=>{handleTyping(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                      rows={1}/>
                  </div>

                  <button onClick={editingMsg?saveEdit:sendMsg}
                    disabled={!input.trim()&&!editingMsg||sending}
                    style={{ width:46, height:46, borderRadius:isMobile ? 16 : 14, background:input.trim()||editingMsg?"linear-gradient(135deg,var(--cb-accent),var(--cb-accent2))":"transparent", color:"#fff", border:input.trim()||editingMsg?"none":"1px solid var(--cb-border)", fontSize:18, cursor:input.trim()||editingMsg?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s", boxShadow:input.trim()?"0 4px 12px rgba(37,99,235,0.2)":"none", opacity:!input.trim()&&!editingMsg?0.5:1 }}>
                    {sending
                      ? <span style={{ width:18, height:18, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite", display:"inline-block" }}/>
                      : editingMsg ? "✓" : "➤"}
                  </button>
                </div>
              </div>

              {!isMobile && (
                <div style={{ textAlign:"center", fontSize:10, color:"var(--cb-muted)", padding:"6px 10px 8px", background:"var(--cb-card)", display:"flex", alignItems:"center", justifyContent:"center", gap:14, flexWrap:"wrap" }}>
                  {["   Chats", "📅 Interviews"].map(f=><span key={f}>{f}</span>)}
                </div>
              )}
            </>
          )}
        </div>
        )}
      </div>
    </>
  );
}

