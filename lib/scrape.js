const Promise = require("bluebird")
const getToken = require("../src/getToken")
const { fetcher } = require("../src/scraper")
const { default: axios } = require("axios")
const fs = require("fs-extra")
const path = require("path")
const Agent = require("agentkeepalive")
const axiosRetry = require("axios-retry")
const createLogger = require("../src/createLogger")
const cheerio = require("cheerio")
const { range } = require('lodash')

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

// const errorHandler = err => (console.log('\u001B[1K'), logger.fail(String(err)), process.exit(1))
const errorHandler = err => console.error('err:', err)
const getCourseMaterialsUrl = async (p, zip, code) => {
  const [pdf, materials] = await Promise.all([
    (async () => {
      let pdf = p.scrapeAll('.chip-item', {
        url: 'button@data-url'
      })
      return pdf;
    })(),
    (async () => {
      // console.log('pdf', pdf.map(u => u.url));
      let materials = p
        .scrape('.book-wrap-poster', {
          ...(zip && { l: 'a@href' }),
          ...(code && { m: "a:nth-child(4)@href" }),
        })
      return materials
    })(),
  ])

  //...(code ? {urlMaterials: getCourseMaterialsUrl(p)} : {urlMaterials: []}),
  /*{
     '0': 'https://vss5.coursehunter.net/je-zinespack/wizard-zines-zine-10-pack_1.pdf',
      '1': 'https://vss5.coursehunter.net/je-zinespack/wizard-zines-zine-10-pack_2.pdf',
      '2': 'https://vss5.coursehunter.net/je-zinespack/wizard-zines-zine-10-pack_3.pdf',
      '3': 'https://vss5.coursehunter.net/je-zinespack/wizard-zines-zine-10-pack_4.pdf',
      '4': 'https://vss5.coursehunter.net/je-zinespack/wizard-zines-zine-10-pack_5.pdf',
      '5': 'https://vss5.coursehunter.net/je-zinespack/wizard-zines-zine-10-pack_6.pdf',
      '6': 'https://vss5.coursehunter.net/je-zinespack/wizard-zines-zine-10-pack_7.pdf',
      '7': 'https://vss5.coursehunter.net/je-zinespack/wizard-zines-zine-10-pack_8.pdf',
      '8': 'https://vss5.coursehunter.net/je-zinespack/wizard-zines-zine-10-pack_9.pdf',
      '9': 'https://vss5.coursehunter.net/je-zinespack/wizard-zines-zine-10-pack_10.pdf',
      l: 'https://dls2.coursehunter.net/s/8f2904d803143410160d4d0d884dadad/je-zinespack.zip',
      m: 'https://vss5.coursehunter.net/je-zinespack/code.zip'
  }*/

  const m = Object
    .values({ ...materials, ...pdf.map(u => u.url) })
    .filter(c => c)
    .map(url => url.replace('//vsss', '//vss'))

  return [...new Set(m)]
};

function getNotificationLink(p) {
  let notification;
  try {
    notification = p.scrape('.course-notification', {
      link: 'a@href'
      // link: 'p@text'
    })
  } catch (e) {
    //console.log('No notification', p.location);
  }
  return notification;
}

