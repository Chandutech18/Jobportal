import React, { useState, useEffect } from "react";

const STATS = [
  { value:"50,000+", label:"Job Listings" },
  { value:"1.2L+",   label:"Students Helped" },
  { value:"500+",    label:"Govt Exams" },
  { value:"Free",    label:"Forever" },
];

const FEATURES = [
  { icon:"🤖", title:"AI Job Recommendations",  desc:"NLP engine matches your profile to govt & private jobs with accuracy scores." },
  { icon:"📄", title:"Smart Resume Analyzer",   desc:"Upload resume for instant AI feedback, skill gaps & ATS score." },
  { icon:"🏛️", title:"Government Job Hub",      desc:"SSC, UPSC, PSU, Railways — every central & state govt job in one place." },
  { icon:"📚", title:"Exam Prep Resources",     desc:"Mock tests, past papers & study material for all major competitive exams." },
  { icon:"💼", title:"Private Sector Jobs",     desc:"Curated MNC, startup & SME jobs for freshers to experienced professionals." },
  { icon:"🧭", title:"AI Career Counselor",     desc:"24/7 Gemini-powered chatbot for personalised career roadmap guidance." },
];

const PATHS = [
  { label:"10th Pass",    icon:"🎒", color:"#f59e0b" },
  { label:"12th Pass",    icon:"🎓", color:"#3b82f6" },
  { label:"Diploma",      icon:"📋", color:"#8b5cf6" },
  { label:"Graduate",     icon:"🏆", color:"#10b981" },
  { label:"Postgraduate", icon:"⭐", color:"#ef4444" },
  { label:"Career Change",icon:"🔄", color:"#f97316" },
  { label:""}
];

