'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const camelCase = require('camelcase');
const ngc = require('@angular/compiler-cli/src/main').main;
const rollup = require('rollup');
const uglify = require('rollup-plugin-uglify');
const sourcemaps = require('rollup-plugin-sourcemaps');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

const inlineResources = require('./inline-resources');

const libName = require('./package.json').name;
const rootFolder = path.join(__dirname);
const compilationFolder = path.join(rootFolder, 'out-tsc');
const srcFolder = path.join(rootFolder, 'src/lib');
const distFolder = path.join(rootFolder, 'dist');
const tempLibFolder = path.join(compilationFolder, 'lib');
const es5OutputFolder = path.join(compilationFolder, 'lib-es5');
const es2015OutputFolder = path.join(compilationFolder, 'lib-es2015');

return Promise.resolve()
  // Copy library to temporary folder and inline html/css.
  .then(() => _relativeCopy(`**/*`, srcFolder, tempLibFolder)
    .then(() => inlineResources(tempLibFolder))
    .then(() => console.log('Inlining succeeded.'))
  )
  // Compile to ES2015.
  .then(() => ngc([ '--project', `${tempLibFolder}/tsconfig.lib.json` ]))
  .then(exitCode => exitCode === 0 ? Promise.resolve() : Promise.reject())
  .then(() => console.log('ES2015 compilation succeeded.'))
  // Compile to ES5.
  .then(() => ngc([ '--project', `${tempLibFolder}/tsconfig.es5.json` ]))
  .then(exitCode => exitCode === 0 ? Promise.resolve() : Promise.reject())
  .then(() => console.log('ES5 compilation succeeded.'))
  // Copy typings and metadata to `dist/` folder.
  .then(() => Promise.resolve()
    .then(() => _relativeCopy('**/*.d.ts', es2015OutputFolder, distFolder))
    .then(() => _relativeCopy('**/*.metadata.json', es2015OutputFolder, distFolder))
    //.then(() => _relativeCopy('viewer-typings.d.ts', path.join(tempLibFolder, '/src/component'), path.join(distFolder, '/src/component')))
    .then(() => console.log('Typings and metadata copy succeeded.'))
  )
  // Bundle lib.
  .then(() => {
    // Base configuration.
    const es5Entry = path.join(es5OutputFolder, `${libName}.js`);
    const es2015Entry = path.join(es2015OutputFolder, `${libName}.js`);
    const rollupBaseConfig = {
      moduleName: camelCase(libName),
      sourceMap: true,
      // ATTENTION:
      // Add any dependency or peer dependency your library to `globals` and `external`.
      // This is required for UMD bundle users.
      globals: {
        // The key here is library name, and the value is the the name of the global variable name
        // the window object.
        // See https://github.com/rollup/rollup/wiki/JavaScript-API#globals for more.
        '@angular/core': 'ng.core',
        '@angular/common': 'ng.common',
        '@angular/common/http': 'ng.common-http',
        '@angular/platform-browser': 'ng.platform-browser',
        'rxjs':                             'Rx',
        'rxjs/add/operator/catch':          'Rx.Observable.prototype',
        'rxjs/add/operator/combineLatest':  'Rx.Observable.prototype',
        'rxjs/add/operator/debounceTime':   'Rx.Observable.prototype',
        'rxjs/add/operator/filter':         'Rx.Observable.prototype',
        'rxjs/add/operator/first':          'Rx.Observable.prototype',
        'rxjs/add/operator/map':            'Rx.Observable.prototype',
        'rxjs/add/operator/mergeMap':       'Rx.Observable.prototype',
        'rxjs/add/operator/pluck':          'Rx.Observable.prototype',
        'rxjs/add/operator/skip':           'Rx.Observable.prototype',
        'rxjs/add/operator/switchMap':      'Rx.Observable.prototype',
        'rxjs/add/operator/takeUntil':      'Rx.Observable.prototype',
        'rxjs/add/operator/throttleTime':   'Rx.Observable.prototype',
        'rxjs/add/operator/withLatestFrom': 'Rx.Observable.prototype',
        'rxjs/Observable':                  'Rx',
        'rxjs/observable/empty':            'Rx.Observable',
        'rxjs/observable/fromEvent':        'Rx.Observable',
        'rxjs/observable/fromPromise':      'Rx.Observable',
        'rxjs/observable/merge':            'Rx.Observable',
        'rxjs/observable/of':               'Rx.Observable',
        'rxjs/observable/of':               'Rx.Observable',
        'rxjs/observable/throw':            'Rx.Observable',
        'rxjs/ReplaySubject':               'Rx',
        'rxjs/Subject':                     'Rx',
      },
      external: [
        // List of dependencies
        // See https://github.com/rollup/rollup/wiki/JavaScript-API#external for more.
        '@angular/core',
        '@angular/common',
        '@angular/common/http',
        '@angular/platform-browser',
        'rxjs',
        'rxjs/add/operator/catch',
        'rxjs/add/operator/combineLatest',
        'rxjs/add/operator/debounceTime',
        'rxjs/add/operator/filter',
        'rxjs/add/operator/first',
        'rxjs/add/operator/map',
        'rxjs/add/operator/mergeMap',
        'rxjs/add/operator/pluck',
        'rxjs/add/operator/skip',
        'rxjs/add/operator/switchMap',
        'rxjs/add/operator/takeUntil',
        'rxjs/add/operator/throttleTime',
        'rxjs/add/operator/withLatestFrom',
        'rxjs/Observable',
        'rxjs/observable/empty',
        'rxjs/observable/fromEvent',
        'rxjs/observable/fromPromise',
        'rxjs/observable/merge',
        'rxjs/observable/of',
        'rxjs/observable/of',
        'rxjs/observable/throw',
        'rxjs/ReplaySubject',
        'rxjs/Subject',
      ],
      paths: {
       'three/index': 'three',
      },
      plugins: [
        commonjs({
          include: ['node_modules/rxjs/**']
        }),
        sourcemaps(),
        nodeResolve({ jsnext: true, module: true })
      ]
    };

    // UMD bundle.
    const umdConfig = Object.assign({}, rollupBaseConfig, {
      entry: es5Entry,
      dest: path.join(distFolder, `bundles`, `${libName}.umd.js`),
      format: 'umd',
    });

    // Minified UMD bundle.
    const minifiedUmdConfig = Object.assign({}, rollupBaseConfig, {
      entry: es5Entry,
      dest: path.join(distFolder, `bundles`, `${libName}.umd.min.js`),
      format: 'umd',
      plugins: rollupBaseConfig.plugins.concat([uglify({})])
    });

    // ESM+ES5 flat module bundle.
    const fesm5config = Object.assign({}, rollupBaseConfig, {
      entry: es5Entry,
      dest: path.join(distFolder, `${libName}.es5.js`),
      format: 'es'
    });

    // ESM+ES2015 flat module bundle.
    const fesm2015config = Object.assign({}, rollupBaseConfig, {
      entry: es2015Entry,
      dest: path.join(distFolder, `${libName}.js`),
      format: 'es'
    });

    const allBundles = [
      umdConfig,
      minifiedUmdConfig,
      fesm5config,
      fesm2015config
    ].map(cfg => rollup.rollup(cfg).then(bundle => bundle.write(cfg)));

    return Promise.all(allBundles)
      .then(() => console.log('All bundles generated successfully.'))
  })
  // Copy package files
  .then(() => Promise.resolve()
    .then(() => _relativeCopy('LICENSE', rootFolder, distFolder))
    .then(() => _relativeCopy('package.json', rootFolder, distFolder))
    .then(() => _relativeCopy('README.md', rootFolder, distFolder))
    // We need to automate the fixing of the viewer.component.d.ts file
    // in the distFolder/src/component. It needs the following at the start of it
    .then(() => _stampReferencePath(distFolder))
    .then(() => console.log('Package files copy succeeded.'))
  )
  .catch(e => {
    console.error('\Build failed. See below for errors.\n');
    console.error(e);
    process.exit(1);
  });


