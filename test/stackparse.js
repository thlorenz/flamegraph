'use strict';
/*jshint asi: true */

var test = require('tape')
  , parse = require('../lib/stackparse')

var lines = [
    '<Unnamed Thread> 0x155005 1673'
  , '<Unnamed Thread> 0x155005;start 1663'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**) 1663'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run 1663'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run;uv__io_poll 1660'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run;uv__io_poll;uv__stream_io 1608'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run;uv__io_poll;uv__stream_io;node::StreamWrapCallbacks::DoRead(uv_stream_s*, long, uv_buf_t const*, uv_handle_type) 1603'
  , '<Unnamed Thread> 0x155005;start;node::Start(int, char**);uv_run;uv__io_poll;uv__stream_io;node::StreamWrapCallbacks::DoRead(uv_stream_s*, long, uv_buf_t const*, uv_handle_type);node::AsyncWrap::MakeCallback(v8::Handle<v8::Function>, int, v8::Handle<v8::Value>*) 1602'
];

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

test('\ngiven an array of collapsed lines representing the call graph', function (t) {
  var parsed = parse(lines);

  t.deepEqual(
      parsed
    , { nodes:
        { 'node::AsyncWrap::MakeCallback(v8::Handle<v8::Function>, int, v8::Handle<v8::Value>*);7;13135':
            { func: 'node::AsyncWrap::MakeCallback(v8::Handle<v8::Function>, int, v8::Handle<v8::Value>*)',
              depth: 7,
              etime: 13135,
              stime: 11533 },
          'node::StreamWrapCallbacks::DoRead(uv_stream_s*, long, uv_buf_t const*, uv_handle_type);6;13135':
            { func: 'node::StreamWrapCallbacks::DoRead(uv_stream_s*, long, uv_buf_t const*, uv_handle_type)',
              depth: 6,
              etime: 13135,
              stime: 9930 },
          'uv__stream_io;5;13135':
            { func: 'uv__stream_io',
              depth: 5,
              etime: 13135,
              stime: 8322 },
          'uv__io_poll;4;13135':
            { func: 'uv__io_poll',
              depth: 4,
              etime: 13135,
              stime: 6662 },
          'uv_run;3;13135':
            { func: 'uv_run',
              depth: 3,
              etime: 13135,
              stime: 4999 },
          'node::Start(int, char**);2;13135':
            { func: 'node::Start(int, char**)',
              depth: 2,
              etime: 13135,
              stime: 3336 },
          'start;1;13135':
            { func: 'start',
              depth: 1,
              etime: 13135,
              stime: 1673 },
          '<Unnamed Thread> 0x155005;0;13135':
            { func: '<Unnamed Thread> 0x155005',
              depth: 0,
              etime: 13135,
              stime: 0 } },
        time: 13135,
        ignored: 0 }
    , 'parses nodes and time correctly and ignores none'
  )
  t.end()
})
