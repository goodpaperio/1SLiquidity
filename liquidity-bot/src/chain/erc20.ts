import { Contract, type ContractRunner } from 'ethers';
import { ERC20_ABI } from './contracts.js';

export async function getBalance(
  token: string,
  account: string,
  runner: ContractRunner
): Promise<bigint> {
  const erc20 = new Contract(token, ERC20_ABI, runner);
  return BigInt((await erc20.balanceOf(account)).toString());
}

export async function ensureAllowance(
  token: string,
  owner: string,
  spender: string,
  amount: bigint,
  runner: ContractRunner
): Promise<void> {
  const erc20 = new Contract(token, ERC20_ABI, runner);
  const current = BigInt((await erc20.allowance(owner, spender)).toString());
  if (current >= amount) return;
  const tx = await erc20.approve(spender, amount);
  await tx.wait();
}
