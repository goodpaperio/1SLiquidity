import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { DepthAggregator } from '../../services/depth-aggregator'
import { DepthConfig } from '../../types/depth'
import { CONTRACT_ADDRESSES } from '../../config/dex'
import { getCache, setCache, generateCacheKey } from '../../utils/redis'
import { createProvider } from '../../utils/provider'

const provider = createProvider()
const depthAggregator = new DepthAggregator(provider)

// Cache TTL in seconds
const CACHE_TTL = 10

// export const main = async (
//   event: APIGatewayProxyEvent
// ): Promise<APIGatewayProxyResult> => {
//   try {
//     // Parse query parameters
//     const token0 = event.queryStringParameters?.token0;
//     const token1 = event.queryStringParameters?.token1;
//     const intervals = event.queryStringParameters?.intervals || '0.01,0.02'; // Default to 1% and 2%
//     const maxDepthPoints = parseInt(event.queryStringParameters?.maxDepthPoints || '10');

//     if (!token0 || !token1) {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({
//           error: 'Missing required parameters: token0 and token1'
//         })
//       };
//     }

//     // Parse intervals
//     const priceIntervals = intervals.split(',').map(Number);

//     // Create depth config
//     const config: DepthConfig = {
//       maxDepthPoints,
//       priceIntervals
//     };

//     // Generate cache key based on tokens and config
//     const cacheKey = generateCacheKey('DEPTH', `${token0}-${token1}-${intervals}-${maxDepthPoints}`);

//     // Try to get from cache first
//     const cachedData = await getCache<any>(cacheKey);
//     if (cachedData) {
//       console.log(`Cache hit for depth of ${token0}-${token1}`);
//       return {
//         statusCode: 200,
//         headers: {
//           'Content-Type': 'application/json',
//           'Access-Control-Allow-Origin': '*'
//         },
//         body: JSON.stringify(cachedData)
//       };
//     }

//     // If not in cache, fetch from API
//     console.log(`Cache miss for depth of ${token0}-${token1}, fetching from API...`);
//     const depthData = await depthAggregator.getDepth(token0, token1, config);

//     // Only store in cache if we have valid data
//     if (depthData && (Array.isArray(depthData) ? depthData.length > 0 : Object.keys(depthData).length > 0)) {
//       await setCache(cacheKey, depthData, CACHE_TTL);
//     } else {
//       console.log(`Skipping cache for empty response: ${token0}-${token1}`);
//     }

//     return {
//       statusCode: 200,
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*'
//       },
//       body: JSON.stringify(depthData)
//     };
//   } catch (error) {
//     console.error('Error in getDepth handler:', error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({
//         error: 'Internal server error'
//       })
//     };
//   }
// };
