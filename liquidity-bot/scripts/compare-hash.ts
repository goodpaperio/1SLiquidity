import { createRequire } from 'node:module';
import { getAddress } from 'ethers';
const require = createRequire(import.meta.url);
const { SignatureTransfer } = require('@uniswap/permit2-sdk');

const permit = {
  permitted: [{ token: getAddress('0x0F5D2fB29fb7d3CFeE444a200298f468908cC942'), amount: '100000000000000000000' }],
  spender: getAddress('0xce9f5d7D17C92Ba1bBCe770FfddE8C92Ed5Baf95'),
  nonce: '0',
  deadline: '1782859015',
};
const h = SignatureTransfer.hash(permit, '0x000000000022D473030F116dDEE9F6B43aC78BA3', 1);
const foundry = '0xd5c2dfa428b2d85feea3bfb3d8457d815b6383fb7b3bb7a1bdb4a7ffc30228d2';
console.log('sdk', h);
console.log('foundry', foundry);
console.log('match', h === foundry);
