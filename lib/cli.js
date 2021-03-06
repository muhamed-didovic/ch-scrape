const fs = require('fs-extra')
const prompts = require("prompts")
const meow = require("meow")
const path = require("path")
const isValidPath = require("is-valid-path")
const Fuse = require('fuse.js')
const isEmail = require('util-is-email').default

const Bluebird = require('bluebird')
Bluebird.config({ longStackTraces: true })
global.Promise = Bluebird

const { scrapeSelectively, scrapeAll, searchForCourses } = require("./scrape")

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
    --videos, -v      Include videos if available.
    --subtitle, -s    Include subtitles if available.
    --zip, -z         Include archive if available.
    --code, -c        Include code if available.
    --lang, -l        Include courses of certain language, available options: 'English', 'Русский' and 'all'
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
      videos     : { type: 'boolean', alias: 'v', default: true },
      subtitle   : { type: 'boolean', alias: 's' },
      code       : { type: 'boolean', alias: 'c' },
      zip        : { type: 'boolean', alias: 'z' },
      lang       : { type: 'string', alias: 'l' },
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
    validate: isEmail
  })
  const password = flags.password || await askOrExit({
    type    : 'password',
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
    message : `Include subtitle if it exists?`,
    initial : flags.subtitle,
    active  : 'yes',
    inactive: 'no'
  })
  const code = flags.code || await askOrExit({
    type    : 'toggle',
    name    : 'value',
    message : 'Include code if it exists?',
    initial : flags.code,
    active  : 'yes',
    inactive: 'no'
  })

  const zip = flags.zip || await askOrExit({
    type    : 'toggle',
    name    : 'value',
    message : 'Include archive of the course if it exists?',
    initial : flags.zip,
    active  : 'yes',
    inactive: 'no'
  })
  const concurrency = flags.concurrency || await askOrExit({
    type   : 'number',
    message: `Enter concurrency`,
    initial: 10
  })
  const videos = flags.videos || await askOrExit({
    type    : 'toggle',
    message : 'Include videos if it exist?',
    initial : flags.videos,
    active  : 'yes',
    inactive: 'no'
  })
  const lang = ['English', 'Русский', 'all'].includes(flags.lang)
    ? flags.lang
    : await askOrExit({
      type   : 'select',
      message: 'Which language of course should be downloaded.',
      choices: [
        {
          title: 'English',
          value: 'English'
        },
        {
          title: 'Russian',
          value: 'Русский'
        },
        {
          title: 'Both, Russian and English',
          value: 'all'
        }
      ],
      initial: 0
    })

  return { email, password, downDir, subtitle, code, zip, concurrency, lang, videos };
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
      initial : 'https://coursehunter.net/course/kak-nastroit-novyy-proekt-react-native', //https://coursehunter.net/source/developedbyed-com',
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
      message: 'What do you want to download: course(book) or source.',
      choices: [
        {
          title: 'course or book',
          value: 'course'
        },
        {
          title: 'source',
          value: 'source'
        }
      ],
      initial: 0
    })

  return { url: input[0].trim(), type, ...options };
};

const run = async (options) => {
  if (options.type === 'course') {
    return scrapeSelectively(options);
  }
  // console.log('options', options);
  return scrapeAll(options);
};

module.exports = {
  prompt,
  run
}
