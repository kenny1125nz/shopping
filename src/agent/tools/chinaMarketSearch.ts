import type { SearchResponse } from '../types';
import { tavilySearch, noSearchResult } from './tavily';

/**
 * Domains covering legitimate Chinese manufacturers and marketplaces.
 */
const CHINA_MARKET_DOMAINS = [
  'tmall.com',
  'jd.com',
  'taobao.com',
  '1688.com',
  'mi.com',
  'dji.com',
  'anker.com',
  'midea.com',
  'haier.com',
  'hisense.com',
  'tcl.com',
  'gree.com',
  'fiio.com',
  'moondrop.com',
];

/**
 * Chinese review and community domains for reputation assessment.
 * smzdm.com = 什么值得买 (China's main consumer review/deals community).
 */
const CHINA_REVIEW_DOMAINS = [
  'smzdm.com',
  'zhihu.com',
  'zol.com.cn',
  'pcpop.com',
  'bilibili.com',
];

/**
 * Step 1 — Identify legitimate Chinese brands and models for this product category.
 * Searches broadly across the web to surface brand names, manufacturers, and
 * common model lines before narrowing down to specific listings.
 */
export async function searchChineseBrands(query: string, tavilyKey: string | null): Promise<SearchResponse> {
  if (!tavilyKey) return noSearchResult('Chinese brand search is unavailable.');
  return tavilySearch(
    `${query} 国产品牌 知名品牌 厂家推荐 Chinese brands manufacturers`,
    tavilyKey,
    { maxResults: 6, searchDepth: 'advanced' },
  );
}

/**
 * Step 2 — Assess the reputation of identified brands.
 * Targets Chinese review communities (什么值得买, Zhihu, ZOL) for authentic
 * consumer sentiment, quality assessments, and reliability reports.
 *
 * @param query         - Product query with Chinese keywords from query analysis
 * @param brandNames    - Space-separated brand names extracted from step 1
 */
export async function searchChineseReputation(
  query: string,
  brandNames: string,
  tavilyKey: string | null,
): Promise<SearchResponse> {
  if (!tavilyKey) return noSearchResult('Chinese brand reputation search is unavailable.');
  const prefix = brandNames ? `${brandNames} ` : '';
  return tavilySearch(
    `${prefix}${query} 品牌评价 口碑 质量 可靠性 值得买 review reputation`,
    tavilyKey,
    { includeDomains: CHINA_REVIEW_DOMAINS, maxResults: 5, searchDepth: 'advanced' },
  );
}

/**
 * Step 3 — Get current prices for the top identified brands on Chinese marketplaces.
 * Targets Taobao, Tmall, and JD.com flagship stores for accurate domestic CNY pricing.
 *
 * @param query         - Product query with Chinese keywords from query analysis
 * @param brandNames    - Space-separated brand names extracted from step 1
 */
export async function searchChinesePrices(
  query: string,
  brandNames: string,
  tavilyKey: string | null,
): Promise<SearchResponse> {
  if (!tavilyKey) return noSearchResult('Chinese price search is unavailable.');
  const prefix = brandNames ? `${brandNames} ` : '';
  return tavilySearch(
    `${prefix}${query} 价格 多少钱 CNY 淘宝 京东 天猫`,
    tavilyKey,
    { includeDomains: CHINA_MARKET_DOMAINS, maxResults: 6, searchDepth: 'basic' },
  );
}
