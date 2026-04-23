import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import SplashScreen  from "./components/SplashScreen";
import Home          from "./pages/Home";
import Login         from "./pages/Login";
import Dashboard     from "./pages/Dashboard";
import PublicProfile from "./pages/PublicProfile";

const SPLASH_KEY = "cb_splash_v2";

function Protected({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user")||"{}");
  if (token) return <Navigate to={user.role==="recruiter"?"/dashboard/recruiter":"/dashboard"} replace/>;
  return children;
}

export default function App() {
  const [splash,  setSplash]  = useState(false);
  const [ready,   setReady]   = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem(SPLASH_KEY);
    if (!shown) { setSplash(true); sessionStorage.setItem(SPLASH_KEY, "1"); }
    else        { setReady(true); }
  }, []);

  if (splash) return <SplashScreen onDone={()=>{ setSplash(false); setReady(true); }}/>;
  if (!ready) return null;

  return (
    <Router>
      <Routes>
        {/* Public pages */}
        <Route path="/"                  element={<Home/>} />
        <Route path="/login"             element={<PublicRoute><Login/></PublicRoute>} />

        {/* Shareable profile URL — anyone can view */}
        <Route path="/profile/:username" element={<PublicProfile/>} />

        {/* Protected dashboard */}
        <Route path="/dashboard"           element={<Protected><Dashboard/></Protected>} />
        <Route path="/dashboard/recruiter" element={<Protected><Dashboard recruiterMode/></Protected>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace/>} />
      </Routes>
    </Router>
  );
}
