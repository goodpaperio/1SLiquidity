'use client'

import DigitalCustodySection from '../landing/digital-custody-section'
import FeaturesSection from '../landing/features-section'
import GatewaySection from '../landing/gateway-section'
import Navbar from '../navbar'

const Docs = () => {
  return (
    <>
      <div className="relative min-h-screen bg-black">
        <Navbar />

        {/* Documentation Sections */}
        <div className="relative overflow-hidden bg-black z-10">
          <GatewaySection />
          <FeaturesSection />
          <DigitalCustodySection />
        </div>
      </div>
    </>
  )
}

export default Docs
