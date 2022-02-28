const downloader = require('./index');

(async () => {
  console.time('test');
  let prompt = await downloader.prompt()
  await downloader.run(prompt)
  console.timeEnd('test');
})()
