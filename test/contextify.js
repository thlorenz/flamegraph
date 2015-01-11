'use strict';
/*jshint asi: true */

var test = require('tape')
  , contextify = require('../lib/contextify')
  , defaultOpts = require('../lib/default-opts')

var parsed = { 
  nodes:
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
    ignored: 0 };

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

test('\ncontextifying parsed stack with default options', function (t) {
  var context = contextify(parsed, defaultOpts);
  // hack to work around the fact that `toLocaleString` works slightly different in the browser than in node
  // i.e. `toLocaleString(1602) is '1,602' in the browser and `1602` in node
  context.nodes.forEach(function (x) { x.samples = x.samples.replace(/(\d),(\d)/, '$1$2') })

  t.deepEqual(
      context
    , { fonttype: 'Verdana',
        fontsize: 12,
        imagewidth: 1200,
        frameheight: 16,
        fontwidth: 0.59,
        minwidth: 0.1,
        countname: 'samples',
        colors: 'hot',
        bgcolor1: '#eeeeee',
        bgcolor2: '#eeeeb0',
        timemax: Infinity,
        factor: 1,
        hash: true,
        titletext: 'Flame Graph',
        nametype: 'Function:',
        palette: false,
        palette_map: {},
        pal_file: 'palette.map',
        imageheight: 194,
        xpad: 10,
        titleX: 600,
        detailsY: 186,
        internals: false,
        optimizationinfo: false,
        nodes:
        [ { name: 'node::AsyncWrap::MakeCallback(v8::Handle&lt;v8::Function&gt;, int, v8::Handle&lt;v8::Value&gt;*)',
            samples: '(1602 samples), 12.2%)',
            rect_x: 1046.1,
            rect_y: 33,
            rect_w: 143.9000000000001,
            rect_h: 15,
            rect_fill: 'rgb(242, 212, 41)',
            showText: true,
            text: 'node::AsyncWrap::M..',
            text_x: 1049.1,
            text_y: 43.5 },
          { name: 'node::StreamWrapCallbacks::DoRead(uv_stream_s*, long, uv_buf_t const*, uv_handle_type)',
            samples: '(3205 samples), 24.4%)',
            rect_x: 902.1,
            rect_y: 49,
            rect_w: 287.9,
            rect_h: 15,
            rect_fill: 'rgb(248, 212, 48)',
            showText: true,
            text: 'node::StreamWrapCallbacks::DoRead(uv_s..',
            text_x: 905.1,
            text_y: 59.5 },
          { name: 'uv__stream_io',
            samples: '(4813 samples), 36.6%)',
            rect_x: 757.6,
            rect_y: 65,
            rect_w: 432.4,
            rect_h: 15,
            rect_fill: 'rgb(239, 98, 37)',
            showText: true,
            text: 'uv__stream_io',
            text_x: 760.6,
            text_y: 75.5 },
          { name: 'uv__io_poll',
            samples: '(6473 samples), 49.3%)',
            rect_x: 608.5,
            rect_y: 81,
            rect_w: 581.5,
            rect_h: 15,
            rect_fill: 'rgb(229, 98, 27)',
            showText: true,
            text: 'uv__io_poll',
            text_x: 611.5,
            text_y: 91.5 },
          { name: 'uv_run',
            samples: '(8136 samples), 61.9%)',
            rect_x: 459.1,
            rect_y: 97,
            rect_w: 730.9,
            rect_h: 15,
            rect_fill: 'rgb(243, 98, 42)',
            showText: true,
            text: 'uv_run',
            text_x: 462.1,
            text_y: 107.5 },
          { name: 'node::Start(int, char**)',
            samples: '(9799 samples), 74.6%)',
            rect_x: 309.7,
            rect_y: 113,
            rect_w: 880.3,
            rect_h: 15,
            rect_fill: 'rgb(239, 212, 38)',
            showText: true,
            text: 'node::Start(int, char**)',
            text_x: 312.7,
            text_y: 123.5 },
          { name: 'start',
            samples: '(11462 samples), 87.3%)',
            rect_x: 160.3,
            rect_y: 129,
            rect_w: 1029.7,
            rect_h: 15,
            rect_fill: 'rgb(239, 156, 38)',
            showText: true,
            text: 'start',
            text_x: 163.3,
            text_y: 139.5 },
          { name: '&lt;Unnamed Thread&gt; 0x155005',
            samples: '(13135 samples), 100%)',
            rect_x: 10,
            rect_y: 145,
            rect_w: 1180,
            rect_h: 15,
            rect_fill: 'rgb(245, 183, 44)',
            showText: true,
            text: '&lt;Unnamed Thread&gt; 0x155005',
            text_x: 13,
            text_y: 155.5 } ] } 
    , 'generates correct context'
  )
  t.end()
  
})

