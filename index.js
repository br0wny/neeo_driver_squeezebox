'use strict';

// Usings the @neeo/cli, this is now deprecated.
// const {startNeeoDriver} = require('./neeoDriver/neeoDriver');

// startNeeoDriver();

const {squeezeDevice} = require('./lib/squeeze/squeezeDevice');

module.exports = {
    devices: [squeezeDevice]
}