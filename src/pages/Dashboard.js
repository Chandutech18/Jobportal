import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io }         from "socket.io-client";
import Sidebar        from "../components/Sidebar";
import Jobs, { JOBS } from "../components/job";
import Chatbot        from "../components/Chatbot";
import ResumeAnalyzer from "../components/ResumeAnalyzer";
import TopProfiles    from "../components/TopProfiles";
import Messages       from "../components/Messages";
import { API, SOCKET_URL } from "../config";

const actKey  = () => { const u=JSON.parse(localStorage.getItem("user")||"{}"); return `cb_activity_${u.id||u.email||"g"}`; };
const getAct  = ()  => { try { return JSON.parse(localStorage.getItem(actKey())||"[]"); } catch { return []; } };
const pushAct = (item) => { const a=getAct(); a.unshift({...item,time:new Date().toISOString()}); localStorage.setItem(actKey(),JSON.stringify(a.slice(0,40))); };
const notifKey = (user) => `cb_notifications_${user.id||user.email||"g"}`;

const readNotifications = (user) => {
  try { return JSON.parse(localStorage.getItem(notifKey(user)) || "[]"); } catch { return []; }
};

const writeNotifications = (user, items) => {
  localStorage.setItem(notifKey(user), JSON.stringify(items.slice(0, 40)));
};

const pickDailyJobs = (list, date) => {
  const dayIndex = Math.max(0, new Date(date).getDate() - 1);
  const rankRecent = (jobs) => [...jobs].sort((a, b) => new Date(b.releasedAt || 0) - new Date(a.releasedAt || 0));
  const featuredJobs = rankRecent(list.filter((job) => !["Government","PSU","Defence"].includes(job.type)));
  const govtJobs = rankRecent(list.filter((job) => ["Government","PSU","Defence"].includes(job.type) && job.notifLink));
  return {
    aiJob: featuredJobs[0] || list[0],
    govtJob: govtJobs[dayIndex % Math.max(govtJobs.length, 1)] || list[0],
  };
};

const findClosestJob = (query) => {
  const tokens = String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);

  if (!tokens.length) return null;

  return JOBS
    .map((job) => {
      const haystack = [job.title, job.org, job.category, ...(job.tags||[]), ...(job.skills||[])]
        .join(" ")
        .toLowerCase();
      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { job, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.job || null;
};

function NotificationPanel({ notifications, unreadCount, onClose, onOpenJob, onOpenNotice, onEnableBrowserAlerts, mobile }) {
  return (
    <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, width:mobile ? "min(360px, calc(100vw - 24px))" : 360, maxHeight:440, overflowY:"auto", background:"var(--cb-surface)", border:"1px solid var(--cb-border)", borderRadius:18, boxShadow:"0 24px 60px rgba(0,0,0,0.18)", padding:16, zIndex:30 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:"var(--cb-text)" }}>Notifications</div>
          <div style={{ fontSize:11, color:"var(--cb-muted)" }}>{unreadCount} unread updates</div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--cb-muted)", cursor:"pointer", fontSize:16 }}>✕</button>
      </div>

      <button onClick={onEnableBrowserAlerts} style={{ width:"100%", marginBottom:12, background:"rgba(37,99,235,0.08)", border:"1px solid rgba(37,99,235,0.18)", color:"var(--cb-accent)", borderRadius:12, padding:"10px 12px", fontSize:"12px", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
        Enable browser alerts
      </button>

      {notifications.length === 0 ? (
        <div style={{ textAlign:"center", padding:"18px 10px", color:"var(--cb-muted)", fontSize:13 }}>No notifications yet.</div>
      ) : notifications.map((item) => (
        <div key={item.id} style={{ padding:"12px 12px 10px", borderRadius:14, background:item.unread?"rgba(37,99,235,0.05)":"var(--cb-card)", border:`1px solid ${item.unread?"rgba(37,99,235,0.16)":"var(--cb-border)"}`, marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:6 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--cb-text)" }}>{item.title}</div>
            {item.unread && <span style={{ fontSize:10, fontWeight:700, color:"var(--cb-accent)" }}>NEW</span>}
          </div>
          <div style={{ fontSize:10, color:"var(--cb-muted)", marginBottom:6 }}>{timeAgo(item.createdAt || item.date)}</div>
          <div style={{ fontSize:12, color:"var(--cb-muted)", lineHeight:1.6, marginBottom:10 }}>{item.body}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={()=>onOpenJob(item)} style={{ background:"linear-gradient(135deg,var(--cb-accent),var(--cb-accent2))", border:"none", color:"#fff", borderRadius:10, padding:"8px 12px", fontSize:"11px", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              Open job
            </button>
            {item.notifLink && (
              <button onClick={()=>onOpenNotice(item)} style={{ background:"transparent", border:"1px solid var(--cb-border)", color:"var(--cb-muted)", borderRadius:10, padding:"8px 12px", fontSize:"11px", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                Official notice
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ recruiterMode }) {
  const navigate  = useNavigate();
  const [viewportW, setViewportW] = useState(() => window.innerWidth);
  const [sec,    setSec]      = useState("dashboard");
  const [col,    setCol]      = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hist,   setHist]     = useState(["dashboard"]);
  const [msgTarget,setMsgTarget]= useState(null);
  const rawUser  = JSON.parse(localStorage.getItem("user") || '{"name":"User","role":"seeker"}');
  const [user,   setUser]     = useState(rawUser);
  const isRec    = recruiterMode || user.role === "recruiter";
  const isMobile = viewportW < 900;
  const [jobFilters, setJobFilters] = useState({ search:"", type:"All", category:"All", sort:"latest", spotlightId:null });
  const [notifications, setNotifications] = useState(() => readNotifications(rawUser));
  const [showNotifications, setShowNotifications] = useState(false);

  const goTo  = (key) => { setHist(p=>[...p,key]); setSec(key); if (isMobile) setMobileMenuOpen(false); };
  const goBack= () => { if(hist.length>1){ const p=hist[hist.length-2]; setHist(h=>h.slice(0,-1)); setSec(p); } else navigate("/"); };

  const handleMessageUser = (target) => {
    setMsgTarget(target);
    goTo("messages");
    pushAct({ type:"message", icon:"💬", label:`Messaged: ${target.name}` });
  };

  const onUserUpdate = (updated) => {
    setUser(updated);
    localStorage.setItem("user", JSON.stringify({ ...rawUser, ...updated }));
  };

  const openJobSearch = (search, extra = {}) => {
    setJobFilters({
      search: search || "",
      type: extra.type || "All",
      category: extra.category || "All",
      sort: extra.sort || "latest",
      spotlightId: extra.spotlightId || null,
    });
    goTo("jobs");
  };

  const handleResumeJobMatch = (jobTitle) => {
    const matchedJob = findClosestJob(jobTitle);
    openJobSearch(matchedJob?.title || jobTitle, {
      sort:"latest",
      spotlightId: matchedJob?.id || null,
      type: matchedJob?.type || "All",
      category: matchedJob?.category || "All",
    });
    pushAct({ type:"resume-match", icon:"💼", label:`Viewed best fit: ${matchedJob?.title || jobTitle}` });
  };

  const enableBrowserAlerts = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") await Notification.requestPermission();
  };

  const markNotificationsSeen = () => {
    const next = notifications.map((item) => ({ ...item, unread:false }));
    setNotifications(next);
    writeNotifications(user, next);
  };

  const openNotificationJob = (item) => {
    openJobSearch(item.search || item.jobTitle, { type:item.type || "All", category:item.category || "All", spotlightId:item.jobId || null });
    setShowNotifications(false);
    const next = notifications.map((note) => note.id === item.id ? { ...note, unread:false } : note);
    setNotifications(next);
    writeNotifications(user, next);
  };

  const openNotificationNotice = (item) => {
    if (item.notifLink) window.open(item.notifLink, "_blank", "noopener,noreferrer");
    const next = notifications.map((note) => note.id === item.id ? { ...note, unread:false } : note);
    setNotifications(next);
    writeNotifications(user, next);
  };

  useEffect(() => {
    setNotifications(readNotifications(user));
  }, [user]);

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const identity = currentUser.id || currentUser._id || currentUser.email;
    if (!token || !identity) return;

    const presenceSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    presenceSocket.on("connect", () => {
      presenceSocket.emit("user_online", identity);
    });

    window._cbPresenceSocket = presenceSocket;

    return () => {
      presenceSocket.disconnect();
      if (window._cbPresenceSocket === presenceSocket) window._cbPresenceSocket = null;
    };
  }, [user.id, user.email]);

  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (isRec) return;
    const today = new Date().toISOString().slice(0, 10);
    const existing = readNotifications(user);
    const { aiJob, govtJob } = pickDailyJobs(JOBS, today);
    const fresh = [
      {
        id:`${today}-ai`,
        date:today,
        kind:"ai",
        unread:true,
        title:"Recent featured job",
        body:`${aiJob.title} at ${aiJob.org}. Fresh released opening to check today.`,
        jobId:aiJob.id,
        jobTitle:aiJob.title,
        search:aiJob.title,
        type:aiJob.type,
        category:aiJob.category,
        notifLink:aiJob.notifLink,
        createdAt:new Date().toISOString(),
      },
      {
        id:`${today}-govt`,
        date:today,
        kind:"govt",
        unread:true,
        title:"Government notification issued",
        body:`${govtJob.title} is active. Open the related job and official notification today.`,
        jobId:govtJob.id,
        jobTitle:govtJob.title,
        search:govtJob.title,
        type:govtJob.type,
        category:govtJob.category,
        notifLink:govtJob.notifLink,
        createdAt:new Date().toISOString(),
      },
    ];

    const existingToday = existing.filter((item) => item.date === today);
    const next = [...fresh, ...existing.filter((item) => item.date !== today)].slice(0, 40);
    setNotifications(next);
    writeNotifications(user, next);

    const currentTitles = existingToday.map((item) => item.jobTitle).join("|");
    const nextTitles = fresh.map((item) => item.jobTitle).join("|");
    if (currentTitles !== nextTitles) {
      pushAct({ type:"notification", icon:"🔔", label:`New daily job alerts: ${aiJob.title} & ${govtJob.title}` });
    }

    if ("Notification" in window && Notification.permission === "granted") {
      if (currentTitles !== nextTitles) {
        fresh.forEach((item) => new Notification(item.title, { body:item.body }));
      }
    }
  }, [isRec, user]);

  const TITLES = {
    dashboard:"Dashboard", jobs:"Browse Jobs", chatbot:"AI Chatbot",
    resume:"Resume Analyzer", profiles:isRec?"Candidate Pool":"Network",
    exams:"Exam Resources", applications:"My Applications", saved:"Saved Jobs",
    profile:"My Profile", post:"Post a Job", analytics:"Analytics",
    listings:"My Listings", messages:"Messages",
  };
  const unreadNotifications = notifications.filter((item) => item.unread).length;

  const render = () => {
    switch(sec) {
      case "jobs":         return <Jobs onMessage={handleMessageUser} initialFilters={jobFilters}/>;
      case "chatbot":      return <Chatbot/>;
      case "resume":       return <ResumeAnalyzer onViewJobs={handleResumeJobMatch}/>;
      case "profiles":     return <TopProfiles recruiterMode={isRec} currentUser={user} onMessage={handleMessageUser}/>;
      case "messages":     return <Messages user={user} preSelectedTarget={msgTarget} onClearTarget={()=>setMsgTarget(null)}/>;
      case "exams":        return isRec ? <NoAccess title="Exam Resources" msg="Mock tests are only for Job Seekers."/> : <ExamPlaceholder/>;
      case "applications": return <Applications onNavigate={goTo}/>;
      case "saved":        return <SavedJobs onNavigate={goTo}/>;
      case "profile":      return <UserProfile user={user} isRec={isRec} onUpdate={onUserUpdate}/>;
      case "post":         return <PostJob/>;
      case "listings":     return <MyListings onNavigate={goTo}/>;
      case "analytics":    return <Analytics/>;
      default:             return <DashHome user={user} isRec={isRec} onNavigate={goTo} onMessage={handleMessageUser}/>;
      
    }
  };

  return (
    <div style={S.root}>
      <style>
        {`
          :root {
            --cb-bg: radial-gradient(circle at top left, rgba(var(--accent-rgb), 0.14), transparent 24%),
              radial-gradient(circle at top right, rgba(var(--accent-rgb), 0.06), transparent 20%),
              linear-gradient(180deg, var(--dark) 0%, var(--dark2) 100%);
            --cb-surface: var(--card-bg);
            --cb-card: var(--input-bg);
            --cb-border: var(--border);
            --cb-accent: var(--blue-light);
            --cb-accent2: var(--blue);
            --cb-gold: var(--accent);
            --cb-text: var(--text);
            --cb-muted: var(--text-dim);
            --cb-subtle: var(--text-muted);
            --cb-danger: #f87171;
            --cb-success: #4ade80;
            --cb-shadow: 0 24px 60px var(--shadow);
          }
        `}
      </style>
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(2,6,23,0.55)", zIndex:110 }}
        />
      )}
      <Sidebar
        active={sec}
        onNavigate={goTo}
        collapsed={isMobile ? false : col}
        onToggle={()=>isMobile ? setMobileMenuOpen(false) : setCol(!col)}
        recruiterMode={isRec}
        mobile={isMobile}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <main style={S.main}>
        <div style={{...S.topbar,padding:isMobile ? "12px 14px" : S.topbar.padding,flexWrap:isMobile ? "wrap" : "nowrap",gap:isMobile ? "12px" : 0}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",flex:1,minWidth:isMobile ? "100%" : "auto"}}>
            {isMobile && <button onClick={()=>setMobileMenuOpen(true)} style={S.backBtn}>☰ Menu</button>}
            <button onClick={goBack} style={S.backBtn}>← Back</button>
            <div>
              <div style={S.pageTitle}>{TITLES[sec]||"Dashboard"}</div>
              <div>
                {hist.slice(-3).map((h,i,arr)=>(
                  <span key={i} onClick={()=>{setSec(h);setHist(p=>p.slice(0,p.lastIndexOf(h)+1));}}
                    style={{color:i===arr.length-1?"var(--cb-gold)":"var(--cb-muted)",cursor:"pointer",fontSize:"11px"}}>
                    {i>0&&" › "}{TITLES[h]||h}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div
            style={{display:"flex",alignItems:"center",gap:"10px",position:"relative"}}
            onClickCapture={(e)=>{
              const title = e.target.closest?.("button")?.title;
              if (title === "Notifications") {
                const next = !showNotifications;
                setShowNotifications(next);
                if (next) markNotificationsSeen();
              }
            }}>
            <button onClick={()=>goTo("messages")} style={{...S.iconBtn,position:"relative"}} title="Messages">💬<span style={{...S.dot,background:"var(--cb-accent)"}}/></button>
            <button style={{...S.iconBtn,position:"relative"}} title="Notifications">🔔<span style={{...S.dot,background:"var(--cb-danger)"}}/></button>
            {showNotifications && (
              <NotificationPanel
                notifications={notifications}
                unreadCount={unreadNotifications}
                onClose={()=>setShowNotifications(false)}
                onOpenJob={openNotificationJob}
                onOpenNotice={openNotificationNotice}
                onEnableBrowserAlerts={enableBrowserAlerts}
                mobile={isMobile}
              />
            )}
            <button onClick={()=>goTo("profile")} style={S.profileBtn}>
              <div style={S.pAvatar}>{(user.name||"U")[0].toUpperCase()}</div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:"13px",fontWeight:700,color:"var(--cb-text)"}}>{user.name}</div>
                <div style={{fontSize:"11px",color:"var(--cb-muted)"}}>@{user.username||"user"} · {isRec?"Recruiter":"Seeker"}</div>
              </div>
            </button>
          </div>
        </div>
        <div style={{...S.content,padding:isMobile ? "14px 12px 18px" : S.content.padding}}>{render()}</div>
      </main>
    </div>
  );
}

/* ══════════════════ DASH HOME ══════════════════ */
function DashHome({ user, isRec, onNavigate, onMessage }) {
  const activity = getAct();
  const applied  = JSON.parse(localStorage.getItem(`cb_applied_${user.id||user.email}`)||"[]");
  const saved    = JSON.parse(localStorage.getItem(`cb_saved_${user.id||user.email}`)||"[]");

  const STATS = isRec
    ? [{icon:"📋",label:"My Listings",  value:"—",c:"var(--cb-accent)"},{icon:"👥",label:"Applicants",value:"—",c:"var(--cb-gold)"},{icon:"💬",label:"Messages",value:"—",c:"var(--cb-success)"},{icon:"📊",label:"Hire Rate",value:"—",c:"#a855f7"}]
    : [{icon:"💼",label:"Jobs Available",value:"50+",c:"var(--cb-accent)"},{icon:"📨",label:"Applied",value:applied.length,c:"var(--cb-gold)"},{icon:"⭐",label:"Saved",value:saved.length,c:"#a855f7"},{icon:"💬",label:"Messages",value:"0",c:"var(--cb-success)"}];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"18px"}}>
      <div style={D.welcome}>
        <div style={D.welcomeGlow}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontSize:"11px",fontWeight:700,letterSpacing:"3px",color:"var(--cb-gold)",marginBottom:"6px",textTransform:"uppercase"}}>
            {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </div>
          <h2 style={{fontSize:"clamp(18px,3vw,28px)",fontWeight:900,color:"var(--cb-text)",fontFamily:"'Playfair Display',serif",marginBottom:"6px"}}>
            Welcome back, {user.name?.split(" ")[0]}! 👋
          </h2>
          <p style={{fontSize:"14px",color:"var(--cb-muted)",lineHeight:1.6,maxWidth:"360px"}}>
            {isRec?"Manage listings, review candidates, connect with talent.":"Find your dream job with AI-powered guidance."}
          </p>
          {user.username && (
            <div style={{fontSize:"12px",color:"var(--cb-muted)",marginTop:"6px",fontFamily:"monospace"}}>
              🔗 careerbharat.in/profile/{user.username}
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:"10px",flexShrink:0,zIndex:1,flexWrap:"wrap"}}>
          <button onClick={()=>onNavigate(isRec?"listings":"jobs")} style={D.btnGold}>{isRec?"My Listings →":"Browse Jobs →"}</button>
          <button onClick={()=>onNavigate("profiles")} style={D.btnOut}>{isRec?"👥 Candidates":"🤝 Network"}</button>
          <button onClick={()=>onNavigate("messages")} style={D.btnOut}>💬 Messages</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"12px"}}>
        {STATS.map((st,i)=>(
          <div key={i} style={D.statCard}>
            <div style={{...D.statIcon,background:`${st.c}18`,color:st.c}}>{st.icon}</div>
            <div><div style={{fontSize:"26px",fontWeight:900,color:"var(--cb-text)",lineHeight:1}}>{st.value}</div><div style={{fontSize:"12px",color:"var(--cb-muted)",marginTop:"3px"}}>{st.label}</div></div>
          </div>
        ))}
      </div>

      <div style={D.card}>
        <div style={D.cardTitle}>⚡ Quick Actions</div>
        <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
          {(isRec
            ? [{icon:"📋",label:"Post Job",key:"post"},{icon:"👥",label:"Candidates",key:"profiles"},{icon:"📁",label:"Listings",key:"listings"},{icon:"💬",label:"Messages",key:"messages"},{icon:"📊",label:"Analytics",key:"analytics"}]
            : [{icon:"💼",label:"Jobs",key:"jobs"},{icon:"📄",label:"Resume AI",key:"resume"},{icon:"🤖",label:"AI Chat",key:"chatbot"},{icon:"📝",label:"Exams",key:"exams"},{icon:"🤝",label:"Network",key:"profiles"},{icon:"💬",label:"Messages",key:"messages"}]
          ).map(({icon,label,key})=>(
            <button key={key} onClick={()=>onNavigate(key)} style={D.qaBtn}>
              <span style={{fontSize:"22px"}}>{icon}</span><span style={{fontSize:"11px",fontWeight:600}}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <DashboardProfilesPreview user={user} isRec={isRec} onNavigate={onNavigate} onMessage={onMessage}/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"14px"}}>
        <div style={D.card}>
          <div style={D.cardTitle}>📋 Recent Activity</div>
          {activity.length===0
            ? <div style={{fontSize:"13px",color:"var(--cb-muted)",textAlign:"center",padding:"20px 0"}}>No activity yet — start exploring!</div>
            : activity.slice(0,6).map((a,i)=>(
              <div key={i} style={{display:"flex",gap:"10px",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--cb-border)"}}>
                <div style={{width:"30px",height:"30px",borderRadius:"8px",background:"rgba(37,99,235,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",flexShrink:0}}>{a.icon||"🔔"}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"12px",fontWeight:600,color:"var(--cb-text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.label}</div>
                  <div style={{fontSize:"10px",color:"var(--cb-muted)"}}>{timeAgo(a.time)}</div>
                </div>
              </div>
            ))}
        </div>
        <div style={D.card}>
          <div style={D.cardTitle}>{isRec?"📊 Platform":"⏰ Exam Calendar"}</div>
          {isRec
            ? [{icon:"🏆",text:"India's #1 AI Career Portal"},{icon:"👥",text:"Growing talent network"},{icon:"🤖",text:"Groq AI Powered"},{icon:"🔒",text:"Secure & Verified"}].map(({icon,text},i)=>(
                <div key={i} style={{display:"flex",gap:"10px",alignItems:"center",fontSize:"13px",color:"var(--cb-muted)",padding:"7px 0"}}><span>{icon}</span><span>{text}</span></div>
              ))
            : <>
                {[{n:"SSC CGL",d:"28 Apr",c:"#f87171",days:41},{n:"SBI PO",d:"15 Apr",c:"#d46f1c",days:28},{n:"UPSC",d:"25 May",c:"#4ade80",days:68},{n:"RRB NTPC",d:"01 May",c:"#60a5fa",days:44}].map((ex,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--cb-border)"}}>
                    <div><div style={{fontSize:"13px",fontWeight:700,color:"var(--cb-text)"}}>{ex.n}</div><div style={{fontSize:"10px",color:"var(--cb-muted)"}}>{ex.d}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:"18px",fontWeight:900,color:ex.c,lineHeight:1}}>{ex.days}</div><div style={{fontSize:"9px",color:"var(--cb-muted)"}}>days</div></div>
                  </div>
                ))}
                <button onClick={()=>onNavigate("exams")} style={{width:"100%",marginTop:"8px",background:"transparent",border:"1px solid rgba(18, 22, 31, 0.25)",color:"var(--cb-accent)",borderRadius:"8px",padding:"9px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>View Exam Resources →</button>
              </>}
        </div>
      </div>
    </div>
  );
}

