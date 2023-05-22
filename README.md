[![npm](https://flat.badgen.net/npm/v/ch-scrape)](https://www.npmjs.com/package/ch-scrape)
[![Downloads](https://img.shields.io/npm/dm/ch-scrape.svg?style=flat)](https://www.npmjs.org/package/ch-scrape)
[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fmuhamed-didovic%2Fch-scrape&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)
[![license](https://flat.badgen.net/github/license/muhamed-didovic/ch-scrape)](https://github.com/muhamed-didovic/ch-scrape/blob/master/LICENSE)

# Scrape videos (courses) from coursehunter.net for pro members into file
## Beware this is not a downloader if you want to use downloader you can use one of these two:

```
https://github.com/muhamed-didovic/fmdown
https://github.com/muhamed-didovic/chdown-workers
```

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
  --videos, -v      Include videos if available (options available: 'yes' or 'no', default is 'yes').
  --subtitle, -s    Include subtitles if available (options available: 'yes' or 'no', default is 'no').
  --zip, -z         Include archive if available (options available: 'yes' or 'no', default is 'no').
  --code, -c        Include code if availabl (options available: 'yes' or 'no', default is 'no').
  --lang, -l        Include courses of certain language, available options: 'English', 'Русский' and 'all'
  --concurrency, -cc

Examples
  $ ch-scrape
  $ ch-scrape --all
  $ ch-scrape https://coursehunter.net/course/intermediate-typescript -t course
  $ ch-scrape [url] [--all] [-e user@mail.com] [-p password] [-t source|course] [-v yes|no] [-s yes|no] [-z yes|no] [-c yes|no] [-l English|Русский|all] [-d path-to-directory] [-cc concurrency-number]
```

## License

MIT
