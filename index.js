'use strict';

var through = require('through2');

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

exports = module.exports = 

/**
 * Converts a stream of call graph lines into an svg document.
 * 
 * @name flamegraph
 * @function
 * @param {ReadableStream} stream that will emit the call graph lines to be parsed
 * @param {string} inputType the type of callgraph `instruments | `
 * @param {Object} opts objects that affect the visualization
 */
function flamegraph(stream, inputType, opts) {
  var collapse;  

  switch(inputType) {
    case 'instruments':
      collapse = exports.stackCollapseInstruments
      break;
    default:
      throw new Error('Unsupported input type ' + inputType);
  }    

  var chunks = [];

  function onread (chunk, enc, cb) { 
    chunks.push(chunk);
    cb();
  }

  function onflush(cb) {
    var lines = Buffer.concat(chunks).toString().split('\n')
      , svg;
    try {
      svg = exports.svg(lines, opts)
    } catch (err) {
      return cb(err);
    }
    this.push(svg);
    cb();
  }

  // Need to take stream as input here, I have not found a way to make this work and allow 
  // `stream.pipe(flamegraph('instruments')).pipe(stdout)` instead.
  // So a little less nice API, but at least it works
  var out = stream
    .on('error', function(err) { out.emit('error', err) })
    .pipe(collapse())
    .on('error', function(err) { out.emit('error', err) })
    .pipe(through(onread, onflush))

  return out;
}

exports.svg = require('./lib/svg');
exports.stackCollapseInstruments = require('./lib/stackcollapse-instruments')

var instream = require('fs').createReadStream(__dirname + '/test/fixtures/instruments-part1.csv');
exports(instream, 'instruments')
  .pipe(process.stdout);
