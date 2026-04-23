import React, { useEffect, useState } from "react";

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0);
  // 0 = logo in, 1 = tagline in, 2 = fade out

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(() => onDone(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;600;700&display=swap');
        @keyframes logoIn   { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
        @keyframes tagIn    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes splashOut{ from{opacity:1} to{opacity:0} }
        @keyframes pulse2   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes dotBounce{ 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      `}</style>

      {/* Animated background */}
      <div style={s.bg}/>
      <div style={s.orb1}/>
      <div style={s.orb2}/>
      <div style={s.orb3}/>
      <div style={s.grid}/>

      {/* Content */}
      <div style={{ ...s.content, animation: phase === 2 ? "splashOut 0.8s ease forwards" : "none" }}>
        {/* Logo mark */}
        <div style={{ animation: "logoIn 0.6s cubic-bezier(.34,1.56,.64,1) both", animationDelay: "0.1s" }}>
          <div style={s.logoRing}>
            <div style={s.logoInner}>
              <span style={s.bolt}>⚡</span>
            </div>
          </div>
        </div>

        {/* Brand name */}
        <div style={{ animation: "logoIn 0.5s cubic-bezier(.34,1.56,.64,1) both", animationDelay: "0.3s" }}>
          <div style={s.brand}>
            Career<span style={s.brandGold}>Bharat</span>
          </div>
        </div>

        {/* Tagline */}
        {phase >= 1 && (
          <div style={{ animation: "tagIn 0.5s ease both" }}>
            <div style={s.tagline}>India's #1 AI-Powered Career Portal</div>
            <div style={s.sub}>🏛️ Govt Jobs · 💼 Private · 🤖 AI Guidance · 📄 Resume AI</div>
          </div>
        )}

        {/* Loading dots */}
        <div style={s.dotsRow}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ ...s.dot, animationDelay: `${i * 0.16}s` }}/>
          ))}
        </div>
      </div>

      {/* Bottom brand */}
      <div style={{ ...s.bottomTag, animation: phase === 2 ? "splashOut 0.8s ease forwards" : "none" }}>
        Made with ❤️ for Bharat's Students
      </div>
    </div>
  );
}

const s = {
  root: { position:"fixed", inset:0, zIndex:9999, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#030b18", overflow:"hidden" },
  bg:   { position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 50%, #0a1628 0%, #030b18 70%)" },
  orb1: { position:"absolute", top:"-15%", left:"10%",  width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle, rgba(30,64,175,0.35) 0%, transparent 65%)", filter:"blur(40px)" },
  orb2: { position:"absolute", bottom:"-10%", right:"5%", width:"400px", height:"400px", borderRadius:"50%", background:"radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 65%)", filter:"blur(40px)" },
  orb3: { position:"absolute", top:"40%", left:"50%", transform:"translate(-50%,-50%)", width:"600px", height:"300px", borderRadius:"50%", background:"radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)", filter:"blur(30px)" },
  grid: { position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(212,175,55,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.04) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" },
  content: { position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"16px" },
  logoRing: { width:"100px", height:"100px", borderRadius:"28px", background:"linear-gradient(135deg, #1e40af, #d4af37)", padding:"3px", marginBottom:"8px", animation:"pulse2 2s ease-in-out infinite", boxShadow:"0 0 60px rgba(30,64,175,0.5), 0 0 120px rgba(212,175,55,0.2)" },
  logoInner:{ width:"100%", height:"100%", borderRadius:"26px", background:"#030b18", display:"flex", alignItems:"center", justifyContent:"center" },
  bolt:     { fontSize:"44px" },
  brand:    { fontSize:"clamp(38px,8vw,56px)", fontWeight:900, color:"#fff", fontFamily:"'Playfair Display',serif", letterSpacing:"-1.5px", textAlign:"center" },
  brandGold:{ background:"linear-gradient(135deg, #d4af37, #f59e0b, #fbbf24)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" },
  tagline:  { fontSize:"clamp(14px,2vw,17px)", color:"rgba(255,255,255,0.7)", textAlign:"center", fontFamily:"'DM Sans',sans-serif", fontWeight:600, marginBottom:"8px" },
  sub:      { fontSize:"clamp(11px,1.5vw,13px)", color:"rgba(255,255,255,0.35)", textAlign:"center", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.3px" },
  dotsRow:  { display:"flex", gap:"8px", marginTop:"32px" },
  dot:      { width:"10px", height:"10px", borderRadius:"50%", background:"linear-gradient(135deg,#1e40af,#d4af37)", animation:"dotBounce 1.4s ease-in-out infinite" },
  bottomTag:{ position:"absolute", bottom:"28px", fontSize:"12px", color:"rgba(255,255,255,0.25)", fontFamily:"'DM Sans',sans-serif", zIndex:1 },
};