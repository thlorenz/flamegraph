'use strict';

var instrumentsRegex = /^Running Time, *Self,.*, *Symbol Name/;

function firstLine(arr) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] && arr[i].length) return arr[i];
  }
}

var go = module.exports = function (arr) {
  var first = firstLine(arr);
  if (!first) return null;

  if (instrumentsRegex.test(first)) return 'instruments';

  return null;
}
