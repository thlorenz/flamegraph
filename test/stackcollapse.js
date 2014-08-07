'use strict';
/*jshint asi: true */

var test = require('tape')
  , path = require('path')
  , fs = require('fs')

var collapseInstruments = require('../lib/stackcollapse-instruments')

var fixtures = path.join(__dirname, 'fixtures') 
var results = path.join(__dirname, 'results') 

function run(collapse, name, inFilename) {
  test('\n' + name, function (t) {
    var foldedFilename = inFilename.slice(0, -path.extname(inFilename).length) + '.folded';
    var expectedFile = path.join(fixtures, foldedFilename);
    var resultFile = path.join(results, foldedFilename);

    fs.createReadStream(path.join(fixtures, inFilename))
      .on('error', t.ifError)
      .pipe(collapse())
      .on('error', t.ifError)
      .pipe(fs.createWriteStream(resultFile))
      .on('finish', onend)

    function onend() {
      var expected = fs.readFileSync(expectedFile, 'utf8').split('\n')
      var actual = fs.readFileSync(resultFile, 'utf8').split('\n')

      t.equal(actual.length, expected.length, 'have same number of lines')
      t.deepEqual(actual, expected, 'generates same folded content as original perl script')
      t.end()
    }
  })
}

run(collapseInstruments, 'collapsing first part of csv file exported from instruments', 'instruments-part1.csv')
run(collapseInstruments, 'collapsing entire csv file exported from instruments', 'instruments.csv')
