const test = require('ava')//.serial
const { scrapeSelectively, scrapeAll, searchForCourses } = require('../lib/scrape')
const {
        errorHandler,
        getNoteLinks,
        getCourse,
        getPages,
        getCourses,
        getVideosForCourse,
        putCoursesIntoFile,
        getCategoriesForDownload
      } = require("../lib/helpers")

const Bluebird = require('bluebird')
Bluebird.config({ longStackTraces: true })
global.Promise = Bluebird

const url = require('url')
const path = require('path')
const fs = require('fs-extra')

let courseUrl = "https://coursehunter.net/course/kak-nastroit-novyy-proekt-react-native"

test('getCourse method', async t => {
  const { allCourses: course } = await getCourse({
    token: "222",
    url  : courseUrl,
    zip  : true,
    code : true
  })
  // console.log('course', course);
  /*const expectedCourse = {
    notes       : [
      {
        link: 'https://coursehunters.online/t/how-to-set-up-a-new-react-native-project'
      }
    ],
    urlMaterials: [
      'https://dls2.coursehunter.net/s/8f16c8880d07d8140d4a4d4d2d88152d/hbl-setnrnpro.zip'
    ],
    id          : '3095',
    url         : 'https://coursehunter.net/course/kak-nastroit-novyy-proekt-react-native'
  };*/

  t.is(course[0].notes.length, 1);
  t.is(course[0].urlMaterials.length, 1);
  t.is(course[0].id, '3095');
  t.is(course[0].url, 'https://coursehunter.net/course/kak-nastroit-novyy-proekt-react-native');
  t.true(course[0].notes[0].link.includes('https://coursehunters.online/t/how-to-set-up-a-new-react-native-project'));
  t.true(course[0].urlMaterials[0].includes('hbl-setnrnpro.zip'));
})

//SEARCH  FUNCTIONALITY
test('searching courses', async t => {
  const courses = await searchForCourses(false)
  t.true(courses.length >= 4493)

  const titles = courses.map(c => c.title)
  t.true([
    'Learn Blockchain Technology & Cryptocurrency in Java',
    'API Automation: REST Assured + Java, TestNG, Lombok, Google',
    'Prometheus'
  ].every(s => titles.includes(s)))
})

test('searching courses from a local file or cache', async t => {
  const courses = await searchForCourses(true)
  t.true(courses.length >= 4503)

  const titles = courses.map(c => c.title)
  t.true([
    'Agile Scrum Mastery: Full Project Simulation + Certification',
    'The Perfect NGINX Server - CentOS Edition',
    'Automated Software Testing with Python'
  ].every(s => titles.includes(s)))
})
