const ConversionSection: React.FC = ({}) => {
  return (
    <div className="w-full">
      <div className="w-full flex gap-2 justify-between items-center mt-[12px] uppercase text-[18px]">
        {/* select token */}
        <p className="text-white">Share of pool</p>
        <p className="bg-gradientText bg-clip-text text-transparent inline-block">
          Est. WEEKLY Yield
        </p>
      </div>

      {/* amount */}
      <div className="w-full flex gap-2 justify-between items-center text-[36px] md:text-[42px]">
        <p className="">~13.7%</p>
        <p className="">$2.20</p>
      </div>

      {/* bottom section */}
      <div className="w-full flex gap-[6px] items-center">
        <p className="text-primary">0.015 ETH*</p>
      </div>
    </div>
  )
}

export default ConversionSection