function DashboardProfilesPreview({ user, isRec, onNavigate, onMessage }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const loadProfiles = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const endpoint = isRec
          ? "/api/auth/users/seekers?limit=4"
          : "/api/auth/users/recruiters?limit=4";

        const res = await fetch(`${API}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!ignore) {
          setProfiles(
            (data.users || [])
              .filter((member) => member.id !== user.id && member.email !== user.email)
              .slice(0, 4)
          );
        }
      } catch {
        if (!ignore) setProfiles([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadProfiles();
    return () => { ignore = true; };
  }, [isRec, user.id, user.email]);

  const title = isRec ? "Top Candidates" : "Top Recruiters";
  const subTitle = isRec
    ? "Best-ranked member profiles from MongoDB, ready to message."
    : "Verified recruiters from recent signups and active accounts.";

  return (
    <div style={D.card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px", marginBottom:"14px", flexWrap:"wrap" }}>
        <div>
          <div style={D.cardTitle}>{isRec ? "🏆 Top Candidates" : "🤝 Top Recruiters"}</div>
          <div style={{ fontSize:"12px", color:"var(--cb-muted)" }}>{subTitle}</div>
        </div>
        <button onClick={() => onNavigate("profiles")} style={D.btnOutline}>
          View all
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize:"13px", color:"var(--cb-muted)", textAlign:"center", padding:"18px 0" }}>
          Loading {title.toLowerCase()}...
        </div>
      ) : profiles.length === 0 ? (
        <div style={{ fontSize:"13px", color:"var(--cb-muted)", textAlign:"center", padding:"18px 0" }}>
          No members found yet. New signups will appear here automatically.
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"12px" }}>
          {profiles.map((profile, index) => {
            const accent = ["var(--cb-accent)","var(--cb-gold)","#22c55e","#a855f7"][index % 4];
            const skills = (profile.skills || []).slice(0, 3);
            const subtitle = isRec
              ? `${profile.education || "Graduate"} · ${profile.experience || "Fresher"}`
              : `${profile.organisation || "Organisation"}${profile.designation ? ` · ${profile.designation}` : ""}`;

            return (
              <div key={profile.id || profile.email} style={{ background:"var(--cb-card)", border:"1px solid var(--cb-border)", borderRadius:"14px", padding:"14px" }}>
                <div style={{ display:"flex", gap:"10px", alignItems:"flex-start", marginBottom:"10px" }}>
                  <div style={{ width:"42px", height:"42px", borderRadius:"12px", background:`linear-gradient(135deg,${accent},rgba(15,23,42,0.92))`, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:"16px", flexShrink:0 }}>
                    {(profile.name || "U")[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ fontSize:"14px", fontWeight:800, color:"var(--cb-text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {profile.name}
                    </div>
                    <div style={{ fontSize:"11px", color:"var(--cb-muted)", marginTop:"2px" }}>{subtitle}</div>
                    <div style={{ fontSize:"10px", color:"var(--cb-subtle)", marginTop:"4px" }}>
                      {profile.location ? `📍 ${profile.location}` : `Joined ${timeAgo(profile.createdAt)}`}
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", gap:"8px", marginBottom:"10px" }}>
                  <div style={{ flex:1, background:"rgba(37,99,235,0.06)", borderRadius:"10px", padding:"8px 10px" }}>
                    <div style={{ fontSize:"16px", fontWeight:900, color:"var(--cb-accent)" }}>{profile.score || 0}</div>
                    <div style={{ fontSize:"10px", color:"var(--cb-muted)" }}>Profile score</div>
                  </div>
                  <div style={{ flex:1, background:"rgba(217,119,6,0.06)", borderRadius:"10px", padding:"8px 10px" }}>
                    <div style={{ fontSize:"16px", fontWeight:900, color:"var(--cb-gold)" }}>{profile.connections || 0}</div>
                    <div style={{ fontSize:"10px", color:"var(--cb-muted)" }}>Connections</div>
                  </div>
                </div>

                {skills.length > 0 && (
                  <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"12px" }}>
                    {skills.map((skill) => (
                      <span key={skill} style={{ fontSize:"10px", fontWeight:700, padding:"4px 8px", borderRadius:"999px", background:"rgba(37,99,235,0.08)", color:"var(--cb-accent)", border:"1px solid rgba(37,99,235,0.12)" }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display:"flex", gap:"8px" }}>
                  <button
                    onClick={() => onMessage && onMessage({
                      id: profile.id,
                      name: profile.name,
                      username: profile.username,
                      role: profile.role,
                      org: profile.organisation || "",
                    })}
                    style={{ ...D.btnBlue, flex:1, padding:"9px 12px", fontSize:"12px" }}
                  >
                    Message
                  </button>
                  <button onClick={() => onNavigate("profiles")} style={{ ...D.btnOutline, padding:"9px 12px", fontSize:"12px" }}>
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════ USER PROFILE ══════════════════ */
function UserProfile({ user, isRec, onUpdate }) {
  const [tab,   setTab]   = useState("info");
  const [form,  setForm]  = useState({
    name:        user.name||"",
    email:       user.email||"",
    username:    user.username||"",
    phone:       user.phone||"",
    location:    user.location||"",
    bio:         user.bio||"",
    education:   user.education||"graduate",
    experience:  user.experience||"fresher",
    skills:      (user.skills||[]).join(", "),
    linkedin:    user.linkedin||"",
    github:      user.github||"",
    website:     user.website||"",
    org:         user.organisation||"",
    industry:    user.industry||"",
    orgSize:     user.orgSize||"",
    designation: user.designation||"",
  });
  const [resume, setResume] = useState(null);
  const [saved,  setSaved]  = useState(false);
  const [saving, setSaving] = useState(false);

  const pct = (() => {
    const fields = isRec
      ? ["name","email","org","industry","designation","phone"]
      : ["name","email","phone","location","education","skills","bio","username"];
    return Math.round(fields.filter(f=>form[f]?.toString().trim()).length/fields.length*100);
  })();

  const save = async () => {
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const payload = {
        ...form,
        organisation: form.org,
        skills: form.skills.split(",").map(s=>s.trim()).filter(Boolean),
      };
      const res  = await fetch(`${API}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.user && onUpdate) onUpdate(data.user);
      pushAct({ type:"profile", icon:"👤", label:"Updated profile" });
      setSaved(true); setTimeout(()=>setSaved(false),2500);
    } catch {}
    setSaving(false);
  };

  const SEEKER_TABS = [["info","👤 Personal"],["career","🎯 Career"],["resume","📄 Resume"],["links","🔗 Links"]];
  const REC_TABS    = [["info","🏢 Company"],["contact","📞 Contact"],["settings","⚙️ Settings"]];

  const profileUrl = `careerbharat.in/profile/${form.username || user.username || "yourname"}`;

  return (
    <div style={{maxWidth:"660px"}}>
      <div style={{marginBottom:"22px"}}><div style={D.overline}>Account</div><h2 style={D.title}>My Profile</h2></div>

      {/* Profile card */}
      <div style={{background:"linear-gradient(135deg,rgba(48, 54, 65, 0.08),rgba(121, 86, 47, 0.04))",border:"1px solid rgba(217,119,6,0.15)",borderRadius:"18px",padding:"22px",marginBottom:"22px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"16px",marginBottom:"16px"}}>
          <div style={{width:"66px",height:"66px",borderRadius:"16px",background:"linear-gradient(135deg,var(--cb-accent),var(--cb-gold))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",fontWeight:900,color:"#e5dfdf",flexShrink:0}}>
            {(user.name||"U")[0].toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:"20px",fontWeight:800,color:"var(--cb-text)"}}>{user.name}</div>
            <div style={{fontSize:"12px",color:"var(--cb-muted)",fontFamily:"monospace"}}>@{user.username||"username"}</div>
            <div style={{fontSize:"12px",color:"var(--cb-gold)",marginTop:"3px"}}>{isRec?"🏢 Recruiter":"🎓 Job Seeker"}</div>
          </div>
        </div>
        <div style={{fontSize:"12px",color:"var(--cb-muted)",marginBottom:"6px",display:"flex",justifyContent:"space-between"}}>
          <span>Profile Completeness</span>
          <span style={{color:pct>=80?"var(--cb-success)":pct>=50?"var(--cb-gold)":"var(--cb-danger)",fontWeight:700}}>{pct}%</span>
        </div>
        <div style={{height:"6px",background:"rgba(16, 16, 16, 0.05)",borderRadius:"3px",overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${pct>=80?"var(--cb-success)":pct>=50?"var(--cb-gold)":"var(--cb-danger)"})`,borderRadius:"3px",transition:"width 0.6s ease"}}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"rgba(0,0,0,0.02)",borderRadius:"12px",padding:"4px",marginBottom:"20px",gap:"4px"}}>
        {(isRec?REC_TABS:SEEKER_TABS).map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"9px",borderRadius:"9px",background:tab===k?"var(--cb-card)":"transparent",border:"none",color:tab===k?"var(--cb-accent)":"var(--cb-muted)",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"}}>{l}</button>
        ))}
      </div>

      {/* ── SEEKER: Personal ── */}
      {!isRec && tab==="info" && (
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <FI label="Full Name"          val={form.name}     set={v=>setForm({...form,name:v})}     type="text"/>
          <FI label="Email Address"      val={form.email}    set={v=>setForm({...form,email:v})}    type="email"/>
            
          {/* ✅ Username field */}
          <div>
            <label style={D.label}>Username</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:"14px",top:"50%",transform:"translateY(-50%)",color:"var(--cb-muted)",fontSize:"14px"}}>@</span>
              <input type="text" value={form.username} onChange={e=>setForm({...form,username:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"")})}
                placeholder="yourname123"
                style={{...D.input,paddingLeft:"30px"}}/>
            </div>
            <div style={{fontSize:"11px",color:"var(--cb-muted)",marginTop:"4px"}}>Only letters, numbers and underscores</div>
          </div>
          <FI label="Phone Number"       val={form.phone}    set={v=>setForm({...form,phone:v})}    type="tel"/>
          <FI label="Location (City)"    val={form.location} set={v=>setForm({...form,location:v})} type="text"/>
          {/* Bio */}
          <div>
            <label style={D.label}>Bio / About Me</label>
            <textarea value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} rows={3}
              placeholder="Tell recruiters about yourself, your goals and strengths..."
              style={{...D.input,resize:"vertical",lineHeight:1.6}}/>
          </div>
          {/* ✅ Profile link shown after bio */}
          <div style={{background:"rgba(217,119,6,0.06)",border:"1px solid rgba(217,119,6,0.15)",borderRadius:"12px",padding:"14px"}}>
            <div style={{fontSize:"11px",fontWeight:700,color:"var(--cb-gold)",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"1px"}}>🔗 Your Profile Link</div>
            <div style={{fontSize:"13px",color:"var(--cb-text)",fontFamily:"monospace",marginBottom:"8px"}}>{profileUrl}</div>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={()=>navigator.clipboard?.writeText(`https://${profileUrl}`)}
                style={{background:"rgba(34, 80, 180, 0.1)",border:"1px solid rgba(37,99,235,0.2)",color:"var(--cb-accent)",borderRadius:"7px",padding:"6px 14px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                📋 Copy Link
              </button>
              <a href={`https://${profileUrl}`} target="_blank" rel="noreferrer"
                style={{background:"transparent",border:"1px solid var(--cb-border)",color:"var(--cb-muted)",borderRadius:"7px",padding:"6px 14px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textDecoration:"none",display:"inline-block"}}>
                🌐 View Profile
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── SEEKER: Career ── */}
      {!isRec && tab==="career" && (
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <div>
            <label style={D.label}>Education Level</label>
            <select value={form.education} onChange={e=>setForm({...form,education:e.target.value})} style={D.select}>
              {["10th","12th","Diploma","Graduate","Postgraduate"].map(e=><option key={e} value={e.toLowerCase()} style={{background:"var(--cb-surface)"}}>{e}</option>)}
            </select>
          </div>
          <div>
            <label style={D.label}>Experience Level</label>
            <select value={form.experience} onChange={e=>setForm({...form,experience:e.target.value})} style={D.select}>
              {["Fresher","1-2 years","3-5 years","5+ years"].map(e=><option key={e} value={e.toLowerCase()} style={{background:"var(--cb-surface)"}}>{e}</option>)}
            </select>
          </div>
          <div>
            <label style={D.label}>Skills <span style={{color:"var(--cb-muted)",fontSize:"11px"}}>(comma separated)</span></label>
            <input value={form.skills} onChange={e=>setForm({...form,skills:e.target.value})} placeholder="Python, SQL, Communication, MS Office..." style={D.input}/>
            {form.skills && (
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"8px"}}>
                {form.skills.split(",").map(sk=>sk.trim()).filter(Boolean).map(sk=>(
                  <span key={sk} style={{fontSize:"12px",padding:"4px 10px",borderRadius:"50px",background:"rgba(37,99,235,0.08)",color:"var(--cb-accent)",border:"1px solid rgba(44, 61, 98, 0.2)"}}>{sk}</span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={D.label}>Job Type Preferences</label>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              {["Government","Private","Internship","Remote"].map(p=>(
                <label key={p} style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"13px",color:"var(--cb-muted)",cursor:"pointer",background:"rgba(0,0,0,0.02)",border:"1px solid var(--cb-border)",borderRadius:"8px",padding:"8px 12px"}}>
                  <input type="checkbox" style={{accentColor:"var(--cb-accent)"}}/>{p}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SEEKER: Resume ── */}
      {!isRec && tab==="resume" && (
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <div style={{border:`2px dashed ${resume?"rgba(22,163,74,0.3)":"var(--cb-border)"}`,borderRadius:"14px",padding:"36px 20px",textAlign:"center",cursor:"pointer",background:resume?"rgba(22,163,74,0.03)":"transparent"}}
            onClick={()=>document.getElementById("cv_upload").click()}>
            <input id="cv_upload" type="file" accept=".pdf,.doc,.docx" style={{display:"none"}} onChange={e=>setResume(e.target.files[0])}/>
            {resume ? (
              <><div style={{fontSize:"36px",marginBottom:"8px"}}>✅</div><div style={{fontSize:"15px",fontWeight:700,color:"var(--cb-success)",marginBottom:"4px"}}>{resume.name}</div><div style={{fontSize:"12px",color:"var(--cb-muted)"}}>{(resume.size/1024).toFixed(1)} KB · Click to change</div></>
            ) : (
              <><div style={{fontSize:"44px",marginBottom:"12px"}}>📄</div><div style={{fontSize:"16px",fontWeight:700,color:"var(--cb-text)",marginBottom:"6px"}}>Upload Your Resume</div><div style={{fontSize:"13px",color:"var(--cb-muted)"}}>PDF, DOC, DOCX · Max 5MB</div></>
            )}
          </div>
          {resume && (
            <div style={{display:"flex",gap:"10px"}}>
              <button style={D.btnBlue}>🔍 Analyze with AI</button>
              <button style={D.btnOutline}>📥 Download</button>
            </div>
          )}
          <div style={{background:"rgba(217,119,6,0.05)",border:"1px solid rgba(217,119,6,0.12)",borderRadius:"12px",padding:"14px"}}>
            <div style={{fontSize:"12px",fontWeight:700,color:"var(--cb-gold)",marginBottom:"8px"}}>💡 Resume Tips</div>
            {["Keep it to 1-2 pages maximum","Use action verbs: Led, Built, Achieved","Quantify results: Increased sales by 30%","Include keywords from job descriptions"].map((t,i)=>(
              <div key={i} style={{fontSize:"12px",color:"var(--cb-muted)",padding:"4px 0"}}>• {t}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── SEEKER: Links ── */}
      {!isRec && tab==="links" && (
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <FI label="LinkedIn Profile" val={form.linkedin} set={v=>setForm({...form,linkedin:v})} placeholder="https://linkedin.com/in/yourname"/>
          <FI label="GitHub / Portfolio" val={form.github} set={v=>setForm({...form,github:v})} placeholder="https://github.com/yourusername"/>
          <FI label="Personal Website" val={form.website} set={v=>setForm({...form,website:v})} placeholder="https://yourportfolio.com"/>
        </div>
      )}

      {/* ── RECRUITER: Company ── */}
      {isRec && tab==="info" && (
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          {/* ✅ Username for recruiter too */}
          <div>
            <label style={D.label}>Username</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:"14px",top:"50%",transform:"translateY(-50%)",color:"var(--cb-muted)",fontSize:"14px"}}>@</span>
              <input type="text" value={form.username} onChange={e=>setForm({...form,username:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"")})}
                placeholder="companyname123" style={{...D.input,paddingLeft:"30px"}}/>
            </div>
          </div>
          <FI label="Company / Organisation Name" val={form.org}         set={v=>setForm({...form,org:v})}/>
          <FI label="Industry"                     val={form.industry}   set={v=>setForm({...form,industry:v})}/>
          <FI label="Company Size"                 val={form.orgSize}    set={v=>setForm({...form,orgSize:v})} placeholder="e.g. 50-200 employees"/>
          <FI label="Website"                      val={form.website}    set={v=>setForm({...form,website:v})} placeholder="https://yourcompany.com"/>
          <div>
            <label style={D.label}>Company Description</label>
            <textarea value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} rows={3} placeholder="Describe your company..." style={{...D.input,resize:"vertical"}}/>
          </div>
          {/* ✅ Profile link for recruiter */}
          <div style={{background:"rgba(217,119,6,0.06)",border:"1px solid rgba(217,119,6,0.15)",borderRadius:"12px",padding:"14px"}}>
            <div style={{fontSize:"11px",fontWeight:700,color:"var(--cb-gold)",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"1px"}}>🔗 Your Profile Link</div>
            <div style={{fontSize:"13px",color:"var(--cb-text)",fontFamily:"monospace",marginBottom:"8px"}}>{profileUrl}</div>
            <button onClick={()=>navigator.clipboard?.writeText(`https://${profileUrl}`)}
              style={{background:"rgba(37,99,235,0.1)",border:"1px solid rgba(37,99,235,0.2)",color:"var(--cb-accent)",borderRadius:"7px",padding:"6px 14px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
              📋 Copy Link
            </button>
          </div>
        </div>
      )}

      {isRec && tab==="contact" && (
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <FI label="Your Full Name"   val={form.name}        set={v=>setForm({...form,name:v})}/>
          <FI label="Designation"      val={form.designation} set={v=>setForm({...form,designation:v})} placeholder="e.g. HR Manager"/>
          <FI label="Work Email"       val={form.email}       set={v=>setForm({...form,email:v})}       type="email"/>
          <FI label="Contact Number"   val={form.phone}       set={v=>setForm({...form,phone:v})}       type="tel"/>
        </div>
      )}

      {isRec && tab==="settings" && (
        <div style={{background:"var(--cb-card)",border:"1px solid var(--cb-border)",borderRadius:"12px",padding:"18px"}}>
          <div style={{fontSize:"13px",fontWeight:700,color:"var(--cb-text)",marginBottom:"14px"}}>🔔 Email Notifications</div>
          {["Notify when someone applies","Daily AI shortlist suggestions","New candidate matches"].map((p,i)=>(
            <label key={i} style={{display:"flex",alignItems:"center",gap:"10px",fontSize:"13px",color:"var(--cb-muted)",cursor:"pointer",padding:"10px 0",borderBottom:"1px solid var(--cb-border)"}}>
              <input type="checkbox" defaultChecked style={{accentColor:"var(--cb-accent)"}}/>{p}
            </label>
          ))}
        </div>
      )}

      <button onClick={save} disabled={saving} style={{...D.btnBlue,width:"100%",padding:"14px",fontSize:"15px",marginTop:"20px",opacity:saving?0.7:1}}>
        {saving?"⏳ Saving...":saved?"✅ Saved!":"💾 Save Profile"}
      </button>
    </div>
  );
}

/* ══════ OTHER SECTIONS (clean, no dummy data) ══════ */
function MyListings({ onNavigate }) {
  const [listings,setListings]=useState(()=>JSON.parse(localStorage.getItem("cb_my_listings")||"[]"));
  const [filter,setFilter]=useState("All");
  const del=(id)=>{ if(!window.confirm("Delete?")) return; const u=listings.filter(l=>l.id!==id); setListings(u); localStorage.setItem("cb_my_listings",JSON.stringify(u)); };
  const toggle=(id)=>{ const u=listings.map(l=>l.id===id?{...l,status:l.status==="Active"?"Paused":"Active"}:l); setListings(u); localStorage.setItem("cb_my_listings",JSON.stringify(u)); };
  const filtered=filter==="All"?listings:listings.filter(l=>l.status===filter);
  const ST={Active:{bg:"rgba(22,163,74,0.08)",c:"var(--cb-success)",b:"rgba(22,163,74,0.2)"},Paused:{bg:"rgba(217,119,6,0.08)",c:"var(--cb-gold)",b:"rgba(217,119,6,0.2)"}};
  return (
    <div>
      <div style={{marginBottom:"20px"}}><div style={D.overline}>Recruiter</div><h2 style={D.title}>My Job Listings</h2></div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"10px"}}>
        <div style={{display:"flex",gap:"6px"}}>
          {["All","Active","Paused"].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 14px",borderRadius:"8px",border:`1px solid ${filter===f?"rgba(37,99,235,0.3)":"var(--cb-border)"}`,background:filter===f?"rgba(37,99,235,0.08)":"transparent",color:filter===f?"var(--cb-accent)":"var(--cb-muted)",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{f}</button>)}
        </div>
        <button onClick={()=>onNavigate("post")} style={D.btnBlue}>+ Post New Job</button>
      </div>
      {filtered.length===0
        ? <div style={{textAlign:"center",padding:"60px",background:"var(--cb-card)",border:"1px solid var(--cb-border)",borderRadius:"16px"}}><div style={{fontSize:"44px",marginBottom:"14px"}}>📭</div><div style={{fontSize:"17px",fontWeight:700,color:"var(--cb-text)",marginBottom:"8px"}}>No listings yet</div><button onClick={()=>onNavigate("post")} style={D.btnBlue}>+ Post a Job</button></div>
        : <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>{filtered.map(job=>{const st=ST[job.status]||ST.Active;return(<div key={job.id} style={{background:"var(--cb-surface)",border:"1px solid var(--cb-border)",borderRadius:"16px",padding:"20px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px"}}><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px",flexWrap:"wrap"}}><h3 style={{fontSize:"16px",fontWeight:700,color:"var(--cb-text)",margin:0}}>{job.title}</h3><span style={{fontSize:"11px",fontWeight:700,padding:"3px 10px",borderRadius:"50px",background:st.bg,color:st.c,border:`1px solid ${st.b}`}}>{job.status}</span></div><div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"8px"}}>{[`📍 ${job.location||"N/A"}`,`💰 ${job.salary||"N/A"}`,`👥 ${job.vacancies||0} seats`,`⏰ ${job.deadline||"N/A"}`].map(c=><span key={c} style={{fontSize:"11px",color:"var(--cb-muted)",background:"rgba(0,0,0,0.02)",padding:"3px 8px",borderRadius:"5px"}}>{c}</span>)}</div></div><div style={{textAlign:"center",background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.1)",borderRadius:"12px",padding:"12px 16px",flexShrink:0}}><div style={{fontSize:"26px",fontWeight:900,color:"var(--cb-accent)",lineHeight:1}}>{job.applicants||0}</div><div style={{fontSize:"10px",color:"var(--cb-muted)",marginTop:"2px"}}>Applicants</div></div></div><div style={{display:"flex",gap:"8px",marginTop:"12px",flexWrap:"wrap"}}><button onClick={()=>toggle(job.id)} style={{...D.btnOutline,color:job.status==="Active"?"var(--cb-gold)":"var(--cb-success)"}}>{job.status==="Active"?"⏸ Pause":"▶ Activate"}</button><button onClick={()=>del(job.id)} style={{...D.btnOutline,color:"var(--cb-danger)"}}>🗑 Delete</button></div></div>);})}</div>}
    </div>
  );
}

function PostJob() {
  const [form,setForm]=useState({title:"",org:"",type:"Private",location:"",salary:"",deadline:"",vacancies:"",description:"",skills:"",requirements:""});
  const [posted,setPosted]=useState(false);
  const [loading,setLoading]=useState(false);
  const post=async()=>{
    if(!form.title.trim()) return alert("Title required.");
    setLoading(true);
    try {
      const token=localStorage.getItem("token");
      await fetch(`${API}/api/jobs`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},body:JSON.stringify({...form,skills:form.skills.split(",").map(s=>s.trim()).filter(Boolean)})});
      const prev=JSON.parse(localStorage.getItem("cb_my_listings")||"[]");
      prev.unshift({id:Date.now(),...form,skills:form.skills.split(",").map(s=>s.trim()).filter(Boolean),status:"Active",applicants:0,posted:new Date().toLocaleDateString("en-IN")});
      localStorage.setItem("cb_my_listings",JSON.stringify(prev));
      pushAct({type:"posted",icon:"📋",label:`Posted: ${form.title}`});
      setPosted(true); setForm({title:"",org:"",type:"Private",location:"",salary:"",deadline:"",vacancies:"",description:"",skills:"",requirements:""});
      setTimeout(()=>setPosted(false),3000);
    } catch { alert("Error posting job."); }
    setLoading(false);
  };
  return (
    <div style={{maxWidth:"620px"}}>
      <div style={{marginBottom:"22px"}}><div style={D.overline}>Recruiter</div><h2 style={D.title}>Post a Job</h2></div>
      {posted&&<div style={{background:"rgba(22,163,74,0.08)",border:"1px solid rgba(22,163,74,0.2)",color:"var(--cb-success)",padding:"13px 16px",borderRadius:"10px",marginBottom:"16px",fontSize:"14px",fontWeight:600}}>✅ Job posted! View in My Listings.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
        {[["Job Title *","title"],["Organisation *","org"],["Location","location"],["Salary Range","salary"],["Deadline","deadline"],["Vacancies","vacancies"]].map(([l,k])=>(<div key={k}><label style={D.label}>{l}</label><input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={D.input}/></div>))}
        <div><label style={D.label}>Job Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={D.select}>{["Government","Private","Internship"].map(t=><option key={t} style={{background:"var(--cb-surface)"}}>{t}</option>)}</select></div>
        <div><label style={D.label}>Skills (comma separated)</label><input value={form.skills} onChange={e=>setForm({...form,skills:e.target.value})} placeholder="Python, Communication..." style={D.input}/></div>
        <div><label style={D.label}>Requirements</label><textarea value={form.requirements} onChange={e=>setForm({...form,requirements:e.target.value})} rows={3} style={{...D.input,resize:"vertical"}}/></div>
        <div><label style={D.label}>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={5} style={{...D.input,resize:"vertical"}}/></div>
        <button onClick={post} disabled={loading} style={{...D.btnBlue,padding:"14px",fontSize:"15px",opacity:loading?0.7:1}}>{loading?"⏳ Posting...":"📋 Post Job"}</button>
      </div>
    </div>
  );
}

function Applications({ onNavigate }) {
  const activity=getAct().filter(a=>a.type==="applied");
  const SC={"Applied":"var(--cb-accent)","Under Review":"var(--cb-gold)","Shortlisted":"var(--cb-success)","Rejected":"var(--cb-danger)"};
  const ST=["Applied","Under Review","Shortlisted","Rejected"];
  return (
    <div>
      <div style={{marginBottom:"20px"}}><div style={D.overline}>Track Journey</div><h2 style={D.title}>My Applications</h2></div>
      {activity.length===0
        ? <div style={{textAlign:"center",padding:"60px",background:"var(--cb-card)",border:"1px solid var(--cb-border)",borderRadius:"16px"}}><div style={{fontSize:"48px",marginBottom:"14px"}}>📨</div><div style={{fontSize:"17px",fontWeight:700,color:"var(--cb-text)",marginBottom:"8px"}}>No applications yet</div><button onClick={()=>onNavigate("jobs")} style={D.btnBlue}>Browse Jobs →</button></div>
        : <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>{activity.map((a,i)=>{const st=ST[i%4];return(<div key={i} style={{display:"flex",alignItems:"center",gap:"14px",background:"var(--cb-surface)",border:"1px solid var(--cb-border)",borderRadius:"14px",padding:"16px 20px"}}><div style={{width:"10px",height:"10px",borderRadius:"50%",background:SC[st],flexShrink:0,boxShadow:`0 0 8px ${SC[st]}`}}/><div style={{flex:1}}><div style={{fontSize:"14px",fontWeight:700,color:"var(--cb-text)"}}>{a.label?.replace("Applied: ","")}</div><div style={{fontSize:"11px",color:"var(--cb-muted)"}}>{timeAgo(a.time)}</div></div><span style={{fontSize:"12px",fontWeight:700,color:SC[st],background:`${SC[st]}18`,padding:"5px 14px",borderRadius:"50px",border:`1px solid ${SC[st]}44`}}>{st}</span></div>);})}</div>}
    </div>
  );
}

function SavedJobs({ onNavigate }) {
  const u=JSON.parse(localStorage.getItem("user")||"{}");
  const saved=JSON.parse(localStorage.getItem(`cb_saved_${u.id||u.email}`)||"[]");
  return (
    <div>
      <div style={{marginBottom:"20px"}}><div style={D.overline}>Wishlist</div><h2 style={D.title}>Saved Jobs ({saved.length})</h2></div>
      {saved.length===0
        ? <div style={{textAlign:"center",padding:"60px",background:"var(--cb-card)",border:"1px solid var(--cb-border)",borderRadius:"16px"}}><div style={{fontSize:"48px",marginBottom:"14px"}}>⭐</div><div style={{fontSize:"17px",fontWeight:700,color:"var(--cb-text)",marginBottom:"8px"}}>No saved jobs yet</div><button onClick={()=>onNavigate("jobs")} style={D.btnBlue}>Browse Jobs →</button></div>
        : <div style={{fontSize:"14px",color:"var(--cb-muted)"}}>You have {saved.length} saved job(s). <button onClick={()=>onNavigate("jobs")} style={{color:"var(--cb-accent)",background:"none",border:"none",cursor:"pointer",fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>Browse More →</button></div>}
    </div>
  );
}

function Analytics() {
  const tests=JSON.parse(localStorage.getItem("testResults")||"[]");
  const avg=tests.length?Math.round(tests.reduce((a,r)=>a+r.score,0)/tests.length):0;
  return (
    <div>
      <div style={{marginBottom:"20px"}}><div style={D.overline}>Insights</div><h2 style={D.title}>Analytics</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"14px"}}>
        {[["📝","Tests Taken",tests.length,"var(--cb-accent)"],["📊","Avg Score",`${avg}%`,"var(--cb-gold)"],["✅","Passed",tests.filter(r=>r.pass).length,"var(--cb-success)"],["📋","Listings","—","#a855f7"]].map(([ic,lb,vl,co],i)=>(
          <div key={i} style={{background:"var(--cb-surface)",border:"1px solid var(--cb-border)",borderRadius:"16px",padding:"20px"}}><div style={{fontSize:"24px",marginBottom:"8px"}}>{ic}</div><div style={{fontSize:"28px",fontWeight:900,color:co}}>{vl}</div><div style={{fontSize:"12px",color:"var(--cb-muted)",marginTop:"4px"}}>{lb}</div></div>
        ))}
      </div>
    </div>
  );
}

function ExamPlaceholder() {
  const [activeTab,    setActiveTab]    = React.useState("all");
  const [activeMock,   setActiveMock]   = React.useState(null);
  const [mockScore,    setMockScore]    = React.useState(null);
  const [currentQ,     setCurrentQ]     = React.useState(0);
  const [answers,      setAnswers]      = React.useState({});
  const [mockStarted,  setMockStarted]  = React.useState(false);
  const [activeSection,setActiveSection]= React.useState("mocks"); // mocks | books
  const [searchQ,      setSearchQ]      = React.useState("");
  const [timeLeft,     setTimeLeft]     = React.useState(null);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (mockStarted && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && mockStarted) {
      submitMock();
    }
    return () => clearTimeout(timerRef.current);
  }, [mockStarted, timeLeft]);

  const EXAMS = [
    { key:"ssc",       label:"SSC",          icon:"🏛️", color:"rgba(105, 188, 23, 0.8)" },
    { key:"upsc",      label:"UPSC",          icon:"🎖️", color:"#8b5cf6" },
    { key:"banking",   label:"Banking",       icon:"🏦", color:"#10b981" },
    { key:"railway",   label:"Railway",       icon:"🚂", color:"#f59e0b" },
    { key:"aptitude",  label:"Aptitude",      icon:"🧮", color:"#ef4444" },
    { key:"reasoning", label:"Reasoning",     icon:"🧠", color:"#ec4899" },
    { key:"english",   label:"English",       icon:"📝", color:"#06b6d4" },
    { key:"it",        label:"IT & Coding",   icon:"💻", color:"var(--cb-gold)" },
    { key:"state",     label:"State PSC",     icon:"🗺️", color:"#6366f1" },
    { key:"defence",   label:"Defence",       icon:"⚔️", color:"#dc2626" },
    { key:"teaching",  label:"Teaching",      icon:"🎓", color:"#7c3aed" },
    { key:"insurance", label:"Insurance",     icon:"🛡️", color:"#0891b2" },
    { key:"gk",        label:"General GK",    icon:"🌍", color:"#16a34a" },
    { key:"maths",     label:"Mathematics",   icon:"➗", color:"#ca8a04" },
    { key:"science",   label:"Science",       icon:"🔬", color:"#0d9488" },
    { key:"computer",  label:"Computer",      icon:"🖥️", color:"#7e22ce" },
    { key:"history",   label:"History",       icon:"📜", color:"#92400e" },
    { key:"geography", label:"Geography",     icon:"🌐", color:"#065f46" },
    { }
  ];

  const MOCKS = [
    {
      id:"ssc_cgl", exam:"SSC CGL 2024", examKey:"ssc", icon:"🏛️", color:"#0ef626",
      duration:1800, questions:25, difficulty:"Medium", attempts:"2.1L+",
      syllabus:"Quant, English, GK, Reasoning",
      qs:[
        { q:"If 15% of x = 30, then x = ?", opts:["150","180","200","220"], ans:2 },
        { q:"A train runs at 54 km/h. Distance covered in 20 minutes:", opts:["16 km","18 km","20 km","22 km"], ans:1 },
        { q:"Choose correct spelling:", opts:["Accomodate","Accommodate","Acommodate","Acomodate"], ans:1 },
        { q:"India's first satellite launched was:", opts:["Bhaskar","Rohini","Aryabhata","INSAT-1A"], ans:2 },
        { q:"√0.0081 = ?", opts:["0.09","0.9","0.009","0.81"], ans:0 },
        { q:"Synonym of CANDID:", opts:["Hidden","Frank","Shy","Rude"], ans:1 },
        { q:"LCM of 12, 15 and 20 is:", opts:["40","60","80","120"], ans:1 },
        { q:"'The Wonder that was India' was written by:", opts:["A.L. Basham","Romila Thapar","R.C. Majumdar","K.M. Munshi"], ans:0 },
        { q:"If FRIEND is coded HUMJTK, how is CANDLE coded?", opts:["EDRIRL","DCQHQK","EDRJQM","ECDPNN"], ans:0 },
        { q:"Antonym of VERBOSE:", opts:["Lengthy","Concise","Talkative","Elaborate"], ans:1 },
        { q:"A shopkeeper sells at 20% profit. If CP is ₹400, SP =?", opts:["₹440","₹460","₹480","₹500"], ans:2 },
        { q:"Which river is called 'Sorrow of Bihar'?", opts:["Ganga","Kosi","Son","Gandak"], ans:1 },
        { q:"Fill blank: She __ to school every day.", opts:["go","goes","going","gone"], ans:1 },
        { q:"P : Q = 3 : 4 and Q : R = 5 : 6. P : Q : R = ?", opts:["15:20:24","3:4:6","5:6:8","9:12:16"], ans:0 },
        { q:"India's Constitution came into effect on:", opts:["15 Aug 1947","26 Jan 1950","26 Nov 1949","1 Jan 1950"], ans:1 },
        { q:"One Word: One who studies handwriting:", opts:["Graphologist","Cartographer","Philanthropist","Numismatist"], ans:0 },
        { q:"Area of circle with radius 7 cm (π=22/7):", opts:["144 cm²","154 cm²","164 cm²","174 cm²"], ans:1 },
        { q:"The 'Hornbill Festival' is celebrated in:", opts:["Assam","Nagaland","Mizoram","Manipur"], ans:1 },
        { q:"In a class, 30% are boys. If there are 21 girls, total students:", opts:["27","30","35","40"], ans:1 },
        { q:"Passive voice: 'She wrote a letter' →", opts:["A letter is written","A letter was written","A letter had written","A letter being written"], ans:1 },
        { q:"The chemical formula of common salt is:", opts:["NaOH","NaCl","Na₂CO₃","NaHCO₃"], ans:1 },
        { q:"Two numbers are in ratio 3:5. Sum = 96. Larger number:", opts:["36","60","56","48"], ans:1 },
        { q:"'Arth Kranti' is associated with which reform?", opts:["Tax reform","Land reform","Banking reform","Cashless economy"], ans:3 },
        { q:"Average of first 10 multiples of 5:", opts:["25","27.5","30","32.5"], ans:1 },
        { q:"Direction: If East is North, South-East is:", opts:["South","North-East","East","South-West"], ans:1 },
      ]
    },
    {
      id:"upsc_pre", exam:"UPSC Prelims", examKey:"upsc", icon:"🎖️", color:"#8b5cf6",
      duration:2400, questions:25, difficulty:"Hard", attempts:"89K+",
      syllabus:"Polity, History, Geography, Economy, Environment",
      qs:[
        { q:"Which article deals with election of the President of India?", opts:["Article 52","Article 54","Article 56","Article 58"], ans:1 },
        { q:"'Silent Valley' National Park is in:", opts:["Karnataka","Kerala","Tamil Nadu","Andhra Pradesh"], ans:1 },
        { q:"Planning Commission was replaced by NITI Aayog in:", opts:["2013","2014","2015","2016"], ans:2 },
        { q:"Palk Strait separates India from:", opts:["Maldives","Indonesia","Sri Lanka","Bangladesh"], ans:2 },
        { q:"Right to Education Act was passed in:", opts:["2005","2007","2009","2011"], ans:2 },
        { q:"The 'Green Revolution' in India was primarily associated with which crop?", opts:["Rice","Wheat","Maize","Jowar"], ans:1 },
        { q:"Which Constitutional Amendment lowered the voting age from 21 to 18?", opts:["42nd","44th","61st","73rd"], ans:2 },
        { q:"'Dandi March' started in:", opts:["1927","1928","1930","1932"], ans:2 },
        { q:"Kaziranga National Park is famous for:", opts:["Tiger","One-horned Rhinoceros","Elephant","Snow Leopard"], ans:1 },
        { q:"Which is NOT a Fundamental Right in India?", opts:["Right to Equality","Right to Property","Right to Freedom","Right Against Exploitation"], ans:1 },
        { q:"The Tropic of Cancer does NOT pass through:", opts:["Rajasthan","Odisha","Chhattisgarh","Andhra Pradesh"], ans:3 },
        { q:"'Operation Flood' was related to:", opts:["Flood control","Milk production","Wheat production","River linking"], ans:1 },
        { q:"The WTO replaced which organization?", opts:["UNCTAD","GATT","IMF","World Bank"], ans:1 },
        { q:"Which gas is responsible for 'Laughing Gas' effect?", opts:["NO","N₂O","NO₂","NH₃"], ans:1 },
        { q:"Biosphere Reserves in India are designated by:", opts:["IUCN","UNESCO","Ministry of Environment","State Governments"], ans:2 },
        { q:"The Rowlatt Act was passed in:", opts:["1917","1919","1921","1923"], ans:1 },
        { q:"India's first Five-Year Plan priority was:", opts:["Industrialization","Agriculture","Education","Infrastructure"], ans:1 },
        { q:"Which Schedule of the Constitution deals with Anti-Defection Law?", opts:["8th","9th","10th","11th"], ans:2 },
        { q:"'Vande Mataram' was composed by:", opts:["Rabindranath Tagore","Bankim Chandra Chatterjee","Subramania Bharati","Swami Vivekananda"], ans:1 },
        { q:"The Narmada river flows into:", opts:["Bay of Bengal","Arabian Sea","Indian Ocean","Gulf of Kutch"], ans:1 },
        { q:"Directive Principles of State Policy are borrowed from:", opts:["USA","UK","Ireland","Australia"], ans:2 },
        { q:"'CITES' is related to:", opts:["Climate change","Trade in endangered species","Chemical weapons","Nuclear testing"], ans:1 },
        { q:"Which is the largest Committee of Parliament?", opts:["Public Accounts","Estimates","Public Undertakings","Petitions"], ans:1 },
        { q:"Soil erosion is reduced by:", opts:["Deforestation","Contour ploughing","Over irrigation","Overgrazing"], ans:1 },
        { q:"India's first nuclear power station was at:", opts:["Kudankulam","Narora","Kalpakkam","Tarapur"], ans:3 },
      ]
    },
    {
      id:"ibps_po", exam:"IBPS PO 2024", examKey:"banking", icon:"🏦", color:"#10b981",
      duration:2400, questions:25, difficulty:"Medium", attempts:"3.4L+",
      syllabus:"Quant, English, Banking Awareness, Reasoning, Computer",
      qs:[
        { q:"RBI was established in:", opts:["1930","1932","1935","1947"], ans:2 },
        { q:"NEFT stands for:", opts:["National Electronic Funds Transfer","Net Easy Fund Transfer","National Easy Finance Transfer","None"], ans:0 },
        { q:"The rate at which RBI lends to commercial banks:", opts:["CRR","SLR","Repo Rate","Bank Rate"], ans:2 },
        { q:"Minimum Capital Adequacy Ratio (CAR) as per Basel III:", opts:["8%","10%","10.5%","12%"], ans:2 },
        { q:"SWIFT code has how many characters?", opts:["6","8 or 11","10","12"], ans:1 },
        { q:"Which bank's tagline is 'A Good People to Bank With'?", opts:["SBI","PNB","Bank of Baroda","Canara Bank"], ans:2 },
        { q:"SDR (Special Drawing Right) is issued by:", opts:["World Bank","IMF","RBI","ADB"], ans:1 },
        { q:"'Priority Sector Lending' target for domestic banks is:", opts:["30%","35%","40%","45%"], ans:2 },
        { q:"The headquarters of NABARD is in:", opts:["New Delhi","Pune","Mumbai","Chennai"], ans:2 },
        { q:"P invested ₹5000 for 2 years at 10% CI. Amount =?", opts:["₹6000","₹6050","₹6100","₹6150"], ans:2 },
        { q:"If in 2 years, SI on a sum at 8% is ₹1600, the principal is:", opts:["₹8000","₹9000","₹10000","₹11000"], ans:2 },
        { q:"PMJDY stands for:", opts:["Pradhan Mantri Jan Dhan Yojana","Prime Minister Jan Dhyan Yojana","Pradhan Mantri Jan Disha Yojana","None"], ans:0 },
        { q:"Which is an example of a Non-Banking Financial Company?", opts:["SBI","HDFC Ltd","Bank of India","RBI"], ans:1 },
        { q:"Reverse Repo Rate is always __ than Repo Rate:", opts:["Higher","Lower","Equal","Unrelated"], ans:1 },
        { q:"If blood group is AB, the person is called:", opts:["Universal donor","Universal recipient","Both","Neither"], ans:1 },
        { q:"'Know Your Customer' (KYC) is related to:", opts:["Tax compliance","Banking identity verification","Insurance","None"], ans:1 },
        { q:"Bank Insurance Fund (BIF) is managed by:", opts:["RBI","SEBI","DICGC","IRDAI"], ans:2 },
        { q:"A sum doubles itself in 8 years at SI. Rate of interest:", opts:["10%","12.5%","15%","20%"], ans:1 },
        { q:"IMPS enables transfer:", opts:["Within bank hours only","24×7 instantly","Only on weekdays","Only above ₹10,000"], ans:1 },
        { q:"Which committee recommended the setup of NABARD?", opts:["Narsimham","Shivaraman","Kelkar","Tendulkar"], ans:1 },
        { q:"Open Market Operations are conducted by:", opts:["SEBI","Government","RBI","Finance Ministry"], ans:2 },
        { q:"Fitch, Moody's, S&P are examples of:", opts:["Stock exchanges","Credit rating agencies","Mutual funds","NBFCs"], ans:1 },
        { q:"CASA ratio stands for:", opts:["Current & Savings Account ratio","Capital Adequacy Savings Account","Cash & Settlement Account","None"], ans:0 },
        { q:"A man deposited ₹10000 at 5% per annum for 3 years CI. Interest earned:", opts:["₹1500","₹1576.25","₹1576","₹1600"], ans:1 },
        { q:"The first bank to be established in India was:", opts:["Bank of Hindustan","SBI","Bank of India","Allahabad Bank"], ans:0 },
      ]
    },
    {
      id:"rrb_ntpc", exam:"RRB NTPC CBT-1", examKey:"railway", icon:"🚂", color:"#f59e0b",
      duration:2700, questions:25, difficulty:"Easy", attempts:"5.2L+",
      syllabus:"Mathematics, GI & Reasoning, General Awareness",
      qs:[
        { q:"Indian Railways was nationalised in:", opts:["1947","1950","1951","1956"], ans:2 },
        { q:"The first railway line in India (1853) ran between:", opts:["Delhi–Agra","Mumbai–Thane","Kolkata–Howrah","Chennai–Arcot"], ans:1 },
        { q:"Vande Bharat Express maximum speed:", opts:["130 km/h","160 km/h","180 km/h","200 km/h"], ans:1 },
        { q:"Railway Zone with HQ at Mumbai (CST):", opts:["WR","CR","SR","NR"], ans:1 },
        { q:"In a 100m race A beats B by 10m. A beats C by 19m. B beats C by:", opts:["9m","10m","8m","11m"], ans:1 },
        { q:"LCM of 24 and 36:", opts:["48","60","72","84"], ans:2 },
        { q:"The 'Lifeline Express' is:", opts:["Hospital on wheels","School on wheels","Tourist train","None"], ans:0 },
        { q:"Speed of a train = 90 km/h. In m/s:", opts:["20 m/s","22 m/s","25 m/s","30 m/s"], ans:2 },
        { q:"Which is India's longest railway platform?", opts:["Gorakhpur","Kharagpur","Patna","Allahabad"], ans:0 },
        { q:"Series: 2, 5, 10, 17, 26, ?", opts:["35","37","38","39"], ans:1 },
        { q:"Odd one out: Train, Bus, Tram, Aeroplane, Metro", opts:["Tram","Bus","Aeroplane","Metro"], ans:2 },
        { q:"Who appoints the Chairman of Railway Board?", opts:["President","Prime Minister","Cabinet","Railway Minister"], ans:0 },
        { q:"Average of 1 to 20:", opts:["9.5","10","10.5","11"], ans:2 },
        { q:"Profit = 25% on CP. If CP = ₹240, SP = ?", opts:["₹280","₹290","₹300","₹310"], ans:2 },
        { q:"Rajdhani Express runs between:", opts:["State capitals","New Delhi & state capitals","Metro cities","None"], ans:1 },
        { q:"If PENCIL → RGPEMP, then ERASER →", opts:["GTCUGT","GZCUGT","GZCTGU","GUCUGT"], ans:0 },
        { q:"Pointing to a man, Ravi says 'He is the son of my mother's only brother'. The man is Ravi's:", opts:["Uncle","Cousin","Brother","Nephew"], ans:1 },
        { q:"A 200m train crosses a 400m bridge in 30 seconds. Speed:", opts:["60 km/h","72 km/h","80 km/h","90 km/h"], ans:1 },
        { q:"Indian Railway's Vision 2024 aims for electrification of:", opts:["50%","80%","100%","75%"], ans:2 },
        { q:"Konkan Railway connects:", opts:["Mumbai–Goa–Mangaluru","Delhi–Mumbai","Kolkata–Chennai","Goa–Hyderabad"], ans:0 },
        { q:"CP = ₹350, Loss = 10%. SP = ?", opts:["₹305","₹310","₹315","₹320"], ans:2 },
        { q:"Hydrogen bomb is based on:", opts:["Nuclear fission","Nuclear fusion","Both","Chemical reaction"], ans:1 },
        { q:"Tiger Express runs in:", opts:["Assam","Madhya Pradesh","Rajasthan","Karnataka"], ans:1 },
        { q:"Ratio 5:8 = ?:120", opts:["65","70","75","80"], ans:2 },
        { q:"First Metro rail in India was introduced in:", opts:["Mumbai","Delhi","Kolkata","Chennai"], ans:2 },
      ]
    },
    {
      id:"quant", exam:"Quantitative Aptitude", examKey:"aptitude", icon:"🧮", color:"#ef4444",
      duration:1800, questions:20, difficulty:"Mixed", attempts:"1.8L+",
      syllabus:"Arithmetic, Algebra, Geometry, DI, Number System",
      qs:[
        { q:"A can do work in 10 days, B in 15 days. Together in:", opts:["5 days","6 days","7 days","8 days"], ans:1 },
        { q:"Average of 5 consecutive even numbers is 26. Largest:", opts:["28","30","32","34"], ans:1 },
        { q:"If 20%(A+B)=15%(A-B), then A:B =", opts:["7:1","5:2","3:1","1:7"], ans:0 },
        { q:"√(7+√(7+√7+...∞)) =", opts:["(1+√29)/2","(1+√33)/2","(1+√29)/4","None"], ans:0 },
        { q:"SI on ₹5000 at 8% p.a. for 3 years:", opts:["₹1000","₹1200","₹1400","₹1600"], ans:1 },
        { q:"A cylindrical tank (r=7m, h=5m). Volume (π=22/7):", opts:["770 m³","720 m³","880 m³","660 m³"], ans:0 },
        { q:"Boat speed = 15 km/h, current = 3 km/h. Upstream speed:", opts:["12 km/h","13 km/h","18 km/h","9 km/h"], ans:0 },
        { q:"HCF of 48 and 72:", opts:["12","18","24","36"], ans:2 },
        { q:"Two trains 120m and 80m long cross each other in 10s (opposite). Speed sum:", opts:["72 km/h","80 km/h","100 km/h","120 km/h"], ans:0 },
        { q:"₹12000 at 10% p.a. CI for 2 years. Amount:", opts:["₹14400","₹14520","₹14640","₹14760"], ans:2 },
        { q:"If 5x - 3y = 4 and 3x - 5y = -4, then x - y =", opts:["0","1","2","3"], ans:1 },
        { q:"A 10m ladder leans against a wall, foot 6m from wall. Height:", opts:["6m","7m","8m","9m"], ans:2 },
        { q:"Pipe A fills tank in 20 min, B in 30 min. Both open, fill in:", opts:["10 min","12 min","15 min","18 min"], ans:1 },
        { q:"Total surface area of cube (side=5cm):", opts:["100 cm²","125 cm²","150 cm²","175 cm²"], ans:2 },
        { q:"20% of 30% of 400:", opts:["16","20","24","28"], ans:2 },
        { q:"Diagonal of a square = 8√2 cm. Area:", opts:["64 cm²","128 cm²","32 cm²","48 cm²"], ans:0 },
        { q:"Selling price is ₹800 at 20% profit. Cost price:", opts:["₹640","₹660","₹666.67","₹680"], ans:2 },
        { q:"If 3^x = 9^3, then x =", opts:["3","6","9","12"], ans:1 },
        { q:"A mixture has milk:water = 7:3. To make ratio 3:7, water to be added (in 100L mixture):", opts:["100L","125L","133.33L","80L"], ans:2 },
        { q:"The value of (1.5)³ + (4.5)³ - 3×1.5×4.5×6:", opts:["0","6³","(1.5+4.5)³","216"], ans:0 },
      ]
    },
    {
      id:"reasoning_test", exam:"Logical Reasoning", examKey:"reasoning", icon:"🧠", color:"#ec4899",
      duration:1500, questions:20, difficulty:"Medium", attempts:"2.3L+",
      syllabus:"Series, Coding-Decoding, Direction, Blood Relations, Puzzles",
      qs:[
        { q:"If BOOK is coded as CPPL, PENCIL is coded as:", opts:["QFODJM","RFOEMJ","QGODKL","None"], ans:0 },
        { q:"Odd one out: 8, 27, 64, 100, 125", opts:["8","27","100","125"], ans:2 },
        { q:"Pointing to a photo, Ram says 'She is daughter of my grandfather's only son'. The girl is Ram's:", opts:["Sister","Cousin","Mother","Aunt"], ans:0 },
        { q:"A walks 10 km North, turns East walks 10 km. Distance from start:", opts:["10√2 km","15 km","20 km","10 km"], ans:0 },
        { q:"Series: 3, 7, 15, 31, 63, ?", opts:["125","127","130","131"], ans:1 },
        { q:"If '<' means '+', '>' means '−', '+' means '×', '−' means '÷', then: 2 < 3 + 4 − 2 > 1 =", opts:["8","7","9","10"], ans:0 },
        { q:"Statements: All cats are dogs. All dogs are birds. Conclusion: All cats are birds.", opts:["True","False","Uncertain","Partially true"], ans:0 },
        { q:"Find missing: ACE, BDF, CEG, ?", opts:["DFH","EGI","DGI","EFH"], ans:0 },
        { q:"If MONDAY=123456, DONKEY=423789, then MONKEY=?", opts:["123789","423781","423789","124789"], ans:0 },
        { q:"In a row of 40 students, A is 15th from left. B is 10th from right. Students between them:", opts:["14","15","16","17"], ans:1 },
        { q:"Water image of '3 6 9':", opts:["9 6 3 inverted","3 6 9 inverted","6 3 9 inverted","Same"], ans:1 },
        { q:"If January 1 is Monday, what day is March 1 (non-leap year)?", opts:["Friday","Saturday","Sunday","Monday"], ans:1 },
        { q:"Arrange: Brother (1), Father (2), Son (3), Grandfather (4), Grandson (5). Age descending:", opts:["4,2,1,3,5","4,1,2,5,3","2,4,1,3,5","4,2,3,1,5"], ans:0 },
        { q:"Which figure completes the series: ■□■ / □■□ / ■□?", opts:["■","□","■■","□□"], ans:0 },
        { q:"Salary of A is 25% more than B. B's salary is what % less than A?", opts:["20%","25%","15%","22%"], ans:0 },
        { q:"Cube painted red, cut into 64 equal pieces. Pieces with no face painted:", opts:["8","16","24","32"], ans:0 },
        { q:"A is B's sister. C is B's mother. D is C's father. E is D's mother. How is A related to D?", opts:["Grand daughter","Daughter","Great grand daughter","Niece"], ans:0 },
        { q:"In a clock, angle between hands at 3:25:", opts:["47.5°","47°","48°","49.5°"], ans:0 },
        { q:"Floor plan: A is to the East of B. C is to the North of B. D is to South of A. What direction is C from D?", opts:["North-West","North-East","South-West","South-East"], ans:1 },
        { q:"If ROSE=6251, CHAIR=73456, PREACH=?", opts:["961473","961437","961347","916473"], ans:0 },
      ]
    },
    {
      id:"english_test", exam:"English Language", examKey:"english", icon:"📝", color:"#06b6d4",
      duration:1500, questions:20, difficulty:"Easy", attempts:"4.1L+",
      syllabus:"Grammar, Vocabulary, Reading Comprehension, Fill-Ups",
      qs:[
        { q:"Choose the correct sentence:", opts:["She don't know","She doesn't knows","She doesn't know","She not know"], ans:2 },
        { q:"Antonym of BENEVOLENT:", opts:["Kind","Generous","Malevolent","Helpful"], ans:2 },
        { q:"Plural of 'criterion':", opts:["criterions","criterias","criteria","criterions"], ans:2 },
        { q:"He is ___ honest man.", opts:["a","an","the","no article"], ans:1 },
        { q:"One word for 'one who studies stars and celestial objects':", opts:["Astrologer","Astronaut","Astronomer","Astrophysicist"], ans:2 },
        { q:"Identify the type: 'The news surprised everyone.'", opts:["Simple","Compound","Complex","Compound-Complex"], ans:0 },
        { q:"'To let the cat out of the bag' means:", opts:["Let a cat escape","Reveal a secret","Create confusion","None"], ans:1 },
        { q:"Correct indirect speech: He said, 'I am very tired.'", opts:["He said he is very tired","He said he was very tired","He told he was tired","He said that I am tired"], ans:1 },
        { q:"Synonym of EPHEMERAL:", opts:["Permanent","Temporary","Ancient","Strong"], ans:1 },
        { q:"'Neither of the two boys __ present.' Correct verb:", opts:["are","were","is","have been"], ans:2 },
        { q:"Prefix for 'possible' to make it negative:", opts:["un","in","im","dis"], ans:2 },
        { q:"The book __ on the table since morning.", opts:["is lying","has been lying","was lying","had lain"], ans:1 },
        { q:"Identify the error: 'He is too weak that he cannot walk.'", opts:["He is too","weak that","he cannot","walk"], ans:1 },
        { q:"'Omniscient' means:", opts:["All-powerful","All-knowing","All-seeing","All-present"], ans:1 },
        { q:"Active voice: 'The cake was eaten by her.'", opts:["She eats the cake","She ate the cake","She had eaten the cake","She has eaten"], ans:1 },
        { q:"Rearrange: (P)played (Q)the children (R)in (S)the park → correct order:", opts:["QPRS","QPSR","PQRS","RQPS"], ans:0 },
        { q:"'A penny saved is __ earned':", opts:["a penny","double","twice","more"], ans:0 },
        { q:"Homophone of 'Knight':", opts:["Night","Knit","Nice","Knot"], ans:0 },
        { q:"Correct spelling:", opts:["Neccessary","Necessary","Neccesary","Necesary"], ans:1 },
        { q:"'She has been living here for ten years.' Tense:", opts:["Present Perfect","Past Perfect","Present Perfect Continuous","Present Continuous"], ans:2 },
      ]
    },
    {
      id:"gate_cs", exam:"IT & GATE CS", examKey:"it", icon:"💻", color:"#bb9200",
      duration:2700, questions:20, difficulty:"Hard", attempts:"67K+",
      syllabus:"DSA, OS, DBMS, Networks, Programming, Algorithms",
      qs:[
        { q:"Time complexity of Binary Search:", opts:["O(n)","O(log n)","O(n log n)","O(1)"], ans:1 },
        { q:"Which uses LIFO principle?", opts:["Queue","Stack","Array","Priority Queue"], ans:1 },
        { q:"In Python, list comprehension for squares of 0-4:", opts:["[x**2 for x in range(5)]","[x^2 for x in range(5)]","[x**2 for x in range(4)]","[x*x for x in 1 to 5]"], ans:0 },
        { q:"SQL: Retrieving unique values uses:", opts:["GROUP BY","DISTINCT","UNIQUE","FILTER"], ans:1 },
        { q:"Which is NOT an OOP principle?", opts:["Encapsulation","Inheritance","Compilation","Polymorphism"], ans:2 },
        { q:"In OS, a deadlock requires all EXCEPT:", opts:["Mutual exclusion","Hold and wait","Preemption","Circular wait"], ans:2 },
        { q:"Number of edges in a complete graph K₅:", opts:["10","12","15","20"], ans:0 },
        { q:"Which sorting algorithm has worst-case O(n log n)?", opts:["Quicksort","Merge sort","Bubble sort","Insertion sort"], ans:1 },
        { q:"IPv4 address is __ bits:", opts:["16","32","64","128"], ans:1 },
        { q:"In a B-tree of order m, max keys in a node:", opts:["m-1","m","m+1","2m-1"], ans:0 },
        { q:"The TCP three-way handshake sequence:", opts:["SYN, SYN-ACK, ACK","SYN, ACK, SYN-ACK","ACK, SYN, FIN","SYN, FIN, ACK"], ans:0 },
        { q:"Which normal form removes transitive dependency?", opts:["1NF","2NF","3NF","BCNF"], ans:2 },
        { q:"A process in 'waiting state' is waiting for:", opts:["CPU","I/O or event","Memory","None"], ans:1 },
        { q:"Worst case of QuickSort:", opts:["O(n)","O(n log n)","O(n²)","O(log n)"], ans:2 },
        { q:"Which layer in OSI handles end-to-end communication?", opts:["Network","Transport","Session","Data Link"], ans:1 },
        { q:"Stack overflow typically occurs due to:", opts:["Too many loops","Infinite recursion","Large arrays","None"], ans:1 },
        { q:"Which data structure is used in BFS?", opts:["Stack","Queue","Tree","Graph"], ans:1 },
        { q:"2's complement of 0110:", opts:["1010","1001","1110","1011"], ans:0 },
        { q:"ACID in DBMS: 'A' stands for:", opts:["Availability","Atomicity","Access","Authentication"], ans:1 },
        { q:"In a min-heap, the root contains:", opts:["Maximum value","Minimum value","Median","Random"], ans:1 },
      ]
    },
    {
      id:"gk_test", exam:"General Knowledge", examKey:"gk", icon:"🌍", color:"#16a34a",
      duration:1200, questions:20, difficulty:"Easy", attempts:"6.7L+",
      syllabus:"Current Affairs, Science, Sports, Awards, World",
      qs:[
        { q:"Which planet is called the 'Red Planet'?", opts:["Venus","Jupiter","Mars","Saturn"], ans:2 },
        { q:"The headquarter of the United Nations is in:", opts:["Geneva","Paris","New York","London"], ans:2 },
        { q:"'Pneumonia' affects which organ?", opts:["Heart","Liver","Lungs","Kidneys"], ans:2 },
        { q:"The 2024 Olympics were held in:", opts:["Tokyo","Paris","London","Los Angeles"], ans:1 },
        { q:"'Swaraj is my birthright' was said by:", opts:["Mahatma Gandhi","Bal Gangadhar Tilak","Subhas Chandra Bose","Bhagat Singh"], ans:1 },
        { q:"Which is the longest river in the world?", opts:["Amazon","Nile","Yangtze","Mississippi"], ans:1 },
        { q:"Vitamin C deficiency causes:", opts:["Rickets","Scurvy","Beriberi","Pellagra"], ans:1 },
        { q:"'Wimbledon' is associated with:", opts:["Cricket","Football","Tennis","Golf"], ans:2 },
        { q:"Capital of Australia:", opts:["Sydney","Melbourne","Canberra","Brisbane"], ans:2 },
        { q:"The chemical symbol of Gold is:", opts:["Go","Gd","Au","Ag"], ans:2 },
        { q:"Who wrote 'A Brief History of Time'?", opts:["Albert Einstein","Stephen Hawking","Carl Sagan","Richard Feynman"], ans:1 },
        { q:"Which is the smallest continent?", opts:["Antarctica","Australia","Europe","South America"], ans:1 },
        { q:"'DNA' full form:", opts:["Deoxyribonucleic Acid","Dextrose Nucleic Acid","Deoxyribose Natural Acid","None"], ans:0 },
        { q:"Who invented the telephone?", opts:["Thomas Edison","Alexander Graham Bell","Nikola Tesla","Guglielmo Marconi"], ans:1 },
        { q:"World Environment Day is observed on:", opts:["April 22","June 5","March 21","December 11"], ans:1 },
        { q:"The pH value of pure water is:", opts:["0","5","7","14"], ans:2 },
        { q:"'Yen' is the currency of:", opts:["China","South Korea","Japan","Vietnam"], ans:2 },
        { q:"Which is the largest ocean?", opts:["Atlantic","Arctic","Indian","Pacific"], ans:3 },
        { q:"Newton's First Law is also called:", opts:["Law of Motion","Law of Inertia","Law of Force","Law of Gravity"], ans:1 },
        { q:"'Kathakali' is a dance form from:", opts:["Tamil Nadu","Andhra Pradesh","Kerala","Karnataka"], ans:2 },
      ]
    },
    {
      id:"defence_test", exam:"NDA / CDS 2024", examKey:"defence", icon:"⚔️", color:"#dc2626",
      duration:2400, questions:20, difficulty:"Hard", attempts:"42K+",
      syllabus:"Maths, GK, English, Science, Current Affairs",
      qs:[
        { q:"NDA examination is conducted by:", opts:["Ministry of Defence","UPSC","SSC","State PSC"], ans:1 },
        { q:"Which is the highest gallantry award in India?", opts:["Param Vir Chakra","Vir Chakra","Ashoka Chakra","Kirti Chakra"], ans:0 },
        { q:"INS Vikrant is India's:", opts:["Nuclear submarine","Aircraft carrier","Destroyer","Frigate"], ans:1 },
        { q:"'Operation Vijay' (1999) was related to:", opts:["Siachen","Kargil","Lanka","Sri Lanka"], ans:1 },
        { q:"CDS stands for:", opts:["Chief Defence Staff","Combined Defence Services","Central Defence System","None"], ans:0 },
        { q:"Which regiment is the oldest in the Indian Army?", opts:["Maratha Light Infantry","Rajput Regiment","Punjab Regiment","Madras Regiment"], ans:3 },
        { q:"Agniveer scheme is for recruitment into:", opts:["Police","Armed Forces","Paramilitary","Intelligence"], ans:1 },
        { q:"AFCAT is conducted for:", opts:["Army","Navy","Air Force","All three"], ans:2 },
        { q:"'DRDO' develops:", opts:["Agricultural technology","Defence technology","Space technology","Nuclear energy"], ans:1 },
        { q:"Sukhoi Su-30 MKI is a:", opts:["Transport aircraft","Fighter aircraft","Helicopter","Bomber"], ans:1 },
        { q:"National Defence Academy is located at:", opts:["Pune (Khadakwasla)","Delhi","Dehradun","Chennai"], ans:0 },
        { q:"The rank of 'Major General' is in:", opts:["Navy","Air Force","Army","All three"], ans:2 },
        { q:"INS Arihant is India's first:", opts:["Aircraft carrier","Nuclear-powered submarine","Destroyer","Frigate"], ans:1 },
        { q:"'Tejas' is an indigenously built:", opts:["Missile","Fighter aircraft","Submarine","Tank"], ans:1 },
        { q:"SIMBEX is a bilateral naval exercise between India and:", opts:["USA","Singapore","Australia","Japan"], ans:1 },
        { q:"The Indian Coast Guard comes under:", opts:["Ministry of Defence","Ministry of Home Affairs","Navy","DRDO"], ans:0 },
        { q:"'Operation Trident' (1971) was a naval strike on:", opts:["Colombo","Karachi","Dhaka","Chittagong"], ans:1 },
        { q:"BrahMos is a:", opts:["Ballistic missile","Supersonic cruise missile","Satellite","Fighter jet"], ans:1 },
        { q:"Military salary of a Lieutenant (approx):", opts:["₹30,000","₹56,100","₹70,000","₹1,00,000"], ans:1 },
        { q:"'Blue Water Navy' means:", opts:["Navy in coastal waters","Deep ocean capable navy","Nuclear navy","None"], ans:1 },
      ]
    },
    {
      id:"ctet_test", exam:"CTET Paper 1 & 2", examKey:"teaching", icon:"🎓", color:"#7c3aed",
      duration:2400, questions:20, difficulty:"Medium", attempts:"1.2L+",
      syllabus:"CDP, Language, Maths, EVS, Pedagogy",
      qs:[
        { q:"'Zone of Proximal Development' concept is given by:", opts:["Piaget","Vygotsky","Bloom","Bruner"], ans:1 },
        { q:"CTET stands for:", opts:["Central Teaching Eligibility Test","Central Teacher Eligibility Test","Combined Teacher Exam Test","None"], ans:1 },
        { q:"NCERT was established in:", opts:["1947","1953","1961","1966"], ans:2 },
        { q:"Multiple Intelligences theory was given by:", opts:["Sternberg","Gardner","Guilford","Cattell"], ans:1 },
        { q:"'Constructivism' in education means:", opts:["Teacher-centered learning","Rote learning","Learner builds own knowledge","Memorization"], ans:2 },
        { q:"RTE Act 2009 provides free education for age:", opts:["3-6 years","6-14 years","6-18 years","5-14 years"], ans:1 },
        { q:"EVS is taught at which level?", opts:["Primary (Class 1-5)","Upper Primary","Secondary","All levels"], ans:0 },
        { q:"Bloom's Taxonomy highest level:", opts:["Application","Analysis","Synthesis/Create","Evaluation"], ans:3 },
        { q:"CCE stands for:", opts:["Continuous Comprehensive Evaluation","Complete Course Evaluation","Combined Curriculum Exam","None"], ans:0 },
        { q:"Which approach is best for language teaching?", opts:["Grammar-translation","Communicative Language Teaching","Lecture method","Rote method"], ans:1 },
        { q:"Dyslexia is a disorder affecting:", opts:["Mathematics","Reading","Memory","Behaviour"], ans:1 },
        { q:"'Inclusive Education' primarily focuses on:", opts:["Gifted students","Students with disabilities","All students together","Urban students"], ans:2 },
        { q:"KVS TGT eligibility requires:", opts:["12th pass","Graduate + B.Ed","Postgraduate","Graduate only"], ans:1 },
        { q:"Portfolio assessment is an example of:", opts:["Formative assessment","Summative assessment","Both","Neither"], ans:0 },
        { q:"The number of bones in the human body:", opts:["204","206","208","210"], ans:1 },
        { q:"'Cooperative learning' promotes:", opts:["Individual work","Group learning","Competition","None"], ans:1 },
        { q:"ADHD stands for:", opts:["Attention Deficit Hyperactivity Disorder","Active Deficit Hyperactivity Disorder","Attention Deficit High Disorder","None"], ans:0 },
        { q:"Which is NOT a microteaching skill?", opts:["Set induction","Probing questions","Blackboard writing","Memorization"], ans:3 },
        { q:"Best seating arrangement for group work:", opts:["Rows","U-shape or clusters","Theatre style","None"], ans:1 },
        { q:"'Motivation' in education context was studied by:", opts:["Maslow","Freud","Pavlov","Thorndike"], ans:0 },
      ]
    },
    {
      id:"maths_test", exam:"Mathematics (Advanced)", examKey:"maths", icon:"➗", color:"#ca8a04",
      duration:2700, questions:20, difficulty:"Hard", attempts:"95K+",
      syllabus:"Algebra, Calculus, Geometry, Trigonometry, Statistics",
      qs:[
        { q:"Derivative of sin(x):", opts:["cos(x)","-cos(x)","-sin(x)","tan(x)"], ans:0 },
        { q:"∫x dx =", opts:["x²","x²/2 + C","2x + C","x + C"], ans:1 },
        { q:"Sum of interior angles of a hexagon:", opts:["540°","620°","720°","800°"], ans:2 },
        { q:"log₂(64) =", opts:["4","5","6","7"], ans:2 },
        { q:"If P(A) = 0.3 and P(B) = 0.4, P(A∩B) = 0.1. P(A∪B)=?", opts:["0.6","0.7","0.8","0.5"], ans:0 },
        { q:"The roots of x² - 5x + 6 = 0:", opts:["2 & 3","1 & 6","2 & 4","-2 & -3"], ans:0 },
        { q:"Area under curve y=x² from 0 to 3:", opts:["6","7","8","9"], ans:3 },
        { q:"(a+b)³ = ?", opts:["a³+b³+3ab(a+b)","a³+3a²b+3ab²+b³","Both","Neither"], ans:2 },
        { q:"tan(45°) =", opts:["0","1","√3","1/√2"], ans:1 },
        { q:"Number of permutations of 4 items from 7 (⁷P₄):", opts:["210","280","840","560"], ans:2 },
        { q:"sin²θ + cos²θ =", opts:["0","1","2","tanθ"], ans:1 },
        { q:"The eccentricity of a circle:", opts:["0","1","0.5","Infinity"], ans:0 },
        { q:"n(n+1)/2 gives the sum of:", opts:["Even numbers","First n natural numbers","Perfect squares","Odd numbers"], ans:1 },
        { q:"If matrix A is 2×3 and B is 3×4, AB is:", opts:["2×4","3×3","4×2","Cannot multiply"], ans:0 },
        { q:"The value of i⁴ (complex numbers):", opts:["-1","i","1","-i"], ans:2 },
        { q:"Mean of 3, 7, 5, 13, 20, 23, 39, 23, 40, 23, 14, 12, 56, 23, 29:", opts:["21","23","24","22"], ans:1 },
        { q:"If f(x) = 2x+3, inverse f⁻¹(x):", opts:["(x-3)/2","(x+3)/2","2x-3","x/2+3"], ans:0 },
        { q:"Arithmetic mean of first n even numbers:", opts:["n","n+1","n/2","2n"], ans:1 },
        { q:"Volume of sphere (r=3cm):", opts:["36π cm³","108π cm³","32π cm³","36π/3 cm³"], ans:0 },
        { q:"Angle subtended by diameter at circumference:", opts:["45°","60°","90°","180°"], ans:2 },
      ]
    },

    
  ];

  const BOOKS = {
    ssc:[
      { title:"Quantitative Aptitude for Competitive Examinations", author:"R.S. Aggarwal", type:"📖", free:true, link:"https://archive.org/search?query=RS+Aggarwal+Quantitative+Aptitude", youtube:"https://www.youtube.com/results?search_query=SSC+CGL+Maths+R.S.+Aggarwal", desc:"The most popular book for SSC Maths — covers all topics from arithmetic to geometry." },
      { title:"Objective General English", author:"S.P. Bakshi (Arihant)", type:"📖", free:true, link:"https://archive.org/search?query=SP+Bakshi+English", youtube:"https://www.youtube.com/results?search_query=SP+Bakshi+English+SSC", desc:"Comprehensive English for SSC — grammar, vocabulary, comprehension." },
      { title:"SSC CGL Previous Year Papers (10 Years)", author:"Kiran Prakashan", type:"📄", free:true, link:"https://www.sscadda.com/free-pdf/ssc-cgl-previous-year-papers/", youtube:"https://www.youtube.com/results?search_query=SSC+CGL+previous+year+paper+solution", desc:"Solved papers with detailed explanations — best for pattern understanding." },
      { title:"Lucent's General Knowledge", author:"Lucent Publications", type:"📖", free:true, link:"https://archive.org/search?query=Lucent+General+Knowledge", youtube:"https://www.youtube.com/results?search_query=Lucent+GK+SSC", desc:"The go-to GK book for all SSC exams — concise and comprehensive." },
      { title:"SSC Reasoning by Rakesh Yadav", author:"Rakesh Yadav", type:"📖", free:true, link:"https://testbook.com/free-ebooks", youtube:"https://www.youtube.com/results?search_query=Rakesh+Yadav+Reasoning+SSC", desc:"Best reasoning guide for SSC with shortcut methods." },
      { title:"Fast Track Arithmetic", author:"Rajesh Verma", type:"📖", free:true, link:"https://archive.org/search?query=Fast+Track+Arithmetic", youtube:"https://www.youtube.com/results?search_query=Fast+Track+Arithmetic+SSC", desc:"Quick revision of all arithmetic topics with tricks." },
    ],
    upsc:[
      { title:"Indian Polity", author:"M. Laxmikanth", type:"📖", free:true, link:"https://archive.org/search?query=Laxmikanth+Indian+Polity", youtube:"https://www.youtube.com/results?search_query=Laxmikanth+Polity+UPSC", desc:"The Bible for UPSC Polity — mandatory reading for every aspirant." },
      { title:"NCERT History (6th–12th)", author:"NCERT", type:"📄", free:true, link:"https://ncert.nic.in/textbook.php", youtube:"https://www.youtube.com/results?search_query=NCERT+History+UPSC", desc:"Foundation for UPSC History — available free on NCERT website." },
      { title:"Indian Economy", author:"Ramesh Singh", type:"📖", free:true, link:"https://archive.org/search?query=Ramesh+Singh+Indian+Economy", youtube:"https://www.youtube.com/results?search_query=Indian+Economy+UPSC+Ramesh+Singh", desc:"Best Economy book for UPSC with updated budget and policy coverage." },
      { title:"Certificate Physical & Human Geography", author:"G.C. Leong", type:"📖", free:true, link:"https://archive.org/search?query=GC+Leong+Geography", youtube:"https://www.youtube.com/results?search_query=GC+Leong+Geography+UPSC", desc:"World Geography standard reference for UPSC Prelims and Mains." },
      { title:"Modern Indian History", author:"Bipin Chandra", type:"📖", free:true, link:"https://archive.org/search?query=Bipin+Chandra+Modern+History", youtube:"https://www.youtube.com/results?search_query=Bipin+Chandra+History+UPSC", desc:"Covers colonial period and Independence movement in depth." },
      { title:"UPSC Prelims 10-Year Solved Papers", author:"Disha Experts", type:"📄", free:true, link:"https://www.drishtiias.com/free-pdf-notes", youtube:"https://www.youtube.com/results?search_query=UPSC+Prelims+2024+question+paper+solution", desc:"Best resource to understand difficulty level and recurring topics." },
    ],
    banking:[
      { title:"IBPS PO Complete Guide", author:"Arihant Experts", type:"📖", free:true, link:"https://archive.org/search?query=IBPS+PO+Arihant", youtube:"https://www.youtube.com/results?search_query=IBPS+PO+complete+preparation", desc:"All-in-one book covering all five sections of IBPS PO exam." },
      { title:"Manorama Yearbook 2024", author:"Malayala Manorama", type:"📖", free:true, link:"https://archive.org/search?query=Manorama+Yearbook", youtube:"https://www.youtube.com/results?search_query=Banking+Awareness+2024", desc:"Current affairs and banking awareness — updated annually." },
      { title:"Quantitative Aptitude for CAT/Bank", author:"Arun Sharma", type:"📖", free:true, link:"https://archive.org/search?query=Arun+Sharma+Quantitative+Aptitude", youtube:"https://www.youtube.com/results?search_query=Arun+Sharma+Quant+Banking", desc:"Advanced quantitative aptitude with DI and complex problems." },
      { title:"Banking & Financial Awareness PDF", author:"Oliveboard", type:"📄", free:true, link:"https://www.oliveboard.in/free-study-material/", youtube:"https://www.youtube.com/results?search_query=Banking+Awareness+Free+PDF+2024", desc:"Free monthly PDF covering RBI, SEBI, IRDAI updates — must download." },
      { title:"SBI Clerk PYQs Kiran", author:"Kiran Prakashan", type:"📄", free:true, link:"https://www.testbook.com/free-ebooks", youtube:"https://www.youtube.com/results?search_query=SBI+Clerk+previous+year+paper", desc:"Year-wise solved papers with explanations for SBI Clerk exam." },
      { title:"Computer Knowledge for Bank Exams", author:"Arihant", type:"📄", free:true, link:"https://testbook.com/free-ebooks", youtube:"https://www.youtube.com/results?search_query=Computer+awareness+Banking+exam", desc:"Complete computer section coverage — MS Office, Internet, OS basics." },
    ],
    railway:[
      { title:"RRB NTPC CBT-1 Complete Guide", author:"Arihant Publications", type:"📖", free:true, link:"https://archive.org/search?query=RRB+NTPC+Arihant", youtube:"https://www.youtube.com/results?search_query=RRB+NTPC+2024+complete+preparation", desc:"Complete guide with all three sections — GI, Maths, and GA." },
      { title:"RRB Group-D Previous Papers", author:"Kiran Prakashan", type:"📄", free:true, link:"https://www.rrbcdg.gov.in/", youtube:"https://www.youtube.com/results?search_query=RRB+Group+D+previous+year+paper", desc:"Official and solved RRB Group D question papers." },
      { title:"General Science for Railway Exams", author:"Lucent", type:"📖", free:true, link:"https://archive.org/search?query=Lucent+Science", youtube:"https://www.youtube.com/results?search_query=General+Science+Railway+RRB", desc:"Physics, Chemistry, Biology — all covered for railway exams." },
      { title:"Railway GK Capsule 2024", author:"Bankersadda", type:"📄", free:true, link:"https://www.adda247.com/railway/free-study-material/", youtube:"https://www.youtube.com/results?search_query=Railway+GK+2024+PDF", desc:"Free downloadable GK capsule specifically for railway exams." },
      { title:"Maths Shortcuts for RRB", author:"Rakesh Yadav", type:"📖", free:true, link:"https://testbook.com/free-ebooks", youtube:"https://www.youtube.com/results?search_query=Rakesh+Yadav+Railway+Maths", desc:"Shortcut methods for all arithmetic topics in RRB exams." },
      { title:"RRB JE CBT-2 Technical Guide", author:"Made Easy", type:"📖", free:true, link:"https://archive.org/search?query=Made+Easy+RRB+JE", youtube:"https://www.youtube.com/results?search_query=RRB+JE+technical+preparation", desc:"Technical section guide for RRB Junior Engineer candidates." },
    ],
    aptitude:[
      { title:"Quantitative Aptitude", author:"R.S. Aggarwal", type:"📖", free:true, link:"https://archive.org/search?query=RS+Aggarwal+Quantitative", youtube:"https://www.youtube.com/results?search_query=RS+Aggarwal+Aptitude+solutions", desc:"The most widely used aptitude book — covers every topic with exercises." },
      { title:"Magical Book on Quicker Maths", author:"M. Tyra", type:"📖", free:true, link:"https://archive.org/search?query=M+Tyra+Quicker+Maths", youtube:"https://www.youtube.com/results?search_query=M+Tyra+Quicker+Maths", desc:"Famous for math tricks and shortcuts — preferred by toppers." },
      { title:"Data Interpretation & Data Sufficiency", author:"Arun Sharma", type:"📖", free:true, link:"https://archive.org/search?query=Arun+Sharma+Data+Interpretation", youtube:"https://www.youtube.com/results?search_query=Data+Interpretation+tricks", desc:"Advanced DI problems — useful for banking, SSC and MBA exams." },
      { title:"Aptitude Shortcuts & Tricks PDF", author:"Testbook", type:"📄", free:true, link:"https://testbook.com/free-ebooks", youtube:"https://www.youtube.com/results?search_query=Aptitude+shortcuts+tricks+2024", desc:"Free PDF with shortcut formulas for all aptitude topics." },
      { title:"Vedic Maths for Beginners", author:"Dhaval Bathia", type:"📖", free:true, link:"https://archive.org/search?query=Vedic+Mathematics", youtube:"https://www.youtube.com/results?search_query=Vedic+maths+tricks", desc:"Learn Vedic math techniques to solve calculations in seconds." },
      { title:"50 Arithmetic Puzzles", author:"Open Resource", type:"📄", free:true, link:"https://brilliant.org", youtube:"https://www.youtube.com/results?search_query=Arithmetic+puzzles+practice", desc:"Practice-based workbook for speed and accuracy improvement." },
    ],
    reasoning:[
      { title:"A Modern Approach to Verbal & Non-Verbal Reasoning", author:"R.S. Aggarwal", type:"📖", free:true, link:"https://archive.org/search?query=RS+Aggarwal+Verbal+Nonverbal+Reasoning", youtube:"https://www.youtube.com/results?search_query=RS+Aggarwal+Reasoning+solutions", desc:"The definitive reasoning book — both verbal and non-verbal covered." },
      { title:"Analytical Reasoning", author:"M.K. Pandey", type:"📖", free:true, link:"https://archive.org/search?query=MK+Pandey+Analytical+Reasoning", youtube:"https://www.youtube.com/results?search_query=MK+Pandey+Analytical+Reasoning", desc:"Best for puzzles, seating arrangements, and blood relations." },
      { title:"Logical Reasoning PDF Notes", author:"BYJU's Free", type:"📄", free:true, link:"https://byjus.com/free-ias-prep/", youtube:"https://www.youtube.com/results?search_query=Logical+Reasoning+free+notes", desc:"Free comprehensive notes on all reasoning topics." },
      { title:"Puzzle & Seating Arrangement PDF", author:"Oliveboard", type:"📄", free:true, link:"https://www.oliveboard.in/free-study-material/", youtube:"https://www.youtube.com/results?search_query=Seating+arrangement+reasoning+tricks", desc:"50+ practice puzzles with detailed step-by-step solutions." },
      { title:"Verbal Reasoning Workbook", author:"Edgar Thorpe", type:"📖", free:true, link:"https://archive.org/search?query=Edgar+Thorpe+Reasoning", youtube:"https://www.youtube.com/results?search_query=Verbal+Reasoning+competitive+exam", desc:"Detailed verbal reasoning — analogies, syllogisms, word series." },
      { title:"Critical Thinking & Brain Teasers", author:"Open Source", type:"📄", free:true, link:"https://openlibrary.org/subjects/logic_puzzles", youtube:"https://www.youtube.com/results?search_query=Critical+thinking+brain+teasers", desc:"Lateral thinking and critical reasoning exercises." },
    ],
    english:[
      { title:"Objective General English", author:"S.P. Bakshi", type:"📖", free:true, link:"https://archive.org/search?query=SP+Bakshi+English", youtube:"https://www.youtube.com/results?search_query=SP+Bakshi+English+full+book", desc:"Comprehensive English for all competitive exams — grammar to essays." },
      { title:"High School English Grammar & Composition", author:"Wren & Martin", type:"📖", free:true, link:"https://archive.org/search?query=Wren+Martin+Grammar", youtube:"https://www.youtube.com/results?search_query=Wren+Martin+Grammar+solutions", desc:"The classic grammar reference — rules, exercises, and compositions." },
      { title:"Word Power Made Easy", author:"Norman Lewis", type:"📖", free:true, link:"https://archive.org/search?query=Word+Power+Made+Easy+Norman+Lewis", youtube:"https://www.youtube.com/results?search_query=Word+Power+Made+Easy+lessons", desc:"Best vocabulary builder — learn 30 words a day systematically." },
      { title:"One Word Substitutions & Idioms PDF", author:"Testbook", type:"📄", free:true, link:"https://testbook.com/free-ebooks", youtube:"https://www.youtube.com/results?search_query=One+word+substitution+English", desc:"1000+ one-word substitutions, idioms, and phrases for all exams." },
      { title:"English Grammar in Use", author:"Raymond Murphy (Cambridge)", type:"📖", free:true, link:"https://archive.org/search?query=English+Grammar+in+Use+Raymond+Murphy", youtube:"https://www.youtube.com/results?search_query=Raymond+Murphy+English+Grammar", desc:"International standard English grammar — clear, self-study friendly." },
      { title:"Reading Comprehension Practice Sets", author:"Disha", type:"📄", free:true, link:"https://www.dishaonline.com/free-materials", youtube:"https://www.youtube.com/results?search_query=Reading+Comprehension+tricks+competitive", desc:"50 RC passages with vocabulary, inference, and tone questions." },
    ],
    it:[
      { title:"Introduction to Algorithms (CLRS)", author:"Cormen, Leiserson, Rivest, Stein", type:"📖", free:true, link:"https://archive.org/search?query=CLRS+Introduction+to+Algorithms", youtube:"https://www.youtube.com/results?search_query=CLRS+Algorithms+lecture", desc:"The algorithms bible — used in IITs, NITs and for GATE preparation." },
      { title:"GATE CS Previous 30 Years Papers", author:"Made Easy", type:"📄", free:true, link:"https://www.madeeasy.in/free-study-material/", youtube:"https://www.youtube.com/results?search_query=GATE+CS+previous+year+papers+solution", desc:"Official GATE CSE solved papers — pattern analysis and solutions." },
      { title:"The C Programming Language", author:"Dennis Ritchie & Brian Kernighan", type:"📖", free:true, link:"https://archive.org/search?query=C+Programming+Kernighan+Ritchie", youtube:"https://www.youtube.com/results?search_query=C+programming+Kernighan+Ritchie", desc:"The original C programming book — still the best reference." },
      { title:"Operating System Concepts", author:"Silberschatz, Galvin", type:"📖", free:true, link:"https://archive.org/search?query=Operating+System+Concepts+Silberschatz", youtube:"https://www.youtube.com/results?search_query=Operating+System+Concepts+lecture", desc:"'Dinosaur book' — standard OS textbook for GATE and interviews." },
      { title:"Database System Concepts", author:"Korth & Sudarshan", type:"📖", free:true, link:"https://archive.org/search?query=Database+System+Concepts+Korth", youtube:"https://www.youtube.com/results?search_query=Database+Systems+Korth+lecture", desc:"Complete DBMS — ER models, normalization, transactions, SQL." },
      { title:"Coding Interview Handbook", author:"Yangshun Tay (Free on GitHub)", type:"📄", free:true, link:"https://www.techinterviewhandbook.org/", youtube:"https://www.youtube.com/results?search_query=Coding+interview+preparation+TCS+Infosys", desc:"Free handbook covering DSA, system design and behavioral rounds." },
    ],
    gk:[
      { title:"Lucent's General Knowledge", author:"Lucent Publications", type:"📖", free:true, link:"https://archive.org/search?query=Lucent+General+Knowledge", youtube:"https://www.youtube.com/results?search_query=Lucent+GK+full+book", desc:"The most popular GK book in India — concise and exam-focused." },
      { title:"Manorama Yearbook 2024", author:"Malayala Manorama", type:"📖", free:true, link:"https://archive.org/search?query=Manorama+Yearbook+2024", youtube:"https://www.youtube.com/results?search_query=Manorama+Yearbook+2024", desc:"Annual yearbook covering current affairs, awards, science and more." },
      { title:"General Knowledge Today PDF", author:"GKToday.in", type:"📄", free:true, link:"https://www.gktoday.in/gk/", youtube:"https://www.youtube.com/results?search_query=GK+Today+current+affairs+2024", desc:"Free daily updated GK — best for current affairs preparation." },
      { title:"Chronicle IAS GK Supplement", author:"Chronicle", type:"📄", free:true, link:"https://www.chronicleindia.in/", youtube:"https://www.youtube.com/results?search_query=Chronicle+IAS+GK+supplement", desc:"Monthly GK supplement with national and international news." },
      { title:"Pratiyogita Darpan (Monthly)", author:"Upkar Prakashan", type:"📖", free:true, link:"https://archive.org/search?query=Pratiyogita+Darpan", youtube:"https://www.youtube.com/results?search_query=Pratiyogita+Darpan+PDF", desc:"India's most popular monthly competitive magazine — all exam types." },
      { title:"Science & Technology for Competitive Exams", author:"Spectrum Publications", type:"📖", free:true, link:"https://archive.org/search?query=Science+Technology+competitive+exam", youtube:"https://www.youtube.com/results?search_query=Science+Technology+GK+exam", desc:"Covers physics, chemistry, biology, space, and technology for GK." },
    ],
    defence:[
      { title:"Pathfinder CDS Examination", author:"Arihant Experts", type:"📖", free:true, link:"https://archive.org/search?query=Pathfinder+CDS+Arihant", youtube:"https://www.youtube.com/results?search_query=CDS+preparation+2024", desc:"Comprehensive CDS prep — all three papers with model tests." },
      { title:"NDA & NA Mathematics Guide", author:"R.S. Aggarwal", type:"📖", free:true, link:"https://archive.org/search?query=NDA+Mathematics+RS+Aggarwal", youtube:"https://www.youtube.com/results?search_query=NDA+Maths+preparation+2024", desc:"NDA Math with Algebra, Trigonometry, Calculus, Statistics." },
      { title:"AFCAT Guide with Previous Papers", author:"Disha", type:"📄", free:true, link:"https://www.testbook.com/free-ebooks", youtube:"https://www.youtube.com/results?search_query=AFCAT+2024+preparation", desc:"Air Force Common Admission Test complete preparation guide." },
      { title:"Agniveer Army Complete Guide", author:"Govt. Portal", type:"📄", free:true, link:"https://joinindianarmy.nic.in/", youtube:"https://www.youtube.com/results?search_query=Agniveer+Army+2024+preparation", desc:"Official Indian Army recruitment material — free from JoinIndianArmy portal." },
      { title:"NDA 10 Years Solved Papers", author:"Kiran", type:"📄", free:true, link:"https://testbook.com/free-ebooks", youtube:"https://www.youtube.com/results?search_query=NDA+previous+year+paper+solution", desc:"Decade of NDA solved papers — essential for understanding pattern." },
      { title:"English for NDA/CDS", author:"Arihant", type:"📖", free:true, link:"https://archive.org/search?query=English+NDA+CDS+Arihant", youtube:"https://www.youtube.com/results?search_query=English+CDS+NDA+preparation", desc:"English section preparation — vocabulary, grammar, comprehension." },
    ],
    teaching:[
      { title:"CTET & TETs Child Development & Pedagogy", author:"Arihant", type:"📖", free:true, link:"https://archive.org/search?query=CTET+Child+Development+Pedagogy", youtube:"https://www.youtube.com/results?search_query=CTET+Child+Development+2024", desc:"CDP section — Piaget, Vygotsky, Bloom, RTE Act, and teaching methods." },
      { title:"CTET Previous Year Papers (2011-2024)", author:"CBSE Portal", type:"📄", free:true, link:"https://ctet.nic.in/", youtube:"https://www.youtube.com/results?search_query=CTET+previous+year+paper+solution", desc:"Official CTET papers available free from CBSE portal." },
      { title:"KVS PGT/TGT/PRT Complete Guide", author:"Kiran", type:"📖", free:true, link:"https://archive.org/search?query=KVS+TGT+PGT+Kiran", youtube:"https://www.youtube.com/results?search_query=KVS+TGT+PGT+preparation+2024", desc:"Kendriya Vidyalaya Sangathan teacher recruitment prep guide." },
      { title:"NCF 2005 & NEP 2020 Notes", author:"NCERT Free", type:"📄", free:true, link:"https://ncert.nic.in/ncf/index.php", youtube:"https://www.youtube.com/results?search_query=NEP+2020+CTET+teaching", desc:"National Curriculum Framework and National Education Policy — free from NCERT." },
      { title:"Environmental Studies for CTET Paper 1", author:"Disha", type:"📄", free:true, link:"https://www.dishaonline.com/free-materials", youtube:"https://www.youtube.com/results?search_query=EVS+CTET+paper+1+preparation", desc:"EVS topics from Classes 3-5 curriculum — ecology, plants, animals, social." },
      { title:"Language Learning Approaches & Methods", author:"H.H. Stern", type:"📖", free:true, link:"https://archive.org/search?query=Language+Teaching+Stern+pedagogy", youtube:"https://www.youtube.com/results?search_query=Language+teaching+methods+CTET", desc:"Fundamental Concepts of Language Teaching — standard reference for language pedagogy." },
    ],
    insurance:[
      { title:"LIC AAO Complete Guide", author:"Arihant", type:"📖", free:true, link:"https://archive.org/search?query=LIC+AAO+Arihant", youtube:"https://www.youtube.com/results?search_query=LIC+AAO+preparation+2024", desc:"All sections covered — reasoning, quant, English, insurance awareness." },
      { title:"Insurance Awareness PDF 2024", author:"Oliveboard Free", type:"📄", free:true, link:"https://www.oliveboard.in/free-study-material/", youtube:"https://www.youtube.com/results?search_query=Insurance+Awareness+2024+PDF", desc:"Comprehensive free PDF for IRDA, LIC, GIC, NICL awareness." },
      { title:"Principles of Insurance (IC-01)", author:"III India", type:"📄", free:true, link:"https://www.insuranceinstituteofindia.com/", youtube:"https://www.youtube.com/results?search_query=Insurance+Institute+India+IC+01", desc:"Official Insurance Institute of India study material — free online." },
      { title:"NICL AO Practice Sets", author:"Kiran", type:"📄", free:true, link:"https://testbook.com/free-ebooks", youtube:"https://www.youtube.com/results?search_query=NICL+AO+preparation", desc:"New India Assurance Company Limited AO mock papers." },
      { title:"GA Capsule for Insurance Exams", author:"Bankersadda", type:"📄", free:true, link:"https://www.adda247.com/", youtube:"https://www.youtube.com/results?search_query=Insurance+exam+GK+capsule", desc:"Free monthly capsule covering insurance sector news and policy." },
      { title:"Life Insurance Underwriting Guide", author:"IRDAI Portal", type:"📄", free:true, link:"https://www.irdai.gov.in/", youtube:"https://www.youtube.com/results?search_query=IRDAI+regulations+exam", desc:"Official IRDAI regulations and guidelines — free download from IRDAI website." },
    ],
    maths:[
      { title:"Higher Algebra", author:"Hall & Knight", type:"📖", free:true, link:"https://archive.org/search?query=Higher+Algebra+Hall+Knight", youtube:"https://www.youtube.com/results?search_query=Higher+Algebra+solutions", desc:"Classic higher algebra text — polynomials, permutations, series." },
      { title:"Coordinate Geometry", author:"S.L. Loney", type:"📖", free:true, link:"https://archive.org/search?query=SL+Loney+Coordinate+Geometry", youtube:"https://www.youtube.com/results?search_query=SL+Loney+coordinate+geometry", desc:"Standard coordinate geometry — circles, parabola, ellipse, hyperbola." },
      { title:"Differential Calculus", author:"Shanti Narayan", type:"📖", free:true, link:"https://archive.org/search?query=Shanti+Narayan+Differential+Calculus", youtube:"https://www.youtube.com/results?search_query=Differential+Calculus+Shanti+Narayan", desc:"Complete differential calculus for degree and engineering students." },
      { title:"Class 11 & 12 NCERT Maths", author:"NCERT", type:"📄", free:true, link:"https://ncert.nic.in/textbook.php", youtube:"https://www.youtube.com/results?search_query=Class+12+NCERT+Maths+solutions", desc:"Free NCERT textbooks — best foundation for competitive math." },
      { title:"Problems in Mathematics", author:"V. Govorov & Others (MIR)", type:"📖", free:true, link:"https://archive.org/search?query=Problems+in+Mathematics+Govorov+MIR", youtube:"https://www.youtube.com/results?search_query=MIR+Publishers+Math+problems", desc:"Soviet MIR publishers problem book — advanced practice for GATE/JEE." },
      { title:"Statistics for Competitive Exams", author:"R.S. Aggarwal", type:"📖", free:true, link:"https://archive.org/search?query=RS+Aggarwal+Statistics", youtube:"https://www.youtube.com/results?search_query=Statistics+competitive+exam+RS+Aggarwal", desc:"Mean, median, mode, regression, probability — all topics with solutions." },
    ],
    state:[
      { title:"TSPSC Group-1 Study Material", author:"Sura Books", type:"📖", free:true, link:"https://archive.org/search?query=TSPSC+Group+1", youtube:"https://www.youtube.com/results?search_query=TSPSC+Group+1+preparation", desc:"Telangana PSC Group-1 complete guide with Telangana-specific content." },
      { title:"All States GK Digest", author:"GKToday.in", type:"📄", free:true, link:"https://www.gktoday.in/gk/", youtube:"https://www.youtube.com/results?search_query=State+GK+PSC+preparation", desc:"State-wise GK covering history, geography, economy for all State PSCs." },
      { title:"MPPSC PCS Complete Guide", author:"Arihant", type:"📖", free:true, link:"https://archive.org/search?query=MPPSC+Arihant", youtube:"https://www.youtube.com/results?search_query=MPPSC+preparation+2024", desc:"Madhya Pradesh PSC — state history, MP economy, polity." },
      { title:"UPPSC PCS Solved Papers", author:"Kiran", type:"📄", free:true, link:"https://testbook.com/free-ebooks", youtube:"https://www.youtube.com/results?search_query=UPPSC+PCS+preparation", desc:"Uttar Pradesh PSC previous papers with detailed solutions." },
      { title:"Karnataka History for KPSC", author:"State Library", type:"📄", free:true, link:"https://karnataka.gov.in/", youtube:"https://www.youtube.com/results?search_query=KPSC+Karnataka+history", desc:"Karnataka-specific history, culture, dynasties for KPSC exams." },
      { title:"RPSC RAS Complete Guide", author:"Unique Publishers", type:"📖", free:true, link:"https://archive.org/search?query=RPSC+RAS+Guide", youtube:"https://www.youtube.com/results?search_query=RPSC+RAS+preparation+2024", desc:"Rajasthan Administrative Services — complete study material." },
    ],
    science:[
      { title:"NCERT Science (6th–10th)", author:"NCERT", type:"📄", free:true, link:"https://ncert.nic.in/textbook.php", youtube:"https://www.youtube.com/results?search_query=NCERT+Science+6+to+10+competitive+exam", desc:"Free NCERT textbooks — foundation for all science-based exam questions." },
      { title:"Lucent's General Science", author:"Lucent Publications", type:"📖", free:true, link:"https://archive.org/search?query=Lucent+General+Science", youtube:"https://www.youtube.com/results?search_query=Lucent+General+Science+competitive", desc:"Concise science coverage — physics, chemistry, biology for SSC/Railway." },
      { title:"Objective Physics", author:"D.C. Pandey", type:"📖", free:true, link:"https://archive.org/search?query=DC+Pandey+Objective+Physics", youtube:"https://www.youtube.com/results?search_query=DC+Pandey+physics+solutions", desc:"Comprehensive objective physics — popular for GATE, SSC, Railway." },
      { title:"Organic Chemistry", author:"O.P. Tandon", type:"📖", free:true, link:"https://archive.org/search?query=OP+Tandon+Organic+Chemistry", youtube:"https://www.youtube.com/results?search_query=OP+Tandon+Organic+Chemistry", desc:"Best organic chemistry reference for engineering and medical entrance." },
      { title:"Modern ABC of Biology", author:"B.B. Arora", type:"📖", free:true, link:"https://archive.org/search?query=Modern+ABC+Biology", youtube:"https://www.youtube.com/results?search_query=Modern+ABC+Biology+Class+12", desc:"Complete biology — genetics, ecology, human physiology, plant biology." },
      { title:"Environment & Ecology for Competitive Exams", author:"Majid Husain", type:"📖", free:true, link:"https://archive.org/search?query=Environment+Ecology+Competitive+Exam", youtube:"https://www.youtube.com/results?search_query=Environment+Ecology+UPSC+SSC", desc:"Climate change, biodiversity, national parks, pollution — all covered." },
    ],
    computer:[
      { title:"Computer Fundamentals", author:"P.K. Sinha", type:"📖", free:true, link:"https://archive.org/search?query=PK+Sinha+Computer+Fundamentals", youtube:"https://www.youtube.com/results?search_query=PK+Sinha+Computer+Fundamentals", desc:"Classic computer fundamentals — hardware, software, OS, networking basics." },
      { title:"Objective Computer Science", author:"R.S. Salaria", type:"📖", free:true, link:"https://archive.org/search?query=RS+Salaria+Computer+Science", youtube:"https://www.youtube.com/results?search_query=Computer+awareness+competitive+exam", desc:"MCQ-based computer science — used for banking, SSC, and GATE preparation." },
      { title:"Data Structures Using C", author:"E. Balagurusamy", type:"📖", free:true, link:"https://archive.org/search?query=Balagurusamy+Data+Structures", youtube:"https://www.youtube.com/results?search_query=Data+Structures+Balagurusamy", desc:"Beginner-friendly data structures with C language implementations." },
      { title:"Computer Networks", author:"Andrew Tanenbaum", type:"📖", free:true, link:"https://archive.org/search?query=Tanenbaum+Computer+Networks", youtube:"https://www.youtube.com/results?search_query=Tanenbaum+Computer+Networks+lecture", desc:"Standard networking textbook — OSI, TCP/IP, protocols, security." },
      { title:"Free Code Camp Curriculum", author:"freeCodeCamp.org", type:"📄", free:true, link:"https://www.freecodecamp.org/", youtube:"https://www.youtube.com/c/Freecodecamp", desc:"Free full-stack web development curriculum — HTML, CSS, JS, React, Node." },
      { title:"CS50 Harvard Course (Free)", author:"Harvard University", type:"📄", free:true, link:"https://cs50.harvard.edu/", youtube:"https://www.youtube.com/results?search_query=CS50+Harvard+full+course", desc:"World's best intro to CS — completely free, covers C, Python, SQL, AI." },
    ],
    history:[
      { title:"Ancient India — NCERT", author:"NCERT (R.S. Sharma)", type:"📄", free:true, link:"https://ncert.nic.in/textbook.php", youtube:"https://www.youtube.com/results?search_query=Ancient+India+NCERT+UPSC", desc:"Standard ancient history text — Indus Valley to Gupta period." },
      { title:"Medieval India", author:"Satish Chandra", type:"📖", free:true, link:"https://archive.org/search?query=Satish+Chandra+Medieval+India", youtube:"https://www.youtube.com/results?search_query=Medieval+India+Satish+Chandra+UPSC", desc:"Comprehensive medieval history from Delhi Sultanate to Mughal Empire." },
      { title:"Modern India (Freedom Struggle)", author:"Bipin Chandra", type:"📖", free:true, link:"https://archive.org/search?query=Bipin+Chandra+Freedom+Struggle", youtube:"https://www.youtube.com/results?search_query=Bipin+Chandra+Modern+India+UPSC", desc:"India's Struggle for Independence — best book for modern history." },
      { title:"History of the World", author:"Arjun Dev", type:"📄", free:true, link:"https://archive.org/search?query=Arjun+Dev+World+History", youtube:"https://www.youtube.com/results?search_query=World+History+UPSC+competitive+exam", desc:"World history for UPSC — French Revolution, World Wars, Cold War." },
      { title:"Art & Culture of India", author:"Nitin Singhania", type:"📖", free:true, link:"https://archive.org/search?query=Nitin+Singhania+Art+Culture", youtube:"https://www.youtube.com/results?search_query=Nitin+Singhania+Art+Culture+UPSC", desc:"Indian art, architecture, music, dance, festivals — highly exam-relevant." },
      { title:"The Wonder that was India", author:"A.L. Basham", type:"📖", free:true, link:"https://archive.org/search?query=Wonder+Was+India+Basham", youtube:"https://www.youtube.com/results?search_query=AL+Basham+Wonder+that+was+India", desc:"Deep-dive into ancient Indian civilization, culture, and society." },
    ],
    geography:[
      { title:"Certificate Physical & Human Geography", author:"G.C. Leong", type:"📖", free:true, link:"https://archive.org/search?query=GC+Leong+Geography", youtube:"https://www.youtube.com/results?search_query=GC+Leong+Geography+UPSC", desc:"The standard geography reference for UPSC and competitive exams." },
      { title:"Geography of India", author:"Majid Husain", type:"📖", free:true, link:"https://archive.org/search?query=Majid+Husain+Geography+India", youtube:"https://www.youtube.com/results?search_query=Majid+Husain+India+Geography+UPSC", desc:"Comprehensive Indian Geography — climate, rivers, soil, industries." },
      { title:"NCERT Geography (6th–12th)", author:"NCERT", type:"📄", free:true, link:"https://ncert.nic.in/textbook.php", youtube:"https://www.youtube.com/results?search_query=NCERT+Geography+UPSC+SSC", desc:"Complete NCERT geography — free from the NCERT website." },
      { title:"Atlas — Oxford Student Atlas", author:"Oxford University Press", type:"📖", free:true, link:"https://archive.org/search?query=Oxford+Student+Atlas+India", youtube:"https://www.youtube.com/results?search_query=Map+Geography+competitive+exam", desc:"Essential atlas for map-based questions in competitive exams." },
      { title:"Indian Geography in Brief", author:"R.C. Tiwari", type:"📖", free:true, link:"https://archive.org/search?query=Indian+Geography+RC+Tiwari", youtube:"https://www.youtube.com/results?search_query=Indian+Geography+RC+Tiwari", desc:"Concise Indian geography — popular for SSC, Railway, Banking exams." },
      { title:"World Geography Free Notes", author:"Vision IAS", type:"📄", free:true, link:"https://visionias.in/resources/", youtube:"https://www.youtube.com/results?search_query=World+Geography+UPSC+free+notes", desc:"Free world geography notes — continents, oceans, climate, cities." },
    ],
  };

  const REMEDIAL = {
    ssc: { yt:"https://www.youtube.com/results?search_query=SSC+CGL+crash+course+2024", books:["Quantitative Aptitude — R.S. Aggarwal","Lucent's GK","Objective General English — S.P. Bakshi"] },
    upsc: { yt:"https://www.youtube.com/results?search_query=UPSC+Prelims+crash+course+2024", books:["Indian Polity — M. Laxmikanth","Indian Economy — Ramesh Singh","NCERT Geography — G.C. Leong"] },
    banking: { yt:"https://www.youtube.com/results?search_query=IBPS+PO+crash+course+2024", books:["IBPS PO Guide — Arihant","Banking Awareness PDF — Oliveboard","Quant — Arun Sharma"] },
    railway: { yt:"https://www.youtube.com/results?search_query=RRB+NTPC+crash+course+2024", books:["RRB NTPC Guide — Arihant","General Science — Lucent","Railway GK Capsule — Adda247"] },
    aptitude: { yt:"https://www.youtube.com/results?search_query=Quantitative+Aptitude+crash+course", books:["Quantitative Aptitude — R.S. Aggarwal","Magical Quicker Maths — M. Tyra","Fast Track Arithmetic — Rajesh Verma"] },
    reasoning: { yt:"https://www.youtube.com/results?search_query=Reasoning+crash+course+competitive+exam", books:["Verbal & Non-Verbal Reasoning — R.S. Aggarwal","Analytical Reasoning — M.K. Pandey"] },
    english: { yt:"https://www.youtube.com/results?search_query=English+grammar+crash+course+competitive+exam", books:["Objective English — S.P. Bakshi","Wren & Martin Grammar","Word Power Made Easy — Norman Lewis"] },
    it: { yt:"https://www.youtube.com/results?search_query=GATE+CS+crash+course+2024", books:["CLRS Algorithms","Operating System — Silberschatz","Database Systems — Korth"] },
    gk: { yt:"https://www.youtube.com/results?search_query=General+Knowledge+crash+course+2024", books:["Lucent's GK","Manorama Yearbook 2024","Pratiyogita Darpan Monthly"] },
    defence: { yt:"https://www.youtube.com/results?search_query=NDA+CDS+crash+course+2024", books:["Pathfinder CDS — Arihant","NDA Mathematics — R.S. Aggarwal","Agniveer Army Guide"] },
    teaching: { yt:"https://www.youtube.com/results?search_query=CTET+crash+course+2024", books:["CTET CDP — Arihant","KVS Guide — Kiran","NCF 2005 Notes — NCERT Free"] },
    maths: { yt:"https://www.youtube.com/results?search_query=Mathematics+crash+course+competitive", books:["NCERT Class 12 Maths","Higher Algebra — Hall & Knight","Problems in Mathematics — MIR"] },
  };

  const startMock = (mock) => {
    setActiveMock(mock);
    setCurrentQ(0);
    setAnswers({});
    setMockScore(null);
    setMockStarted(true);
    setTimeLeft(mock.duration);
  };

  const submitMock = () => {
    clearTimeout(timerRef.current);
    const score = activeMock.qs.reduce((acc, q, i) => acc + (answers[i] === q.ans ? 1 : 0), 0);
    setMockScore(score);
    setMockStarted(false);
    setTimeLeft(null);
  };

  const fmtTime = (s) => {
    if (!s && s !== 0) return "";
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  const filteredMocks = activeTab === "all" ? MOCKS : MOCKS.filter(m => m.examKey === activeTab);
  const filteredBooks = activeTab === "all"
    ? Object.entries(BOOKS).flatMap(([k, arr]) => arr.slice(0, 2).map(b => ({ ...b, examKey: k })))
    : (BOOKS[activeTab] || []).map(b => ({ ...b, examKey: activeTab }));
  const searchedBooks = searchQ
    ? filteredBooks.filter(b => b.title.toLowerCase().includes(searchQ.toLowerCase()) || b.author.toLowerCase().includes(searchQ.toLowerCase()))
    : filteredBooks;

  // ─── Mock Test Active Screen ───────────────────────────────────────────
  if (mockStarted && activeMock) {
    const q = activeMock.qs[currentQ];
    const total = activeMock.qs.length;
    const pct = Math.round((currentQ / total) * 100);
    const answered = Object.keys(answers).length;
    const isLowTime = timeLeft !== null && timeLeft < 120;
    return (
      <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:780, margin:"0 auto", padding:"16px 12px" }}>
        {/* Top bar */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          <button onClick={() => { if(window.confirm("Exit test? Progress will be lost.")) { setMockStarted(false); setTimeLeft(null); }}}
            style={{ padding:"7px 14px", borderRadius:8, border:"1px solid var(--cb-border)", background:"var(--cb-card)", color:"var(--cb-muted)", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
            ← Exit
          </button>
          <div style={{ flex:1, minWidth:120 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--cb-text)", marginBottom:4 }}>{activeMock.exam}</div>
            <div style={{ height:5, background:"rgba(0,0,0,0.05)", borderRadius:3, overflow:"hidden" }}>
              <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${activeMock.color},${activeMock.color}88)`, transition:"width 0.4s", borderRadius:3 }}/>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ background:"var(--cb-card)", border:"1px solid var(--cb-border)", borderRadius:8, padding:"5px 12px", fontSize:12, color:"var(--cb-muted)" }}>
              ✅ {answered}/{total}
            </div>
            {timeLeft !== null && (
              <div style={{ background:isLowTime?"rgba(220,38,38,0.08)":"var(--cb-card)", border:`1px solid ${isLowTime?"rgba(220,38,38,0.2)":"var(--cb-border)"}`, borderRadius:8, padding:"5px 12px", fontSize:13, fontWeight:700, color:isLowTime?"var(--cb-danger)":"var(--cb-muted)", minWidth:60, textAlign:"center" }}>
                ⏱ {fmtTime(timeLeft)}
              </div>
            )}
          </div>
        </div>

        {/* Question */}
        <div style={{ background:"var(--cb-card)", border:`1px solid ${activeMock.color}30`, borderRadius:16, padding:"22px 24px", marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontSize:11, color:activeMock.color, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>Question {currentQ+1} of {total}</span>
            <span style={{ fontSize:11, padding:"3px 10px", borderRadius:50, background:`${activeMock.color}18`, color:activeMock.color, fontWeight:600 }}>{activeMock.difficulty}</span>
          </div>
          <div style={{ fontSize:16, fontWeight:600, color:"var(--cb-text)", lineHeight:1.7, marginBottom:22 }}>{q.q}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {q.opts.map((opt, i) => (
              <button key={i} onClick={() => setAnswers(a => ({ ...a, [currentQ]: i }))}
                style={{ padding:"13px 18px", borderRadius:12, border:`2px solid ${answers[currentQ] === i ? activeMock.color : "var(--cb-border)"}`, background:answers[currentQ] === i ? `${activeMock.color}18` : "var(--cb-surface)", color:answers[currentQ] === i ? "var(--cb-text)" : "var(--cb-muted)", textAlign:"left", fontSize:14, cursor:"pointer", fontFamily:"inherit", fontWeight:answers[currentQ] === i ? 600 : 400, transition:"all 0.15s", display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ width:24, height:24, borderRadius:"50%", border:`2px solid ${answers[currentQ]===i?activeMock.color:"var(--cb-border)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:answers[currentQ]===i?activeMock.color:"var(--cb-muted)", flexShrink:0, background:answers[currentQ]===i?`${activeMock.color}20`:"transparent" }}>{String.fromCharCode(65+i)}</span>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Question navigator */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
          {activeMock.qs.map((_, i) => (
            <button key={i} onClick={() => setCurrentQ(i)}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${i === currentQ ? activeMock.color : answers[i] !== undefined ? `${activeMock.color}60` : "var(--cb-border)"}`, background:i === currentQ ? `${activeMock.color}25` : answers[i] !== undefined ? `${activeMock.color}12` : "var(--cb-card)", color:i === currentQ ? activeMock.color : answers[i] !== undefined ? activeMock.color : "var(--cb-muted)", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {i+1}
            </button>
          ))}
        </div>

        {/* Nav buttons */}
        <div style={{ display:"flex", gap:10 }}>
          {currentQ > 0 && <button onClick={() => setCurrentQ(q => q-1)} style={{ flex:1, padding:12, borderRadius:10, border:"1px solid var(--cb-border)", background:"var(--cb-card)", color:"var(--cb-muted)", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>← Previous</button>}
          {currentQ < total-1
            ? <button onClick={() => setCurrentQ(q => q+1)} style={{ flex:2, padding:12, borderRadius:10, border:"none", background:answers[currentQ] !== undefined ? `linear-gradient(135deg,${activeMock.color},${activeMock.color}aa)` : "var(--cb-card)", color:"#e98383", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:answers[currentQ]===undefined?0.5:1 }}>Next →</button>
            : <button onClick={submitMock} style={{ flex:2, padding:12, borderRadius:10, border:"none", background:"linear-gradient(135deg,var(--cb-success),#059669)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Submit Test ✓</button>}
        </div>
      </div>
    );
  }

  // ─── Score / Results Screen ────────────────────────────────────────────
  if (mockScore !== null && activeMock) {
    const total = activeMock.qs.length;
    const pct = Math.round((mockScore / total) * 100);
    const passed = pct >= 80;
    const remedial = REMEDIAL[activeMock.examKey] || REMEDIAL.gk;
    const grade = pct >= 90 ? { label:"Outstanding 🏆", color:"var(--cb-gold)" } : pct >= 80 ? { label:"Excellent ✅", color:"var(--cb-success)" } : pct >= 60 ? { label:"Good 👍", color:"var(--cb-accent)" } : pct >= 40 ? { label:"Average ⚠️", color:"#f59e0b" } : { label:"Needs Work 💪", color:"var(--cb-danger)" };
    return (
      <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:680, margin:"0 auto", padding:"20px 12px" }}>
        {/* Score card */}
        <div style={{ background:`linear-gradient(135deg,${activeMock.color}12,rgba(0,0,0,0.02))`, border:`1px solid ${activeMock.color}30`, borderRadius:20, padding:"28px 24px", marginBottom:20, textAlign:"center" }}>
          <div style={{ fontSize:56, marginBottom:8 }}>{pct>=80?"🏆":pct>=60?"🎉":pct>=40?"📈":"💪"}</div>
          <h2 style={{ fontSize:24, fontWeight:900, color:"var(--cb-text)", margin:"0 0 4px" }}>Test Complete!</h2>
          <p style={{ fontSize:13, color:"var(--cb-muted)", margin:"0 0 20px" }}>{activeMock.exam}</p>
          <div style={{ display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap", marginBottom:20 }}>
            {[{v:`${mockScore}/${total}`,l:"Score"},{v:`${pct}%`,l:"Percentage"},{v:grade.label,l:"Grade",c:grade.color}].map(({v,l,c})=>(
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:900, color:c||"var(--cb-text)" }}>{v}</div>
                <div style={{ fontSize:11, color:"var(--cb-muted)" }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ height:8, background:"rgba(0,0,0,0.05)", borderRadius:4, overflow:"hidden", marginBottom:8 }}>
            <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${activeMock.color},${activeMock.color}88)`, borderRadius:4, transition:"width 1s" }}/>
          </div>
          <div style={{ fontSize:12, color:"var(--cb-muted)" }}>Pass mark: 80% ({Math.ceil(total*0.8)}/{total} correct)</div>
        </div>

        {/* Answer review */}
        <div style={{ marginBottom:20 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:"var(--cb-text)", marginBottom:12 }}>📋 Answer Review</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:320, overflowY:"auto" }}>
            {activeMock.qs.map((q, i) => {
              const ua = answers[i]; const correct = ua === q.ans;
              return (
                <div key={i} style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${correct?"rgba(22,163,74,0.2)":"rgba(220,38,38,0.2)"}`, background:correct?"rgba(22,163,74,0.05)":"rgba(220,38,38,0.05)", display:"flex", alignItems:"flex-start", gap:10 }}>
                  <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{correct?"✅":"❌"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:"var(--cb-text)", lineHeight:1.5 }}>{i+1}. {q.q}</div>
                    {!correct && <div style={{ fontSize:11, color:"var(--cb-danger)", marginTop:3 }}>Your answer: {ua !== undefined ? q.opts[ua] : "Not answered"} &nbsp;|&nbsp; <span style={{ color:"var(--cb-success)" }}>Correct: {q.opts[q.ans]}</span></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Remedial section (only if failed) */}
        {!passed && (
          <div style={{ background:"rgba(220,38,38,0.05)", border:"1px solid rgba(220,38,38,0.2)", borderRadius:16, padding:"18px 20px", marginBottom:20 }}>
            <h3 style={{ fontSize:14, fontWeight:800, color:"var(--cb-danger)", marginBottom:14 }}>📚 You scored below 80% — Study these to improve:</h3>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--cb-muted)", marginBottom:8 }}>📖 Recommended Books:</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {remedial.books.map((b,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"var(--cb-card)", borderRadius:8, fontSize:12, color:"var(--cb-text)" }}>
                    <span style={{ color:"var(--cb-gold)" }}>📖</span>{b}
                  </div>
                ))}
              </div>
            </div>
            <a href={remedial.yt} target="_blank" rel="noreferrer"
              style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.2)", borderRadius:10, textDecoration:"none", color:"var(--cb-danger)", fontSize:13, fontWeight:700 }}>
              <span style={{ fontSize:18 }}>▶️</span>
              <div>
                <div>Watch Free YouTube Crash Course</div>
                <div style={{ fontSize:11, color:"var(--cb-muted)", fontWeight:400 }}>{activeMock.exam} — Free video lectures</div>
              </div>
              <span style={{ marginLeft:"auto", fontSize:11 }}>→</span>
            </a>
          </div>
        )}

        {passed && (
          <div style={{ background:"rgba(22,163,74,0.08)", border:"1px solid rgba(22,163,74,0.2)", borderRadius:12, padding:"14px 18px", marginBottom:20, fontSize:13, color:"var(--cb-success)", fontWeight:600, textAlign:"center" }}>
            🎉 Congratulations! You passed with {pct}%. Keep practising to maintain your score!
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => startMock(activeMock)} style={{ flex:1, padding:13, borderRadius:10, border:`1px solid ${activeMock.color}40`, background:`${activeMock.color}12`, color:activeMock.color, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🔄 Retry</button>
          <button onClick={() => { setMockScore(null); setActiveMock(null); }} style={{ flex:1, padding:13, borderRadius:10, border:"none", background:"linear-gradient(135deg,var(--cb-accent),var(--cb-accent2))", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>📚 All Tests</button>
        </div>
      </div>
    );
  }

  // ─── Main Screen ───────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", padding:"0 2px" }}>
      {/* Header Banner */}
      <div style={{ background:"linear-gradient(135deg,rgba(34, 63, 125, 0.08),rgba(139,92,246,0.04),rgba(22,163,74,0.04))", border:"1px solid rgba(37,99,235,0.15)", borderRadius:18, padding:"22px 24px", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16, flexWrap:"wrap" }}>
          <div style={{ fontSize:44 }}>📚</div>
          <div>
            <h2 style={{ fontSize:22, fontWeight:900, color:"var(--cb-text)", margin:0, letterSpacing:"-0.5px" }}>Exam Resources & Mock Tests</h2>
            <p style={{ fontSize:13, color:"var(--cb-muted)", margin:"4px 0 0", lineHeight:1.6 }}>Free Books, PDFs, Videos & Live Timed Mock Tests • 18 Exam Categories • 80% Pass Target</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {[{v:"18+",l:"Exam Types",c:"var(--cb-accent)"},{v:`${MOCKS.length}`,l:"Mock Tests",c:"var(--cb-success)"},{v:"100%",l:"All Free",c:"var(--cb-gold)"},{v:"200+",l:"Resources",c:"#8b5cf6"},{v:"80%",l:"Pass Target",c:"var(--cb-danger)"}].map(({v,l,c})=>(
            <div key={l} style={{ background:"var(--cb-card)", border:`1px solid ${c}25`, borderRadius:10, padding:"8px 14px", textAlign:"center", minWidth:60 }}>
              <div style={{ fontSize:16, fontWeight:900, color:c }}>{v}</div>
              <div style={{ fontSize:10, color:"var(--cb-muted)", marginTop:1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
        <button onClick={() => setActiveTab("all")} style={{ padding:"6px 14px", borderRadius:50, border:`1px solid ${activeTab==="all"?"var(--cb-accent)":"var(--cb-border)"}`, background:activeTab==="all"?"rgba(37,99,235,0.08)":"var(--cb-surface)", color:activeTab==="all"?"var(--cb-accent)":"var(--cb-muted)", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>🌐 All</button>
        {EXAMS.map(e => (
          <button key={e.key} onClick={() => setActiveTab(e.key)} style={{ padding:"6px 14px", borderRadius:50, border:`1px solid ${activeTab===e.key?e.color:"var(--cb-border)"}`, background:activeTab===e.key?`${e.color}18`:"var(--cb-surface)", color:activeTab===e.key?e.color:"var(--cb-muted)", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>
            {e.icon} {e.label}
          </button>
        ))}
      </div>

      {/* Section Toggle */}
      <div style={{ display:"flex", gap:8, marginBottom:20, background:"var(--cb-card)", border:"1px solid var(--cb-border)", borderRadius:12, padding:4, width:"fit-content" }}>
        {[{k:"mocks",l:"🎯 Mock Tests"},{k:"books",l:"📖 Books & Resources"}].map(({k,l}) => (
          <button key={k} onClick={() => setActiveSection(k)} style={{ padding:"8px 18px", borderRadius:9, border:"none", background:activeSection===k?"linear-gradient(135deg,var(--cb-accent),var(--cb-accent2))":"transparent", color:activeSection===k?"#fff":"var(--cb-muted)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>{l}</button>
        ))}
      </div>

      {/* ── Mock Tests ── */}
      {activeSection === "mocks" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <h3 style={{ fontSize:15, fontWeight:800, color:"var(--cb-text)", margin:0 }}>
              🎯 Live Mock Tests <span style={{ fontSize:12, color:"var(--cb-muted)", fontWeight:500 }}>— Timed • Scored • With answer review</span>
            </h3>
            <span style={{ fontSize:12, color:"var(--cb-muted)" }}>{filteredMocks.length} tests</span>
          </div>
          {filteredMocks.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--cb-muted)", fontSize:14 }}>No mock tests for this category yet. Try <button onClick={()=>setActiveTab("all")} style={{ background:"none", border:"none", color:"var(--cb-accent)", cursor:"pointer", fontSize:14, fontWeight:600 }}>All Categories</button>.</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:12 }}>
              {filteredMocks.map(m => (
                <div key={m.id} style={{ background:"var(--cb-surface)", border:`1px solid ${m.color}22`, borderRadius:14, padding:"16px 14px", transition:"all 0.2s", cursor:"default" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=m.color; e.currentTarget.style.background=`${m.color}0d`; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${m.color}18`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=`${m.color}22`; e.currentTarget.style.background="var(--cb-surface)"; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <span style={{ fontSize:28 }}>{m.icon}</span>
                    <span style={{ fontSize:10, padding:"3px 8px", borderRadius:50, background:`${m.color}18`, color:m.color, fontWeight:700 }}>{m.difficulty}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:800, color:"var(--cb-text)", marginBottom:4 }}>{m.exam}</div>
                  <div style={{ fontSize:11, color:"var(--cb-muted)", marginBottom:2 }}>📝 {m.questions} Questions • ⏱ {Math.round(m.duration/60)} min</div>
                  <div style={{ fontSize:11, color:"var(--cb-muted)", marginBottom:10 }}>👥 {m.attempts} attempts</div>
                  <div style={{ fontSize:10, color:"var(--cb-muted)", marginBottom:12, lineHeight:1.5 }}>{m.syllabus}</div>
                  <div style={{ display:"flex", gap:6 }}>
                    <div style={{ flex:1, height:2, background:"rgba(0,0,0,0.05)", borderRadius:1, overflow:"hidden", alignSelf:"center" }}>
                      <div style={{ width:"80%", height:"100%", background:`${m.color}60`, borderRadius:1 }}/>
                    </div>
                    <span style={{ fontSize:9, color:"var(--cb-muted)", flexShrink:0 }}>Pass: 80%</span>
                  </div>
                  <button onClick={() => startMock(m)} style={{ width:"100%", marginTop:12, padding:"9px 0", borderRadius:8, border:"none", background:`linear-gradient(135deg,${m.color},${m.color}bb)`, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.3px" }}>
                    Start Test →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Books & Resources ── */}
      {activeSection === "books" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, gap:12, flexWrap:"wrap" }}>
            <h3 style={{ fontSize:15, fontWeight:800, color:"var(--cb-text)", margin:0 }}>
              📖 Books & Study Material <span style={{ fontSize:12, color:"var(--cb-muted)", fontWeight:500 }}>— All Free</span>
            </h3>
            <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--cb-card)", border:"1px solid var(--cb-border)", borderRadius:10, padding:"7px 12px", minWidth:200 }}>
              <span style={{ fontSize:13, color:"var(--cb-muted)" }}>🔍</span>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search books or author..." style={{ background:"transparent", border:"none", outline:"none", color:"var(--cb-text)", fontSize:12, fontFamily:"inherit", flex:1 }}/>
              {searchQ && <button onClick={() => setSearchQ("")} style={{ background:"none", border:"none", color:"var(--cb-muted)", cursor:"pointer", fontSize:12 }}>✕</button>}
            </div>
          </div>
          {searchedBooks.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--cb-muted)", fontSize:14 }}>No books found. Try a different search.</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10 }}>
              {searchedBooks.map((r, i) => {
                const exam = EXAMS.find(e => e.key === r.examKey);
                return (
                  <div key={i} style={{ background:"var(--cb-surface)", border:"1px solid var(--cb-border)", borderRadius:12, padding:"14px 14px", transition:"all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(37,99,235,0.3)"; e.currentTarget.style.background="rgba(37,99,235,0.02)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="var(--cb-border)"; e.currentTarget.style.background="var(--cb-surface)"; }}>
                    <div style={{ display:"flex", gap:10, marginBottom:8 }}>
                      <span style={{ fontSize:26, flexShrink:0, marginTop:2 }}>{r.type}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"var(--cb-text)", lineHeight:1.4, marginBottom:2 }}>{r.title}</div>
                        <div style={{ fontSize:11, color:"var(--cb-muted)" }}>by {r.author}</div>
                      </div>
                    </div>
                    {r.desc && <div style={{ fontSize:11, color:"var(--cb-muted)", lineHeight:1.6, marginBottom:10, paddingLeft:36 }}>{r.desc}</div>}
                    <div style={{ display:"flex", gap:6, alignItems:"center", paddingLeft:36, flexWrap:"wrap" }}>
                      {exam && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:50, background:`${exam.color}15`, color:exam.color, fontWeight:600 }}>{exam.icon} {exam.label}</span>}
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:50, background:"rgba(22,163,74,0.12)", color:"var(--cb-success)", fontWeight:700 }}>FREE</span>
                      <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
                        <a href={r.link} target="_blank" rel="noreferrer" style={{ fontSize:10, padding:"4px 10px", borderRadius:6, background:"rgba(37,99,235,0.08)", border:"1px solid rgba(37,99,235,0.2)", color:"var(--cb-accent)", textDecoration:"none", fontWeight:600 }}>📥 Get</a>
                        <a href={r.youtube} target="_blank" rel="noreferrer" style={{ fontSize:10, padding:"4px 10px", borderRadius:6, background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.2)", color:"var(--cb-danger)", textDecoration:"none", fontWeight:600 }}>▶ YouTube</a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function NoAccess({ title, msg }) {
  return <div style={{textAlign:"center",padding:"60px 20px",background:"var(--cb-card)",border:"1px solid var(--cb-border)",borderRadius:"16px"}}><div style={{fontSize:"48px",marginBottom:"14px"}}>🚫</div><h3 style={{fontSize:"18px",fontWeight:700,color:"var(--cb-text)",marginBottom:"8px"}}>{title}</h3><p style={{fontSize:"14px",color:"var(--cb-muted)"}}>{msg}</p></div>;
}

function FI({ label, val, set, type="text", placeholder="" }) {
  return (
    <div>
      <label style={D.label}>{label}</label>
      <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={placeholder} style={D.input}/>
    </div>
  );
}

function timeAgo(iso) {
  if(!iso) return "";
  const m=Math.floor((Date.now()-new Date(iso).getTime())/60000);
  if(m<1) return "Just now"; if(m<60) return `${m}m ago`;
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}

const S = {
  root:{display:"flex",height:"100vh",background:"var(--cb-bg)",overflow:"hidden",color:"var(--cb-text)"},
  main:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},
  topbar:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 20px",background:"var(--cb-surface)",borderBottom:"1px solid var(--cb-border)",flexShrink:0},
  backBtn:{background:"rgba(217,119,6,0.08)",border:"1px solid rgba(217,119,6,0.2)",color:"var(--cb-gold)",padding:"7px 14px",borderRadius:"8px",fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  pageTitle:{fontSize:"18px",fontWeight:800,color:"var(--cb-text)",fontFamily:"'Playfair Display',serif"},
  iconBtn:{background:"var(--cb-card)",border:"1px solid var(--cb-border)",borderRadius:"9px",width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",cursor:"pointer",color:"var(--cb-text)"},
  dot:{position:"absolute",top:"5px",right:"5px",width:"7px",height:"7px",borderRadius:"50%"},
  profileBtn:{display:"flex",alignItems:"center",gap:"10px",background:"var(--cb-card)",border:"1px solid var(--cb-border)",borderRadius:"12px",padding:"8px 14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  pAvatar:{width:"32px",height:"32px",borderRadius:"9px",background:"linear-gradient(135deg,var(--cb-accent),var(--cb-gold))",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"14px",color:"#fff",flexShrink:0},
  content:{flex:1,overflowY:"auto",padding:"20px 22px"},
};

const D = {
  overline:{fontSize:"11px",fontWeight:700,letterSpacing:"3px",textTransform:"uppercase",color:"var(--cb-gold)",marginBottom:"4px"},
  title:{fontSize:"26px",fontWeight:900,color:"var(--cb-text)",fontFamily:"'Playfair Display',serif"},
  welcome:{background:"linear-gradient(135deg,rgba(37,99,235,0.08),rgba(217,119,6,0.04))",border:"1px solid rgba(217,119,6,0.15)",borderRadius:"20px",padding:"24px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"16px",position:"relative",overflow:"hidden"},
  welcomeGlow:{position:"absolute",top:"-50%",right:0,width:"400px",height:"200%",background:"radial-gradient(ellipse,rgba(217,119,6,0.08),transparent 70%)",pointerEvents:"none"},
  btnGold:{background:"linear-gradient(135deg,var(--cb-gold),#f59e0b)",color:"#fff",border:"none",borderRadius:"10px",padding:"10px 20px",fontSize:"13px",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  btnOut:{background:"var(--cb-surface)",border:"1px solid var(--cb-border)",color:"var(--cb-text)",borderRadius:"10px",padding:"10px 18px",fontSize:"13px",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  btnBlue:{background:"linear-gradient(135deg,var(--cb-accent),var(--cb-accent2))",color:"#fff",border:"none",borderRadius:"9px",padding:"10px 18px",fontSize:"13px",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  btnOutline:{background:"transparent",border:"1px solid var(--cb-border)",color:"var(--cb-muted)",borderRadius:"8px",padding:"8px 14px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  statCard:{background:"var(--cb-surface)",border:"1px solid var(--cb-border)",borderRadius:"15px",padding:"16px",display:"flex",gap:"12px",alignItems:"center"},
  statIcon:{width:"42px",height:"42px",borderRadius:"11px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"19px",flexShrink:0},
  card:{background:"var(--cb-surface)",border:"1px solid var(--cb-border)",borderRadius:"16px",padding:"18px"},
  cardTitle:{fontSize:"14px",fontWeight:700,color:"var(--cb-text)",marginBottom:"12px"},
  qaBtn:{display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",padding:"12px 14px",background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.15)",borderRadius:"12px",color:"var(--cb-accent)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",minWidth:"76px"},
  label:{display:"block",fontSize:"12px",fontWeight:600,color:"var(--cb-muted)",marginBottom:"6px"},
  input:{width:"100%",background:"var(--cb-surface)",border:"1px solid var(--cb-border)",borderRadius:"10px",padding:"12px 14px",color:"var(--cb-text)",fontSize:"14px",outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box"},
  select:{width:"100%",background:"var(--cb-surface)",border:"1px solid var(--cb-border)",borderRadius:"10px",padding:"12px 14px",color:"var(--cb-text)",fontSize:"14px",outline:"none",fontFamily:"'DM Sans',sans-serif"},
};
