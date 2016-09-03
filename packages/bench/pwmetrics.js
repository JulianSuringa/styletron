const path = require('path');
const fs = require('fs');
const os = require('os');
const {spawn, exec} = require('child_process');

const chromepath = require('chrome-location');
spawn(chromepath, ['--remote-debugging-port=9222', '--no-first-run', `--user-data-dir=${path.join(os.tmpdir(), 'temp-profile')}`]);

const PWMetrics = require('pwmetrics');

const staticDir = path.join(__dirname, 'static');

const variants = fs
  .readdirSync(staticDir)
  .filter(filename => path.parse(filename).ext === '' && filename[0] !== '.');

let entries = [];

let resultsArr = [];

variants.forEach(variant => {
  const variantDir = path.join(staticDir, variant);

  const apps = fs
    .readdirSync(variantDir)
    .filter(filename => path.parse(filename).ext === '' && filename[0] !== '.');

  const appEntries = apps.map(app => {
    return fs
      .readdirSync(path.join(variantDir, app))
      .filter(filename => path.parse(filename).ext === '.html')
      .map(filename => ({
        app: app,
        variant: variant,
        file: filename
      }));
  });

  let partial = appEntries.reduce((acc, arr) => {
    return acc.concat(arr);
  }, []);
  entries = entries.concat(partial);
});

const urls = entries.map(url);

function test(remaining) {
  if (remaining >= 0) {
    const p = new PWMetrics(urls[remaining], {json: true});
    p.then((results) => {
      console.log(urls[remaining]);
      console.log(results);
      resultsArr.push(JSON.parse(results));
      test(remaining - 1);
    });
  } else {
    summary();
  }
}



function summary() {
  const totals = resultsArr.reduce((acc, result, i) => {
    const reversed = entries.reverse();
    const entry = reversed[i];
    const wut = {
      app: entry.app,
      variant: entry.variant,
      library: path.parse(entry.file).name,
      tti: result.timings[5].value
    };
    acc.push(wut);
    return acc;
  }, []);
  console.log('SUMMARY');
  console.log('===========');
  console.log(JSON.stringify(totals, null, 2));
  process.exit(0);
}

setTimeout(_ => test(urls.length - 1), 3000);

function url({app, file, variant}) {
  return path.join('http://localhost:8080', variant, app, file);
}
