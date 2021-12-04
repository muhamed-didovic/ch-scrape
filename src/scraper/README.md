
<div align="center">
<h1>scraping-ninja-toolkit</h1>
<p>All the goodies you'll ever need to scrape the web</p>
</div>

## Documentation

* [Get Started](https://jimmylaurent.github.io/scraping-ninja-toolkit/#/README)
* [Examples](https://jimmylaurent.github.io/scraping-ninja-toolkit/#/examples)
* [API Reference](https://jimmylaurent.github.io/scraping-ninja-toolkit/#/api-reference)


## In-browser Playground

You can try the library on codesandbox, it uses a cors proxy fetcher to let you grab contents from any website inside your browser.

* CodeSandbox: https://codesandbox.io/s/pkyv3n2xym

## Installation
```sh
yarn add scraping-ninja-toolkit
# or
npm i scraping-ninja-toolkit
```
## Features

* All in one package
* Nodejs / Browsers compatibility
* Blazingly fast
* Extensible

## Overview

The library is articulated around two main components:

- the `fetcher` let you grab contents from any url,
- the `scraper` let you extract data from webpages.

There is also some additional tools like an enhanced axios client. 

## Quick Example

```js
const { fetcher } = require('scraping-ninja-toolkit');

// Fetch the given url and return a page scraper
const page = await fetcher.get('http://quotes.toscrape.com');

// Scrape an object
const quote = page.scrape('.quote', {
  author: '.author@text',
  text: '.text@text'
});
```
```json
<!-- quote -->
{ 
  "author": "Albert Einstein", 
  "text": "“The world as we have created it is a process of our thinking.“"
}
```

## Advanced real world example

```js
const { fetcher } = require('scraping-ninja-toolkit');
const fs = require('fs');

(async () => {
  // Get categories urls
  const categories = await fetcher
    .get('https://coursehunters.net')
    .links('.menu-aside__a');

  // For each category
  // => frontend
  // => backend ...
  const results = await fetcher.getAll(categories).map(
    async (fetchNode, index) => {
      // Get all courses from the catagory in an flat array
      // https://coursehunters.net/frontend?page=1 => 10 courses
      // https://coursehunters.net/frontend?page=1 => 10 courses
      // ....
      //
      // allCourses => [{
      //   title: 'Modern HTML & CSS From The Beginning',
      //   url: 'https://coursehunters.net/course/sovremennyy-html-i-css-s-samogo-nachala'
      // }, ... ]
      const allCourses = await fetchNode
        .paginate('.pagination__a[rel="next"]')
        .flatMap(p =>
          p.scrapeAll('article', {
            title: '.standard-course-block__original@text',
            url: 'a[itemprop="mainEntityOfPage"]@href'
          })
        );

      // For each course scrape chapters
      // with a concurrency of 50 queries at the same time
      // and filter "undefined" values (courses without chapters)
      const courses = await fetcher
        .getAll(allCourses.map(c => c.url))
        .map(
          async p => {
            console.log(`Scraping url: ${p.location}`);

            const chapters = p.scrapeAll('.lessons-list__li', {
              name: 'span[itemprop="name"]@text',
              url: 'link[itemprop="url"]@href'
            });
            if (chapters && chapters.length && chapters[0].url) {
              const course = allCourses.find(c => c.url === p.location);
              course.chapters = chapters;
              return course;
            }
          },
          { concurrency: 50 }
        )
        .filter(c => c);

      return {
        category: categories[index].split('/').pop(),
        courses: courses
      };
    },
    { resolvePromise: false, concurrency: 6 }
  );

  fs.writeFileSync('courses.json', JSON.stringify(results, null, 2), 'utf8');
})();
```

## Credits

__&#8226; FB55:__ his work is the core of this library.

__&#8226; Matt Mueller and cheerio contributors :__
A good portion of the code and concepts are copied/derived from the cheerio and x-ray scraper libraries.

## License

MIT © 2019 [Jimmy Laurent](https://github.com/JimmyLaurent)
