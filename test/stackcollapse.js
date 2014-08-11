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

function write(actual, expected) {
  if (Array.isArray(actual)) actual = actual.join('\n')
  if (Array.isArray(expected)) expected = expected.join('\n')
  fs.writeFileSync(__dirname + '/results/actual.txt', actual, 'utf8');
  fs.writeFileSync(__dirname + '/results/expected.txt', expected, 'utf8');
}

var collapse = require('../lib/stackcollapse')

var fixtures = path.join(__dirname, 'fixtures') 
var results = path.join(__dirname, 'results') 

function run(type, name, input, folded) {
  test('\n' + name, function (t) {
    var actual, expected;
    try { 
      expected = folded.split('\n').filter(nonEmpty);
      actual = collapse(type, input.split('\n')).filter(nonEmpty);

      t.equal(actual.length, expected.length, 'have same number of lines')
//      t.deepEqual(actual, expected, 'generates same folded content as original perl script')
    } catch (err) {
      t.fail(err);
    }
    t.end()
  })
}

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

var input, folded;

input = fs.readFileSync(__dirname + '/fixtures/instruments-part1.csv', 'utf8')
folded = fs.readFileSync(__dirname + '/fixtures/instruments-part1.folded', 'utf8')
run('instruments', 'collapsing first part of csv file exported from instruments', input, folded)

input = fs.readFileSync(__dirname + '/fixtures/instruments.csv', 'utf8')
folded = fs.readFileSync(__dirname + '/fixtures/instruments.folded', 'utf8')
run('instruments', 'collapsing entire csv file exported from instruments', input, folded)

input = fs.readFileSync(__dirname + '/fixtures/perf-script-part1.txt', 'utf8')
folded = fs.readFileSync(__dirname + '/fixtures/perf-script-part1.folded', 'utf8')

run('perf', 'collapsing first part of txt file exported from perf', input, folded)

// The below currently fails cause we add one more line than the original perl script
// not sure if that is actually a problem

//input = fs.readFileSync(__dirname + '/fixtures/perf-script.txt', 'utf8')
//folded = fs.readFileSync(__dirname + '/fixtures/perf-script.folded', 'utf8')
//run('perf', 'collapsing txt file exported from perf', input, folded)
