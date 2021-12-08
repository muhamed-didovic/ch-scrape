#!/usr/bin/env node
const downloader = require('../src/index');

(async () => {
  const { url, email, password, downDir, type } = await downloader.prompt();
  await downloader.run({ url, email, password, downDir, type });
})()
