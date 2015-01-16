'use strict';

var instrumentsRegex = /^Running Time, *Self,.*, *Symbol Name/;

// node 22610 13108.211038: cpu-clock:u: 
var perfRegex = /^\w+ +\d+ +\d+\.\d+:/;

// cpuprofile is JSON
var cpuprofileRegex = /^\s*?{/;

function firstLine(arr) {
  for (var i = 0; i < arr.length; i++) {
    // ignore empty lines and comments starting with #
    if (arr[i] && arr[i].length && arr[i][0] !== '#') return arr[i];
  }
}

var go = module.exports = function detectInputType(arr) {
  var first = firstLine(arr);
  if (!first) return null;

  if (instrumentsRegex.test(first)) return 'instruments';
  if (perfRegex.test(first)) return 'perf';
  if (cpuprofileRegex.test(first)) return 'cpuprofile'; 

  return null;
}
