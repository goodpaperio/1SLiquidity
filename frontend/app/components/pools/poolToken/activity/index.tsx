'use client';
import Tabs from '@/app/components/tabs';
import { ACTIVITY_TABS } from '@/app/lib/constants';
import { useState } from 'react';
import ActivityTable from './activity-table';

type Props = {};

const Activity: React.FC<Props> = () => {
  const [activityActiveTab, setActivityActiveTab] = useState(
    ACTIVITY_TABS[0]
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      <h1 className="text-[30px] md:text-[42px] font-bold">
        Activity
      </h1>

      <div className="w-full gap-4 flex flex-wrap justify-between">
        <div className="w-fit">
          <Tabs
            theme="secondary"
            tabs={ACTIVITY_TABS}
            activeTab={activityActiveTab}
            setActiveTab={setActivityActiveTab}
            tabHeight={32}
          />
        </div>
        <ActivityTable />
      </div>
    </div>
  );
};

export default Activity;
