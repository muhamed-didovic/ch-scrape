const fs = require('fs');
const Promise = require('bluebird');
const prompts = require("prompts");
const meow = require("meow");
const path = require("path");
const isValidPath = require("is-valid-path");

const http = require('http');
const https = require("https");
const Agent = require('agentkeepalive');
const axios = require('axios').default;
const axiosRetry = require('axios-retry');

const createLogger = require('../src/create/createLogger')
const getToken = require("../src/download/getToken");
const { fetcher } = require('../src/scraper');

const logger = createLogger()
// const errorHandler = err => (console.log('\u001B[1K'), logger.fail(String(err)), process.exit(1))
const errorHandler = err => console.error('err:', err)

const keepaliveAgent = new Agent({
  maxSockets       : 100,
  maxFreeSockets   : 10,
  timeout          : 60000, // active socket keepalive for 60 seconds
  freeSocketTimeout: 30000, // free socket keepalive for 30 seconds
});
axiosRetry(axios, {
  retries           : 3,
  shouldResetTimeout: true,
  retryCondition    : (_error) => true // retry no matter what
});

/*axiosRetry(axios, {
  retries       : 3, // number of retries
  retryDelay    : (retryCount) => {
    console.log(`-----------------retry attempt: ${retryCount}`);
    return retryCount*2000; // time interval between retries
  },
  retryCondition: (error) => {
    console.log(`-----------------retryConditiont:`, error);
    return true;
    // if retry condition is not specified, by default idempotent requests are retried
    return error.response.status === 503 || error.response.status === 502;
  },
});*/

async function askOrExit(question) {
  const res = await prompts({ name: 'value', ...question }, { onCancel: () => process.exit(1) })
  return res.value
}

const askSaveDirOrExit = () => askOrExit({
  type   : 'text',
  message: 'Enter the directory to save.',
  initial: process.cwd()
});
const getCourseMaterialsUrl = (p) => {
  let materials = p
    .scrape('.book-wrap-poster', {
      l: 'a@href',
      m: "a:nth-child(4)@href"
    })

  return Object.values(materials).filter(c => c)
};
const getCourse = async ({ token, url }) => {
  const scrapingMsg = logger.start('start gathering courses from pages..')
  // Fetch the given url and return a page scraper
  const p = await fetcher.get(url, {
    // httpAgent: new http.Agent({ keepAlive: true }),
    // httpsAgent: new https.Agent({ keepAlive: true }),
    httpAgent : keepaliveAgent,
    httpAgents: keepaliveAgent,
    headers   : {
      Cookie: token
    }
  });
  scrapingMsg.text = `Course: ${p.location}`
  const c = p.scrape('.comment-form', {
    id: 'input[name="course_id"]@value'
  })
  const allCourses = [
    {
      urlMaterials: getCourseMaterialsUrl(p),
      id          : c.id,
      url
    }
  ];
  scrapingMsg.succeed(`Courses gathered: ${url}`)
  /*return {
    category: categories[index].split('/').pop(),
    courses : courses
  };*/
  return { token, allCourses }
};
const getPages = async ({ token, categories }) => {
  let cc = 0;
  logger.info(`Number of urls to download from: ${categories.length}`)
  const spin = logger.start('Capturing pages')
  let allPages = await fetcher
    .getAll(categories)
    .map(
      async (fetchNode, index) => {

        //const allCourses =
        return await fetchNode
          .paginate('.pagination__a[rel="next"]')
          .flatMap(p => {
            //let category = categories[index].split('/').pop()
            spin.text = `Pages counter: ${cc} and Page: ${p.location}`;
            let s = p.scrapeAll('article.course', {
              title       : '.course-primary-name@text',
              second_title: '.course-secondary-name@text',
              //url: 'a[itemprop="mainEntityOfPage"]@href'
              url: '.course-figure@data-link',
              //category
            })
            ++cc;
            return s;
          });
      },
      { resolvePromise: false, concurrency: 50 }//6
    )

  allPages = allPages.flat();
  fs.writeFileSync(`pages-${new Date().toISOString()}.json`, JSON.stringify(allPages, null, 2), 'utf8');
  spin.succeed(`Collecting pages done: ${cc}`)
  return { token, allPages };
};
const getCourses = async ({ token, allPages }) => {
  let counter = 0
  const scrapingMsg = logger.start('start gathering courses from pages..')
  let allCourses = await fetcher
    //const courses = await createFetcher()
    .getAll(allPages.map(c => c.url), {
      // httpAgent: new http.Agent({ keepAlive: true }),
      // httpsAgent: new https.Agent({ keepAlive: true }),
      httpAgent : keepaliveAgent,
      httpAgents: keepaliveAgent,
      headers   : {
        Cookie: token
      }
    })
    .map(
      async (p) => {
        scrapingMsg.text = `Course counter: ${counter} and Course: ${p.location}`
        let c = p.scrape('.comment-form', {
          id: 'input[name="course_id"]@value'
        })

        const course = allPages.find(c => c.url === p.location);
        course.urlMaterials = getCourseMaterialsUrl(p)
        course.id = c.id;
        ++counter;
        return course;
      },
      { concurrency: 50 } //50
    )
    .filter(c => c);
  scrapingMsg.succeed(`Courses gathered: ${counter}`)
  /*return {
    category: categories[index].split('/').pop(),
    courses : courses
  };*/
  return { token, allCourses }
};
const getVideosForCourse = async ({ token, allCourses }) => {
  const lessonsMsg = logger.start('start gathering videos for lessons..')
  let c = 0;
  const allCourseWithVideosLessons = await Promise
    .map(allCourses, async (course) => {

      //let courses = category.courses;
      //await Promise.map(courses, async course => {
      lessonsMsg.text = `Collecting course for: https://coursehunter.net/course/${course.id}/lessons`
      let res = await axios({
        url    : `https://coursehunter.net/course/${course.id}/lessons`,
        method : 'get',
        headers: {
          Cookie: token
        }
      }).catch((err) => {
        lessonsMsg.fail('-----------error:');
        if (err.response.status !== 200) {
          throw new Error(`-----------API call failed with status code: ${err.response.status} after 3 retry attempts`);
        }
      });

      let lessonsData = res.data;
      course.chapters = lessonsData.map((lesson) => lesson.file)
      course.names = lessonsData.map((lesson) => {
        const str = lesson.title.replace(
          /\s\|\s\d{2}:\d{2}:\d{2}/g,
          ""
        );
        const match = str.match(/\d+\.\s.*!/g);
        if (match && match.length) {
          return match[0];
        }

        return str;
      })

      ++c;
      return course;
      //}, { concurrency: 50 })
    }, {
      concurrency: 50
    })
  lessonsMsg.succeed(`Videos collected with counter: ${c}`)
  return allCourseWithVideosLessons;
};
const putCoursesIntoFile = (allCourseWithVideosLessons, downDir) => {
  const downloads = `courses-${new Date().toISOString()}.json`
  const fileMsg = logger.start(`Creating file with all courses`)
  fs.writeFileSync(downDir + path.sep + downloads, JSON.stringify(allCourseWithVideosLessons, null, 2), 'utf8');
  fileMsg.succeed(`Videos collected in: ${downDir + path.sep + downloads}`)
  return allCourseWithVideosLessons;
};
const getCategoriesForDownload = async ({ token, type, url }) => {
  let categories;
  // Get categories urls
  if (type === 'source') {
    //pagesMsg.text = 'Scraping for source'
    categories = [
      url
    ];
  } else if (type === 'all') {
    categories = await fetcher
      .get('https://coursehunter.net')
      .links('.drop-menu-left a')
  }

  return { token, categories }
};

