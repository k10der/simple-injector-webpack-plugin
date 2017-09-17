'use strict';
const path = require('path');

const expect = require('chai').expect;
const proxyquire = require('proxyquire');

class FileExistsMock {
  constructor() {
    this.existingPaths = [];

    this.setExistingPaths = this.setExistingPaths.bind(this);
    this.sync = this.sync.bind(this);
  }

  /**
   * Set existing paths array
   *
   * @param {string[]} existingPaths
   */
  setExistingPaths(existingPaths) {
    this.existingPaths = existingPaths;
  }

  /**
   * Return existence of a file path
   *
   * @param {string} filePath
   * @return {boolean}
   */
  sync(filePath) {
    return this.existingPaths.indexOf(filePath) !== -1;
  }
}

class ProcessCWDMock {
  constructor() {
    if (process.platform === 'win32') {
      this._pathBase = 'c:\\';
    } else {
      this._pathBase = '/';
    }
    this.cwdPath = path.join(this._pathBase, 'tmp');

    this.cwd = this.cwd.bind(this);
    this.setCWD = this.setCWD.bind(this);
  }

  /**
   * Return mocked current working directory
   *
   * @return {string}
   */
  cwd() {
    return this.cwdPath;
  }

  /**
   * Set new current working directory
   *
   * @param {string[]} pathParts
   */
  setCWD(pathParts) {
    this.cwdPath = path.join(this._pathBase, ...pathParts);
  }
}

