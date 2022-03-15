const axios = require('axios').default;
const axiosRetry = require('axios-retry');
const FormData = require('form-data');

// Axios with:
// - basic cookie session support (careful: it's not supporting domain filtering for now so it will send your cookie to any domain)
// - form data

axiosRetry(axios, {
  retries: 50,
  //retryDelay: axiosRetry.exponentialDelay,
  // shouldResetTimeout: true,
  //retryCondition: (_error) => true // retry no matter what

  retryDelay    : (retryCount) => {
    //console.log(`retry attempt: ${retryCount}`);
    return retryCount*2000; // time interval between retries
  },
  retryCondition: (error) => {
    // console.log('EEEEEEE', error);
    // if retry condition is not specified, by default idempotent requests are retried
    // return error.response.status === 502;
    return true
  },
});

// rax.attach();
/*const myConfig = {
  raxConfig: {
    retry: 5, // number of retry when facing 4xx or 5xx
    noResponseRetries: 5, // number of retry when facing connection error
    onRetryAttempt: err => {
      const cfg = rax.getConfig(err);
      console.log(`Retry attempt #${cfg.currentRetryAttempt}`); // track current trial
    }
  },
  timeout: 50 // don't forget this one
}*/

const STANDARD_COOKIE_PROPERTIES = [
  'domain',
  'expires',
  'httponly',
  'max-age',
  'path',
  'secure'
];

function isCookieValueProperty(key) {
  return STANDARD_COOKIE_PROPERTIES.indexOf(key.toLowerCase()) === -1;
}

function getCookieValue(cookieObj) {
  return Object.keys(cookieObj)
    .filter(isCookieValueProperty)
    .reduce((str, key) => (str += `${key}=${cookieObj[key]};`), '');
}

function accumCookieProperties(cookieObjectAccum, cookieString) {
  let [name, value] = cookieString
    .split('=')
    .map(cookiePart => cookiePart.trim());

  try {
    cookieObjectAccum[name] = JSON.parse(value);
  } catch (error) {
    cookieObjectAccum[name] = value;
  }
  return cookieObjectAccum;
}

function parseCookie(cookie) {
  const cookieObj = cookie.split(';').reduce(accumCookieProperties, {});
  return {
    cookie: cookieObj,
    value : () => getCookieValue(cookieObj)
  };
}

function createFormData(formObj) {
  const form = new FormData();
  Object.keys(formObj).forEach(key => {
    form.append(key, formObj[key]);
  });
  return form;
}

function handleForm(config) {
  if (config.form) {
    const form = createFormData(config.form);
    config.headers = Object.assign(config.headers || {}, form.getHeaders());
    config.data = form;
    delete config.form;
  }
}

function setCookieHook(config) {
  if (!config.cookieHookSetuped) {
    config.transformResponse = axios.defaults.transformResponse.concat(function (
      data,
      headers
    ) {
      if (headers['set-cookie']) {
        const cookies = headers['set-cookie'].map(c => parseCookie(c));
        const cookie = cookies.reduce(
          (str, cookie) => (str += cookie.value()),
          ''
        );
        config.headers = Object.assign(config.headers || {}, { Cookie: cookie });
      }
      return data;
    });
    config.cookieHookSetuped = true;
  }
}

function enhancedAxios(config) {
  setCookieHook(config);
  handleForm(config);
  /*config.raxConfig = {
    retry     : 3,
    retryDelay: 4000
  }*/
  return axios(config);
}

module.exports = enhancedAxios;
