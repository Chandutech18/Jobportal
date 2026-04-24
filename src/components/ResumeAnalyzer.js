import React, { useState, useRef, useEffect } from "react";
import { API } from "../config";

export default function ResumeAnalyzer({ onViewJobs }) {
  const [file,     setFile]     = useState(null);
  const [text,     setText]     = useState("");
  const [mode,     setMode]     = useState("upload");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState("");
  const [drag,     setDrag]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewportW, setViewportW] = useState(() => window.innerWidth);
  const inputRef = useRef();
  const isMobile = viewportW < 760;
  const isTablet = viewportW < 1024;

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleFile = (f) => {
    if (!f) return;
    const ok = ["application/pdf","text/plain"].includes(f.type) || f.name.endsWith(".docx") || f.name.endsWith(".txt");
    if (!ok) { setError("Please upload PDF, DOCX, or TXT file."); return; }
    if (f.size > 5*1024*1024) { setError("File size must be under 5MB."); return; }
    setFile(f); setError("");
  };

  const analyze = async () => {
    const content = mode==="paste" ? text.trim() : file ? `[Resume: ${file.name}] No text extracted — AI will analyze based on filename and general feedback.` : "";
    if (!content) { setError("Please upload a resume or paste text."); return; }

    setLoading(true); setError(""); setResult(null); setProgress(0);

    // Simulate progress
    const prog = setInterval(()=>setProgress(p=>Math.min(p+8,90)), 300);

    try {
      const res  = await fetch(`${API}/api/chat/resume`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ resumeText: content }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      clearInterval(prog); setProgress(100);
      setTimeout(()=>setProgress(0), 500);

      if (data.result) {
        setResult(data.result);
        // Save to activity
        const activity = JSON.parse(localStorage.getItem("activity")||"[]");
        activity.unshift({ type:"resume", score: data.result.score, time: new Date().toISOString() });
        localStorage.setItem("activity", JSON.stringify(activity.slice(0,20)));
      } else {
        setError("AI returned invalid response. Try again.");
      }
    } catch (err) {
      clearInterval(prog); setProgress(0);
      setError(`${err.message}. Make sure backend is running: cd server → node server.js`);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = v => v>=80?"#4ade80":v>=60?"#d4af37":"#f87171";
  const scoreLabel = v => v>=80?"Excellent 🏆":v>=60?"Good 👍":v>=40?"Fair ⚡":"Needs Work 🔧";

  return (
    <div>
      <div style={{marginBottom:"22px"}}>
        <div style={s.overline}>Groq AI Powered</div>
        <h2 style={s.title}>Resume Analyzer</h2>
        <p style={{fontSize:"14px",color:"#64748b"}}>Upload your resume and get instant AI feedback, ATS score, missing skills & best job matches</p>
      </div>

      <div style={{...s.layout,gridTemplateColumns:isTablet?"1fr":"1fr 1fr",gap:isMobile?"16px":"20px"}}>
        {/* ── LEFT — Input ── */}
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          {/* Tabs */}
          <div style={s.tabs}>
            {[["upload","📁 Upload File"],["paste","✏️ Paste Text"]].map(([m,l])=>(
              <button key={m} onClick={()=>setMode(m)} style={{...s.tab,...(mode===m?s.tabOn:{})}}>
                {l}
              </button>
            ))}
          </div>

          {/* Upload / Paste */}
          {mode==="upload" ? (
            <div
              onDragOver={e=>{e.preventDefault();setDrag(true)}}
              onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0])}}
              onClick={()=>inputRef.current.click()}
              style={{...s.dropZone,padding:isMobile?"30px 16px":"40px 20px",minHeight:isMobile?"180px":"200px",...(drag?s.dropOn:{})}}>
              <input ref={inputRef} type="file" accept=".pdf,.txt,.docx" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
              {file ? (
                <>
                  <div style={{fontSize:"36px",marginBottom:"8px"}}>✅</div>
                  <div style={{fontSize:"15px",fontWeight:700,color:"#4ade80",marginBottom:"4px"}}>{file.name}</div>
                  <div style={{fontSize:"12px",color:"#64748b"}}>{(file.size/1024).toFixed(1)} KB · Click to change</div>
                  <button onClick={e=>{e.stopPropagation();setFile(null)}} style={s.removeBtn}>Remove ✕</button>
                </>
              ) : (
                <>
                  <div style={{fontSize:"44px",marginBottom:"12px"}}>📄</div>
                  <div style={{fontSize:"15px",fontWeight:700,color:"#fff",marginBottom:"6px"}}>Drop resume here</div>
                  <div style={{fontSize:"12px",color:"#64748b",marginBottom:"10px"}}>or click to browse files</div>
                  <div style={{fontSize:"11px",color:"#334155"}}>Supports PDF · DOCX · TXT (max 5MB)</div>
                </>
              )}
            </div>
          ) : (
            <textarea value={text} onChange={e=>setText(e.target.value)}
              placeholder={"Paste your complete resume text here...\n\nInclude:\n• Name & Contact\n• Education\n• Work Experience\n• Skills\n• Projects\n• Certifications"}
              style={s.textarea}/>
          )}

          {error && <div style={s.errBox}>⚠️ {error}</div>}

          {/* Progress bar */}
          {loading && progress>0 && (
            <div style={{background:"rgba(255,255,255,0.06)",borderRadius:"4px",overflow:"hidden",height:"6px"}}>
              <div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,#1e40af,#d4af37)",transition:"width 0.3s ease",borderRadius:"4px"}}/>
            </div>
          )}

          <button onClick={analyze} disabled={loading} style={{...s.analyzeBtn,...(loading?{opacity:0.7,cursor:"not-allowed"}:{})}}>
            {loading ? <><span style={s.spinner}/> Analyzing with Groq AI...</> : "🔍 Analyze My Resume"}
          </button>

          {/* Tips */}
          <div style={s.tipsBox}>
            <div style={{fontSize:"12px",fontWeight:700,color:"#d4af37",marginBottom:"10px"}}>💡 Tips for Better Score</div>
            {[
              ["📝","Use action verbs: Led, Built, Achieved, Managed"],
              ["📊","Quantify results: 'Increased sales by 30%'"],
              ["🎯","Tailor skills to the job description"],
              ["⚡","Keep it 1-2 pages, ATS-friendly format"],
              ["🔑","Include relevant keywords from job postings"],
            ].map(([ic,tip],i)=>(
              <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start",marginBottom:"6px"}}>
                <span>{ic}</span>
                <span style={{fontSize:"12px",color:"#94a3b8"}}>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT — Results ── */}
        <div>
          {!result && !loading && (
            <div style={s.placeholder}>
              <div style={{fontSize:"52px",marginBottom:"14px"}}>🎯</div>
              <div style={{fontSize:"18px",fontWeight:700,color:"#fff",marginBottom:"8px"}}>Analysis Results Appear Here</div>
              <div style={{fontSize:"14px",color:"#64748b",lineHeight:1.6}}>
                Upload or paste your resume<br/>
                Get: Score · ATS Rating · Missing Skills<br/>
                Strengths · Improvements · Job Matches
              </div>
            </div>
          )}

          {loading && (
            <div style={s.placeholder}>
              <div style={{fontSize:"48px",marginBottom:"16px"}}>🤖</div>
              <div style={{fontSize:"16px",fontWeight:700,color:"#fff",marginBottom:"8px"}}>Groq AI is analyzing...</div>
              <div style={{fontSize:"13px",color:"#64748b"}}>Reading skills, experience, qualifications...</div>
            </div>
          )}

          {result && !loading && (
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              {/* Score cards */}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"12px"}}>
                {[["Overall Score",result.score,"🏆"],["ATS Score",result.ats_score,"🤖"]].map(([label,val,ic])=>(
                  <div key={label} style={s.scoreCard}>
                    <div style={{fontSize:"24px",marginBottom:"4px"}}>{ic}</div>
                    <div style={{fontSize:"38px",fontWeight:900,color:scoreColor(val),lineHeight:1}}>{val}</div>
                    <div style={{fontSize:"11px",color:"#64748b"}}>/100</div>
                    <div style={{fontSize:"12px",color:scoreColor(val),fontWeight:700,margin:"4px 0"}}>{scoreLabel(val)}</div>
                    <div style={{fontSize:"11px",color:"#475569"}}>{label}</div>
                    <div style={{height:"5px",background:"rgba(255,255,255,0.07)",borderRadius:"3px",marginTop:"10px",overflow:"hidden"}}>
                      <div style={{width:`${val}%`,height:"100%",background:`linear-gradient(90deg,${scoreColor(val)}88,${scoreColor(val)})`,borderRadius:"3px",transition:"width 1s ease"}}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div style={s.card}>
                <div style={s.cardTitle}>📋 Summary</div>
                <p style={{fontSize:"13px",color:"#94a3b8",lineHeight:1.7}}>{result.summary}</p>
              </div>

              {/* Strengths & Improvements */}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"12px"}}>
                <div style={s.card}>
                  <div style={{...s.cardTitle,color:"#4ade80"}}>✅ Strengths</div>
                  {(result.strengths||[]).map((item,i)=>(
                    <div key={i} style={{display:"flex",gap:"8px",marginBottom:"6px",alignItems:"flex-start"}}>
                      <span style={{color:"#4ade80",fontSize:"12px",marginTop:"2px"}}>✓</span>
                      <span style={{fontSize:"12px",color:"#94a3b8",lineHeight:1.5}}>{item}</span>
                    </div>
                  ))}
                </div>
                <div style={s.card}>
                  <div style={{...s.cardTitle,color:"#fb923c"}}>⚡ Improve</div>
                  {(result.improvements||[]).map((item,i)=>(
                    <div key={i} style={{display:"flex",gap:"8px",marginBottom:"6px",alignItems:"flex-start"}}>
                      <span style={{color:"#fb923c",fontSize:"12px",marginTop:"2px"}}>→</span>
                      <span style={{fontSize:"12px",color:"#94a3b8",lineHeight:1.5}}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills found */}
              <div style={s.card}>
                <div style={s.cardTitle}>🛠 Skills Detected</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
                  {(result.skills_found||[]).map(sk=>(
                    <span key={sk} style={{fontSize:"12px",fontWeight:600,padding:"5px 12px",borderRadius:"50px",background:"rgba(30,64,175,0.15)",color:"#93c5fd",border:"1px solid rgba(30,64,175,0.25)"}}>{sk}</span>
                  ))}
                </div>
              </div>

              {/* Missing skills */}
              {result.missing_skills && result.missing_skills.length > 0 && (
                <div style={{...s.card,borderColor:"rgba(251,146,60,0.25)"}}>
                  <div style={{...s.cardTitle,color:"#fb923c"}}>🎯 Missing Skills to Add</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
                    {result.missing_skills.map(sk=>(
                      <span key={sk} style={{fontSize:"12px",fontWeight:600,padding:"5px 12px",borderRadius:"50px",background:"rgba(251,146,60,0.12)",color:"#fb923c",border:"1px solid rgba(251,146,60,0.25)"}}>{sk}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Best fit jobs */}
              <div style={s.card}>
                <div style={s.cardTitle}>💼 Best Fit Jobs</div>
                {(result.best_fit_jobs||[]).map((job,i)=>(
                  <div key={i} style={{display:"flex",gap:"10px",alignItems:isMobile?"flex-start":"center",flexDirection:isMobile?"column":"row",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <span style={{fontSize:"18px"}}>{"🥇🥈🥉"[i]||"🔹"}</span>
                    <span style={{fontSize:"13px",color:"#e2e8f0",fontWeight:600,flex:1,alignSelf:isMobile?"stretch":"auto"}}>{job}</span>
                    <button onClick={()=>onViewJobs?.(job)} style={{background:"rgba(30,64,175,0.15)",border:"1px solid rgba(30,64,175,0.3)",color:"#93c5fd",borderRadius:"6px",padding:"4px 10px",fontSize:"11px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",width:isMobile?"100%":"auto"}}>Find Jobs →</button>
                  </div>
                ))}
              </div>

              <button onClick={()=>setResult(null)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#64748b",padding:"12px",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                ↺ Analyze Another Resume
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  overline:{fontSize:"11px",fontWeight:700,letterSpacing:"3px",textTransform:"uppercase",color:"#d4af37",marginBottom:"4px"},
  title:{fontSize:"26px",fontWeight:900,color:"#fff",fontFamily:"'Playfair Display',serif",marginBottom:"6px"},
  layout:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px",alignItems:"start"},
  tabs:{display:"flex",background:"rgba(255,255,255,0.04)",borderRadius:"10px",padding:"4px",gap:"4px"},
  tab:{flex:1,padding:"9px",borderRadius:"8px",background:"transparent",border:"none",color:"#64748b",fontSize:"13px",fontWeight:600,cursor:"pointer",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif"},
  tabOn:{background:"rgba(30,64,175,0.3)",color:"#93c5fd"},
  dropZone:{border:"2px dashed rgba(255,255,255,0.12)",borderRadius:"14px",padding:"40px 20px",textAlign:"center",cursor:"pointer",transition:"all 0.3s",minHeight:"200px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},
  dropOn:{borderColor:"#3b82f6",background:"rgba(30,64,175,0.08)"},
  removeBtn:{marginTop:"10px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",borderRadius:"6px",padding:"5px 12px",fontSize:"11px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  textarea:{width:"100%",minHeight:"220px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",padding:"14px",color:"#e2e8f0",fontSize:"13px",lineHeight:1.65,resize:"vertical",outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box"},
  errBox:{background:"rgba(239,68,68,0.09)",border:"1px solid rgba(239,68,68,0.22)",color:"#fca5a5",padding:"10px 14px",borderRadius:"10px",fontSize:"13px"},
  analyzeBtn:{width:"100%",background:"linear-gradient(135deg,#1e40af,#3b82f6)",color:"#fff",border:"none",borderRadius:"12px",padding:"14px",fontSize:"15px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 6px 24px rgba(37,99,235,0.35)"},
  spinner:{width:18,height:18,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block"},
  tipsBox:{background:"rgba(212,175,55,0.05)",border:"1px solid rgba(212,175,55,0.12)",borderRadius:"12px",padding:"14px"},
  placeholder:{textAlign:"center",padding:"50px 20px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"16px"},
  scoreCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"14px",padding:"18px",textAlign:"center"},
  card:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"14px",padding:"16px",display:"flex",flexDirection:"column",gap:"6px"},
  cardTitle:{fontSize:"13px",fontWeight:700,color:"#d4af37",marginBottom:"6px"},
};