const getCourse = async ({ token, url, zip, code }) => {
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
  const c = p.scrape('.comment-form', {
    id: 'input[name="course_id"]@value',
  })
  const notification = getNotificationLink(p);
  const allCourses = [
    {
      urlMaterials: getCourseMaterialsUrl(p, zip, code),
      id          : c.id,
      ...(notification && { notification }),
      url
    }
  ];
  scrapingMsg.succeed(`Courses gathered: ${url}`)
  return { token, allCourses }
};
const getPages = async ({ token, categories, lang }) => {
  let cc = 0;
  logger.info(`Start to capture pages`)
  const spin = logger.start('Capturing pages')
  let allPages = await fetcher
    .getAll(categories)
    .map(async (fetchNode, index) => {

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

        await Promise.all([
          (async () => {
            scrapingMsg.text = `Course counter: ${counter} and Course: ${p.location}`
            let c = p.scrape('.comment-form', {
              id: 'input[name="course_id"]@value'
            })
            course.id = c.id;
            //return c;
          })(),
          (async () => {
            const notification = getNotificationLink(p);
            //return notification;
            notification && (course.notification = notification);
          })(),
          (async () => {
            course.urlMaterials = getCourseMaterialsUrl(p, zip, code)
          })(),
        ])


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
      if (subtitle || videos) {
        lessonsMsg.text = `Collecting course for: https://coursehunter.net/course/${course.id}/lessons`
        const { data } = await axios({
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
        lessonsData = data;
      }

      await Promise.all([
        (async () => {
          //include subtitles if available
          if (subtitle) {
            lessonsMsg.text = `Course ${course.title} adding subtitle if available.`
            course.subtitles = lessonsData
              .filter(lesson => lesson.subtitle.includes('http'))
              .map(lesson => lesson.subtitle.includes('[English]') ? lesson.subtitle.split('[English]')[1] : lesson.subtitle)
          }
        })(),
        (async () => {
          //include videos if available
          if (videos) {
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

const scrapeSelectively = ({ email, password, url, downDir, subtitle, zip, code, videos }) => Promise
  .resolve()
  .then(async () => getToken(email, password))
  .then(token => getCourse({ token, url, zip, code }))
  .then(({ token, allCourses }) => getVideosForCourse({ token, allCourses, subtitle, videos }))
  .then(allCourseWithVideosLessons => putCoursesIntoFile(allCourseWithVideosLessons, downDir))
  .catch(errorHandler);

const scrapeAll = ({ email, password, type, url, downDir, subtitle, zip, code, lang, videos }) => Promise
  .resolve()
  .then(async () => getToken(email, password))
  .then(token => getCategoriesForDownload({ token, type, url }))
  .then(({ token, categories }) => getPages({ token, categories, lang }))
  .then(({ token, allPages }) => getCourses({ token, allPages, zip, code }))
  .then(({ token, allCourses }) => getVideosForCourse({ token, allCourses, subtitle, videos }))
  .then(allCourseWithVideosLessons => putCoursesIntoFile(allCourseWithVideosLessons, downDir))
  .catch(errorHandler);


const searchForCourses = async (searchFromLocalFile) => {
  const scrapingMsg = logger.start('start gathering courses for search..')
  if (fs.existsSync(path.resolve(process.cwd(), 'json/search-courses.json')) && searchFromLocalFile) {
    scrapingMsg.succeed(`Found a file`)
    return require(path.resolve(process.cwd(), 'json/search-courses.json'))
  }

  return Promise
    .resolve()
    .then(async () => {

      let res = await axios({
        url   : `https://coursehunter.net/course`,
        method: 'get'
      }).catch((err) => {
        scrapingMsg.fail('-----------error:');
        if (err.response.status !== 200) {
          throw new Error(`-----------API call failed with status code: ${err.response.status} after 3 retry attempts`);
        }
      });
      const $ = cheerio.load(res.data)

      const [json, paginationNumbers] = await Promise.all([
        (async () => {
          return $('article.course')
            .map((index, element) => {
              return {
                second_title: $(element).find('.course-primary-name').text(),
                title       : $(element).find('.course-secondary-name').text(),
                value       : $(element).find('.course-figure').attr('data-link'),
              }
            });
        })(),
        (async () => {
          return $('.pagination__a')
            .map((index, element) => {
              return $(element).attr('href') ? $(element).attr('href').split('?page=')[1] : null
            })
            .get()
            .filter(number => !isNaN(number))
        })(),
      ])
      scrapingMsg.text = `Found pages: ${Math.max(...paginationNumbers)}`
      return {
        lastPaginationNumber: Math.max(...paginationNumbers),
        course              : json
      }

    })
    .then(async ({ lastPaginationNumber, course }) => {
      if (!lastPaginationNumber) {
        return course;
      }

      const r = range(2, ++lastPaginationNumber);
      let courses = await Promise
        .map(r, async page => {
          let { data: body } = await axios({
            url   : `https://coursehunter.net/course?page=${page}`,
            method: 'get'
          }).catch((err) => {
            scrapingMsg.fail('-----------error:');
            if (err.response.status !== 200) {
              throw new Error(`-----------API call failed with status code: ${err.response.status} after 3 retry attempts`);
            }
          });
          const $ = cheerio.load(body)

          return $('article.course')
            .map((i, element) => {
              scrapingMsg.text = (`Collecting Page: ${page} - link: ${$(element).find('.course-figure').attr('data-link')} please wait...`);
              return {
                second_title: $(element).find('.course-primary-name').text(),
                title       : $(element).find('.course-secondary-name').text(),
                value       : $(element).find('.course-figure').attr('data-link'),
              }
            })
            .get();

        }, {
          concurrency: 10
        })
        .then(c => c.flat())

      fs.ensureDir(path.resolve(process.cwd(), 'json'))
      fs.writeFileSync(`./json/search-courses.json`, JSON.stringify([...course, ...courses], null, 2), 'utf8')
      scrapingMsg.succeed(`Done, Courses length: ${[...course, ...courses].length}`)
      return courses;
    })

}
module.exports = {
  scrapeAll,
  scrapeSelectively,
  searchForCourses
}
