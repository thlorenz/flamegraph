'use strict';

var instruments = require('./collapse-instruments')

function getCollapser(type) {
  switch(type) {
    case 'instruments':
      return instruments()
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
  var collapser = getCollapser(type);

  function online (line) {
    collapser.collapseLine(line);
  }

  function nonEmpty(line) {
    return line && line.length;
  }

  arr.forEach(online);

  return collapser.collapsedLines().filter(nonEmpty);
}
