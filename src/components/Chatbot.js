import React, { useState, useRef, useEffect } from "react";
import { API } from "../config";

const QUICK = [
  "Best govt jobs after graduation?",
  "How to prepare for UPSC?",
  "SSC CGL syllabus 2025?",
  "Top IT jobs for freshers?",
  "How to write a good resume?",
  "Banking jobs after 12th?",
  "Railway jobs eligibility?",
  "Salary of IAS officer?",
  "Career options after B.Tech?",
  "How to crack SBI PO exam?",
  "What is GATE exam?",
  "How to prepare for GATE exam?",
  "Best careers without a degree?",
  "How to become a data scientist?",
  "What jobs are in demand in India?",
  
];

const WELCOME = `Namaste! 🙏 I'm **CareerBot** — your AI Career Counselor powered by Groq AI.

I can help you with:
• 🏛️ Government job opportunities (UPSC, SSC, Banking, Railway)
• 💼 Private sector career guidance
• 📝 Exam preparation tips & syllabus
• 📄 Resume & interview advice
• 🎯 Career path based on your education


What would you like to know today?`;

export default function Chatbot() {
  const [msgs,    setMsgs]    = useState([{ from:"ai", text:WELCOME, time:now() }]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [viewportW, setViewportW] = useState(() => window.innerWidth);
  const endRef = useRef(null);
  const isMobile = viewportW < 760;
  const isTablet = viewportW < 1024;

  useEffect(()=>{ endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs, loading]);
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function now() { return new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}); }

  // ── Get token from localStorage ──────────────────
  function getHeaders() {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setError("");
    setMsgs(p => [...p, { from:"user", text:msg, time:now() }]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method:  "POST",
        headers: getHeaders(),           // ← sends token automatically
        body:    JSON.stringify({ message: msg }),
      });

      // Handle token errors gracefully
      if (res.status === 401) {
        setMsgs(p=>[...p, { from:"ai", text:"⚠️ Session expired. Please log in again.", time:now() }]);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      setMsgs(p=>[...p, {
        from:     "ai",
        text:     data.reply || "Sorry, no response.",
        time:     now(),
        provider: data.provider,
      }]);

    } catch (err) {
      setError(`❌ ${err.message}. Make sure backend is running on port 5000.`);
      setMsgs(p=>[...p, {
        from: "ai",
        text: "⚠️ Cannot connect to AI server.\n\nPlease make sure:\n• Backend is running → cd server → node server.js\n• GROQ_API_KEY is set in server/.env",
        time: now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setMsgs([{ from:"ai", text:WELCOME, time:now() }]);
    setError("");
  };

  // Render markdown bold **text**
  const renderText = (text) =>
    text.split("\n").map((line, i) => (
      <span key={i}>
        {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
          j % 2 === 1
            ? <strong key={j} style={{color:"#fff"}}>{part}</strong>
            : part
        )}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    ));

  return (
    <div style={{...s.root,height:isMobile?"calc(100dvh - 190px)":isTablet?"calc(100dvh - 170px)":s.root.height,minHeight:isMobile?"480px":s.root.minHeight}}>
      {/* Header */}
      <div style={{...s.header,flexWrap:isMobile?"wrap":"nowrap",gap:isMobile?"12px":"0"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",minWidth:0}}>
          <div style={s.avatar}>🤖</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:"15px",fontWeight:800,color:"#fff"}}>CareerBot AI</div>
            <div style={{fontSize:"12px",color:"#64748b",display:"flex",alignItems:"center",gap:"6px"}}>
              <span style={{width:"7px",height:"7px",borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/>
              Powered by Groq · LLaMA 3.3 70B
            </div>
          </div>
        </div>
        <button onClick={clear} style={{...s.clearBtn,width:isMobile?"100%":"auto"}}>🗑 Clear</button>
      </div>

      {/* Error banner */}
      {error && <div style={s.errorBar}>{error}</div>}

      {/* Quick prompts */}
      <div style={{...s.quickWrap,padding:isMobile?"10px 12px":"10px 16px"}}>
        <div style={{fontSize:"11px",color:"#334155",fontWeight:600,marginBottom:"7px"}}>
          Quick Questions →
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:isTablet?"nowrap":"wrap",overflowX:isTablet?"auto":"visible",paddingBottom:isTablet?"4px":"0"}}>
          {QUICK.map((q,i)=>(
            <button key={i} onClick={()=>send(q)} disabled={loading} style={s.quickBtn}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{...s.messages,padding:isMobile?"14px 12px":"18px"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.from==="user"?"flex-end":"flex-start",gap:"3px"}}>
            {m.from==="ai" && (
              <div style={s.aiLabel}>
                🤖 CareerBot {m.provider && <span style={{fontSize:"9px",color:"#334155"}}>({m.provider})</span>}
              </div>
            )}
            <div style={{...s.bubble,maxWidth:isMobile?"92%":s.bubble.maxWidth,...(m.from==="user"?s.userBubble:s.aiBubble)}}>
              {renderText(m.text)}
            </div>
            <div style={{fontSize:"10px",color:"#1e293b"}}>{m.time}</div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"3px"}}>
            <div style={s.aiLabel}>🤖 CareerBot</div>
            <div style={{...s.bubble,...s.aiBubble}}>
              <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
                {[0,1,2].map(i=>(
                  <span key={i} style={{width:"8px",height:"8px",borderRadius:"50%",background:"#3b82f6",animation:`pulse 1.2s ${i*0.2}s infinite`}}/>
                ))}
                <span style={{fontSize:"12px",color:"#64748b",marginLeft:"6px"}}>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div style={{...s.inputArea,flexDirection:isMobile?"column":"row",padding:isMobile?"12px":"12px 16px"}}>
        <input
          style={s.input}
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Ask about career, exams, jobs, resume tips..."
          disabled={loading}
        />
        <button
          onClick={()=>send()}
          disabled={loading||!input.trim()}
          style={{...s.sendBtn,width:isMobile?"100%":s.sendBtn.width,opacity:loading||!input.trim()?0.5:1}}>
          {loading ? <span style={s.spinner}/> : "➤"}
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:"11px",color:"#1e293b",padding:"5px"}}>
        Press Enter to send · Groq AI · Free & Fast
      </div>
    </div>
  );
}

