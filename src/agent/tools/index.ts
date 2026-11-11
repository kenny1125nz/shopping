export { searchNZRetailers }     from './nzRetailerSearch';
export { searchOverseasMarkets }  from './overseasSearch';
export {
  searchChineseBrands,
  searchChineseReputation,
  searchChinesePrices,
} from './chinaMarketSearch';
export { searchProductReviews }  from './reviewSearch';
export { searchWeb }             from './webSearch';

/** Display metadata for each tool — used by the progress UI. */
export const TOOL_META: Record<string, { label: string; icon: string }> = {
  analyzeQuery:            { label: 'Analysing query',       icon: '🧠' },
  searchWeb:               { label: 'Web search',            icon: '🔍' },
  searchNZRetailers:       { label: 'NZ retailers',          icon: '🇳🇿' },
  searchOverseasMarkets:   { label: 'Overseas markets',      icon: '🌏' },
  searchChineseBrands:     { label: 'Chinese brands',        icon: '🇨🇳' },
  searchChineseReputation: { label: 'Brand reputation',      icon: '🔎' },
  searchChinesePrices:     { label: 'Chinese prices',        icon: '💴' },
  searchProductReviews:    { label: 'Product reviews',       icon: '⭐' },
};
