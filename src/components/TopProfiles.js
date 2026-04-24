import React, { useState, useEffect } from "react";
import { API } from "../config";
const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#d4af37","#ec4899"];

export default function TopProfiles({ recruiterMode, currentUser, onMessage }) {
  const [profiles,    setProfiles]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("All");
  const [search,      setSearch]      = useState("");
  const [selected,    setSelected]    = useState(null);
  const [connected,   setConnected]   = useState([]);
  const [shortlisted, setShortlisted] = useState([]);
  const [actLoading,  setActLoading]  = useState("");
  const [toast,       setToast]       = useState("");
  const [viewportW,   setViewportW]   = useState(() => window.innerWidth);

  const user  = currentUser || JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const uKey  = user.id || user.email || "g";
  const isMobile = viewportW < 760;
  const isTablet = viewportW < 1100;

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    load();
    setConnected(  JSON.parse(localStorage.getItem(`cb_connected_${uKey}`)   || "[]"));
    setShortlisted(JSON.parse(localStorage.getItem(`cb_shortlisted_${uKey}`) || "[]"));
  }, [recruiterMode, uKey]);

  const load = async () => {
    setLoading(true);
    try {
      const ep  = recruiterMode ? "/api/auth/users/seekers" : "/api/auth/users/recruiters";
      const res = await fetch(`${API}${ep}`, { headers: { Authorization: `Bearer ${token}` } });
      const d   = await res.json();
      setProfiles((d.users || []).filter(u => u.id !== user.id && u._id !== user.id));
    } catch { setProfiles([]); }
    setLoading(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const connect = async (p) => {
    const pid = p.id || p._id;
    if (connected.includes(pid)) return;
    setActLoading(`c_${pid}`);
    try { await fetch(`${API}/api/auth/connect/${pid}`, { method:"POST", headers:{ Authorization:`Bearer ${token}` } }); } catch {}
    const u = [...connected, pid];
    setConnected(u);
    localStorage.setItem(`cb_connected_${uKey}`, JSON.stringify(u));
    showToast(`✅ Connected with ${p.name}!`);
    setActLoading("");
  };

  const shortlist = async (p) => {
    const pid = p.id || p._id;
    if (shortlisted.includes(pid)) return;
    setActLoading(`s_${pid}`);
    try { await fetch(`${API}/api/auth/shortlist/${pid}`, { method:"POST", headers:{ Authorization:`Bearer ${token}` } }); } catch {}
    const u = [...shortlisted, pid];
    setShortlisted(u);
    localStorage.setItem(`cb_shortlisted_${uKey}`, JSON.stringify(u));
    showToast(`⭐ ${p.name} shortlisted!`);
    setActLoading("");
  };

  const FILTERS = recruiterMode
    ? ["All","Fresher","1-2 years","3-5 years","5+ years"]
    : ["All","IT","Banking","Government","Education"];

  const filtered = profiles.filter(p => {
    const ms = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.username?.toLowerCase().includes(search.toLowerCase()) ||
      (p.skills||[]).join(" ").toLowerCase().includes(search.toLowerCase()) ||
      p.organisation?.toLowerCase().includes(search.toLowerCase());
    const mf = filter === "All" ||
      p.experience === filter ||
      p.industry?.toLowerCase().includes(filter.toLowerCase()) ||
      (p.skills||[]).some(s => s.toLowerCase().includes(filter.toLowerCase()));
    return ms && mf;
  });

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:isMobile ? "76px" : "80px", left:isMobile ? "12px" : "auto", right:isMobile ? "12px" : "20px", background:"rgba(15,31,56,0.98)", border:"1px solid rgba(30,64,175,0.5)", color:"#fff", padding:"12px 20px", borderRadius:"12px", fontSize:"14px", fontWeight:600, zIndex:9999, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", textAlign:"center" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:"20px", display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:"12px" }}>
        <div>
          <div style={S.overline}>{recruiterMode ? "Real-time Candidate Pool" : "Professional Network"}</div>
          <h2 style={S.title}>{recruiterMode ? "Browse Candidates" : "Connect with Recruiters"}</h2>
          <div style={{ fontSize:"13px", color:"#64748b" }}>
            {loading ? "Loading..." : `${filtered.length} real user${filtered.length !== 1 ? "s" : ""} found`}
          </div>
        </div>
        <button onClick={load} style={S.refreshBtn}>🔄 Refresh</button>
      </div>

      {/* Search + Filters */}
      <div style={{ display:"flex", gap:"10px", marginBottom:"18px", flexWrap:"wrap" }}>
        <div style={{...S.searchBox,minWidth:isMobile?"100%":"200px"}}>
          <span style={{ color:"#475569" }}>🔍</span>
          <input style={S.searchInput}
            placeholder={recruiterMode ? "Search by name, skill..." : "Search recruiters, companies..."}
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer" }}>✕</button>}
        </div>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:"8px 14px", borderRadius:"8px", border:`1px solid ${filter===f?"rgba(30,64,175,0.4)":"rgba(255,255,255,0.08)"}`, background:filter===f?"rgba(30,64,175,0.2)":"transparent", color:filter===f?"#93c5fd":"#64748b", fontSize:"12px", fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Shortlisted banner */}
      {recruiterMode && shortlisted.length > 0 && (
        <div style={{ background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:"12px", padding:"12px 16px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
          <span>✅</span>
          <span style={{ fontSize:"13px", fontWeight:700, color:"#d4af37" }}>Shortlisted: {shortlisted.length} candidates</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:"center", padding:"80px", color:"#64748b" }}>
          <div style={{ fontSize:"40px", marginBottom:"14px", animation:"spin 1s linear infinite", display:"inline-block" }}>⏳</div>
          <div style={{ fontSize:"14px", fontWeight:600, color:"#fff", marginBottom:"6px" }}>Loading real users...</div>
          <div style={{ fontSize:"12px" }}>Fetching from database</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"80px 20px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"16px" }}>
          <div style={{ fontSize:"48px", marginBottom:"16px" }}>👥</div>
          <div style={{ fontSize:"18px", fontWeight:700, color:"#fff", marginBottom:"8px" }}>
            No {recruiterMode ? "candidates" : "recruiters"} found yet
          </div>
          <div style={{ fontSize:"14px", color:"#64748b", lineHeight:1.7, maxWidth:"360px", margin:"0 auto" }}>
            {recruiterMode
              ? "No job seekers have registered yet. Share the platform so candidates can sign up!"
              : "No recruiters have registered yet. Ask your recruiter to sign up on CareerBharat!"}
          </div>
          <button onClick={load} style={{ marginTop:"20px", ...S.btnBlue }}>🔄 Refresh</button>
        </div>
      )}

      {/* Profile cards */}
      {!loading && filtered.length > 0 && (
        <div style={{...S.grid,gridTemplateColumns:isMobile?"1fr":isTablet?"repeat(auto-fill,minmax(280px,1fr))":S.grid.gridTemplateColumns}}>
          {filtered.map((p, idx) => {
            const pid    = p.id || p._id;
            const isConn = connected.includes(pid);
            const isSh   = shortlisted.includes(pid);
            const isExp  = selected === pid;
            const color  = COLORS[idx % COLORS.length];
            const uname  = p.username || (p.name || "user").toLowerCase().replace(/[^a-z0-9]/g, "");

            return (
              <div key={pid} style={{ ...S.card, ...(isExp ? S.cardExp : {}) }}>
                <div style={{ height:"3px", background:`linear-gradient(90deg,${color},#d4af37)`, margin:"-1px -1px 0", borderRadius:"16px 16px 0 0" }} />

                <div style={{ padding:"18px" }}>
                  {/* Header row */}
                  <div style={{ display:"flex", gap:"14px", alignItems:"flex-start", marginBottom:"12px" }}>
                    <div style={{ width:"52px", height:"52px", borderRadius:"14px", background:`linear-gradient(135deg,${color},#1e293b)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:"22px", color:"#fff", flexShrink:0 }}>
                      {(p.name || "U")[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"16px", fontWeight:800, color:"#fff", marginBottom:"2px" }}>{p.name}</div>
                      <div style={{ fontSize:"12px", color:"#64748b", fontFamily:"monospace" }}>@{uname}</div>
                      <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"2px" }}>
                        {recruiterMode
                          ? `${p.education || "Graduate"} · ${p.experience || "Fresher"}`
                          : `${p.organisation || p.org || "Organisation"} · ${p.designation || p.industry || ""}`}
                      </div>
                      {p.location && <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px" }}>📍 {p.location}</div>}
                    </div>
                    {isSh && <span style={{ fontSize:"9px", fontWeight:800, padding:"3px 8px", borderRadius:"50px", background:"rgba(212,175,55,0.15)", color:"#d4af37", border:"1px solid rgba(212,175,55,0.3)", whiteSpace:"nowrap", flexShrink:0 }}>⭐ SHORTLISTED</span>}
                  </div>

                  {/* Bio */}
                  {p.bio && (
                    <p style={{ fontSize:"12px", color:"#94a3b8", lineHeight:1.65, marginBottom:"12px", display:isExp?"block":"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:isExp?"visible":"hidden" }}>
                      {p.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div style={{ display:"flex", gap:"0", marginBottom:"12px", background:"rgba(255,255,255,0.03)", borderRadius:"10px", overflow:"hidden" }}>
                    {[
                      { label:"Connections", value: p.connections || 0, color:"#3b82f6" },
                      recruiterMode && p.score ? { label:"AI Score", value: p.score, color:"#d4af37" } : null,
                      { label:"Skills", value:(p.skills||[]).length, color:"#10b981" },
                    ].filter(Boolean).map((st, i, arr) => (
                      <div key={i} style={{ flex:1, textAlign:"center", padding:"10px 8px", borderRight:i<arr.length-1?"1px solid rgba(255,255,255,0.06)":"none" }}>
                        <div style={{ fontSize:"18px", fontWeight:900, color:st.color }}>{st.value}</div>
                        <div style={{ fontSize:"10px", color:"#475569" }}>{st.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Skills */}
                  {(p.skills||[]).length > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"12px" }}>
                      {(p.skills||[]).slice(0, isExp ? 99 : 4).map((sk, si) => (
                        <span key={sk} style={{ fontSize:"11px", fontWeight:600, padding:"3px 9px", borderRadius:"50px", background:`${COLORS[si%8]}18`, color:COLORS[si%8], border:`1px solid ${COLORS[si%8]}33` }}>{sk}</span>
                      ))}
                      {!isExp && (p.skills||[]).length > 4 && <span style={{ fontSize:"11px", color:"#475569", padding:"3px" }}>+{p.skills.length-4}</span>}
                    </div>
                  )}

                  {/* Profile link */}
                  <div style={{ fontSize:"11px", color:"#334155", marginBottom:"14px", fontFamily:"monospace", background:"rgba(255,255,255,0.03)", padding:"7px 10px", borderRadius:"7px", display:"flex", alignItems:isMobile?"flex-start":"center", justifyContent:"space-between", gap:"8px", flexDirection:isMobile?"column":"row" }}>
                    <span>🔗 careerbharat.in/profile/{uname}</span>
                    <button onClick={() => { navigator.clipboard?.writeText(`https://careerbharat.in/profile/${uname}`); showToast("📋 Copied!"); }}
                      style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:"11px" }}>Copy</button>
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", gap:"8px", flexDirection:isMobile?"column":"row" }}>
                    <button onClick={() => onMessage && onMessage({ id:pid, name:p.name, username:uname, role:p.role, org:p.organisation||p.org||"" })}
                      style={{ flex:1, background:"linear-gradient(135deg,#1e40af,#3b82f6)", color:"#fff", border:"none", borderRadius:"9px", padding:"10px", fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
                      💬 Message
                    </button>
                    <button onClick={() => connect(p)} disabled={isConn || actLoading===`c_${pid}`}
                      style={{ flex:1, background:isConn?"rgba(34,197,94,0.1)":"rgba(255,255,255,0.05)", border:`1px solid ${isConn?"rgba(34,197,94,0.3)":"rgba(255,255,255,0.12)"}`, color:isConn?"#4ade80":"#94a3b8", borderRadius:"9px", padding:"10px", fontSize:"12px", fontWeight:600, cursor:isConn?"default":"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                      {actLoading===`c_${pid}`?"...":isConn?"✅ Connected":"🤝 Connect"}
                    </button>
                    {recruiterMode && (
                      <button onClick={() => shortlist(p)} disabled={isSh || actLoading===`s_${pid}`}
                        style={{ background:isSh?"rgba(212,175,55,0.15)":"rgba(212,175,55,0.08)", border:`1px solid ${isSh?"rgba(212,175,55,0.4)":"rgba(212,175,55,0.2)"}`, color:"#d4af37", borderRadius:"9px", padding:"10px 12px", fontSize:"13px", cursor:isSh?"default":"pointer" }}>
                        {actLoading===`s_${pid}`?"...":isSh?"⭐":"☆"}
                      </button>
                    )}
                    <button onClick={() => setSelected(isExp ? null : pid)}
                      style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b", borderRadius:"9px", padding:"10px 12px", fontSize:"12px", cursor:"pointer" }}>
                      {isExp?"▲":"▼"}
                    </button>
                  </div>

                  {/* Expanded */}
                  {isExp && (
                    <div style={{ marginTop:"14px", paddingTop:"14px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                      {[
                        p.education   && ["🎓","Education",  p.education],
                        p.experience  && ["⏱","Experience", p.experience],
                        p.location    && ["📍","Location",   p.location],
                        (p.organisation||p.org) && ["🏢","Organisation", p.organisation||p.org],
                        p.industry    && ["💼","Industry",   p.industry],
                        p.designation && ["👔","Designation",p.designation],
                        p.linkedin    && ["🔗","LinkedIn",   p.linkedin],
                      ].filter(Boolean).map(([ic,label,val]) => (
                        <div key={label} style={{ display:"flex", gap:"10px", alignItems:"flex-start", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                          <span style={{ fontSize:"14px", width:"22px", flexShrink:0 }}>{ic}</span>
                          <div>
                            <div style={{ fontSize:"10px", color:"#475569", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
                            {label==="LinkedIn"
                              ? <a href={val} target="_blank" rel="noreferrer" style={{ fontSize:"13px", color:"#3b82f6" }}>{val}</a>
                              : <div style={{ fontSize:"13px", color:"#e2e8f0", fontWeight:600 }}>{val}</div>}
                          </div>
                        </div>
                      ))}
                      <div style={{ display:"flex", gap:"8px", marginTop:"14px", flexDirection:isMobile?"column":"row" }}>
                        <button onClick={() => onMessage && onMessage({ id:pid, name:p.name, username:uname, role:p.role, org:p.organisation||p.org||"" })}
                          style={{ flex:1, background:"linear-gradient(135deg,#1e40af,#3b82f6)", color:"#fff", border:"none", borderRadius:"9px", padding:"11px", fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                          💬 Send Message
                        </button>
                        {recruiterMode && !isSh && (
                          <button onClick={() => shortlist(p)}
                            style={{ flex:1, background:"linear-gradient(135deg,#92400e,#d4af37)", color:"#000", border:"none", borderRadius:"9px", padding:"11px", fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                            ⭐ Shortlist
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const S = {
  overline:   { fontSize:"11px", fontWeight:700, letterSpacing:"3px", textTransform:"uppercase", color:"#d4af37", marginBottom:"4px" },
  title:      { fontSize:"26px", fontWeight:900, color:"#fff", fontFamily:"'Playfair Display',serif", marginBottom:"4px" },
  refreshBtn: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b", borderRadius:"9px", padding:"9px 16px", fontSize:"13px", fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" },
  searchBox:  { display:"flex", alignItems:"center", gap:"8px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px", padding:"10px 14px", flex:1, minWidth:"200px" },
  searchInput:{ background:"transparent", border:"none", outline:"none", color:"#fff", fontSize:"13px", flex:1, fontFamily:"'DM Sans',sans-serif" },
  grid:       { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"16px" },
  card:       { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"16px", overflow:"hidden", transition:"all 0.3s ease" },
  cardExp:    { border:"1px solid rgba(212,175,55,0.25)", boxShadow:"0 8px 32px rgba(0,0,0,0.3)" },
  btnBlue:    { background:"linear-gradient(135deg,#1e40af,#3b82f6)", color:"#fff", border:"none", borderRadius:"9px", padding:"10px 18px", fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" },
};
