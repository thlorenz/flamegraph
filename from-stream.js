'use strict';

var flamegraph = require('./');
var through = require('through2');
var concatStream = require('concat-stream');

// Kept here and isn't referenced by index.js in order to keep bundle small when used in the browser
// assuming we won't need streaming in the browser anyways

module.exports = 

/**
 * Converts a stream of call graph lines into an svg document.
 * Not truly streaming, concats all lines before processing.
 *
 * **Example**:
 *
 * ```js
 * var fromStream = require('flamegraph/from-stream');
 * fromStream(process.stdin, opts).pipe(process.stdout);
 * ```
 *
 * @name flamegraph::fromStream
 * @function
 * @param {ReadableStream} stream that will emit the call graph lines to be parsed
 * @param {Object} opts same as `flamegraph` 
 * @return {ReadableStream} stream that emits the lines of generated svg
 */
function fromStream(stream, opts) {
  opts = opts || {};
  var out = through();

  function ondata(res) {
    try { 
      var svg = flamegraph(res.toString().split('\n'), opts);
      out.write(svg);
    } catch (err) {
      out.emit('error', err);
    }
  }

  // Once memory becomes an issue we need to make this truly streaming
  stream.pipe(concatStream(ondata));
  return out;
}

