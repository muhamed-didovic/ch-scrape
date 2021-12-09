const downloader = require('./index');

(async () => {
  let prompt = await downloader.prompt()
  await downloader.run(prompt)
})()
