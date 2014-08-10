'use strict';

var instruments = require('./linecollapse-instruments')

function collapser(type) {
  switch(type) {
    case 'instruments':
      return instruments
    default:
      throw new Error('Unknown type, cannot collapse ' + type); 
  }
}

exports = module.exports = 

/**
 * Collapses a callgraph inside a given lines array line by line.
 * 
 * @name flamegraph::stackCollapse.array
 * @private
 * @function
 * @param {string} type the type of input to collapse
 * @param {Array.<string>} arr lines to collapse
 * @return {Array.<string>} array of collapsed lines
 */
function stackCollapse(type, arr) {
  var stack = []

  var collapseLine = collapser(type);

  function online (line) {
    var collapsed = collapseLine(stack, line);
    return collapsed ? collapsed.trim('\n') : null;
  }

  function nonEmpty(line) {
    return line && line.length;
  }

  return arr.map(online).filter(nonEmpty);
}

