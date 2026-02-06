'use client';
import { useState } from 'react';
import Navbar from '../components/navbar';
import Explore from '../components/pools/explore';
import Liquidity from '../components/pools/liquidity';
import PoolOverall from '../components/pools/overall';
import AddLiquidity from '../components/pools/addLiquidity';

export default function Pools() {
  const [isLiquidityTab, setIsLiquidityTab] = useState(false);
  return (
    <div className="">
      <Navbar
        isBack={isLiquidityTab}
        onBack={() => setIsLiquidityTab(false)}
      />
      {isLiquidityTab ? (
        <div className="mt-[110px] mb-10 mx-auto w-fit">
          <AddLiquidity />
        </div>
      ) : (
        <div className="mt-[110px] mb-10 w-full px-6 lg:px-[11%]">
          {/* <SELSection /> */}
          <div className="flex flex-col lg:grid grid-cols-5 gap-28">
            <div className="md:col-span-3">
              <PoolOverall />
            </div>
            <div className="md:col-span-2">
              <Liquidity />
            </div>
            {/* <PoolOverall /> */}
          </div>

          <div className="mt-[76px]">
            <Explore onAddLiquidity={() => setIsLiquidityTab(true)} />
          </div>
        </div>
      )}
    </div>
  );
}
