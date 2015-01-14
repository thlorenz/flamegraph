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

test('\nfiltering internals with unresolved hex addresses from folded instruments graph', function (t) {
  var arr = [
      '<Unnamed Thread> 0x155005 1673'
    , '<Unnamed Thread> 0x155005;start;0x155005 1663'
    , '<Unnamed Thread> 0x155005;start;0x155005;0x155009;node::Start(int, char**) 1663'
  ]
  var filtered = filter(arr);
  t.deepEqual(
      filtered
    , [ '<Unnamed Thread> 0x155005 1673',
        '<Unnamed Thread> 0x155005;start 1663',
        '<Unnamed Thread> 0x155005;start 1663' ]
    , 'filters out lonely hex addresses'
  )
  t.end()
})
