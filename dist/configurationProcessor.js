'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var path = require('path');

var fileExists = require('file-exists');

var ConfigurationProcessor = function () {
  function ConfigurationProcessor() {
    _classCallCheck(this, ConfigurationProcessor);
  }

  _createClass(ConfigurationProcessor, [{
    key: 'process',
    value: function process(configuration) {
      var processedConfiguration = {};

      processedConfiguration.eol = this._processEOL(configuration.eol);
      processedConfiguration.file = this._processFile(configuration.file);
      processedConfiguration.filter = this._processFilter(configuration.filter);
      processedConfiguration.re = this._processInjector(configuration.injectorName);
      processedConfiguration.sort = this._processSort(configuration.sort);
      processedConfiguration.template = this._processTemplate(configuration.template);

      return processedConfiguration;
    }

    /**
     * Process `eol` parameter. Returns an actual EOL value to be used when
     * rendering multiple strings
     *
     * @param {string?} eol
     * @return {string}
     * @private
     */

  }, {
    key: '_processEOL',
    value: function _processEOL(eol) {
      var CLASSIC_MAC_EOL = '\r';
      var UNIX_EOL = '\n';
      var WINDOWS_EOL = '\r\n';

      var CLASSIC_MAC_OPTIONS = ['cmac', 'classicmac', '\r'];
      var UNIX_OPTIONS = ['unix', 'linux', 'osx', 'bsd', '\n'];
      var WINDOWS_OPTIONS = ['win', 'windows', '\r\n'];

      var POSSIBLE_OPTIONS = [].concat(CLASSIC_MAC_OPTIONS, UNIX_OPTIONS, WINDOWS_OPTIONS);

      if (eol === undefined) {
        return UNIX_EOL;
      }

      if (POSSIBLE_OPTIONS.indexOf(eol) === -1) {
        throw new Error('Unsupported \'eol\' configuration parameter value is provided. Possible values are: ' + POSSIBLE_OPTIONS.map(function (o) {
          return o.replace('\n', '\\n').replace('\r', '\\r');
        }));
      }

      if (CLASSIC_MAC_OPTIONS.indexOf(eol) !== -1) {
        return CLASSIC_MAC_EOL;
      } else if (UNIX_OPTIONS.indexOf(eol) !== -1) {
        return UNIX_EOL;
      } else if (WINDOWS_OPTIONS.indexOf(eol) !== -1) {
        return WINDOWS_EOL;
      }

      throw new Error('Unexpected error occurred while processing \'eol\' configuration parameter.');
    }

    /**
     * Process file property to check whether file paths exist and build
     * a new file path in case of providing a relative
     * path
     *
     * @param {string} file
     * @return {string}
     * @private
     */

  }, {
    key: '_processFile',
    value: function _processFile(file) {
      if (!file) {
        throw new Error('Required \'file\' property is missing on parameters object');
      }

      var filePaths = [file, path.join(process.cwd(), file)];

      if (fileExists.sync(filePaths[0])) {
        return filePaths[0];
      } else if (fileExists.sync(filePaths[1])) {
        return filePaths[1];
      }

      throw new Error('Couldn\'t find provided file path (checked in "' + filePaths.join('" and "') + '") directories');
    }

    /**
     * Process filter configuration parameter that is used to filter out
     * injectable assets by name
     *
     * @param {function|string?} filter
     * @return {function|boolean}
     * @private
     */

  }, {
    key: '_processFilter',
    value: function _processFilter(filter) {
      if (filter === undefined) {
        return false;
      }

      if (typeof filter === 'function') {
        return filter;
      } else if (typeof filter === 'string') {
        return function (assetName) {
          return assetName.match(new RegExp(filter));
        };
      }

      throw new Error('Unexpected \'filter\' parameter value is provided. Expected function, regex string or undefined.');
    }

    /**
     * Generate a new regexp string using provided injector value
     *
     * @param {string?} injectorName
     * @return {string}
     * @private
     */

  }, {
    key: '_processInjector',
    value: function _processInjector(injectorName) {
      // TODO add logic to provide custom token
      return '((<!-- *injector:' + (injectorName || 'js') + ' *-->)([\\s\\S]*?)(<!-- *endinjector *-->))';
    }

    /**
     * Process sort option to generate a sorting function for output assets
     *
     * @param {string[]|function?} sort
     * @return {function}
     * @private
     */

  }, {
    key: '_processSort',
    value: function _processSort(sort) {
      if (sort === undefined) {
        return function (entrypoints) {
          return entrypoints;
        };
      }

      if (typeof sort === 'function') {
        return sort;
      }

      if (Array.isArray(sort)) {
        return _processSortArray(sort.slice());
      }

      throw new Error('Unexpected \'sort\' parameter value is provided. Expected function, array or undefined.');

      function _processSortArray(sort) {
        // For an empty sort array setting the default `ascending` behavior
        if (sort.length === 0) {
          sort.push('+');
        }

        if (sort.length === 1) {
          if (['-', '+'].indexOf(sort[0]) !== -1) {
            var direction = parseInt(sort[0] + '1');
            return function (entrypoints) {
              return entrypoints.sort(function (e1, e2) {
                return e1.name > e2.name ? direction : -1 * direction;
              });
            };
          }
        }

        if (sort.indexOf('-') === -1 && sort.indexOf('+') === -1) {
          sort.push('+');
        }

        return _processMultipleValuesSort(sort);

        function _processMultipleValuesSort(sort) {
          _validate(sort);

          return function (entrypoints) {
            var explicitlyDefinedEntryPoints = [];
            var entryPointsHash = entrypoints.reduce(function (o, e, i) {
              o[e.name] = i;
              return o;
            }, {});
            var sortedEntryPoints = [];
            var reverseEnabled = false;

            // Always make asc/desc sort logic to appear at the end of definition
            if (['-', '+'].indexOf(sort[0]) !== -1) {
              sort[0] = sort[0] === '-' ? '+' : '-';
              sort.reverse();
              reverseEnabled = true;
            }

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = sort[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var s = _step.value;

                if (['-', '+'].indexOf(s) === -1) {
                  if (!entryPointsHash.hasOwnProperty(s)) {
                    throw new Error('Non-existing entry point "' + s + '" is provided in \'sort\' parameter value. Unable to continue processing.');
                  }

                  explicitlyDefinedEntryPoints.push(entryPointsHash[s]);
                } else {
                  (function () {
                    var direction = parseInt(s + '1');
                    sortedEntryPoints = Object.keys(entryPointsHash).filter(function (ep) {
                      return sort.indexOf(ep) === -1;
                    }).sort(function (e1, e2) {
                      return e1 > e2 ? direction : -1 * direction;
                    }).map(function (ep) {
                      return entryPointsHash[ep];
                    });
                  })();
                }
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }

            return (reverseEnabled ? [].concat(explicitlyDefinedEntryPoints, _toConsumableArray(sortedEntryPoints)).reverse() : [].concat(explicitlyDefinedEntryPoints, _toConsumableArray(sortedEntryPoints))).map(function (i) {
              return entrypoints[i];
            });
          };

          /**
           * Validate input sorting array
           *
           * @param {string[]} sort
           * @private
           */
          function _validate(sort) {
            // Generate a map of provided properties and number of their usages
            var validationMap = sort.reduce(function (o, e) {
              if (!o.hasOwnProperty(e)) {
                o[e] = 0;
              }
              o[e]++;
              return o;
            }, {});

            if (validationMap.hasOwnProperty('-') && validationMap['-'] >= 1 && validationMap.hasOwnProperty('+') && validationMap['+'] >= 1) {
              throw new Error('Wrong \'sort\' parameter value is provided. Ascending and Descending sorting rules can\'t be used within a single sorting definition.');
            }
            if (validationMap.hasOwnProperty('-') && [0, sort.length - 1].indexOf(sort.indexOf('-')) === -1 || validationMap.hasOwnProperty('+') && [0, sort.length - 1].indexOf(sort.indexOf('+')) === -1) {
              throw new Error('Wrong \'sort\' parameter value is provided. Ascending and Descending sorting rules can be used only either in the beginning of sorting configuration or in it\'s end.');
            }
            if (validationMap.hasOwnProperty('-') && validationMap['-'] > 1) {
              throw new Error('Wrong \'sort\' parameter value is provided. Descending sorting rule can\'t be used more than once.');
            }
            if (validationMap.hasOwnProperty('+') && validationMap['+'] > 1) {
              throw new Error('Wrong \'sort\' parameter value is provided. Ascending sorting rule can\'t be used more than once.');
            }

            if (validationMap.hasOwnProperty('')) {
              throw new Error('Wrong \'sort\' parameter value is provided. Sorting rules can\'t contain empty strings.');
            }
          }
        }
      }
    }

    /**
     * Generate a template function for an asset row
     *
     * @param {function?} template
     * @private
     */

  }, {
    key: '_processTemplate',
    value: function _processTemplate(template) {
      if (template === undefined) {
        return function (assetName) {
          return assetName;
        };
      }

      if (typeof template === 'function') {
        return template;
      } else {
        throw new Error('Unexpected \'template\' parameter value is provided. Expected function or undefined.');
      }
    }
  }]);

  return ConfigurationProcessor;
}();

ConfigurationProcessor['default'] = ConfigurationProcessor;
module.exports = ConfigurationProcessor;