const downloader = require('./lib/cli');

(async () => {
  console.time('took');
  let prompt = await downloader.prompt()
  console.log('inputs', prompt);
  await downloader.run(prompt)
  console.timeEnd('took');
})()