const downloadSelectively = async (email, password, url, downDir) => {
  try {
    await Promise
      .resolve();
    let token = await getToken(email, password);
    let result2 = await getCourse({ token, url });
    let allCourseWithVideosLessons = await getVideosForCourse(result2);
    return await putCoursesIntoFile(allCourseWithVideosLessons, downDir);
  } catch (err) {
    return errorHandler(err);
  }
};
const downloadAll = async (email, password, type, url, downDir) => {
  try {
    await Promise
      .resolve();
    let token = await getToken(email, password);
    let result2 = await getCategoriesForDownload({ token, type, url });
    let result3 = await getPages(result2);
    let result4 = await getCourses(result3);
    let allCourseWithVideosLessons = await getVideosForCourse(result4);
    return await putCoursesIntoFile(allCourseWithVideosLessons, downDir);
  } catch (err) {
    return errorHandler(err);
  }
};

const cli = meow(`
    Usage
    $ ch <?CourseUrl|SourceUrl|CategoryUrl>

Options
    --all, -a   Get all courses.
    --email, -e   Your email. 
    --password, -p    Your password.
    --directory, -d   Directory to save.
    --type, -t  source|course Type of download. 
      
    Examples
      $ ch
      $ ch --all
      $ ch https://coursehunter.net/course/intermediate-typescript/ -t course 
      $ ch -e user@gmail.com -p password -d path-to-directory -t source`, {
  flags: {
    help     : { alias: 'h' },
    version  : { alias: 'v' },
    all      : { type: 'boolean', alias: 'a' },
    email    : {
      type : 'string',
      alias: 'e'
    },
    password : {
      type : 'string',
      alias: 'p'
    },
    directory: { type: 'string', alias: 'd' },//, default: process.cwd()
    /*directory: {
      type : 'string',
      alias: 'd'
    },*/
    type: {
      type : 'string',
      alias: 't'
    },

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
  return { input, email, password, downDir, type: 'all' };
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

  if (input.length === 0) {
    input.push(await askOrExit({
      type    : 'text',
      message : 'Enter url for download.',
      initial : 'https://coursehunter.net/source/frontendmasters',
      validate: value => value.includes('coursehunter.net') ? true : 'Url is not valid'
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

  return { url: input[0], email, password, downDir, type };


};
const run = async ({ url, email, password, downDir, type }) => {
  if (type === 'course') {
    return downloadSelectively(email, password, url, downDir);
  }
  return downloadAll(email, password, type, url, downDir);
};
/*(async () => {
  const { url, email, password, downDir, type } = await prompt();
  await run({ url, email, password, downDir, type });
})();*/

module.exports = {
  prompt,
  run
}
