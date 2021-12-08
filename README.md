# Scrape videos (course) from coursehunter.net
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
    --all, -a   Get all courses.
    --email, -e   Your email.
    --password, -p    Your password.
    --directory, -d   Directory to save.
    --type, -t  source|course Type of download.

Examples
    $ ch
    $ ch --all
    $ ch https://coursehunter.net/course/intermediate-typescript/ -t course
    $ ch -e user@gmail.com -p password -d path-to-directory -t source

## License
MIT
