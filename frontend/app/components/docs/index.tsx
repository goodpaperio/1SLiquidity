'use client'

import CTASection from '../landing/cta-section'
import FeaturesSection from '../landing/features-section'
import GatewaySection from '../landing/gateway-section'
import HowItWorksSection from '../landing/how-it-works-section'
import KeyMetricsSection from '../landing/key-metrics-section'
import SupportedNetworksSection from '../landing/supported-networks-section'
import UseCasesSection from '../landing/use-cases-section'
import WhatIsSection from '../landing/what-is-section'
import Navbar from '../navbar'

const marqueeItems = [
  '/// Stream Execution Live',
  '/// Multi-DEX Aggregation',
  '/// Slippage Under 10 BPS',
  '/// Instasettle OTC',
  '/// 40+ Chains Supported',
  '/// Sweet Spot Algorithm',
]

const Docs = () => {
  return (
    <>
      <div className="relative bg-black">
        {/* Scanlines overlay */}
        <div className="bg-scanlines" aria-hidden />

        {/* HUD border frame - aligned below navbar (docs page only) */}
        <div
          className="fixed top-16 left-4 right-4 bottom-4 border border-white/5 pointer-events-none z-40 hidden lg:block"
          aria-hidden
        >
          <div className="absolute bottom-0 left-0 p-2 font-mono text-[9px] text-gray-700">
            DECASTREAM
          </div>
          <div className="absolute bottom-0 right-0 p-2 font-mono text-[9px] text-gray-700">
            DOCS
          </div>
        </div>

        {/* Fixed transparent navbar so hero background shows through */}
        <div className="fixed top-0 left-0 right-0 z-[5555] bg-transparent">
          <Navbar />
        </div>

        {/* Normal full-page scroll (snap disabled for design review) */}
        <div className="min-h-screen overflow-y-auto scroll-smooth docs-page-scroll">
          <GatewaySection />
          {/* Marquee ticker bar */}
          <div className="bg-[var(--primary)] py-2 overflow-hidden relative z-20">
            <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite] font-mono text-xs font-bold text-black uppercase tracking-widest">
              {marqueeItems.concat(marqueeItems).map((item, i) => (
                <span key={i} className="mx-8">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <WhatIsSection />
          <FeaturesSection />
          <HowItWorksSection />
          <KeyMetricsSection />
          <SupportedNetworksSection />
          <UseCasesSection />
          <CTASection />
        </div>
      </div>
    </>
  )
}

export default Docs
