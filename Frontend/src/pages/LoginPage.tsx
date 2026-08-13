import { useState } from "react"
import type { JSX } from "react"
import { Link, Navigate } from "react-router-dom"

import { LoginForm } from "../components/auth/LoginForm"
import { useAuth } from "../hooks/useAuth"

export const LoginPage = (): JSX.Element => {
  const { isAuthenticated, isLoading } = useAuth()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [authStep, setAuthStep] = useState<"credentials" | "otp">("credentials")

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#f6f5fa] font-sans text-slate-900 p-4 sm:p-6 lg:p-8">
      {/* Background Aurora & Slow Moving Ambient Glows */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-[15%] -left-[10%] h-[700px] w-[700px] rounded-full bg-purple-200/60 blur-[160px] animate-pulse" 
          style={{ animationDuration: '10s' }} 
        />
        <div 
          className="absolute -bottom-[15%] -right-[10%] h-[700px] w-[700px] rounded-full bg-indigo-200/60 blur-[160px] animate-pulse" 
          style={{ animationDuration: '12s', animationDelay: '2s' }} 
        />
        <div 
          className="absolute left-[35%] top-[25%] h-[550px] w-[550px] rounded-full bg-purple-300/35 blur-[140px] animate-pulse" 
          style={{ animationDuration: '14s', animationDelay: '4s' }} 
        />
        {/* Subtle Noise Texture */}
        <div 
          className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
        />
      </div>

      {/* Main Floating Card */}
      <div 
        onMouseMove={handleMouseMove}
        className="group relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/90 bg-white/80 shadow-[0_30px_90px_-15px_rgba(91,76,243,0.12),0_15px_40px_-15px_rgba(0,0,0,0.08)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-700 ease-out lg:grid lg:grid-cols-2"
      >
        {/* Spotlight Soft Reflection */}
        <div 
          className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100 z-20"
          style={{
            background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(91, 76, 243, 0.08), transparent 50%)`
          }}
        />

        {/* LEFT SECTION: Promotional */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/50 p-8 lg:p-10 border-b border-slate-100 lg:border-b-0 lg:after:absolute lg:after:right-0 lg:after:top-10 lg:after:bottom-10 lg:after:w-px lg:after:bg-gradient-to-b lg:after:from-transparent lg:after:via-slate-200/90 lg:after:to-transparent">
          
          {/* 3D Isometric Illustration Section */}
          <div className="relative my-4 flex flex-col items-center text-center">
            
            {/* Ambient Purple Light & Shadow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-gradient-to-tr from-purple-500/25 via-indigo-400/25 to-transparent blur-3xl pointer-events-none" />

            {/* Illustration Card (Item 8: Vibrant Crisp Opacity) */}
            <div className="relative w-full max-w-[370px] overflow-hidden rounded-2xl border border-purple-200/70 bg-gradient-to-b from-purple-100/40 via-purple-50/60 to-white p-3 shadow-[0_20px_40px_-10px_rgba(91,76,243,0.14),inset_0_1px_2px_rgba(255,255,255,1)] transition-all duration-500 hover:scale-[1.03]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,46,255,0.12),transparent_70%)] pointer-events-none" />
              
              <img 
                src="/3d_hero.png" 
                alt="Collaborative IT Incident Management" 
                className="relative z-10 w-full h-auto max-h-[225px] rounded-xl object-contain opacity-100 animate-[pulse_6s_ease-in-out_infinite]"
              />
            </div>

            {/* Headline */}
            <div className="relative mt-5">
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-56 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-snug">
                IT Case Discussions, <br />
                <span className="bg-gradient-to-r from-[#5B4CF3] via-[#7B3BF8] to-[#8B2EFF] bg-clip-text text-transparent">
                  Unified & Resolved
                </span>
              </h2>
            </div>
            
            <p className="mt-1.5 text-xs font-medium text-slate-500 max-w-xs leading-relaxed">
              Streamline incident tracking, technical discussions, and cross-team collaboration in one secure workspace.
            </p>
          </div>

          {/* Interactive Feature Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <div className="group flex items-center gap-1.5 rounded-full border border-purple-100/90 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs transition-all duration-200 hover:bg-white hover:border-purple-300 hover:ring-2 hover:ring-purple-200/50 hover:shadow-xs hover:-translate-y-0.5 cursor-pointer">
              <svg className="h-3.5 w-3.5 text-[#5B4CF3] group-hover:text-[#8B2EFF] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Secure Authentication</span>
            </div>

            <div className="group flex items-center gap-1.5 rounded-full border border-purple-100/90 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs transition-all duration-200 hover:bg-white hover:border-purple-300 hover:ring-2 hover:ring-purple-200/50 hover:shadow-xs hover:-translate-y-0.5 cursor-pointer">
              <svg className="h-3.5 w-3.5 text-[#8B2EFF] group-hover:text-[#5B4CF3] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Incident Resolution</span>
            </div>

            <div className="group flex items-center gap-1.5 rounded-full border border-purple-100/90 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs transition-all duration-200 hover:bg-white hover:border-purple-300 hover:ring-2 hover:ring-purple-200/50 hover:shadow-xs hover:-translate-y-0.5 cursor-pointer">
              <svg className="h-3.5 w-3.5 text-[#5B4CF3] group-hover:text-[#8B2EFF] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Real-time Collaboration</span>
            </div>
          </div>

        </div>

        {/* RIGHT SECTION: Login Form */}
        <div className="flex flex-col justify-center bg-white p-8 lg:p-10">
          <div className="mx-auto w-full max-w-sm">
            
            {/* Logo Header */}
            <div className="flex items-center gap-1.5 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] text-white shadow-md shadow-[#5B4CF3]/30">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 ml-1">CaseRoom</h1>
            </div>

            {/* Header (Dynamic based on authStep) */}
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5B4CF3]">
                {authStep === "otp" ? "ONE-TIME PASSCODE" : "SIGN IN"}
              </p>
              <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {authStep === "otp" ? "Enter Verification Code" : "Welcome Back"}
              </h3>
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                {authStep === "otp" 
                  ? "Enter the 6-digit passcode sent to your email address." 
                  : "Please sign in to your account to access your secure workspace."}
              </p>
            </div>

            <LoginForm onStepChange={setAuthStep} />

            {/* Footer Links (Item 7: Show Support link on OTP step instead of Register) */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              {authStep === "otp" ? (
                <p className="text-xs font-medium text-slate-400">
                  Need help?{" "}
                  <a
                    href="mailto:support@caseroom.com"
                    className="font-semibold text-slate-600 hover:text-[#5B4CF3] transition-colors"
                  >
                    Contact Support
                  </a>
                </p>
              ) : (
                <p className="text-xs font-medium text-slate-500">
                  Don&apos;t have an account?{" "}
                  <Link
                    to="/register"
                    className="font-bold text-[#5B4CF3] transition-colors hover:text-[#8B2EFF] hover:underline"
                  >
                    Register
                  </Link>
                </p>
              )}
            </div>

          </div>
        </div>

      </div>
    </main>
  )
}
