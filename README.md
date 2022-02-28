# Scrape videos (courses) from coursehunter.net for pro members into file

[![npm](https://badgen.net/npm/v/ch-scrape)](https://www.npmjs.com/package/ch-scrape)

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
    $ ch <?CourseUrl|SourceUrl|CategoryUrl>

Options
--all, -a         Get all courses.
--email, -e       Your email. 
--password, -p    Your password.
--directory, -d   Directory to save.
--type, -t        source|course Type of download. 
--subtitle, -s    Download subtitles if available.
--zip, -z         Download archive if available.
--code, -c        Download code if available.
--concurrency, -cc
  
Examples
  $ ch
  $ ch --all
  $ ch https://coursehunter.net/course/intermediate-typescript -t course 
  $ ch --all [-e user@mail.com] [-p password] [-t source-or-course] [-d path-to-directory] [-cc concurrency-number]
```

## License
MIT
