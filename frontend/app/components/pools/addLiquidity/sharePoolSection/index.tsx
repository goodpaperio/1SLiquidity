import ConversionSection from '../conversionSection';

interface Props {}

const SharePoolSection: React.FC<Props> = () => {
  return (
    <div className="w-full min-h-[167px] border-[2px] border-white12 p-[1px] relative rounded-[15px]">
      <div className="bg-black z-20 w-full h-full sticky left-0 top-0 px-7 py-5 rounded-[13px]">
        <ConversionSection />
      </div>
    </div>
  );
};

export default SharePoolSection;
