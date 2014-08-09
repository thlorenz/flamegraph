'use strict';

var split = require('split2')

var instruments = require('./linecollpase-instruments')

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
 * Collapses a callgraph inside a given file line by line.
 * 
 * @name flamegraph::stackCollapse
 * @function
 * @param {string} type the type of input to collapse
 * @return {TransformStream} stream into which to pipe the lines of the `.csv` file 
 */
function stackcollapse(type) {
  var stack = []
  var collapseLine = collapser(type);

  function processLine(line) {
    var collapsed = collapseLine(stack, line);
    return collapsed;
  }

  return split(processLine);
}

/**
 * Collapses a callgraph inside a given lines array line by line.
 * 
 * @name flamegraph::stackCollapse.array
 * @function
 * @param {string} type the type of input to collapse
 * @param {Array.<string>} arr lines to collapse
 * @return {Array.<string>} array of collapsed lines
 */
exports.array = function (type, arr) {
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
