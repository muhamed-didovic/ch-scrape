// const errorHandler = err => (console.log('\u001B[1K'), logger.fail(String(err)), process.exit(1))
// const Promise = require("bluebird");
const { fetcher } = require("../src/scraper")
const { default: axios } = require("axios");
const fs = require("fs-extra");
const path = require("path");
const createLogger = require("../src/createLogger");
const Agent = require("agentkeepalive");
const axiosRetry = require("axios-retry");

const logger = createLogger()
const keepaliveAgent = new Agent({
  maxSockets       : 100,
  maxFreeSockets   : 10,
  timeout          : 60000, // active socket keepalive for 60 seconds
  freeSocketTimeout: 30000, // free socket keepalive for 30 seconds
})
axiosRetry(axios, {
  retries           : 3,
  shouldResetTimeout: true,
  retryCondition    : (_error) => true // retry no matter what
});

const errorHandler = err => console.error('err:', err)
const getCourseMaterialsUrl = async (p, zip, code) => {
  const [pdf, materials] = await Promise.all([
    (async () => {
      return p.scrapeAll('.chip-item', {
        url: 'button@data-url'
      });
    })(),
    (async () => {
      return p
        .scrape('.book-wrap-poster', {
          ...(zip === 'yes' && { l: 'a@href' }),
          ...(code === 'yes' && { m: "a:nth-child(4)@href" }),
        })
    })(),
  ])

  const m = Object
    .values({ ...materials, ...pdf.map(u => u.url) })
    .filter(c => c)
    .map(url => url.replace('//vsss', '//vss'))

  return [...new Set(m)]
};

const getNoteLinks = p => {
  let notes;
  try {
    notes = p.scrapeAll('.course-notification p', {
      link: 'a@href'
    })
  } catch (e) {
    //console.log('No notes', p.location);
  }
  return notes.filter(c => c.link);
};

