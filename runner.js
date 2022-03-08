const downloader = require('./index');

(async () => {
  console.time('took');
  let prompt = await downloader.prompt()
  await downloader.run(prompt)
  console.timeEnd('took');
})()
