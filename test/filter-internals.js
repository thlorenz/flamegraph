'use strict';

var test = require('tape')
  , fs = require('fs')
  , filter = require('../lib/filter-internals')

test('\nfiltering internals from folded instruments graph', function (t) {
  var folded = fs.readFileSync(__dirname + '/fixtures/instruments.folded', 'utf8')
  var arr = folded.split('\n')
  var filtered = filter(arr)

  t.equal(arr.length, filtered.length, 'removes no collapsed lines')
  t.notEqual(arr[2].length, filtered[2].length, 'removes node::Start from 3rd line')

  t.end()
})
