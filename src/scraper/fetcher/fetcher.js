const axios = require('./enhancedAxios');
const { parseHtml } = require('../scraper/scraper');
const enhanceIterator = require('./enhanceIterator');
const addScraperShortcuts = require('../utils/addScraperShortcuts');

function createFetcher(config = {}) {
  let fetcherInstance;

  function fetcher() {
    if (fetcherInstance) {
      return fetcherInstance;
    }

    const globalRequestConfig = { ...config };
    let fetch = requestConfig => {
      return axios({
        ...requestConfig,
        url: encodeURI(requestConfig.url)
      }).then(response => response.data);
    };

    function paginate(paginate, url) {
      if (typeof paginate !== 'string' && typeof paginate !== 'function') {
        throw new Error('paginate argument must be a string or function');
      }

      const paginateGenFn = function*() {
        let page;
        let fetchFnWithPageUpdate = config =>
          fetchNode(config, p => {
            page = p;
            return p;
          });

        yield fetchFnWithPageUpdate({ url });

        let currentPageNumber = 0;
        while (true) {
          if (typeof paginate === 'string') {
            url = page.link(paginate);
          } else {
            url = paginate(++currentPageNumber, page);
            // TODO: check if url is valid
          }
          if (!url) {
            break;
          }
          yield fetchFnWithPageUpdate({ url });
        }
      };

      const paginateIterator = paginateGenFn();
      return enhanceIterator(paginateIterator);
    }

    async function followLink(config, selector) {
      const page = await fetchNode(config);
      const url = page.link(selector);
      return scraperFetchNode({ url });
    }

    function followLinks(config, selector) {
      async function followLinks() {
        const page = await fetchNode(config);
        const urlsIterator = page.linksGenerator(selector);
        const fetchIteratorFn = function*() {
          for (let url of urlsIterator) {
            yield fetchNode({ url });
          }
        };
        return fetchIteratorFn();
      }
      const iteratorPromise = followLinks();
      return enhanceIterator(iteratorPromise);
    }

    async function process(requestConfig) {
      requestConfig.headers = {
        ...requestConfig.headers,
        ...globalRequestConfig.headers
      };

      const html = await fetch(requestConfig);

      if (requestConfig.saveCookies && requestConfig.headers) {
        globalRequestConfig.headers = Object.assign(
          globalRequestConfig.headers || {},
          requestConfig.headers
        );
      }
      const page = parseHtml(html, requestConfig.url);
      return page;
    }

    function fetchNode(config = {}, postFn = p => p, preFn = p => p) {
      const requestConfig = { ...globalRequestConfig, ...config };
      const fetch = () =>
        Promise.resolve(preFn)
          .then(() => process(requestConfig))
          .then(postFn);

      const fetchNode = fetch;
      fetchNode.location = requestConfig.url;

      fetchNode.then = (resolve, reject) => fetch().then(resolve, reject);
      fetchNode.catch = (...args) => fetch().catch(...args);
      fetchNode.paginate = fn => enhanceIterator(paginate(fn, fetch.location));
      fetchNode.followLink = (...args) => followLink(requestConfig, ...args);
      fetchNode.followLinks = (...args) => followLinks(requestConfig, ...args);
      fetchNode.get = (...args) =>
        addScraperShortcuts(fetch().then(() => fetcherInstance.get(...args)));
      fetchNode.post = (...args) =>
        addScraperShortcuts(fetch().then(() => fetcherInstance.post(...args)));

      return fetchNode;
    }

    function scraperFetchNode(config) {
      return addScraperShortcuts(fetchNode(config));
    }

    function generatorFetchNode(iterator, config = {}) {
      const generatorFetchNodeFn = function*() {
        for (let url of iterator) {
          yield fetchNode({ ...config, url });
        }
      };
      return enhanceIterator(generatorFetchNodeFn());
    }

    fetcher.get = function(url, config) {
      return scraperFetchNode({ ...config, url, method: 'get' });
    };

    fetcher.post = function(url, data, config) {
      return scraperFetchNode({ ...config, url, data, method: 'post' });
    };

    fetcher.getAll = function(iterator, config = {}) {
      return generatorFetchNode(iterator, config);
    };

    fetcher.login = function(config) {
      const loginRequestConfig = {
        method: 'post',
        saveCookies: true,
        /* Specific for axios (TODO: see how to extract this from the fetcher) */
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status <= 302,
        /* End */
        ...config
      };

      return fetchNode(loginRequestConfig);
    };

    fetcher.setFetchAdapter = function(fetchFn) {
      fetch = fetchFn;
    };

    fetcher.download = async function(url, path) {
      const response = await axios({ url, responseType: 'arraybuffer' });
      await new Promise((resolve, reject) => {
        require('fs').writeFile(path, response.data, error => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    };

    return fetcher;
  }

  fetcherInstance = fetcher();
  return fetcherInstance;
}

module.exports = {
  fetcher: createFetcher(),
  createFetcher
};
