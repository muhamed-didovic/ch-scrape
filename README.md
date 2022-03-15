# Scrape videos (courses) from coursehunter.net for pro members into file

[![npm](https://flat.badgen.net/npm/v/ch-scrape)](https://www.npmjs.com/package/ch-scrape)
[![license](https://flat.badgen.net/github/license/muhamed-didovic/ch-scrape)](https://github.com/muhamed-didovic/ch-scrape/blob/master/LICENSE)


## Install
```sh
npm i -g ch-scrape
```

#### without Install
```sh
npx ch-scrape
```

## CLI
```sh
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
  --lang, -l        Include courses of certain language ('en', 'ru' or 'both')
  --concurrency, -cc

Examples
  $ ch-scrape
  $ ch-scrape --all
  $ ch-scrape https://coursehunter.net/course/intermediate-typescript -t course
  $ ch-scrape --all [-e user@mail.com] [-p password] [-t source-or-course] [-d path-to-directory] [-cc concurrency-number]
```

## License
MIT