const s = {
  root:      {display:"flex",flexDirection:"column",height:"calc(100dvh - 150px)",minHeight:"520px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"20px",overflow:"hidden"},
  header:    {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",background:"linear-gradient(135deg,rgba(30,64,175,0.2),rgba(212,175,55,0.06))",borderBottom:"1px solid rgba(255,255,255,0.06)"},
  avatar:    {width:"44px",height:"44px",borderRadius:"12px",background:"linear-gradient(135deg,#1e40af,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px"},
  clearBtn:  {background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#64748b",padding:"7px 14px",borderRadius:"8px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  errorBar:  {background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#fca5a5",padding:"10px 16px",fontSize:"12px"},
  quickWrap: {padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  quickBtn:  {background:"rgba(30,64,175,0.1)",border:"1px solid rgba(30,64,175,0.2)",color:"#93c5fd",padding:"5px 11px",borderRadius:"50px",fontSize:"11px",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"},
  messages:  {flex:1,overflowY:"auto",padding:"18px",display:"flex",flexDirection:"column",gap:"12px"},
  aiLabel:   {fontSize:"11px",color:"#475569",fontWeight:600},
  bubble:    {maxWidth:"78%",padding:"12px 15px",borderRadius:"14px",fontSize:"13px",lineHeight:1.65,wordBreak:"break-word"},
  aiBubble:  {background:"rgba(30,64,175,0.14)",border:"1px solid rgba(30,64,175,0.22)",color:"#cbd5e1",borderTopLeftRadius:"4px"},
  userBubble:{background:"linear-gradient(135deg,#d4af37,#f59e0b)",color:"#000",fontWeight:600,borderTopRightRadius:"4px"},
  inputArea: {display:"flex",gap:"10px",padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.15)"},
  input:     {flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:"11px",padding:"12px 15px",color:"#fff",fontSize:"14px",outline:"none",fontFamily:"'DM Sans',sans-serif"},
  sendBtn:   {width:"46px",height:"46px",borderRadius:"11px",background:"linear-gradient(135deg,#1e40af,#3b82f6)",color:"#fff",border:"none",fontSize:"18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"},
  spinner:   {width:"18px",height:"18px",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block"},
};
