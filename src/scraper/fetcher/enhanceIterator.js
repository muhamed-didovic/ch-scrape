const PromisePool = require('es6-promise-pool');

function enhanceIterator(iterator) {
  iterator.forEach = function(fn, config) {
    return this.reduce(
      async (current, accumulator, index) => {
        await fn(current, index);
      },
      [],
      config
    );
  };

  iterator.limit = function(limit) {
    let self = this;
    async function limitAsync() {
      self = await self;
      const limitGen = function*() {
        for (let value of self) {
          if (value && limit) {
            yield value;
          } else {
            break;
          }
          limit--;
        }
      };
      return limitGen();
    }
    return enhanceIterator(limitAsync());
  };

  iterator.take = iterator.limit;

  iterator.takeWhile = function(takeWhile) {
    if (typeof takeWhile !== 'function') {
      throw new Error('takeWhile argument must be a function');
    }

    let self = this;
    async function takeWhileAsync() {
      //self = await self;
      const takeWhileGen = function*() {
        let currentPageNumber = 0;
        let page = self.next().value;
        while (page && takeWhile(++currentPageNumber, page)) {
          yield page;
          page = self.next().value;
        }
      };
      return takeWhileGen();
    }
    return enhanceIterator(takeWhileAsync());
  };

  iterator.reduce = function(
    reduceFn,
    accumulatorArg,
    { concurrency = 1, resolvePromise = true } = {}
  ) {
    let accumulator = accumulatorArg;
    let iterator; // = await this;

    const getPromiseIterator = function*() {
      let i = 0;
      for (let p of iterator) {
        if (resolvePromise && p && p.then) {
          yield p.then(page => reduceFn(page, accumulator, i++));
        } else {
          yield reduceFn(p, accumulator, i++);
        }
      }
    };

    const pool = new PromisePool(getPromiseIterator(), concurrency);
    pool.addEventListener('fulfilled', function(event) {
      accumulator = event.data.result;
    });

    pool.addEventListener('rejected', function(event) {
      // what to do ?
      console.log('Rejected: ' + event.data.error.message);
    });

    const startReducing = () =>
      Promise.resolve(this)
        .then(it => {
          iterator = it;
        })
        .then(() => pool.start())
        .then(() => accumulator);
    const startReducingFn = startReducing;

    startReducingFn.then = (...args) => startReducing().then(...args);
    let x = enhanceIterator(startReducingFn);
    return x;
  };

  iterator.map = function(fn, config) {
    return this.reduce(
      async (page, accumulator, index) => {
        accumulator.push(await fn(page, index));
        return accumulator;
      },
      [],
      config
    );
  };

  iterator.flatMap = function(fn, config) {
    return this.reduce(
      async (page, accumulator, index) => {
        const result = await fn(page, index);
        if (Array.isArray(result)) {
          accumulator = [...accumulator, ...result];
        } else {
          accumulator.push(result);
        }
        return accumulator;
      },
      [],
      config
    );
  };

  iterator.first = function() {
    return this.take(1);
  };

  iterator.filter = function(fn, config) {
    return this.reduce(
      async (current, accumulator, index) => {
        if (await fn(current, index)) {
          accumulator.push(current);
        }
        return accumulator;
      },
      [],
      config
    );
  };

  iterator.toArray = function(config) {
    return this.reduce(
      async (current, accumulator) => {
        accumulator.push(current);
        return accumulator;
      },
      [],
      config
    );
  };

  return iterator;
}

module.exports = enhanceIterator;
