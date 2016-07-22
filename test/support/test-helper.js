'use strict';

// test env configuration
require('dotenv').config({path: `${__dirname}/../../config/test.env`});

// global includes
global.expect = require('chai').expect;
global.Q = require('q');

// helper methods
module.exports.minutesFromNow = (mins) => {
  return new Date((new Date()).getTime() + mins * 60000);
}
module.exports.readTestFile = (name) => {
  return require('fs').createReadStream(`${__dirname}/${name}`);
}
