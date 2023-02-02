#!/usr/bin/env node
const downloader = require('./cli');

(async () => {
  const prompt = await downloader.prompt()
  await downloader.run(prompt)
})()
