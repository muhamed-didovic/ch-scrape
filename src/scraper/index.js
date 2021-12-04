require('regenerator-runtime/runtime');
const { fetcher, createFetcher } = require('./fetcher/fetcher');
const corsProxyFetcher = require('./fetcher/corsProxyFetcher');
const { parseHtml, parseCurrentPageHtml, setGlobalFilters } = require('./scraper/scraper');
const enhancedAxios = require('./fetcher/enhancedAxios');
const FormData = require('form-data');

module.exports = {
  // Fetchers
  fetcher,
  createFetcher,
  corsProxyFetcher,

  // Parsers / scrapers
  parseHtml,
  parseCurrentPageHtml,
  setGlobalFilters,

  // Other tools
  enhancedAxios,
  FormData
};
