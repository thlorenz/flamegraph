'use strict';

var instruments = require('./collapse-instruments')
  , perf = require('./collapse-perf')
  , cpuprofile = require('./collapse-cpuprofile')

function getCollapser(opts) {
  switch(opts.inputtype) {
    case 'instruments':
      return instruments(opts)
    case 'perf':
      return perf(opts)
    case 'cpuprofile':
      return cpuprofile(opts)
    default:
      throw new Error('Unknown type, cannot collapse "' + opts.inputtype + '"'); 
  }
}

exports = module.exports = 

/**
 * Collapses a callgraph inside a given lines array line by line.
 * 
 * @name flamegraph::stackCollapse.array
 * @private
 * @function
 * @param {Object} opts
 * @param {string} opts.inputtype the type of input to collapse
 * @param {Array.<string>} arr lines to collapse
 * @return {Array.<string>} array of collapsed lines
 */
function stackCollapse(opts, arr) {
  var collapser = getCollapser(opts);
  
  if (typeof collapser.collapseArray === 'function') return collapser.collapseArray(arr);

  function online (line) {
    collapser.collapseLine(line);
  }

  function nonEmpty(line) {
    return line && line.length;
  }

  arr.forEach(online);

  return collapser.collapsedLines().filter(nonEmpty);
}
