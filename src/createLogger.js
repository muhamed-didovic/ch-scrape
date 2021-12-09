'use strict';

/*const path = require('path');
const fs = require('fs');

function createLogger(downloadFolder) {
  const logFile =`${downloadFolder}${path.sep}videos.txt`
  fs.existsSync(logFile) ?
    console.log(`File ${logFile} already exists`.blue) :
    console.log(`File ${logFile} created`.blue);
  const logger = fs.createWriteStream(logFile, { flags: 'a' });
  return logger;
}

module.exports = createLogger;*/

const ora = require('ora')

/**
 * @param {import('ora').Options & {disabled: boolean}} opts
 * @returns {import('ora').Ora}
 */
module.exports = (opts = {}) => new Proxy({ isLogger: true }, {
  get (target, prop) {
    if (hasOwn(target, prop)) return Reflect.get(target, prop)
    if (opts.disabled) return returnNullObj
    const o = ora(opts)
    if (prop === 'promise') {
      return (p, text) => {
        const spin = o.start(text)
        return p.then(
          v => (spin.succeed(text + '  completed.'), v),
          err => (spin.fail(text + '  failed!'), Promise.reject(err))
        )
      }
    }
    return typeof o[prop] === 'function' ? o[prop].bind(o) : o[prop]
  }
})

function hasOwn (o, prop) {
  return Object.prototype.hasOwnProperty.call(o, prop)
}

function returnNullObj () {
  return {}
}
