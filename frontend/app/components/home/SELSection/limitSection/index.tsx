import ConversionSection from '../conversionSection';

interface Props {
  active: boolean;
  setActive: any;
}

const LimitSection: React.FC<Props> = ({ active, setActive }) => {
  return (
    <div
      className="w-full min-h-[167px] border-[2px] border-primary px-7 py-5 rounded-[15px]"
      onClick={() => setActive(!active)}
    >
      <ConversionSection />
    </div>
  );
};

export default LimitSection;
