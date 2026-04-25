import React, { useEffect, useState } from "react";
import { API, getServerReachabilityHelp } from "../config";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
const GOOGLE_CONFIGURED = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes("your_") && GOOGLE_CLIENT_ID.length > 20;

const SEEKER_PERKS = [
  { icon:"🤖", text:"AI-matched job recommendations" },
  { icon:"📄", text:"Smart resume analysis & scoring" },
  { icon:"🏛️", text:"20+ Govt + Private job listings" },
  { icon:"🧭", text:"Free AI career counseling 24/7" },
];
const RECRUITER_PERKS = [
  { icon:"🎯", text:"AI-ranked candidate shortlists" },
  { icon:"📊", text:"Talent pool analytics dashboard" },
  { icon:"⚡", text:"One-click bulk outreach" },
  { icon:"🔍", text:"Advanced skill-based filters" },
];

export default function Login() {
  const [viewportW, setViewportW] = useState(() => window.innerWidth);
  const [role,    setRole]    = useState(null);
  const [mode,    setMode]    = useState("login");
  const [step,    setStep]    = useState(0);
  const [form,    setForm]    = useState({ name:"", email:"", password:"", confirm:"", org:"", phone:"" });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [gLoading,setGLoading]= useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [showGInfo, setShowGInfo] = useState(false);

  const isSk = role === "seeker";
  const isMobile = viewportW < 768;
  const isTablet = viewportW < 1024;
  const acc  = isSk ? "#3b82f6" : "#d4af37";
  const grad = isSk ? "linear-gradient(135deg,#1e3a8a,#2563eb)" : "linear-gradient(135deg,#92400e,#d4af37)";

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const pick = (r) => { setRole(r); setStep(1); setError(""); setSuccess(""); };
  const back = () => {
    setStep(0); setRole(null); setError(""); setSuccess("");
    setForm({ name:"",email:"",password:"",confirm:"",org:"",phone:"" });
  };

  const afterLogin = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user",  JSON.stringify(data.user));
    setSuccess(`${data.message || "Welcome"}, ${data.user.name}! Redirecting...`);
    setTimeout(() => {
      window.location.href = data.user.role === "recruiter" ? "/dashboard/recruiter" : "/dashboard";
    }, 1200);
  };

  // ── Google Login ─────────────────────────────────
  const handleGoogleLogin = () => {
    if (!GOOGLE_CONFIGURED) {
      setShowGInfo(true);
      return;
    }

    setGLoading(true);
    setError("");

    // Load Google script dynamically
    if (!window.google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.onload = () => initGoogleLogin();
      script.onerror = () => { setError("Failed to load Google Sign-In. Check internet connection."); setGLoading(false); };
      document.head.appendChild(script);
    } else {
      initGoogleLogin();
    }
  };

  const initGoogleLogin = () => {
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const res  = await fetch(`${API}/api/auth/google`, {
              method:  "POST",
              headers: { "Content-Type":"application/json" },
              body:    JSON.stringify({ credential: response.credential, role: role || "seeker" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Google login failed");
            afterLogin(data);
          } catch (err) {
            setError(friendlyFetchError(err));
          } finally {
            setGLoading(false);
          }
        },
      });
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setGLoading(false);
          setError("Google sign-in popup was blocked. Please allow popups for this site.");
        }
      });
    } catch (err) {
      setGLoading(false);
      setError("Google login failed: " + friendlyFetchError(err));
    }
  };

  // ── Email Submit ──────────────────────────────────
  const validate = () => {
    if (!form.email || !form.password) return "Email and password are required.";
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Enter a valid email address.";
    if (mode === "register") {
      if (!form.name.trim())             return "Full name is required.";
      if (form.password.length < 6)      return "Password must be at least 6 characters.";
      if (form.password !== form.confirm) return "Passwords do not match.";
      if (!isSk && !form.org.trim())     return "Organisation name is required.";
    }
    return null;
  };

  const friendlyFetchError = (err) => {
    const msg = String(err?.message || "");
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      return getServerReachabilityHelp(API);
    }
    return msg || "Something went wrong.";
  };

  const submit = async () => {
    setError(""); setSuccess("");
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body     = mode === "login"
        ? { email:form.email, password:form.password, role }
        : { name:form.name, email:form.email, password:form.password, role,
            phone:        isSk  ? form.phone : undefined,
            organisation: !isSk ? form.org   : undefined };

      const res  = await fetch(`${API}${endpoint}`, {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      afterLogin(data);
    } catch (err) {
      setError(friendlyFetchError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...s.root, alignItems:isMobile ? "flex-start" : "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .rcard:hover{transform:translateY(-6px) scale(1.02)!important;box-shadow:0 24px 60px rgba(0,0,0,0.5)!important}
        input::placeholder{color:#2d3f55}
        input:focus{outline:none;border-color:var(--a)!important;box-shadow:0 0 0 3px var(--ag)!important}
      `}</style>

      <div style={s.bgGrid}/>

      {/* Logo */}
      <div style={{ ...s.logo, top:isMobile ? "16px" : "22px", left:isMobile ? "16px" : "30px", right:isMobile ? "16px" : "auto", justifyContent:isMobile ? "center" : "flex-start" }}>
        <span style={{fontSize:"20px"}}>⚡</span>
        <span style={{fontSize:"18px",fontWeight:800,color:"#fff",fontFamily:"'Playfair Display',serif"}}>CareerBharat</span>
        <span style={s.badge}>AI</span>
      </div>

      {/* ── STEP 0: Role Picker ── */}
      {step === 0 && (
        <div style={{ ...s.center, padding:isMobile ? "88px 18px 40px" : "100px 40px 60px" }}>
          <div style={{textAlign:"center",marginBottom:"40px",animation:"fadeUp 0.5s ease both"}}>
            <div style={s.overline}>India's #1 AI Career Platform</div>
            <h1 style={{ ...s.bigTitle, fontSize:isMobile ? "clamp(34px,12vw,52px)" : s.bigTitle.fontSize }}>I am a...</h1>
            <p style={{color:"#475569",fontSize:"15px"}}>Choose your role for a personalised experience</p>
          </div>

          <div style={{ ...s.cardsRow, flexDirection:isMobile ? "column" : "row", flexWrap:isMobile ? "wrap" : "nowrap", maxWidth:isMobile ? "420px" : "800px", gap:isMobile ? "14px" : "18px" }}>
            {/* Seeker Card */}
            <div className="rcard" onClick={()=>pick("seeker")} style={{ ...s.rcard, width:isMobile ? "100%" : "320px" }}>
              <div style={{...s.rcTop,background:"linear-gradient(135deg,#0f2460,#1e40af)"}}>
                <div style={s.rcEmoji}>🎓</div>
                <div style={s.rcName}>Job Seeker</div>
                <div style={s.rcSub}>Student · Fresher · Career Changer</div>
              </div>
              <div style={s.rcBody}>
                {SEEKER_PERKS.map((p,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"16px"}}>{p.icon}</span>
                    <span style={{fontSize:"13px",color:"#94a3b8"}}>{p.text}</span>
                  </div>
                ))}
                <div style={{...s.rcBtn,background:"linear-gradient(135deg,#1e40af,#3b82f6)"}}>Get Started Free →</div>
              </div>
              <div style={{...s.rcBar,background:"#3b82f6"}}/>
            </div>

            {/* OR */}
            <div style={{display:"flex",flexDirection:isMobile ? "row" : "column",alignItems:"center",justifyContent:"center",gap:"8px",flexShrink:0,width:isMobile ? "100%" : "auto"}}>
              <div style={{width:isMobile ? "80px" : "1px",height:isMobile ? "1px" : "auto",flex:1,background:"rgba(255,255,255,0.07)"}}/>
              <span style={{fontSize:"11px",color:"#334155",fontWeight:700,letterSpacing:"2px"}}>OR</span>
              <div style={{width:isMobile ? "80px" : "1px",height:isMobile ? "1px" : "auto",flex:1,background:"rgba(255,255,255,0.07)"}}/>
            </div>

            {/* Recruiter Card */}
            <div className="rcard" onClick={()=>pick("recruiter")} style={{ ...s.rcard, width:isMobile ? "100%" : "320px" }}>
              <div style={{...s.rcTop,background:"linear-gradient(135deg,#431407,#92400e)"}}>
                <div style={s.rcEmoji}>🏢</div>
                <div style={s.rcName}>Recruiter</div>
                <div style={s.rcSub}>HR · Hiring Manager · Employer</div>
              </div>
              <div style={s.rcBody}>
                {RECRUITER_PERKS.map((p,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"16px"}}>{p.icon}</span>
                    <span style={{fontSize:"13px",color:"#94a3b8"}}>{p.text}</span>
                  </div>
                ))}
                <div style={{...s.rcBtn,background:"linear-gradient(135deg,#92400e,#d4af37)"}}>Post Jobs Free →</div>
              </div>
              <div style={{...s.rcBar,background:"#d4af37"}}/>
            </div>
          </div>

          <p style={{color:"#475569",fontSize:"14px",marginTop:"24px"}}>
            Already have an account?{" "}
            <span style={{color:"#3b82f6",fontWeight:700,cursor:"pointer"}}
              onClick={()=>{pick("seeker");setMode("login");}}>
              Sign in
            </span>
          </p>
        </div>
      )}

      {/* ── STEP 1: Login Form ── */}
      {step === 1 && (
        <div style={{ ...s.split, flexDirection:isTablet ? "column" : "row" }}>
          {/* Left Panel */}
          <div style={{...s.left,background:grad,width:isTablet ? "100%" : "42%",minHeight:isTablet ? "auto" : "100vh",padding:isMobile ? "88px 20px 28px" : isTablet ? "88px 28px 36px" : "80px 44px"}}>
            <div style={{position:"relative",zIndex:1}}>
              <div style={s.leftBadge}>{isSk?"🎓 Job Seeker Portal":"🏢 Recruiter Portal"}</div>
              <h2 style={{ ...s.leftTitle, fontSize:isMobile ? "clamp(28px,9vw,38px)" : s.leftTitle.fontSize }}>{isSk?"Your Dream\nJob Awaits":"Find Your\nNext Star"}</h2>
              <p style={s.leftSub}>
                {isSk?"Join 1.2 lakh+ students using AI to land dream jobs across govt & private sectors."
                     :"Access India's largest verified talent pool with AI-powered candidate matching."}
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:"13px",marginBottom:"28px"}}>
                {(isSk?SEEKER_PERKS:RECRUITER_PERKS).map((p,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"12px"}}>
                    <span style={{fontSize:"18px",width:"36px",height:"36px",background:"rgba(255,255,255,0.12)",borderRadius:"9px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{p.icon}</span>
                    <span style={{fontSize:"14px",color:"rgba(255,255,255,0.82)"}}>{p.text}</span>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",background:"rgba(255,255,255,0.08)",borderRadius:"12px",overflow:"hidden"}}>
                {[["50K+","Jobs"],["1.2L+","Users"],["Free","Forever"]].map(([n,l],i)=>(
                  <React.Fragment key={i}>
                    <div style={{flex:1,padding:"12px 8px",textAlign:"center"}}>
                      <div style={{fontSize:"17px",fontWeight:900,color:"#fff"}}>{n}</div>
                      <div style={{fontSize:"10px",color:"rgba(255,255,255,0.45)",letterSpacing:"1px",textTransform:"uppercase"}}>{l}</div>
                    </div>
                    {i<2&&<div style={{width:"1px",background:"rgba(255,255,255,0.1)",margin:"8px 0"}}/>}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div style={{position:"absolute",top:-80,right:-80,width:280,height:280,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.09)",pointerEvents:"none"}}/>
          </div>

          {/* Right Form */}
          <div style={{ ...s.right, minHeight:isTablet ? "auto" : "100vh", padding:isMobile ? "24px 18px 42px" : "80px 36px" }}>
            <button onClick={back} style={{ ...s.backBtn, top:isTablet ? "16px" : "22px", left:isTablet ? "18px" : "22px" }}>← Change Role</button>

            <div style={{width:"100%",maxWidth:isMobile ? "100%" : "420px",animation:"slideIn 0.4s ease both",marginTop:isTablet ? "28px" : 0}}>
              {/* Role pill */}
              <div style={{display:"inline-block",background:isSk?"rgba(59,130,246,0.1)":"rgba(212,175,55,0.1)",border:`1px solid ${acc}44`,color:acc,padding:"5px 14px",borderRadius:"50px",fontSize:"12px",fontWeight:700,marginBottom:"20px"}}>
                {isSk?"🎓 Job Seeker":"🏢 Recruiter"}
              </div>

              {/* Tabs */}
              <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.07)",marginBottom:"22px"}}>
                {["login","register"].map(m=>(
                  <button key={m}
                    onClick={()=>{setMode(m);setError("");setSuccess("");}}
                    style={{flex:1,background:"transparent",border:"none",borderBottom:mode===m?`2px solid ${acc}`:"2px solid transparent",color:mode===m?acc:"#475569",padding:"11px",fontSize:"14px",fontWeight:700,cursor:"pointer",marginBottom:"-1px",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"}}>
                    {m==="login"?"Sign In":"Create Account"}
                  </button>
                ))}
              </div>

              <h2 style={{fontSize:"22px",fontWeight:800,color:"#fff",marginBottom:"4px",fontFamily:"'Playfair Display',serif"}}>
                {mode==="login"?`Welcome back ${isSk?"👋":"🤝"}`:isSk?"Start Your Journey 🚀":"Start Hiring Smarter 🎯"}
              </h2>
              <p style={{fontSize:"13px",color:"#475569",marginBottom:"20px"}}>
                {mode==="login"?"Sign in to your dashboard":"Create your free account in 2 minutes"}
              </p>

              {/* ── GOOGLE BUTTON ── */}
              <button onClick={handleGoogleLogin} disabled={gLoading}
                style={s.googleBtn}>
                {gLoading ? (
                  <span style={{width:"18px",height:"18px",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block"}}/>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>{mode==="login"?"Continue with Google":"Sign up with Google"}</span>
                {!GOOGLE_CONFIGURED && <span style={{fontSize:"10px",color:"#f87171",marginLeft:"4px"}}>(Setup required)</span>}
              </button>

              {/* Google Setup Info */}
              {showGInfo && (
                <div style={{background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.25)",borderRadius:"10px",padding:"14px",marginBottom:"14px",fontSize:"12px",color:"#fed7aa"}}>
                  <div style={{fontWeight:700,color:"#fb923c",marginBottom:"8px"}}>⚙️ Google Login Setup Required</div>
                  <div style={{lineHeight:1.7}}>
                    1. Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{color:"#60a5fa"}}>console.cloud.google.com</a><br/>
                    2. APIs & Services → Credentials → OAuth 2.0 Client ID<br/>
                    3. Add <code style={{background:"rgba(255,255,255,0.1)",padding:"1px 5px",borderRadius:"3px"}}>http://localhost:3000</code> and your computer IP origin, like <code style={{background:"rgba(255,255,255,0.1)",padding:"1px 5px",borderRadius:"3px"}}>http://192.168.x.x:3000</code>, to authorized origins<br/>
                    4. Copy Client ID → paste in <code style={{background:"rgba(255,255,255,0.1)",padding:"1px 5px",borderRadius:"3px"}}>mini/.env</code> as:<br/>
                    <code style={{background:"rgba(255,255,255,0.1)",padding:"2px 6px",borderRadius:"3px",display:"inline-block",marginTop:"4px"}}>REACT_APP_GOOGLE_CLIENT_ID=your_id</code>
                  </div>
                  <button onClick={()=>setShowGInfo(false)} style={{marginTop:"10px",background:"none",border:"1px solid rgba(255,255,255,0.15)",color:"#94a3b8",padding:"5px 12px",borderRadius:"6px",cursor:"pointer",fontSize:"11px",fontFamily:"'DM Sans',sans-serif"}}>
                    Got it ✕
                  </button>
                </div>
              )}

              {/* OR divider */}
              <div style={{display:"flex",alignItems:"center",gap:"12px",margin:"14px 0"}}>
                <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.07)"}}/>
                <span style={{fontSize:"12px",color:"#334155",fontWeight:600}}>or with email</span>
                <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.07)"}}/>
              </div>

              {/* Alerts */}
              {error   && <div style={s.alertErr}>⚠️ &nbsp;{error}</div>}
              {success && <div style={s.alertOk}>✅ &nbsp;{success}</div>}

              {/* Form Fields */}
              <div style={{display:"flex",flexDirection:"column",gap:"13px",marginBottom:"16px"}}>
                {mode==="register" && (
                  <Field label="Full Name" placeholder={isSk?"e.g. Priya Sharma":"e.g. Rahul Verma"}
                    value={form.name} onChange={v=>setForm({...form,name:v})} acc={acc}/>
                )}
                {mode==="register" && !isSk && (
                  <Field label="Organisation" placeholder="e.g. Infosys, TCS, Startup"
                    value={form.org} onChange={v=>setForm({...form,org:v})} acc={acc}/>
                )}
                {mode==="register" && isSk && (
                  <Field label="Phone Number" placeholder="+91 98765 43210"
                    value={form.phone} onChange={v=>setForm({...form,phone:v})} acc={acc}/>
                )}
                <Field label="Email Address" type="email" placeholder="you@example.com"
                  value={form.email} onChange={v=>setForm({...form,email:v})} acc={acc}/>

                {/* Password with eye toggle */}
                <div>
                  <label style={s.label}>Password</label>
                  <div style={{position:"relative"}}>
                    <input type={showPw?"text":"password"}
                      style={{...s.inp,"--a":acc,"--ag":`${acc}44`,paddingRight:"44px"}}
                      placeholder="••••••••" value={form.password}
                      onChange={e=>setForm({...form,password:e.target.value})}
                      onKeyDown={e=>e.key==="Enter"&&submit()}/>
                    <button onClick={()=>setShowPw(!showPw)}
                      style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"15px"}}>
                      {showPw?"🙈":"👁️"}
                    </button>
                  </div>
                </div>

                {mode==="register" && (
                  <Field label="Confirm Password" type="password" placeholder="••••••••"
                    value={form.confirm} onChange={v=>setForm({...form,confirm:v})}
                    acc={acc} onEnter={submit}/>
                )}

                {mode==="login" && (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile ? "flex-start" : "center",flexDirection:isMobile ? "column" : "row",gap:isMobile ? "10px" : 0}}>
                    <label style={{display:"flex",alignItems:"center",gap:"7px",fontSize:"13px",color:"#64748b",cursor:"pointer"}}>
                      <input type="checkbox" style={{accentColor:acc}}/> Remember me
                    </label>
                    <span style={{fontSize:"13px",color:acc,fontWeight:600,cursor:"pointer"}}>
                      Forgot password?
                    </span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button onClick={submit} disabled={loading}
                style={{width:"100%",background:grad,color:"#fff",border:"none",padding:"14px",borderRadius:"11px",fontSize:"14px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",marginBottom:"16px",fontFamily:"'DM Sans',sans-serif",opacity:loading?0.7:1,transition:"all 0.2s"}}>
                {loading ? (
                  <><span style={s.spinner}/> Processing...</>
                ) : mode==="login"
                  ? `Sign In as ${isSk?"Job Seeker":"Recruiter"} →`
                  : `Create ${isSk?"Seeker":"Recruiter"} Account →`}
              </button>

              {/* Email notification note */}
              <p style={{fontSize:"11px",color:"#334155",textAlign:"center",marginBottom:"14px"}}>
                📧 You'll receive a confirmation email after {mode==="register"?"registration":"login"}
              </p>

              {/* Switch mode */}
              <div style={{textAlign:"center",fontSize:"13px",color:"#475569"}}>
                {mode==="login"?"Don't have an account? ":"Already registered? "}
                <span style={{color:acc,fontWeight:700,cursor:"pointer"}}
                  onClick={()=>{setMode(mode==="login"?"register":"login");setError("");setSuccess("");}}>
                  {mode==="login"?"Sign up free":"Sign in"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable field component ─────────────────────────
function Field({ label, placeholder, value, onChange, type="text", acc, onEnter }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <input type={type}
        style={{...s.inp,"--a":acc,"--ag":`${acc}44`}}
        placeholder={placeholder} value={value}
        onChange={e=>onChange(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&onEnter&&onEnter()}/>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────
const s = {
  root:      { minHeight:"100vh", background:"#060e1f", color:"#e2e8f0", fontFamily:"'DM Sans',sans-serif", position:"relative", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" },
  bgGrid:    { position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(212,175,55,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.03) 1px,transparent 1px)", backgroundSize:"50px 50px", pointerEvents:"none", zIndex:0 },
  logo:      { position:"fixed", top:"22px", left:"30px", display:"flex", alignItems:"center", gap:"8px", zIndex:200 },
  badge:     { background:"linear-gradient(135deg,#d4af37,#f59e0b)", color:"#000", fontSize:"9px", fontWeight:800, padding:"2px 6px", borderRadius:"4px", letterSpacing:"1px" },
  center:    { display:"flex", flexDirection:"column", alignItems:"center", padding:"100px 40px 60px", zIndex:1, width:"100%" },
  overline:  { fontSize:"11px", fontWeight:700, letterSpacing:"3px", textTransform:"uppercase", color:"#d4af37", marginBottom:"10px" },
  bigTitle:  { fontSize:"clamp(44px,7vw,78px)", fontWeight:900, color:"#fff", margin:"0 0 8px", fontFamily:"'Playfair Display',serif", letterSpacing:"-2px" },
  cardsRow:  { display:"flex", flexDirection:"row", flexWrap:"nowrap", alignItems:"stretch", justifyContent:"center", gap:"18px", width:"100%", maxWidth:"800px" },
  rcard:     { width:"320px", flexShrink:0, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:"22px", overflow:"hidden", cursor:"pointer", position:"relative", transition:"transform 0.35s cubic-bezier(.34,1.56,.64,1),box-shadow 0.35s ease", boxShadow:"0 4px 30px rgba(0,0,0,0.28)" },
  rcTop:     { padding:"32px 22px 24px", textAlign:"center" },
  rcEmoji:   { fontSize:"44px", marginBottom:"10px" },
  rcName:    { fontSize:"22px", fontWeight:900, color:"#fff", fontFamily:"'Playfair Display',serif", marginBottom:"5px" },
  rcSub:     { fontSize:"12px", color:"rgba(255,255,255,0.55)" },
  rcBody:    { padding:"18px 22px 22px", display:"flex", flexDirection:"column", gap:"10px" },
  rcBtn:     { color:"#fff", padding:"12px", borderRadius:"9px", fontSize:"13px", fontWeight:700, textAlign:"center", marginTop:"4px" },
  rcBar:     { position:"absolute", bottom:0, left:0, right:0, height:"3px" },
  split:     { display:"flex", flexDirection:"row", width:"100%", minHeight:"100vh", position:"relative", zIndex:1 },
  left:      { width:"42%", minHeight:"100vh", padding:"80px 44px", display:"flex", alignItems:"center", position:"relative", overflow:"hidden", flexShrink:0 },
  leftBadge: { display:"inline-block", background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.22)", color:"#fff", padding:"7px 16px", borderRadius:"50px", fontSize:"13px", fontWeight:600, marginBottom:"24px" },
  leftTitle: { fontSize:"clamp(30px,4vw,48px)", fontWeight:900, color:"#fff", fontFamily:"'Playfair Display',serif", lineHeight:1.15, marginBottom:"14px", whiteSpace:"pre-line", letterSpacing:"-1.5px" },
  leftSub:   { fontSize:"14px", color:"rgba(255,255,255,0.62)", lineHeight:1.7, marginBottom:"26px", maxWidth:"300px" },
  right:     { flex:1, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 36px", overflowY:"auto", position:"relative" },
  backBtn:   { position:"absolute", top:"22px", left:"22px", background:"transparent", border:"1px solid rgba(255,255,255,0.09)", color:"#475569", padding:"7px 14px", borderRadius:"8px", fontSize:"12px", fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" },
  googleBtn: { width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", color:"#fff", padding:"13px", borderRadius:"10px", fontSize:"14px", fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s", marginBottom:"4px" },
  alertErr:  { background:"rgba(239,68,68,0.09)", border:"1px solid rgba(239,68,68,0.25)", color:"#fca5a5", padding:"11px 14px", borderRadius:"9px", fontSize:"13px", marginBottom:"14px" },
  alertOk:   { background:"rgba(34,197,94,0.09)", border:"1px solid rgba(34,197,94,0.25)", color:"#86efac", padding:"11px 14px", borderRadius:"9px", fontSize:"13px", marginBottom:"14px" },
  label:     { display:"block", fontSize:"12px", fontWeight:600, color:"#94a3b8", marginBottom:"6px" },
  inp:       { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:"10px", padding:"12px 15px", color:"#fff", fontSize:"14px", width:"100%", boxSizing:"border-box", transition:"border-color 0.2s,box-shadow 0.2s", fontFamily:"'DM Sans',sans-serif" },
  spinner:   { width:"16px", height:"16px", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite", display:"inline-block" },
};
