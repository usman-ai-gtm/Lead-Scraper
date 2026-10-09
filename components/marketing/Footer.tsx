import React from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, Lock, Globe2 } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#05070a] pt-16 pb-12 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Info */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-glow-sm">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                USMAN <span className="text-blue-500">AI GTM</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
              Find. Engage. Convert. Grow. Enterprise AI-powered sales intelligence, B2B prospecting, research, omnichannel outreach, CRM, and revenue operations.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> SOC 2 Type II
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <Lock className="h-4 w-4 text-blue-400" /> GDPR & CCPA
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06] text-xs text-slate-400 space-y-1">
              <div>Email: <a href="mailto:telegramtiktokn1@gmail.com" className="text-slate-300 hover:text-white transition-colors">telegramtiktokn1@gmail.com</a></div>
              <div>Phone: <a href="tel:+923304580601" className="text-slate-300 hover:text-white transition-colors">+923304580601</a></div>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/#platform" className="hover:text-white transition-colors">Command Center</Link></li>
              <li><Link href="/features" className="hover:text-white transition-colors">Lead Discovery</Link></li>
              <li><Link href="/features" className="hover:text-white transition-colors">AI Research</Link></li>
              <li><Link href="/features" className="hover:text-white transition-colors">Cold Email Cadence</Link></li>
              <li><Link href="/features" className="hover:text-white transition-colors">WhatsApp Business</Link></li>
              <li><Link href="/app/crm" className="hover:text-white transition-colors">Enterprise CRM</Link></li>
            </ul>
          </div>

          {/* Solutions Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">Solutions</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/solutions" className="hover:text-white transition-colors">Enterprise Sales</Link></li>
              <li><Link href="/solutions" className="hover:text-white transition-colors">RevOps & Pipeline</Link></li>
              <li><Link href="/solutions" className="hover:text-white transition-colors">Agency Lead Gen</Link></li>
              <li><Link href="/solutions" className="hover:text-white transition-colors">Customer Success</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing & Plans</Link></li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">Company & Trust</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About USMAN AI</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Sales</Link></li>
              <li><Link href="/resources" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/about#security" className="hover:text-white transition-colors">Security & Trust</Link></li>
              <li><Link href="/about#privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/about#terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} USMAN AI GTM Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Powered by 29 AI Models</span>
            <span>Zero Streamlit Runtime</span>
            <span className="text-emerald-400 font-medium">● Systems 100% Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
