const fs = require('fs-extra')
const Promise = require('bluebird')
const prompts = require("prompts")
const meow = require("meow")
const path = require("path")
const isValidPath = require("is-valid-path")
const Fuse = require('fuse.js')

const { scrapeSelectively, scrapeAll, searchForCourses } = require("./lib/scrape")

async function askOrExit(question) {
  const res = await prompts({ name: 'value', ...question }, { onCancel: () => process.exit(1) })
  return res.value
}

const askSaveDirOrExit = () => askOrExit({
  type   : 'text',
  message: 'Enter the directory to save.',
  initial: process.cwd()
});

const cli = meow(`
  Usage
    $ ch-scrape <?CourseUrl|SourceUrl|CategoryUrl>

  Options
    --all, -a         Get all courses.
    --email, -e       Your email. 
    --password, -p    Your password.
    --directory, -d   Directory to save.
    --type, -t        source|course Type of download. 
    --subtitle, -s    Download subtitles if available.
    --zip, -z         Download archive if available.
    --code, -c        Download code if available.
    --concurrency, -cc
      
  Examples
    $ ch-scrape
    $ ch-scrape --all
    $ ch-scrape https://coursehunter.net/course/intermediate-typescript -t course 
    $ ch-scrape --all [-e user@mail.com] [-p password] [-t source-or-course] [-d path-to-directory] [-cc concurrency-number]`,
  {
    flags: {
      help       : { alias: 'h' },
      version    : { alias: 'v' },
      all        : { type: 'boolean', alias: 'a' },
      email      : { type: 'string', alias: 'e' },
      password   : { type: 'string', alias: 'p' },
      directory  : { type: 'string', alias: 'd' },//, default: process.cwd()
      type       : { type: 'string', alias: 't' },
      subtitle   : { type: 'boolean', alias: 's', default: false },
      code       : { type: 'boolean', alias: 'c', default: false },
      zip        : { type: 'boolean', alias: 'z', default: false },
      concurrency: { type: 'number', alias: 'cc', default: 10 }
    }
  })

async function promptForDownloadAll(flags, input) {
  /*const downDir = await askSaveDirOrExit()*/
  const otherFlags = await commonFlags(flags);
  return { input, type: 'all', ...otherFlags };
}

async function commonFlags(flags) {
  const email = flags.email || await askOrExit({
    type    : 'text',
    message : 'Enter email',
    validate: value => value.length < 5 ? `Sorry, enter correct email` : true
  })
  const password = flags.password || await askOrExit({
    type    : 'text',
    message : 'Enter password',
    validate: value => value.length < 5 ? `Sorry, password must be longer` : true
  })
  const downDir = flags.directory || path.resolve(await askOrExit({
    type    : 'text',
    message : `Enter a directory to save a file (eg: ${path.resolve(process.cwd())})`,
    initial : path.resolve(process.cwd(), 'videos/'),
    validate: isValidPath
  }))
  const subtitle = flags.subtitle || await askOrExit({
    type    : 'toggle',
    name    : 'value',
    message : `Download subtitle?`,
    initial : flags.subtitle,
    active  : 'yes',
    inactive: 'no'
  })
  const code = flags.code || await askOrExit({
    type    : 'toggle',
    name    : 'value',
    message : 'Download code if it exists?',
    initial : flags.code,
    active  : 'yes',
    inactive: 'no'
  })

  const zip = flags.zip || await askOrExit({
    type    : 'toggle',
    name    : 'value',
    message : 'Download archive of the course if it exists?',
    initial : flags.zip,
    active  : 'yes',
    inactive: 'no'
  })
  const concurrency = flags.concurrency || await askOrExit({
    type   : 'number',
    message: `Enter concurrency`,
    initial: 10
  })
  return { email, password, downDir, subtitle, code, zip, concurrency };
}

const prompt = async () => {
  const { flags, input } = cli

  if (flags.all || (input.length === 0 && await askOrExit({
    type   : 'confirm',
    message: 'Do you want all courses?',
    initial: true
  }))) {
    return await promptForDownloadAll(flags, input);
  }

  const searchOrDownload = await askOrExit({
    type   : (!flags.file && input.length === 0) ? 'confirm' : null,
    message: 'Choose "Y" if you want to search for a course otherwise choose "N" if you have a link for download',
    initial: true
  })

  if (input.length === 0 && searchOrDownload === false) {
    input.push(await askOrExit({
      type    : 'text',
      message : 'Enter url for download.',
      initial : 'https://coursehunter.net/source/developedbyed-com',
      validate: value => value.includes('coursehunter.net') ? true : 'Url is not valid'
    }))
  } else {

    let searchCoursesFile = false;
    if (fs.existsSync(path.resolve(process.cwd(), 'json/search-courses.json'))) {
      searchCoursesFile = true;
    }

    const foundSearchCoursesFile = await askOrExit({
      type   : (searchCoursesFile && input.length === 0 && !flags.file) ? 'confirm' : null,
      message: 'Do you want to search for a courses from a local file (which is faster)',
      initial: true
    })

    input.push(await askOrExit({
      type   : (input.length === 0 && !flags.file) ? 'autocomplete' : null,
      message: 'Search for a course',
      choices: (input.length === 0 && !flags.file) ? await searchForCourses(foundSearchCoursesFile) : [],
      suggest: (input, choices) => {
        if (!input) return choices;
        const fuse = new Fuse(choices, {
          keys: ['title', 'second_title', 'value']
        })
        return fuse.search(input).map(i => i.item);
      },
    }))
  }

  const options = await commonFlags(flags);

  const type = ['source', 'course'].includes(flags.type)
    ? flags.type
    : await askOrExit({
      type   : 'select',
      message: 'What do you want to download: course or source.',
      choices: [
        {
          title: 'source',
          value: 'source'
        },
        {
          title: 'course',
          value: 'course'
        }
      ],
      initial: 0
    })

  return { url: input[0], type, ...options };
};

const run = async (options) => {//{ url, email, password, downDir, type, subtitle, code, zip }
  if (options.type === 'course') {
    return scrapeSelectively(options);
  }
  // console.log('options', options);
  return scrapeAll(options);
};
/*(async () => {
  const { url, email, password, downDir, type } = await prompt();
  await run({ url, email, password, downDir, type });
})();*/

module.exports = {
  prompt,
  run
}