const TESTIMONIALS = [
  { name:"Priya Sharma",  role:"SBI PO Selected",          from:"Lucknow, UP",  text:"This portal guided me from 12th pass to a bank job. The AI matched me perfectly!", avatar:"PS" },
  { name:"Rahul Verma",   role:"Software Engineer @ TCS",  from:"Patna, Bihar", text:"As a first-gen college student I had no guidance. The AI chatbot became my career counselor.", avatar:"RV" },
  { name:"Anjali Patel",  role:"UPSC CSE Selected",        from:"Bhopal, MP",   text:"The exam resources and govt job listings kept me focused. Cracked UPSC in second attempt!", avatar:"AP" },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [hovered,  setHovered]  = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg,  setChatMsg]  = useState("");
  const [chatLog,  setChatLog]  = useState([{ from:"ai", text:"Namaste! 🙏 I'm your AI Career Counselor. What's your education level and what kind of job are you looking for?" }]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    setChatLog(p => [...p,
      { from:"user", text:chatMsg },
      { from:"ai",   text:"Great! Based on your profile I recommend exploring AI-matched job opportunities. Click 'Get Started' to create your free account and see personalised recommendations!" }

    ]);
    setChatMsg("");
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes float{from{transform:translateY(0)}to{transform:translateY(-14px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .nav-link:hover{color:#fff!important}
        .feat-card:hover{background:rgba(160, 168, 196, 0.15)!important;border-color:rgba(212,175,55,0.3)!important;transform:translateY(-4px)}
        .path-card:hover{transform:translateY(-6px) scale(1.03)!important}
        input::placeholder{color:#334155}
      `}</style>

      <div style={s.bgGrid}/>
      <div style={s.glow1}/>
      <div style={s.glow2}/>

      {/* NAV */}
      <nav style={{...s.nav,...(scrolled?s.navScroll:{})}}>
        <div style={s.navInner}>
          <div style={s.logo}>
            <span style={s.logoMark}>⚡</span>
            <span style={s.logoName}>CareerBharat</span>
            <span style={s.logoBadge}>AI</span>
          </div>
          <div style={s.navLinks}>
            {["Home","Jobs","Resources","Exam Prep","Career Advice","About"].map(l=>(
              <a key={l} className="nav-link" href="#" style={s.navLink}>{l}</a>
            ))}
          </div>
          <div style={{display:"flex",gap:"10px"}}>
            <button onClick={()=>window.location.href="/login"} style={s.btnOutline}>Login</button>
            <button onClick={()=>window.location.href="/login"} style={s.btnPrimary}>Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={s.hero}>
        <div style={{flex:1,maxWidth:"600px",animation:"fadeUp 0.7s ease both"}}>
          <div style={s.heroBadge}><span style={{width:8,height:8,borderRadius:"50%",background:"#806b27",animation:"pulse 2s infinite",display:"inline-block"}}/> India's #1 AI-Powered Career Platform</div>
          <h1 style={s.heroTitle}>Your Dream Career<br/><span style={s.heroGold}>Starts Here</span></h1>
          <p style={s.heroSub}>From 10th class to post-graduate — find government jobs, private roles, exam resources & personalised AI career guidance. All in one place, completely free.</p>
          <div style={s.searchBox}>
            <span style={{fontSize:"16px"}}>🔍</span>
            <input style={s.searchInput} placeholder="Search jobs, exams, skills, career paths..."/>
            <button onClick={()=>window.location.href="/login"} style={s.searchBtn}>Find Opportunities</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
            {["SSC CGL","UPSC","Banking Jobs","IT Sector","Railway Jobs","State PSC",].map(t=>(
              <span key={t} style={s.tag}>{t}</span>
            ))}
          </div>
        </div>

        {/* Hero Card */}
        <div style={{flex:1,display:"flex",justifyContent:"center",animation:"fadeUp 0.9s ease both"}}>
          <div style={s.heroCard}>
            <div style={{display:"flex",gap:"6px",marginBottom:"18px"}}>
              {["#8644ef","#e3780d","#22c55e"].map(c=><div key={c} style={{width:12,height:12,borderRadius:"60%",background:c}}/>)}
            </div>
            <div style={{fontSize:"12px",color:"#64748b",marginBottom:"8px",fontWeight:600}}>🤖 AI Match Score</div>
            <div style={{height:"8px",background:"rgba(17, 17, 17, 0)",borderRadius:"4px",marginBottom:"6px",overflow:"hidden"}}>
              <div style={{width:"92%",height:"100%",background:"linear-gradient(90deg,#1e40af,#d4af37)",borderRadius:"4px"}}/>
            </div>
            <div style={{fontSize:"12px",color:"#d4af37",fontWeight:700,marginBottom:"16px"}}>92% Match — SBI PO 2025</div>
            {[{t:"UPSC CSE 2025",m:"88%",g:true},{t:"TCS NQT Drive",m:"89%",g:false},{t:"SSC CGL Tier 1",m:"91%",g:true}].map((j,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,0.04)",borderRadius:"10px",padding:"10px 12px",marginBottom:"8px"}}>
                <div>
                  <div style={{fontSize:"12px",fontWeight:700,color:"#e2e8f0",marginBottom:"3px"}}>{j.t}</div>
                  <span style={{fontSize:"10px",fontWeight:700,padding:"2px 7px",borderRadius:"4px",background:j.g?"rgba(158, 157, 182, 0.15)":"rgba(34,197,94,0.1)",color:j.g?"#60a5fa":"#4ade80"}}>{j.g?"Govt":"Private"}</span>
                </div>
                <div style={{fontSize:"18px",fontWeight:900,color:"#cba730"}}>{j.m}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <div style={s.statsBar}>
        {STATS.map((st,i)=>(
          <div key={i} style={{flex:1,textAlign:"center",padding:"36px 16px",borderRight:i<STATS.length-1?"1px solid rgba(212,175,55,0.1)":"none"}}>
            <div style={{fontSize:"32px",fontWeight:900,color:"#d4af37",marginBottom:"5px"}}>{st.value}</div>
            <div style={{fontSize:"13px",color:"#475569"}}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* PATHS */}
      <section style={s.section}>
        <div style={{textAlign:"center",marginBottom:"40px"}}>
          <div style={s.overline}>For Every Student & Job Seeker</div>
          <h2 style={s.sectionTitle}>Choose Your Path</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"14px"}}>
          {PATHS.map((p,i)=>(
            <div key={i} className="path-card" onClick={()=>window.location.href="/login"}
              style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${p.color}33`,borderRadius:"16px",padding:"24px 16px",textAlign:"center",cursor:"pointer",transition:"all 0.3s cubic-bezier(.34,1.56,.64,1)"}}>
              <div style={{width:"48px",height:"48px",borderRadius:"12px",background:`${p.color}18`,color:p.color,fontSize:"22px",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>{p.icon}</div>
              <div style={{fontSize:"14px",fontWeight:700,color:"#e2e8f0",marginBottom:"10px"}}>{p.label}</div>
              <div style={{fontSize:"12px",color:p.color,fontWeight:600}}>Explore →</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={s.section}>
        <div style={{textAlign:"center",marginBottom:"40px"}}>
          <div style={s.overline}>Powered by AI</div>
          <h2 style={s.sectionTitle}>Everything You Need to Succeed</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:"16px"}}>
          {FEATURES.map((f,i)=>(
            <div key={i} className="feat-card"
              style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"16px",padding:"28px",cursor:"pointer",transition:"all 0.3s ease"}}>
              <div style={{fontSize:"32px",marginBottom:"14px"}}>{f.icon}</div>
              <h3 style={{fontSize:"16px",fontWeight:700,color:"#fff",marginBottom:"8px"}}>{f.title}</h3>
              <p style={{fontSize:"13px",color:"#64748b",lineHeight:1.7,marginBottom:"14px"}}>{f.desc}</p>
              <span style={{color:"#d4af37",fontWeight:700,fontSize:"15px"}}>→</span>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={s.section}>
        <div style={{textAlign:"center",marginBottom:"40px"}}>
          <div style={s.overline}>Real Success Stories</div>
          <h2 style={s.sectionTitle}>Students Who Made It</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"16px"}}>
          {TESTIMONIALS.map((t,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"20px",padding:"28px"}}>
              <div style={{fontSize:"52px",color:"#d4af37",lineHeight:.8,fontFamily:"Georgia,serif",marginBottom:"14px"}}>"</div>
              <p style={{fontSize:"14px",color:"#94a3b8",lineHeight:1.7,marginBottom:"20px"}}>{t.text}</p>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"40px",height:"40px",borderRadius:"50%",background:"linear-gradient(135deg,#1e40af,#d4af37)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"13px",color:"#fff",flexShrink:0}}>{t.avatar}</div>
                <div>
                  <div style={{fontSize:"14px",fontWeight:700,color:"#fff"}}>{t.name}</div>
                  <div style={{fontSize:"11px",color:"#64748b"}}>{t.role} · {t.from}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{textAlign:"center",padding:"80px 40px",position:"relative"}}>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"500px",height:"250px",background:"radial-gradient(ellipse,rgba(212,175,55,0.1),transparent 70%)",pointerEvents:"none"}}/>
        <h2 style={{...s.sectionTitle,fontSize:"clamp(28px,4vw,48px)",marginBottom:"12px"}}>Start Your Career Journey Today</h2>
        <p style={{fontSize:"16px",color:"#64748b",marginBottom:"36px"}}>Join 1.2 lakh+ students already using CareerBharat to find their dream jobs</p>
        <div style={{display:"flex",gap:"14px",justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>window.location.href="/login"} style={s.btnPrimary}>Create Free Account</button>
          <button style={s.btnOutline}>Explore Jobs →</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"50px 40px 24px",maxWidth:"1280px",margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"40px",marginBottom:"36px",flexWrap:"wrap"}}>
          <div>
            <div style={s.logo}>
              <span style={s.logoMark}>⚡</span>
              <span style={s.logoName}>CareerBharat</span>
              <span style={s.logoBadge}>AI</span>
            </div>
            <p style={{fontSize:"13px",color:"#a8b0bc",lineHeight:1.7,marginTop:"12px",maxWidth:"260px"}}>India's most comprehensive AI-powered career & job portal for students and job seekers.</p>
          </div>
          {[{t:"Jobs",l:["Government Jobs","Private Jobs","Internships","Part-time"]},{t:"Exams",l:["UPSC","SSC","Banking","State PSC"]},{t:"Resources",l:["Study Material","Mock Tests","Resume Builder","Career Advice"]}].map(col=>(
            <div key={col.t}>
              <div style={{fontSize:"12px",fontWeight:800,color:"#fff",letterSpacing:"1px",textTransform:"uppercase",marginBottom:"14px"}}>{col.t}</div>
              {col.l.map(lk=><div key={lk} style={{fontSize:"13px",color:"#c3cedd",marginBottom:"9px",cursor:"pointer"}}>{lk}</div>)}
            </div>
          ))}
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"20px",display:"flex",justifyContent:"space-between",fontSize:"12px",color:"#1e293b"}}>
          <span>© 2025 CareerBharat. Made with ❤️ for Bharat's students.</span>
          <span>Privacy · Terms · Contact</span>
        </div>
      </footer>

      {/* AI CHAT BUBBLE */}
      <div onClick={()=>setChatOpen(!chatOpen)} style={s.chatBubble}>{chatOpen?"✕":"🤖"}</div>
      {chatOpen && (
        <div style={s.chatBox}>
          <div style={s.chatHeader}>
            <span>🤖 AI Career Counselor</span>
            <span style={{fontSize:"12px",color:"#4ade80"}}>● Online</span>
          </div>
          <div style={{padding:"14px",maxHeight:"220px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"8px"}}>
            {chatLog.map((m,i)=>(
              <div key={i} style={{padding:"10px 14px",borderRadius:"10px",fontSize:"13px",lineHeight:1.5,maxWidth:"85%",alignSelf:m.from==="user"?"flex-end":"flex-start",background:m.from==="user"?"linear-gradient(135deg,#d4af37,#f59e0b)":"rgba(30,64,175,0.2)",color:m.from==="user"?"#000":"#93c5fd",border:m.from==="user"?"none":"1px solid rgba(30,64,175,0.3)",fontWeight:m.from==="user"?700:400}}>{m.text}</div>
            ))}
          </div>
          <div style={{display:"flex",gap:"8px",padding:"10px 12px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask about careers, exams..."
              style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",padding:"9px 12px",color:"#fff",fontSize:"13px",outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
            <button onClick={sendChat} style={{background:"linear-gradient(135deg,#1e40af,#3b82f6)",color:"#fff",border:"none",borderRadius:"8px",padding:"9px 13px",cursor:"pointer",fontSize:"15px"}}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root:{fontFamily:"'DM Sans',sans-serif",background:"#060e1f",color:"#e2e8f0",minHeight:"100vh",position:"relative",overflowX:"hidden"},
  bgGrid:{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(212,175,55,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.03) 1px,transparent 1px)",backgroundSize:"56px 56px",pointerEvents:"none",zIndex:0},
  glow1:{position:"fixed",top:"-20%",left:"-10%",width:"600px",height:"600px",background:"radial-gradient(circle,rgba(30,64,175,0.22),transparent 70%)",pointerEvents:"none",zIndex:0},
  glow2:{position:"fixed",bottom:"-20%",right:"-10%",width:"500px",height:"500px",background:"radial-gradient(circle,rgba(212,175,55,0.12),transparent 70%)",pointerEvents:"none",zIndex:0},
  nav:{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"16px 40px",transition:"all 0.3s ease"},
  navScroll:{background:"rgba(6,14,31,0.95)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(212,175,55,0.12)",padding:"12px 40px"},
  navInner:{maxWidth:"1280px",margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"},
  logo:{display:"flex",alignItems:"center",gap:"8px"},
  logoMark:{fontSize:"22px"},
  logoName:{fontSize:"20px",fontWeight:800,color:"#fff",fontFamily:"'Playfair Display',serif"},
  logoBadge:{background:"linear-gradient(135deg,#d4af37,#f59e0b)",color:"#000",fontSize:"9px",fontWeight:800,padding:"2px 6px",borderRadius:"4px",letterSpacing:"1px"},
  navLinks:{display:"flex",gap:"28px"},
  navLink:{color:"#64748b",fontSize:"14px",fontWeight:500,transition:"color 0.2s"},
  btnOutline:{background:"transparent",border:"1px solid rgba(212,175,55,0.4)",color:"#d4af37",padding:"9px 18px",borderRadius:"8px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  btnPrimary:{background:"linear-gradient(135deg,#1e40af,#2563eb)",color:"#fff",border:"none",padding:"10px 20px",borderRadius:"8px",fontSize:"13px",fontWeight:700,cursor:"pointer",boxShadow:"0 4px 18px rgba(37,99,235,0.4)",fontFamily:"'DM Sans',sans-serif"},
  hero:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:"1280px",margin:"0 auto",padding:"120px 40px 80px",gap:"60px",position:"relative",zIndex:1,flexWrap:"wrap"},
  heroBadge:{display:"inline-flex",alignItems:"center",gap:"8px",background:"rgba(212,175,55,0.1)",border:"1px solid rgba(212,175,55,0.28)",color:"#d4af37",padding:"7px 14px",borderRadius:"50px",fontSize:"12px",fontWeight:600,marginBottom:"24px"},
  heroTitle:{fontSize:"clamp(40px,5vw,68px)",fontWeight:900,lineHeight:1.1,color:"#fff",marginBottom:"20px",letterSpacing:"-2px",fontFamily:"'Playfair Display',serif"},
  heroGold:{background:"linear-gradient(135deg,#d4af37,#f59e0b,#fbbf24)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"},
  heroSub:{fontSize:"16px",color:"#94a3b8",lineHeight:1.7,marginBottom:"32px",maxWidth:"520px"},
  searchBox:{display:"flex",alignItems:"center",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(212,175,55,0.22)",borderRadius:"12px",padding:"8px 8px 8px 18px",marginBottom:"20px",gap:"10px"},
  searchInput:{flex:1,background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:"14px",fontFamily:"'DM Sans',sans-serif"},
  searchBtn:{background:"linear-gradient(135deg,#d4af37,#f59e0b)",color:"#000",border:"none",padding:"11px 20px",borderRadius:"8px",fontSize:"13px",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif"},
  tag:{background:"rgba(37,99,235,0.12)",border:"1px solid rgba(37,99,235,0.28)",color:"#93c5fd",padding:"5px 12px",borderRadius:"50px",fontSize:"11px",fontWeight:500},
  heroCard:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(212,175,55,0.18)",borderRadius:"20px",padding:"24px",width:"320px",backdropFilter:"blur(20px)"},
  statsBar:{display:"flex",borderTop:"1px solid rgba(212,175,55,0.08)",borderBottom:"1px solid rgba(212,175,55,0.08)",background:"rgba(212,175,55,0.03)",position:"relative",zIndex:1},
  section:{maxWidth:"1280px",margin:"0 auto",padding:"70px 40px",position:"relative",zIndex:1},
  overline:{fontSize:"11px",fontWeight:700,letterSpacing:"3px",color:"#d4af37",textTransform:"uppercase",marginBottom:"8px"},
  sectionTitle:{fontSize:"clamp(26px,3vw,40px)",fontWeight:900,color:"#fff",fontFamily:"'Playfair Display',serif",letterSpacing:"-1px"},
  chatBubble:{position:"fixed",bottom:"28px",right:"28px",width:"58px",height:"58px",borderRadius:"50%",background:"linear-gradient(135deg,#1e40af,#2563eb)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",cursor:"pointer",boxShadow:"0 8px 28px rgba(37,99,235,0.5)",zIndex:200,border:"2px solid rgba(212,175,55,0.35)"},
  chatBox:{position:"fixed",bottom:"96px",right:"28px",width:"320px",background:"#0d1b35",border:"1px solid rgba(212,175,55,0.22)",borderRadius:"18px",overflow:"hidden",zIndex:200,boxShadow:"0 20px 60px rgba(0,0,0,0.5)"},
  chatHeader:{background:"linear-gradient(135deg,#1e3a8a,#1e40af)",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"13px",fontWeight:700,color:"#fff"},
};