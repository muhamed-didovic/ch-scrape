const test = require('ava').serial
const { cli, prompt } = require('../lib/cli')

const Bluebird = require('bluebird')
Bluebird.config({ longStackTraces: true })
global.Promise = Bluebird

test('cli options', async t => {
  const { flags, input } = cli
  // console.log('prompt: ', { flags, input });

  /*flags: {
    all: false,
      videos: true,
      subtitle: false,
      code: false,
      zip: false,
      concurrency: 10
  },
  input: []*/

  t.is(input.length, 0);
  t.is(flags.videos, 'yes');
  t.is(flags.concurrency, 10);
  t.is(flags.subtitle, 'no');
  t.is(flags.code, 'no');
  t.is(flags.zip, 'no');
})

test('prompt - download all courses with all options', async t => {
// ✔ Do you want all courses? … no
// ✔ Choose "Y" if you want to search for a course otherwise choose "N" if you have a link for download … yes
// ✔ Do you want to search for a courses from a local file (which is faster) … yes
// ✔ Found a file
// ✔ Search for a course › Intro to UX: Design Effective Dashboards With Brain Science
// ✔ Include subtitle if it exists? … no / yes
// ✔ Include code if it exists? … no / yes
// ✔ Include archive of the course if it exists? … no / yes
// ✔ Which language of course should be downloaded. › English
// ✔ What do you want to download: course(book) or source. › course or book


  const p = await prompt({
    all: true,
    email: 'test@example.com',
    password: 'test',
    downDir: './d',
    subtitle: 'yes',
    code: 'yes',
    zip: 'yes',
    lang: 'all'
  })

  /*{
    input: [],
      type: 'all',
    email: 'test@example.com',
    password: 'test',
    downDir: './d',
    subtitle: true,
    code: true,
    zip: true,
    concurrency: 10,
    lang: 'all',
    videos: true
  }*/
  // console.log('prompt: ', p)


  t.is(p.input.length, 0);
  t.is(p.type, 'all');
  t.is(p.email, 'test@example.com');
  t.is(p.password, 'test');
  t.is(p.downDir, './d');
  t.is(p.lang, 'all');

  t.is(p.videos, 'yes');
  t.is(p.subtitle, 'yes');
  t.is(p.code, 'yes');
  t.is(p.zip, 'yes');

  t.is(p.concurrency, 10);
})

test('prompt - download all courses with some options', async t => {
  const p = await prompt({
    all: true,
    email: 'test@example.com',
    password: 'test',
    downDir: './dd',
    subtitle: 'no',
    code: 'no',
    zip: 'no',
    videos: 'no',
    concurrency: 7,
    lang: 'English'
  })

  t.is(p.input.length, 0);
  t.is(p.type, 'all');
  t.is(p.email, 'test@example.com');
  t.is(p.password, 'test');
  t.is(p.downDir, './dd');
  t.is(p.lang, 'English');
  t.is(p.concurrency, 7);

  t.is(p.videos, 'no');
  t.is(p.subtitle, 'no');
  t.is(p.code, 'no');
  t.is(p.zip, 'no');
})

test('prompt - download one course with all options', async t => {

  const p = await prompt({
    // all: false,
    url: 'https://coursehunter.net/course/kak-nastroit-novyy-proekt-react-native',
    type: 'course',
    email: 'test@example.com',
    password: 'test',
    downDir: './dd',
    subtitle: 'yes',
    code: 'yes',
    zip: 'yes',
    concurrency: 8,
    lang: 'all'
  })

  t.true(p.url.length > 0);
  t.is(p.type, 'course');
  t.is(p.email, 'test@example.com');
  t.is(p.password, 'test');
  t.is(p.downDir, './dd');
  t.is(p.lang, 'all');
  t.is(p.concurrency, 8);

  t.is(p.videos, 'yes');
  t.is(p.subtitle, 'yes');
  t.is(p.code, 'yes');
  t.is(p.zip, 'yes');
})

test('prompt - download one course with some options', async t => {

  const p = await prompt({
    // all: false,
    url: 'https://coursehunter.net/course/kak-nastroit-novyy-proekt-react-native',
    type: 'course',
    email: 'test@example.com',
    password: 'test',
    downDir: './dd',
    subtitle: 'no',
    code: 'no',
    zip: 'no',
    videos: 'no',
    concurrency: 8,
    lang: 'Русский'
  })

  t.true(p.url.length > 0);
  t.is(p.type, 'course');
  t.is(p.email, 'test@example.com');
  t.is(p.password, 'test');
  t.is(p.downDir, './dd');
  t.is(p.lang, 'Русский');
  t.is(p.concurrency, 8);

  t.is(p.videos, 'no');
  t.is(p.subtitle, 'no');
  t.is(p.code, 'no');
  t.is(p.zip, 'no');
})

test('prompt - download source with some options', async t => {
  const p = await prompt({
    // all: false,
    url: 'https://coursehunter.net/course/kak-nastroit-novyy-proekt-react-native',
    type: 'source',
    email: 'test@example.com',
    password: 'test',
    downDir: './dd',
    subtitle: 'no',
    code: 'no',
    zip: 'no',
    //videos: 'no',
    concurrency: 8,
    lang: 'Русский'
  })

  t.true(p.url.length > 0);
  t.is(p.type, 'source');
  t.is(p.email, 'test@example.com');
  t.is(p.password, 'test');
  t.is(p.downDir, './dd');
  t.is(p.lang, 'Русский');
  t.is(p.concurrency, 8);

  t.is(p.videos, 'yes');
  t.is(p.subtitle, 'no');
  t.is(p.code, 'no');
  t.is(p.zip, 'no');
})


test('prompt - error with all option and url', async t => {
  await t.throwsAsync(async () => {
    await prompt({
      all: true,
      url: 'https://coursehunter.net/course/kak-nastroit-novyy-proekt-react-native',
      type: 'course',
      email: 'test@example.com',
      password: 'test',
      downDir: './dd',
      subtitle: 'no',
      code: 'no',
      zip: 'no',
      //videos: 'no',
      concurrency: 8,
      lang: 'Русский'
    })
  }, {instanceOf: Error, message: 'This combination of options is not allowed!!!'});
})

