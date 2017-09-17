'use strict';
const ConfigurationProcessor = require('./configurationProcessor');
const OutputProcessor = require('./outputProcessor');

class SimpleInjectorWebpackPlugin {
  constructor(config) {
    const configurationProcessor = new ConfigurationProcessor();
    this.outputProcessor = new OutputProcessor();
    this._configurations = [];

    if (Array.isArray(config)) {
      this._configurations = config.forEach(c => configurationProcessor.process(c));
    } else if (typeof config === 'object') {
      this._configurations.push(configurationProcessor.process(config));
    } else {
      throw new Error('No configuration or wrong configuration is provided');
    }
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, cb) => {
      this.outputProcessor.process(this._configurations, compilation, cb);
    });
  }
}

SimpleInjectorWebpackPlugin['default'] = SimpleInjectorWebpackPlugin;
module.exports = SimpleInjectorWebpackPlugin;