describe(`ConfigurationProcessor`, function () {
  let configurationProcessor;
  let fileExistsMock;
  let processCWDMock;
  let originalCWD;

  before(function () {
    fileExistsMock = new FileExistsMock();
    processCWDMock = new ProcessCWDMock();

    const ConfigurationProcessor = proxyquire('../src/configurationProcessor', {
      'file-exists': fileExistsMock,
    });

    configurationProcessor = new ConfigurationProcessor();

    originalCWD = Object.getOwnPropertyDescriptor(process, 'cwd');
    // Redefine process.cwd
    Object.defineProperty(process, 'cwd', {
      value: processCWDMock.cwd,
    });
  });

  after(function () {
    // Restore original process.cwd
    Object.defineProperty(process, 'cwd', originalCWD);
  });

  describe(`#process`, function () {
    describe(`#_processEOL`, function () {
      it(`should return \\n by default if no 'eol' parameter value is provided`, function () {
        expect(configurationProcessor._processEOL()).to.equal('\n');
      });

      it(`should return the correct line ending if the correct 'eol' parameter value is provided`, function () {
        expect(configurationProcessor._processEOL('cmac')).to.equal('\r');
        expect(configurationProcessor._processEOL('classicmac')).to.equal('\r');
        expect(configurationProcessor._processEOL('\r')).to.equal('\r');

        expect(configurationProcessor._processEOL('unix')).to.equal('\n');
        expect(configurationProcessor._processEOL('linux')).to.equal('\n');
        expect(configurationProcessor._processEOL('osx')).to.equal('\n');
        expect(configurationProcessor._processEOL('bsd')).to.equal('\n');
        expect(configurationProcessor._processEOL('\n')).to.equal('\n');

        expect(configurationProcessor._processEOL('win')).to.equal('\r\n');
        expect(configurationProcessor._processEOL('windows')).to.equal('\r\n');
        expect(configurationProcessor._processEOL('\r\n')).to.equal('\r\n');
      });

      it(`should throw an error if 'eol' parameter value doesn't match any pre-defined one`, function () {
        expect(() => configurationProcessor._processEOL('undefined')).to.throw(`Unsupported 'eol' configuration parameter value is provided. Possible values are: cmac,classicmac,\\r,unix,linux,osx,bsd,\\n,win,windows,\\r\\n`);
      });
    });

    describe(`#_processFile`, function () {
      it(`should return file path if 'file' parameter value represents a full path or a relative to cwd path that exists`, function () {
        const fileName = 'test.html';

        processCWDMock.setCWD(['data']);
        fileExistsMock.setExistingPaths([path.join(processCWDMock.cwd(), fileName)]);
        expect(configurationProcessor._processFile(path.join(processCWDMock.cwd(), fileName))).to.equal(path.join(processCWDMock.cwd(), fileName));
        expect(configurationProcessor._processFile(fileName)).to.equal(path.join(processCWDMock.cwd(), fileName));
      });

      it(`should throw an error if given full or relative file paths of 'file' parameter value doesn't exist`, function () {
        const fileName = 'test.html';

        const filePathsFull = [
          path.join(processCWDMock.cwd(), fileName),
          path.join(processCWDMock.cwd(), processCWDMock.cwd(), fileName),
        ];
        const filePathsRelative = [
          fileName,
          path.join(processCWDMock.cwd(), fileName),
        ];

        processCWDMock.setCWD(['data']);
        fileExistsMock.setExistingPaths([]);
        expect(() => configurationProcessor._processFile(path.join(processCWDMock.cwd(), fileName))).to.throw(`Couldn't find provided file path (checked in "${filePathsFull.join('" and "')}") directories`);
        expect(() => configurationProcessor._processFile(fileName)).to.throw(`Couldn't find provided file path (checked in "${filePathsRelative.join('" and "')}") directories`);
      });

      it(`should throw an error if 'file' parameter value isn't provided`, function () {
        expect(() => configurationProcessor._processFile()).to.throw(`Required 'file' property is missing on parameters object`);
      });
    });

    describe(`#_processFilter`, function () {
      it(`should return false if 'filter' parameter value isn't provided`, function () {
        expect(configurationProcessor._processFilter()).to.be.false;
      });

      it(`should return the same function if 'filter' parameter value is a function`, function () {
        const filterFunction = () => true;
        expect(configurationProcessor._processFilter(filterFunction)).to.equal(filterFunction);
      });

      it(`should return a function with RegExp logic if 'filter' parameter value is a string`, function () {
        const sampleData = ['a', 'aa', 'baa', 'aba', 'aaaa'];
        const filterFunctionConstructor = regexpString => name => name.match(new RegExp(regexpString));

        const regexpString1 = '^aa';
        const filterOutput1 = sampleData.filter(d => configurationProcessor._processFilter(regexpString1)(d));
        const sampleOutput1 = sampleData.filter(d => filterFunctionConstructor(regexpString1)(d));
        expect(filterOutput1.length).to.equal(2);
        expect(filterOutput1.length).to.equal(sampleOutput1.length);
        expect(filterOutput1).to.have.same.members(sampleOutput1);

        const regexpString2 = '^a';
        const filterOutput2 = sampleData.filter(d => configurationProcessor._processFilter(regexpString2)(d));
        const sampleOutput2 = sampleData.filter(d => filterFunctionConstructor(regexpString2)(d));
        expect(filterOutput2.length).to.equal(4);
        expect(filterOutput2.length).to.equal(sampleOutput2.length);
        expect(filterOutput2).to.have.same.members(sampleOutput2);
      });

      it(`should throw and error if 'filter' parameter value isn't a string, function or undefined`, function () {
        expect(() => configurationProcessor._processFilter(null)).to.throw(`Unexpected 'filter' parameter value is provided. Expected function, regex string or undefined.`);
        expect(() => configurationProcessor._processFilter(0)).to.throw(`Unexpected 'filter' parameter value is provided. Expected function, regex string or undefined.`);
        expect(() => configurationProcessor._processFilter({})).to.throw(`Unexpected 'filter' parameter value is provided. Expected function, regex string or undefined.`);
        expect(() => configurationProcessor._processFilter([])).to.throw(`Unexpected 'filter' parameter value is provided. Expected function, regex string or undefined.`);
      });
    });

    describe(`#_processInjector`, function () {
      it(`should return string with specified injector name included if 'injectorName' parameter value is provided`, function () {
        const injectorName = 'test';
        expect(configurationProcessor._processInjector(injectorName)).to.equal(`((<!-- *injector:${injectorName} *-->)([\\s\\S]*?)(<!-- *endinjector *-->))`);
      });

      it(`should return string with default injector name included ("js") if 'injectorName' parameter value is not provided`, function () {
        expect(configurationProcessor._processInjector()).to.equal(`((<!-- *injector:js *-->)([\\s\\S]*?)(<!-- *endinjector *-->))`);
      });
    });

    describe(`#_processSort`, function () {
      it(`should return function that returns the same value if 'sort' parameter value isn't provided`, function () {
        const arr = [1, 2, 3];
        expect(configurationProcessor._processSort()(arr)).to.equal(arr);
      });

      it(`should return the same function if 'sort' parameter value is a function`, function () {
        const sortFunction = () => true;
        expect(configurationProcessor._processSort(sortFunction)).to.equal(sortFunction);
      });

      it(`should return the correct sorting function if correct 'sort' parameter value is provided`, function () {
        const sampleData = [
          {
            name: 'app',
          },
          {
            name: 'jquery',
          },
          {
            name: 'shared',
          },
          {
            name: 'vendor',
          },
        ];

        expect(configurationProcessor._processSort([])(sampleData).map(d => d.name).join(',')).to.equal('app,jquery,shared,vendor');
        expect(configurationProcessor._processSort(['+'])(sampleData).map(d => d.name).join(',')).to.equal('app,jquery,shared,vendor');
        expect(configurationProcessor._processSort(['-'])(sampleData).map(d => d.name).join(',')).to.equal('vendor,shared,jquery,app');
        expect(configurationProcessor._processSort(['jquery'])(sampleData).map(d => d.name).join(',')).to.equal('jquery,app,shared,vendor');
        expect(configurationProcessor._processSort(['jquery', '+'])(sampleData).map(d => d.name).join(',')).to.equal('jquery,app,shared,vendor');
        expect(configurationProcessor._processSort(['jquery', '-'])(sampleData).map(d => d.name).join(',')).to.equal('jquery,vendor,shared,app');
        expect(configurationProcessor._processSort(['+', 'jquery'])(sampleData).map(d => d.name).join(',')).to.equal('app,shared,vendor,jquery');
        expect(configurationProcessor._processSort(['-', 'jquery'])(sampleData).map(d => d.name).join(',')).to.equal('vendor,shared,app,jquery');
        expect(configurationProcessor._processSort(['jquery', 'vendor'])(sampleData).map(d => d.name).join(',')).to.equal('jquery,vendor,app,shared');
        expect(configurationProcessor._processSort(['jquery', 'vendor', '+'])(sampleData).map(d => d.name).join(',')).to.equal('jquery,vendor,app,shared');
        expect(configurationProcessor._processSort(['jquery', 'vendor', '-'])(sampleData).map(d => d.name).join(',')).to.equal('jquery,vendor,shared,app');
        expect(configurationProcessor._processSort(['+', 'jquery', 'vendor'])(sampleData).map(d => d.name).join(',')).to.equal('app,shared,jquery,vendor');
        expect(configurationProcessor._processSort(['-', 'jquery', 'vendor'])(sampleData).map(d => d.name).join(',')).to.equal('shared,app,jquery,vendor');
        expect(configurationProcessor._processSort(ep => ep.slice().sort((ep1, ep2) => ep1.name[2] > ep2.name[2] ? 1 : -1))(sampleData).map(d => d.name).join(',')).to.equal('shared,vendor,app,jquery');
      });

      it(`should throw an error if wrong 'sort' parameter value is provided`, function () {
        expect(() => configurationProcessor._processSort(null)).to.throw(`Unexpected 'sort' parameter value is provided. Expected function, array or undefined.`);
        expect(() => configurationProcessor._processSort(0)).to.throw(`Unexpected 'sort' parameter value is provided. Expected function, array or undefined.`);
        expect(() => configurationProcessor._processSort({})).to.throw(`Unexpected 'sort' parameter value is provided. Expected function, array or undefined.`);

        expect(() => configurationProcessor._processSort(['-', '+'])).to.throw(`Wrong 'sort' parameter value is provided. Ascending and Descending sorting rules can't be used within a single sorting definition.`);
        expect(() => configurationProcessor._processSort(['-', '+', '-', '+'])).to.throw(`Wrong 'sort' parameter value is provided. Ascending and Descending sorting rules can't be used within a single sorting definition.`);
        expect(() => configurationProcessor._processSort(['app', '-', 'vendor'])).to.throw(`Wrong 'sort' parameter value is provided. Ascending and Descending sorting rules can be used only either in the beginning of sorting configuration or in it's end.`);
        expect(() => configurationProcessor._processSort(['app', '+', 'vendor'])).to.throw(`Wrong 'sort' parameter value is provided. Ascending and Descending sorting rules can be used only either in the beginning of sorting configuration or in it's end.`);
        expect(() => configurationProcessor._processSort(['-', '-'])).to.throw(`Wrong 'sort' parameter value is provided. Descending sorting rule can't be used more than once.`);
        expect(() => configurationProcessor._processSort(['+', '+'])).to.throw(`Wrong 'sort' parameter value is provided. Ascending sorting rule can't be used more than once.`);
        expect(() => configurationProcessor._processSort([''])).to.throw(`Wrong 'sort' parameter value is provided. Sorting rules can't contain empty strings.`);
      });

      it(`should throw an error while processing sorting if wrong 'sort' parameter value is provided`, function () {
        const sampleData = [
          {
            name: 'app',
          },
        ];

        expect(() => configurationProcessor._processSort(['app', 'vendor'])(sampleData)).to.throw(`Non-existing entry point "vendor" is provided in 'sort' parameter value. Unable to continue processing.`);
      });

    });

    describe(`#_processTemplate`, function () {
      it(`should return function that returns asset name if 'template' parameter value isn't provided`, function () {
        expect(configurationProcessor._processTemplate()(123)).to.equal(123);
        expect(configurationProcessor._processTemplate()('test')).to.equal('test');
        expect(configurationProcessor._processTemplate()()).to.be.undefined;
      });

      it(`should return the same function if 'template' parameter value is a function`, function () {
        const templateFunction = assetName => `<script src="${assetName}"></script>`;
        expect(configurationProcessor._processTemplate(templateFunction)).to.equal(templateFunction);
      });

      it(`should throw and error if 'template' parameter value isn't a function or undefined`, function () {
        expect(() => configurationProcessor._processTemplate(null)).to.throw(`Unexpected 'template' parameter value is provided. Expected function or undefined.`);
        expect(() => configurationProcessor._processTemplate(0)).to.throw(`Unexpected 'template' parameter value is provided. Expected function or undefined.`);
        expect(() => configurationProcessor._processTemplate({})).to.throw(`Unexpected 'template' parameter value is provided. Expected function or undefined.`);
        expect(() => configurationProcessor._processTemplate([])).to.throw(`Unexpected 'template' parameter value is provided. Expected function or undefined.`);
      });
    });
  });
});
