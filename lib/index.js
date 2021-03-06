#!/usr/bin/env node
const downloader = require('./cli');

(async () => {
  const { url, email, password, downDir, type } = await downloader.prompt();
  await downloader.run({ url, email, password, downDir, type });
})()
