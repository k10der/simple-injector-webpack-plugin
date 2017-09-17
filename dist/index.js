'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ConfigurationProcessor = require('./configurationProcessor');
var OutputProcessor = require('./outputProcessor');

var SimpleInjectorWebpackPlugin = function () {
  function SimpleInjectorWebpackPlugin(config) {
    _classCallCheck(this, SimpleInjectorWebpackPlugin);

    var configurationProcessor = new ConfigurationProcessor();
    this.outputProcessor = new OutputProcessor();
    this._configurations = [];

    if (Array.isArray(config)) {
      this._configurations = config.forEach(function (c) {
        return configurationProcessor.process(c);
      });
    } else if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
      this._configurations.push(configurationProcessor.process(config));
    } else {
      throw new Error('No configuration or wrong configuration is provided');
    }
  }

  _createClass(SimpleInjectorWebpackPlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this = this;

      compiler.plugin('emit', function (compilation, cb) {
        _this.outputProcessor.process(_this._configurations, compilation, cb);
      });
    }
  }]);

  return SimpleInjectorWebpackPlugin;
}();

SimpleInjectorWebpackPlugin['default'] = SimpleInjectorWebpackPlugin;
module.exports = SimpleInjectorWebpackPlugin;