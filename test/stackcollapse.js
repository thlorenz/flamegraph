'use strict';
/*jshint asi: true */

var test = require('tape')
  , path = require('path')
  , fs = require('fs')

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

function nonEmpty(line) {
  return line && line.length;
}

var collapse = require('../lib/stackcollapse')

var fixtures = path.join(__dirname, 'fixtures') 
var results = path.join(__dirname, 'results') 

function run(type, name, csv, folded) {
  test('\n' + name, function (t) {
    var actual, expected;
    try { 
      expected = folded.split('\n').filter(nonEmpty);
      actual = collapse(type, csv.split('\n')).filter(nonEmpty);

      t.equal(actual.length, expected.length, 'have same number of lines')
      t.deepEqual(actual, expected, 'generates same folded content as original perl script')
    } catch (err) {
      t.fail(err);
    }
    t.end()
  })
}

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

// need to make this statically analyzable for brfs
var csvPart1 = fs.readFileSync(__dirname + '/fixtures/instruments-part1.csv', 'utf8')
var foldedPart1 = fs.readFileSync(__dirname + '/fixtures/instruments-part1.folded', 'utf8')

run('instruments', 'collapsing first part of csv file exported from instruments', csvPart1, foldedPart1)

var csv = fs.readFileSync(__dirname + '/fixtures/instruments.csv', 'utf8')
var folded = fs.readFileSync(__dirname + '/fixtures/instruments.folded', 'utf8')
run('instruments', 'collapsing entire csv file exported from instruments', csv, folded)
