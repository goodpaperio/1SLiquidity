'use client';
import { DAYS, EXPLORE_TABS } from '@/app/lib/constants';
import { useState } from 'react';
import Tabs from '../../tabs';
import Searchbar from '../../searchbar';
import PoolTable from './pool-table';

type Props = {
  onAddLiquidity: () => void;
};

const Explore: React.FC<Props> = ({ onAddLiquidity }) => {
  const [exploreActiveTab, setExploreActiveTab] = useState(
    EXPLORE_TABS[0]
  );
  const [daysActiveTab, setDaysActiveTab] = useState(DAYS[0]);
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="flex flex-col gap-4 w-full">
      <h1 className="text-[30px] md:text-[42px] font-bold">
        Explore Pools
      </h1>

      <div className="w-full gap-3 flex flex-wrap justify-between">
        <div className="w-fit min-w-40">
          <Tabs
            theme="secondary"
            tabs={EXPLORE_TABS}
            activeTab={exploreActiveTab}
            setActiveTab={setExploreActiveTab}
            tabHeight={32}
          />
        </div>
        <div className="flex w-fit gap-3 flex-wrap-reverse">
          <div className="w-fit">
            <Tabs
              tabs={DAYS}
              theme="secondary"
              activeTab={daysActiveTab}
              setActiveTab={setDaysActiveTab}
              tabHeight={32}
            />
          </div>
          <div className="w-[230px]">
            <Searchbar
              onChange={(e) => setSearchValue(e.target.value)}
              value={searchValue}
              setValue={(e: any) => setSearchValue(e)}
            />
          </div>
        </div>
        <PoolTable onAddLiquidity={onAddLiquidity} />
      </div>
    </div>
  );
};

export default Explore;
