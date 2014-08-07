//'use strict';

var regexp = /(\d+)\.\d+ms[^,]+,\d+,\s+,(\s*)(.+)/;

function write(x) {
  process.stdout.write(x);
}

function writeFrame(f) {
  write(f);
  write(';');
}

function writeLine(stack, line) {
  var matches = line.match(regexp);

  var ms = matches[1];
  var depth = matches[2].length;
  var fn = matches[3];

  stack[depth] = fn;
  stack.forEach(writeFrame);

  write(fn + ' ' + ms + '\n');
}


// Test
if (!module.parent && typeof window === 'undefined') {
  var csv = [
      '1673.0ms   91.6%,0, ,<Unnamed Thread> 0x155005'
    , '1663.0ms   91.0%,0, , start'
    , '1663.0ms   91.0%,0, ,  node::Start(int, char**)'
    , '1663.0ms   91.0%,0, ,   uv_run'
    , '1660.0ms   90.9%,0, ,    uv__io_poll'
    , '1608.0ms   88.0%,0, ,     uv__stream_io'
  ];
  var collapsed = [
      '<Unnamed Thread> 0x155005 1673'
    , '<Unnamed Thread> 0x155005;start 1663'
    , '<Unnamed Thread> 0x155005;start;node::Start(int, char**) 1663'
    , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run 1663'
    , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run;uv__io_poll 1660'
    , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run;uv__io_poll;uv__stream_io 1608'
  ];

  var stack = [];
  var line = csv[0];


  function processLine(line) {
    writeLine(stack, line);
  }

  csv.forEach(processLine);
}

