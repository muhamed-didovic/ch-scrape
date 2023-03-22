// const Promise = require("bluebird")
const getToken = require("../src/getToken")
const { fetcher } = require("../src/scraper")
const { default: axios } = require("axios")
const fs = require("fs-extra")
const path = require("path")
// const Agent = require("agentkeepalive")
// const axiosRetry = require("axios-retry")
const createLogger = require("../src/createLogger")
const cheerio = require("cheerio")
const { range } = require('lodash')

const {
        errorHandler,
        getNoteLinks,
        getCourse,
        getPages,
        getCourses,
        getVideosForCourse,
        putCoursesIntoFile,
        getCategoriesForDownload
      } = require("./helpers")
const logger = createLogger()


const scrapeSelectively = ({ email, password, url, downDir, subtitle, zip, code, videos }) => {
  return Promise
    .resolve()
    .then(async () => getToken(email, password))
    .then(token => getCourse({ token, url, zip, code }))
    .then(({ token, allCourses }) => getVideosForCourse({ token, allCourses, subtitle, videos }))
    .then(allCourseWithVideosLessons => putCoursesIntoFile(allCourseWithVideosLessons, downDir))
    .catch(errorHandler);
};

const scrapeAll = ({email, password, type, url, downDir, subtitle, zip, code, lang, videos}) => {
  return Promise
    .resolve()
    .then(async () => getToken(email, password))
    .then(token => getCategoriesForDownload({ token, type, url }))
    .then(({ token, categories }) => getPages({ token, categories, lang }))
    .then(({ token, allPages }) => getCourses({ token, allPages, zip, code }))
    .then(({ token, allCourses }) => getVideosForCourse({ token, allCourses, subtitle, videos }))
    .then(allCourseWithVideosLessons => putCoursesIntoFile(allCourseWithVideosLessons, downDir))
    .catch(errorHandler);
};

const searchForCourses = async (searchFromLocalFile) => {
  console.time('search');
  const scrapingMsg = logger.start('start gathering courses for search..')
  if (fs.existsSync(path.resolve(__dirname, '../json/search-courses.json')) && searchFromLocalFile) {
    scrapingMsg.succeed(`Found a file`)
    return require(path.resolve(__dirname, '../json/search-courses.json'))
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
              return $(element).attr('href')
                ? $(element).attr('href').split('page=')[1]
                : null
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
          concurrency: 20
        })
        .then(c => c.flat())

      fs.ensureDir(path.resolve(__dirname, '../json'))
      fs.writeFileSync(path.resolve(__dirname, '../json/search-courses.json'), JSON.stringify([...course, ...courses], null, 2), 'utf8')
      scrapingMsg.succeed(`Done, Courses length: ${[...course, ...courses].length}`)
      console.timeEnd('search');
      return courses;
    })

}
module.exports = {
  scrapeAll,
  scrapeSelectively,
  searchForCourses
}
