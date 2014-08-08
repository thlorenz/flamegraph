'use strict';
/*jshint asi: true */

var test = require('tape')
  , path = require('path')
  , fs = require('fs')
  , applyTransform = require('apply-transform')

var collapseInstruments = require('../lib/stackcollapse-instruments')

var fixtures = path.join(__dirname, 'fixtures') 
var results = path.join(__dirname, 'results') 

function run(collapse, name, csv, folded) {
  test('\n' + name, function (t) {
    applyTransform(collapse(), csv, function (err, actual) {
      if (err) { t.fail(err); return t.end(); }
      
      t.equal(actual.length, folded.length, 'have same number of lines')
      t.deepEqual(actual, folded, 'generates same folded content as original perl script')
      t.end()
    })
  })
}

// need to make this statically analyzable for brfs
var csvPart1 = fs.readFileSync(__dirname + '/fixtures/instruments-part1.csv', 'utf8')
var foldedPart1 = fs.readFileSync(__dirname + '/fixtures/instruments-part1.folded', 'utf8')

run(collapseInstruments, 'collapsing first part of csv file exported from instruments', csvPart1, foldedPart1)

// slow due to apply transform spitting out each char separately, so only run with travis
if (process.env.TRAVIS) {
  var csv = fs.readFileSync(__dirname + '/fixtures/instruments.csv', 'utf8')
  var folded = fs.readFileSync(__dirname + '/fixtures/instruments.folded', 'utf8')
  run(collapseInstruments, 'collapsing entire csv file exported from instruments', csv, folded)
}
