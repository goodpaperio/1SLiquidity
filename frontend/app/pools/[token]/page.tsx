'use client';
import Breadcrumbs from '@/app/components/breadcrumbs';
import Navbar from '@/app/components/navbar';
import AddLiquidity from '@/app/components/pools/addLiquidity';
import PoolToken from '@/app/components/pools/poolToken';
import Activity from '@/app/components/pools/poolToken/activity';
import LiquidityStats from '@/app/components/pools/poolToken/liquidity-stats';
import WithdrawSection from '@/app/components/pools/withdraw';
import { useState } from 'react';

export default function Token() {
  const [isLiquidityTab, setIsLiquidityTab] = useState(false);
  const [isWithdrawTab, setIsWithdrawTab] = useState(false);
  return (
    <div className="">
      <Navbar
        isBack={isLiquidityTab || isWithdrawTab}
        onBack={() => {
          setIsLiquidityTab(false);
          setIsWithdrawTab(false);
        }}
      />
      {isLiquidityTab ? (
        <div className="mt-[110px] mb-10 mx-auto w-fit">
          <AddLiquidity />
        </div>
      ) : isWithdrawTab ? (
        <div className="mt-[110px] mb-10 mx-auto w-fit">
          <WithdrawSection />
        </div>
      ) : (
        <div className="mt-[110px] mb-10 w-full px-6 lg:px-[11%]">
          <Breadcrumbs
            links={[
              { title: 'Pools', href: '/pools' },
              { title: 'ETH', href: '/pools/eth', active: true },
            ]}
          />
          <div className="mt-[34px] flex flex-col lg:grid grid-cols-5 gap-28">
            <div className="md:col-span-3 flex flex-col gap-8">
              <PoolToken />
              <div className="md:mt-[50px]">
                <Activity />
              </div>
            </div>
            <div className="md:col-span-2">
              <LiquidityStats
                onAddLiquidity={() => setIsLiquidityTab(true)}
                onWithdraw={() => setIsWithdrawTab(true)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
