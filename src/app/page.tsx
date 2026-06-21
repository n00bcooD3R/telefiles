'use client';

import React from 'react';
import {
  Folder,
  Image as ImageIcon,
  HardDrive,
  Shield,
  Sparkles,
  ArrowRight,
  Server,
  Zap,
  Lock,
  Compass,
} from 'lucide-react';
import Link from 'next/link';
import { SignInButton, SignUpButton, Show } from '@clerk/nextjs';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden text-slate-100 bg-[#09090b]">
      {/* Dynamic Morphing Background */}
      <div className="mesh-bg" />

      {/* Decorative ambient glowing lines */}
      <div className="absolute top-0 left-1/4 w-[1px] h-screen bg-gradient-to-b from-white/5 via-white/2 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-3/4 w-[1px] h-screen bg-gradient-to-b from-white/5 via-white/2 to-transparent pointer-events-none" />

      {/* Floating Header */}
      <header className="fixed top-6 left-6 right-6 z-50 glass-panel px-8 py-4.5 rounded-full flex items-center justify-between shadow-2xl border-white/5 max-w-7xl mx-auto transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg">
            <Lock className="w-3.5 h-3.5 text-zinc-950" />
          </div>
          <span className="font-heading font-semibold text-lg text-white tracking-tight">
            privfiles
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-full text-xs font-semibold text-zinc-950 bg-white hover:bg-slate-200 transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-xs font-semibold text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-950 bg-white hover:bg-slate-200 transition-all duration-300 cursor-pointer shadow-lg">
                Get Started
              </button>
            </SignUpButton>
          </Show>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-40 pb-20 relative z-10 max-w-6xl mx-auto w-full text-center">
        <div className="space-y-8 max-w-4xl">
          {/* Editorial Index Number */}
          <div className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-semibold uppercase tracking-widest mx-auto">
            <Compass className="w-3.5 h-3.5 text-white animate-spin-slow" />
            <span>Standalone Storage Protocol</span>
          </div>

          <h1 className="text-4xl sm:text-7xl font-light tracking-tight text-white leading-tight text-glow">
            Your Private, Telegram-Backed<br />
            <span className="font-heading italic font-normal text-slate-300">
              Cloud Storage Vault
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed font-light">
            An elegant web-based file manager and gallery client. Connect your own Telegram Bot to host photos, clips, and archives securely with zero size limits.
          </p>

          <div className="pt-4 flex items-center justify-center gap-4.5">
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="px-8 py-3.5 rounded-full text-xs font-semibold text-zinc-950 bg-white hover:bg-slate-200 transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-xl"
              >
                <span>Access Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Show>
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <button className="px-8 py-3.5 rounded-full text-xs font-semibold text-zinc-950 bg-white hover:bg-slate-200 transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-xl">
                  <span>Start Free Backup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="px-8 py-3.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-transparent border border-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer">
                  <span>Sign In</span>
                </button>
              </SignInButton>
            </Show>
          </div>
        </div>

        {/* Features Matrix Grid - Liquid Glass Editorial design */}
        <section className="mt-32 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full text-left">
          {[
            {
              title: 'Unlimited Backup',
              desc: 'Store photos, clips, audio, and archives securely by piping files directly into Telegram channels/groups.',
              icon: HardDrive,
              color: 'text-white',
              border: 'border-white/5',
            },
            {
              title: 'iOS Gallery UI',
              desc: 'Browse photos/videos in zoomable grids, organize directories into custom Albums, and mark Favorites.',
              icon: ImageIcon,
              color: 'text-white',
              border: 'border-white/5',
            },
            {
              title: 'Interactive Setup Wizard',
              desc: 'Dynamic bot connector with automated chat ID scanning. Configure credentials at runtime in seconds.',
              icon: Server,
              color: 'text-white',
              border: 'border-white/5',
            },
            {
              title: 'AI Design Intelligence',
              desc: 'Fully integrated UI/UX Pro Max helper tools to fetch layouts, color swatches, and guidelines dynamically.',
              icon: Sparkles,
              color: 'text-white',
              border: 'border-white/5',
            },
          ].map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className={`glass-card p-8 rounded-3xl border ${feat.border} flex flex-col gap-6`}
              >
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon className={`w-4.5 h-4.5 ${feat.color}`} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-heading font-medium text-base text-white">{feat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-light">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Editorial Mock Stats Panel */}
        <section className="mt-28 glass-panel rounded-[2rem] p-10 border-white/5 w-full flex flex-col md:flex-row items-center justify-around gap-8">
          <div className="text-center space-y-1.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Vault Space</p>
            <h4 className="text-3xl font-light text-white font-heading italic">Unlimited</h4>
            <p className="text-[10px] text-slate-400 font-light">Telegram API Backed</p>
          </div>
          <div className="hidden md:block h-12 w-px bg-white/10" />
          <div className="text-center space-y-1.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Security Protocol</p>
            <h4 className="text-3xl font-light text-white font-heading italic">HTTPS / SSL</h4>
            <p className="text-[10px] text-slate-400 font-light">Masked Bot Credentials</p>
          </div>
          <div className="hidden md:block h-12 w-px bg-white/10" />
          <div className="text-center space-y-1.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Access Protocol</p>
            <h4 className="text-3xl font-light text-white font-heading italic">Clerk Core</h4>
            <p className="text-[10px] text-slate-400 font-light">Secure Account Management</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 border-t border-white/5 bg-black/40 text-center text-xs text-slate-500 z-10 relative">
        <p className="font-light tracking-wide">© 2026 privfiles. Standalone Telegram Storage Client. MIT License.</p>
      </footer>
    </div>
  );
}

