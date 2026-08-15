import { recoverAddress } from 'ethers';

const digest = '0xd5c2dfa428b2d85feea3bfb3d8457d815b6383fb7b3bb7a1bdb4a7ffc30228d2';
const foundrySig =
  '0xdd638a04bb0c80ea3ec40926e8f1b2462ceb8952303ae9c5722875524efe3c3d4f705901ea20c97d8f7160416c94fa5a4fe61737b8f048b293adcf54ca2f7ac91c';

console.log('recover foundry sig', recoverAddress(digest, foundrySig));
console.log('expected', '0xe05fcC23807536bEe418f142D19fa0d21BB0cfF7');
