const downloader = require('../src/index');

(async () => {
  await downloader.run(await downloader.prompt())
})()

/*
(async () => {
  const { url, email, password, downDir, type } = await downloader.prompt();
  await downloader.run({ url, email, password, downDir, type });
})();
*/
