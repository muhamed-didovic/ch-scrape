const axios = require('axios');

const getToken = async (e_mail, password) => {
  try {
    let res = await axios({
      url    : 'https://coursehunter.net/api/auth/login',
      method : 'put',
      headers: {
        'content-type'               : 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      data   : JSON.stringify({ e_mail: e_mail, password: password }),
    })

    if (!res.data.token) throw new Error('not token from response')
    return res.headers['set-cookie'][0] + '; accessToken=' + res.data.token;
  } catch (error) {
    throw new Error(error.response.data);
  }
};

module.exports = getToken;
