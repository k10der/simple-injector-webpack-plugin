'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');
var path = require('path');

var async = require('async');
var fileExists = require('file-exists');

var SimpleInjectorWebpackPlugin = function () {
  function SimpleInjectorWebpackPlugin(parameters) {
    _classCallCheck(this, SimpleInjectorWebpackPlugin);

    this._parameters = [];

    if (Array.isArray(parameters)) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = parameters[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var o = _step.value;

          this._processParameters(o);
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
    } else if ((typeof parameters === 'undefined' ? 'undefined' : _typeof(parameters)) === 'object') {
      this._processParameters(parameters);
    } else {
      throw new Error('No or wrong configuration provided');
    }
  }

  _createClass(SimpleInjectorWebpackPlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this = this;

      compiler.plugin('emit', function (compilation, cb) {
        var outputs = {};
        for (var a in compilation.assets) {
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = _this._parameters[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var p = _step2.value;

              if (!outputs.hasOwnProperty(p.file)) {
                outputs[p.file] = {
                  eol: p.eol,
                  re: p.re,
                  strings: []
                };
              }

              if (p.filter(a)) {
                outputs[p.file].strings.push(p.template(a));
              }
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
              }
            } finally {
              if (_didIteratorError2) {
                throw _iteratorError2;
              }
            }
          }
        }

        async.eachOf(outputs, function (data, path, cb) {
          fs.readFile(path, 'utf-8', function (err, fileContent) {
            if (err) {
              return cb(err);
            }
            var match = new RegExp(data.re, 'g').exec(fileContent);
            var replacement = '' + match[2] + data.eol + data.strings.join(data.eol) + data.eol + match[4];
            var newFileContent = fileContent.replace(match[0], replacement);

            fs.writeFile(path, newFileContent, cb);
          });
        }, cb);
      });
    }
  }, {
    key: '_processParameters',
    value: function _processParameters(parameters) {
      var parameter = {};

      parameter.eol = ['win', 'windows'].indexOf(parameters.eol) !== -1 ? '\r\n' : '\n';

      if (!parameters.file) {
        throw new Error('Required \'file\' property is missing on parameters object');
      } else {
        var filePaths = [parameters.file, path.join(process.cwd(), parameters.file)];

        if (fileExists.sync(filePaths[0])) {
          parameter.file = filePaths[0];
        } else if (fileExists.sync(filePaths[1])) {
          parameter.file = filePaths[1];
        } else {
          throw new Error('Couldn\'t find provided file path (checked in "' + filePaths.join('", "') + '")');
        }
      }

      // TODO provide custom token options
      parameter.re = '((<!-- *injector:' + (parameters.injectorName || 'js') + ' *-->)([\\s\\S]*?)(<!-- *endinjector *-->))';

      if (typeof parameters.filter === 'function') {
        parameter.filter = parameters.filter;
      } else {
        parameter.filter = function () {
          return true;
        };
      }

      if (typeof parameters.template === 'function') {
        parameter.template = parameters.template;
      } else {
        parameter.template = function (assetName) {
          return assetName;
        };
      }

      this._parameters.push(parameter);
    }
  }]);

  return SimpleInjectorWebpackPlugin;
}();

SimpleInjectorWebpackPlugin['default'] = SimpleInjectorWebpackPlugin;
module.exports = SimpleInjectorWebpackPlugin;