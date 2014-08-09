'use strict';
/*jshint asi: true */

var test = require('tape')
var fs = require('fs')
var detect = require('../lib/detect-inputtype')

var instruments = fs.readFileSync(__dirname + '/fixtures/instruments-part1.csv').toString().split('\n')

test('\ninput detector', function (t) {
  t.equal(detect([]), null, 'returns null for empty array')
  t.equal(detect([ 'unknown type' ]), null, 'returns null for unknown input')

  t.equal(detect(instruments), 'instruments', 'detects instruments csv')
  t.end()
})