// Copy files maintaining relative paths.
function _relativeCopy(fileGlob, from, to) {
  return new Promise((resolve, reject) => {
    glob(fileGlob, { cwd: from, nodir: true }, (err, files) => {
      if (err) reject(err);
      files.forEach(file => {
        const origin = path.join(from, file);
        const dest = path.join(to, file);
        const data = fs.readFileSync(origin, 'utf-8');
        _recursiveMkDir(path.dirname(dest));
        fs.writeFileSync(dest, data);
        resolve();
      })
    })
  });
}

// Recursively create a dir.
function _recursiveMkDir(dir) {
  if (!fs.existsSync(dir)) {
    _recursiveMkDir(path.dirname(dir));
    fs.mkdirSync(dir);
  }
}

// We need to automate the fixing of the viewer.component.d.ts file
// in the distFolder/src/component. It needs the following at the start of it
function _stampReferencePath(distFolder) {
  const fileName = path.join(distFolder, 'src/component/viewer.component.d.ts');

  return new Promise((resolve) => {
    console.log('Correcting reference paths...');

    // Read file
    let contents = fs.readFileSync(fileName).toString();

    // Remove first line
    contents = contents.substring(contents.indexOf('\n') + 1);
    // Replace with correct reference paths
    contents = '/// <reference types="three" />\n'
      + '/// <reference types="forge-viewer" />\n'
      + contents;

    // Write file
    fs.writeFileSync(fileName, contents);

    resolve();
  });

}
