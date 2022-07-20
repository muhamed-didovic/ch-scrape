# Scrape videos (courses) from coursehunter.net for pro members into file

[![npm](https://flat.badgen.net/npm/v/ch-scrape)](https://www.npmjs.com/package/ch-scrape)
[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fmuhamed-didovic%2Fch-scrape&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)
[![license](https://flat.badgen.net/github/license/muhamed-didovic/ch-scrape)](https://github.com/muhamed-didovic/ch-scrape/blob/master/LICENSE)

## Requirement
- Node 18

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
