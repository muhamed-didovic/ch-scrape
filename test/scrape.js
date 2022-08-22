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
    zip  : 'yes',
    code : 'yes'
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

test('getVideosForCourse', async t => {
  const { allCourses } = await getCourse({
    token: "222",
    url  : courseUrl,
    zip  : 'yes',
    code : 'yes'
  })
  const course = await getVideosForCourse({
    token   : "222",
    allCourses,
    subtitle: 'yes',
    videos  : 'yes'
  })
  t.true(allCourses.length === 1)

  /*const a = [
    {
      notes       : [
        {
          link: 'https://coursehunters.online/t/how-to-set-up-a-new-react-native-project'
        }
      ],
      urlMaterials: [
        'https://dls2.coursehunter.net/s/8f4d15889e0d144ac8074d8816d80d9e/hbl-setnrnpro.zip'
      ],
      id          : '3095',
      url         : 'https://coursehunter.net/course/kak-nastroit-novyy-proekt-react-native',
      subtitles   : [],
      chapters    : [
        'https://vss6.coursehunter.net/s/c7390f13362dac3ae61510c5f8a0425b/hbl-setnrnpro/lesson1.mp4',
        'https://vss6.coursehunter.net/s/c76e2010428a12362d4724db3a8369d1/hbl-setnrnpro/lesson2.mp4',
        'https://vss6.coursehunter.net/s/c7913a1bc673ef2dad68368310426fb6/hbl-setnrnpro/lesson3.mp4',
        'https://vss6.coursehunter.net/s/c7a01445362d4b3a6a9f103d8747425f/hbl-setnrnpro/lesson4.mp4',
        'https://vss6.coursehunter.net/s/c75cd76f362d673ac37b1058726f4254/hbl-setnrnpro/lesson5.mp4',
        'https://vss6.coursehunter.net/s/c72d691061e436360044403a47c64273/hbl-setnrnpro/lesson6.mp4',
        'https://vss6.coursehunter.net/s/c72d55101fa63d36f012ac3aae224280/hbl-setnrnpro/lesson7.mp4',
        'https://vss6.coursehunter.net/s/c7f5d63a6b2d0c36d41057b442831523/hbl-setnrnpro/lesson8.mp4',
        'https://vss6.coursehunter.net/s/c72d8123425f103a3619c530c3c0f500/hbl-setnrnpro/lesson9.mp4',
        'https://vss6.coursehunter.net/s/c710299a2d36389f38d688f23abf42a6/hbl-setnrnpro/lesson10.mp4',
        'https://vss6.coursehunter.net/s/c7422d36c66c5a0323103a33be7513e8/hbl-setnrnpro/lesson11.mp4',
        'https://vss6.coursehunter.net/s/c7c2581042706e362d14fdcc3a702dd3/hbl-setnrnpro/lesson12.mp4'
      ],
      names       : [
        '1 Series Intro',
        '2 Create a New React Native Project',
        '3 Configure the iOS Simulator for React Native Development [Mac Only]',
        '4 Configure the Android Emulator for React Native Development',
        '5 Setup Code Linting',
        '6 Setup Prettier',
        '7 Automatic Code Linting & Formatting in Visual Studio Code',
        '8 Configure Visual Studio Code for React Native Development',
        '9 Organizing Your React Native Project',
        '10 Configure Navigation in React Native',
        '11 Debug a React Native App',
        '12 Style a React Native App'
      ]
    }
  ]*/
  t.is(course[0].notes.length, 1);
  t.is(course[0].urlMaterials.length, 1);
  t.is(course[0].id, '3095');
  t.is(course[0].url, 'https://coursehunter.net/course/kak-nastroit-novyy-proekt-react-native');
  t.is(course[0].chapters.length, 12);
  t.is(course[0].names.length, 12);
  t.true(course[0].notes[0].link.includes('https://coursehunters.online/t/how-to-set-up-a-new-react-native-project'));
  t.true(course[0].urlMaterials[0].includes('hbl-setnrnpro.zip'));
})


test('getCategoriesForDownload method for source', async t => {
  const category = await getCategoriesForDownload({
    token: "222",
    type: 'source',
    url  : 'https://coursehunter.net/category/zbrush',
  })

  /*{
      token: '222',
      categories: [ 'https://coursehunter.net/category/zbrush' ]
  }*/
  t.true(category.token.includes('222'));
  t.true(category.categories[0].includes('https://coursehunter.net/category/zbrush'));
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
  t.true(courses.length >= 4503) //4508

  const titles = courses.map(c => c.title)
  t.true([
    'Agile Scrum Mastery: Full Project Simulation + Certification',
    'The Perfect NGINX Server - CentOS Edition',
    'Automated Software Testing with Python'
  ].every(s => titles.includes(s)))
})
