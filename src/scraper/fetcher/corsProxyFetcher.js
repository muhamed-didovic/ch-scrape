const axios = require('./enhancedAxios');
const { createFetcher } = require('./fetcher');

const fetcher = createFetcher();
fetcher.setFetchAdapter(config => {
  return axios({
    ...config,
    url: `https://cors-anywhere.herokuapp.com/${config.url}`,
    //headers: { Origin: 'https://example.com' }
  }).then(response => response.data);
});

module.exports = fetcher;
