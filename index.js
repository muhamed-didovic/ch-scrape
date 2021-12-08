const downloader = require('./src/index');

(async () => {
  let prompt = await downloader.prompt()
  // console.log('finalni pro', prompt);
  await downloader.run(prompt)
})()