const getCourseId = async (p) => {
  try {
    const id = p.scrape('.comment-form', { id: 'input[name="course_id"]@value' })?.id
    return id;
  } catch (e) {
    //if we can't get ID let's check other place
    const [, id] = /"mpn": "(.*)"/.exec(p.scrape('head').html())
    return id;
  }

}
const getCourse = async ({ token, url, zip, code }) => {
  // console.log('---', { token, url, zip, code });
  const scrapingMsg = logger.start('start gathering courses from pages..')
  // Fetch the given url and return a page scraper
  const p = await fetcher.get(url, {
    httpAgent : keepaliveAgent,
    httpAgents: keepaliveAgent,
    headers   : {
      Cookie: token
    }
  });

  scrapingMsg.text = `Course: ${p.location}`
  let allCourses = await Promise
    .props({
      notes       : getNoteLinks(p),
      urlMaterials: getCourseMaterialsUrl(p, zip, code),
      id          : getCourseId(p),
      url
    })
  scrapingMsg.succeed(`Courses gathered: ${url}`)
  return { token, allCourses: [allCourses] }
};
const getPages = async ({ token, categories, lang }) => {
  let cc = 0;
  logger.info(`Start to capture pages`)
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

            //filter language
            spin.text = `Pages counter: ${cc} and Page: ${p.location}`;
            let s = p.scrapeAll('article.course', {
              title       : '.course-primary-name@text',
              second_title: '.course-secondary-name@text',
              //url: 'a[itemprop="mainEntityOfPage"]@href'
              url : '.course-figure@data-link',
              lang: '.course-lang@text'
            })

            //check if there are books maybe
            if (!s.length) {
              s = p.scrapeAll('article.book', {
                title       : '.book-name@text',
                second_title: '.course-secondary-name@text',
                //url: 'a[itemprop="mainEntityOfPage"]@href'
                url : '.book-figure@data-link',
                lang: '.book-lang@text'
              })
            }
            spin.text = `Pages counter: ${cc} and Page: ${p.location} found ${s.length} resources`;

            if (lang !== 'all') {
              s = s.filter(item => {
                return item.lang === lang
              })
            }

            ++cc;
            return s;
          });
      },
      { resolvePromise: false, concurrency: 50 }//6
    )

  allPages = allPages.flat();
  // fs.writeFileSync(`pages-${new Date().toISOString()}.json`, JSON.stringify(allPages, null, 2), 'utf8');
  spin.succeed(`Collecting pages done: ${--cc}`)
  return { token, allPages };
};
const getCourses = async ({ token, allPages, zip, code }) => {
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
        let course = allPages.find(c => c.url === p.location);
        /*const [id, notes, urlMaterials] = await Promise.all([
          (async () => {
            scrapingMsg.text = `Course counter: ${counter} and Course: ${p.location}`
            let c = p.scrape('.comment-form', {
              id: 'input[name="course_id"]@value'
            })
            return c.id;
          })(),
          getNoteLinks(p),
          getCourseMaterialsUrl(p, zip, code),
        ])*/
        scrapingMsg.text = `Course counter: ${counter} and Course: ${p.location}`
        const details = await Promise
          .props({
            notes       : getNoteLinks(p),
            urlMaterials: getCourseMaterialsUrl(p, zip, code),
            id          : p.scrape('.comment-form', { id: 'input[name="course_id"]@value' })?.id,
          })

        // course.id = id;
        // course.notes = notes;
        // course.urlMaterials = urlMaterials;

        ++counter;
        // return course;
        return { ...course, ...details };
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

const getVideosForCourse = async ({ token, allCourses, subtitle, videos }) => {
  const lessonsMsg = logger.start(`start gathering videos for lessons..`)
  let c = 0;
  const allCourseWithVideosLessons = await Promise
    //let courses = category.courses;
    //await Promise.map(courses, async course => {
    .map(allCourses, async (course) => {
      /*[
        {
          "title": "1 Introduction | 00:01:40",
          "file": "https://vss1.coursehunter.net/s/c7372a42f8e366f6891027a8755f24f0/udemy-css-complete-guide/lesson1.mp4",
          "subtitle": "[English]https://vss1.coursehunter.net/udemy-css-complete-guide/lesson1.srt",
          "id": "c10681"
        },
        ...
      ]*/
      let lessonsData = [];
      if (subtitle === 'yes' || videos === 'yes') {
        //https://coursehunter.net/api/v1/course/5226/lessons
        lessonsMsg.text = `Collecting course for: https://coursehunter.net/course/${course.id}/lessons`
        // console.log('1111--', token, course);
        const {data} = await axios({
          url    : `https://coursehunter.net/api/v1/course/${course.id}/lessons`, //https://coursehunter.net/course/${course.id}/lessons`,
          method : 'GET',
          headers: {
            Cookie: token
          }
        }).catch((err) => {
          lessonsMsg.fail('-----------error:', err);
          if (err.response.status !== 200) {
            throw new Error(`-----------API call failed with status code: ${err.response.status} after 3 retry attempts`);
          }
        });
        // console.log('data', data);
        if (!data) {
          throw new Error(`-----------API failed no data in getVideosForCourse method`);
        }
        lessonsData = data;
      }

      await Promise.all([
        (async () => {
          //include subtitles if available
          if (subtitle === 'yes') {
            lessonsMsg.text = `Course ${course.title} adding subtitle if available.`
            course.subtitles = lessonsData
              .filter(lesson => lesson.subtitle.includes('http'))
              .map(lesson => lesson.subtitle.includes('[English]') ? lesson.subtitle.split('[English]')[1] : lesson.subtitle)
          }
        })(),
        (async () => {
          //include videos if available
          if (videos === 'yes') {
            lessonsMsg.text = `Course ${course.title} adding videos if available.`
            course.chapters = lessonsData.map(lesson => lesson.file)
            course.names = lessonsData.map(lesson => {
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
            lessonsMsg.text = `Course ${course.title} found: ${course.chapters.length} videos.`
          }
        })(),
      ])
      ++c;
      return course;
      //}, { concurrency: 50 })
    }, {
      concurrency: 50
    })
  lessonsMsg.succeed(`Founded courses: ${c}`)
  return allCourseWithVideosLessons;
};
const putCoursesIntoFile = async (allCourseWithVideosLessons, downDir) => {
  const downloads = `../json/courses-${new Date().toISOString()}.json`
  await fs.ensureDir(path.resolve(downDir, '../json'))
  const fileMsg = logger.start(`Creating file with all courses`)
  fs.writeFileSync(path.resolve(downDir, downloads), JSON.stringify(allCourseWithVideosLessons, null, 2), 'utf8');
  fileMsg.succeed(`Videos collected in: ${path.resolve(downDir, downloads)}`)
  return {
    courses : allCourseWithVideosLessons,
    fileName: path.resolve(downDir, downloads)
  };
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
    /*categories = await fetcher
      .get('https://coursehunter.net')
      .links('.nav-li a')
    console.log('categories', categories);*/

    categories = [
      'https://coursehunter.net/course'
    ];
  }

  return { token, categories }
};


module.exports = {
  errorHandler,
  getNoteLinks,
  getCourse,
  getPages,
  getCourses,
  getVideosForCourse,
  putCoursesIntoFile,
  getCategoriesForDownload
}
