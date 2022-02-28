const fs = require('fs-extra')
const Promise = require('bluebird')
const prompts = require("prompts")
const meow = require("meow")
const path = require("path")
const isValidPath = require("is-valid-path")
const Fuse = require('fuse.js')

const { downloadSelectively, downloadAll, searchForCourses } = require("./lib/download")

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
    $ ch <?CourseUrl|SourceUrl|CategoryUrl>

Options
    --all, -a         Get all courses.
    --email, -e       Your email. 
    --password, -p    Your password.
    --directory, -d   Directory to save.
    --type, -t        source|course Type of download. 
    --subtitle, -s    Download subtitles if available.
      
    Examples
      $ ch
      $ ch --all
      $ ch https://coursehunter.net/course/intermediate-typescript/-t course 
      $ ch -e user@gmail.com -p password -d path-to-directory -t source`,
  {
    flags: {
      help     : { alias: 'h' },
      version  : { alias: 'v' },
      all      : { type: 'boolean', alias: 'a' },
      email    : { type : 'string', alias: 'e' },
      password : { type : 'string', alias: 'p' },
      directory: { type: 'string', alias: 'd' },//, default: process.cwd()
      subtitle : { type   : 'boolean', alias  : 's', default: false },
      type     : { type : 'string', alias: 't' },
      concurrency: { type: 'number', alias: 'c', default: 10}

    }
  })

async function promptForDownloadAll(flags, input) {
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
  const downDir = await askSaveDirOrExit()
  return { input, email, password, downDir, type: 'all', file, filePath };
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

  const searchOrDownload = flags.file || await askOrExit({
    type   : 'confirm',
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
    input.push(await askOrExit({
      type    : 'autocomplete',
      message : 'Search for a course',
      choices   : await searchForCourses(),
      suggest   : (input, choices) => {
        if (!input) return choices;
        const fuse = new Fuse(choices, {
          keys: ['title', 'second_title', 'value']
        })
        return fuse.search(input).map(i => i.item);
      },
    }))
  }

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
    message : `Enter a directory to save (eg: ${path.resolve(process.cwd())})`,
    initial : path.resolve(process.cwd(), 'videos/'),
    validate: isValidPath
  }))
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

  const subtitle = flags.subtitle || await askOrExit({
    type    : 'toggle',
    name    : 'value',
    message : `Download subtitle?`,
    initial : flags.zip,
    active  : 'yes',
    inactive: 'no'
  })

  return { url: input[0], email, password, downDir, type, subtitle };
};
const run = async ({ url, email, password, downDir, type, subtitle }) => {
  if (type === 'course') {
    return downloadSelectively(email, password, url, downDir, subtitle);
  }
  return downloadAll(email, password, type, url, downDir, subtitle);
};
/*(async () => {
  const { url, email, password, downDir, type } = await prompt();
  await run({ url, email, password, downDir, type });
})();*/

module.exports = {
  prompt,
  run
}
