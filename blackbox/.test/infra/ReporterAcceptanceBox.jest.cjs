'use strict';
/**
 * .what = the jest entry for ReporterAcceptanceBox
 * .why = jest loads a reporter with a bare require, after it has already unregistered the ts
 *   loader it used for the config. so this entry registers esbuild-register for the one load
 *   of the reporter's ts graph, then hands jest the class
 */
const { register } = require('esbuild-register/dist/node');

const { unregister } = register({ target: 'node18' });
const { ReporterAcceptanceBox } = require('./ReporterAcceptanceBox.ts');
unregister();

module.exports = ReporterAcceptanceBox;
