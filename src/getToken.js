// const axios = require('axios');
const req = require('requestretry');
const j = req.jar();
const request = req.defaults({ jar: j, retryDelay: 500, fullResponse: true });

const getToken = async (email, password) => {
  try {
    /*let res = await axios({
      url    : 'https://coursehunter.net/sign-in',
      // method : 'POST',
      // maxRedirects: 0,
      // maxRedirects: 0,
      // redirect: 'manual',
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*!/!*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      },
      // "method": "POST",
      // "mode": "cors",
      // "credentials": "include",
      data
    })*/

    const res = await request.post({
      url            : 'https://coursehunter.net/sign-in',
      throwHttpErrors: false,
      followRedirect : true,
      headers        : {
        'content-type': 'application/json',
      },
      body           : JSON.stringify({ email, password }),
      verify         : false
    })

    // console.log('headers', res.status, res.headers);
    // console.log('set-cookie', res.headers['set-cookie']);
    let [,xsrfToken] = res.headers['set-cookie']
    // console.log('xsrfToken', xsrfToken);
    return xsrfToken.split(';')[0]; // accessToken=' + res.data.token;
  } catch (error) {
    throw new Error(error.response.data);
  }
};

module.exports = getToken;
