'use strict';
/*jshint asi: true */

var test = require('tape')
  , processor = require('../lib/cpuprofile-processor')
  , fs = require('fs')

var profile = JSON.parse(fs.readFileSync(__dirname + '/fixtures/v8-profiler.cpuprofile', 'utf8'))

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

test('\ngiven an array of collapsed lines representing the call graph', function (t) {
  var parsed = processor(profile).process();

  t.deepEqual(
      parsed
    , { nodes:
        { '(program);1;2015': { func: '(program)', depth: 1, etime: 2015, stime: 0 },
          'IncomingMessage.read _http_incoming.js:93;4;2017':
            { func: 'IncomingMessage.read _http_incoming.js:93',
              depth: 4,
              etime: 2017,
              stime: 2016 },
          'resume_ _stream_readable.js:721;3;2017':
            { func: 'resume_ _stream_readable.js:721',
              depth: 3,
              etime: 2017,
              stime: 2015 },
          '(anonymous function) _stream_readable.js:715;2;2017':
            { func: '(anonymous function) _stream_readable.js:715',
              depth: 2,
              etime: 2017,
              stime: 2015 },
          'Socket.destroy net.js:484;11;2018':
            { func: 'Socket.destroy net.js:484',
              depth: 11,
              etime: 2018,
              stime: 2017 },
          'onSocketFinish net.js:194;10;2018':
            { func: 'onSocketFinish net.js:194',
              depth: 10,
              etime: 2018,
              stime: 2017 },
          'emit events.js:68;9;2018': { func: 'emit events.js:68', depth: 9, etime: 2018, stime: 2017 },
          'finishMaybe _stream_writable.js:441;8;2018':
            { func: 'finishMaybe _stream_writable.js:441',
              depth: 8,
              etime: 2018,
              stime: 2017 },
          'endWritable _stream_writable.js:454;7;2018':
            { func: 'endWritable _stream_writable.js:454',
              depth: 7,
              etime: 2018,
              stime: 2017 },
          'Writable.end _stream_writable.js:399;6;2018':
            { func: 'Writable.end _stream_writable.js:399',
              depth: 6,
              etime: 2018,
              stime: 2017 },
          'Socket.end net.js:391;5;2018':
            { func: 'Socket.end net.js:391',
              depth: 5,
              etime: 2018,
              stime: 2017 },
          'socketOnEnd _http_server.js:382;4;2018':
            { func: 'socketOnEnd _http_server.js:382',
              depth: 4,
              etime: 2018,
              stime: 2017 },
          'emit events.js:68;3;2018': { func: 'emit events.js:68', depth: 3, etime: 2018, stime: 2017 },
          '(anonymous function) _stream_readable.js:902;2;2018':
            { func: '(anonymous function) _stream_readable.js:902',
              depth: 2,
              etime: 2018,
              stime: 2017 },
          '_tickCallback node.js:359;1;2018':
            { func: '_tickCallback node.js:359',
              depth: 1,
              etime: 2018,
              stime: 2015 },
          'exports._unrefActive timers.js:517;5;2019':
            { func: 'exports._unrefActive timers.js:517',
              depth: 5,
              etime: 2019,
              stime: 2018 },
          'Socket.setTimeout net.js:307;4;2019':
            { func: 'Socket.setTimeout net.js:307',
              depth: 4,
              etime: 2019,
              stime: 2018 },
          'connectionListener _http_server.js:271;3;2019':
            { func: 'connectionListener _http_server.js:271',
              depth: 3,
              etime: 2019,
              stime: 2018 },
          'emit events.js:68;2;2019': { func: 'emit events.js:68', depth: 2, etime: 2019, stime: 2018 },
          'onconnection net.js:1272;1;2019':
            { func: 'onconnection net.js:1272',
              depth: 1,
              etime: 2019,
              stime: 2018 },
          'OutgoingMessage _http_outgoing.js:64;10;2020':
            { func: 'OutgoingMessage _http_outgoing.js:64',
              depth: 10,
              etime: 2020,
              stime: 2019 },
          'ServerResponse _http_server.js:101;9;2020':
            { func: 'ServerResponse _http_server.js:101',
              depth: 9,
              etime: 2020,
              stime: 2019 },
          'OutgoingMessage._send _http_outgoing.js:121;12;2021':
            { func: 'OutgoingMessage._send _http_outgoing.js:121',
              depth: 12,
              etime: 2021,
              stime: 2020 },
          'Buffer.byteLength buffer.js:198;13;2022':
            { func: 'Buffer.byteLength buffer.js:198',
              depth: 13,
              etime: 2022,
              stime: 2021 },
          'OutgoingMessage.write _http_outgoing.js:405;12;2022':
            { func: 'OutgoingMessage.write _http_outgoing.js:405',
              depth: 12,
              etime: 2022,
              stime: 2021 },
          'ServerResponse.writeHead _http_server.js:175;13;2023':
            { func: 'ServerResponse.writeHead _http_server.js:175',
              depth: 13,
              etime: 2023,
              stime: 2022 },
          'ServerResponse._implicitHeader _http_server.js:171;12;2023':
            { func: 'ServerResponse._implicitHeader _http_server.js:171',
              depth: 12,
              etime: 2023,
              stime: 2022 },
          'OutgoingMessage.end _http_outgoing.js:498;11;2023':
            { func: 'OutgoingMessage.end _http_outgoing.js:498',
              depth: 11,
              etime: 2023,
              stime: 2020 },
          'toFib /Volumes/d/dev/projects/v8-profiler/examples/faas.js:66;12;2025':
            { func: 'toFib /Volumes/d/dev/projects/v8-profiler/examples/faas.js:66',
              depth: 12,
              etime: 2025,
              stime: 2024 },
          'cal_arrayConcat /Volumes/d/dev/projects/v8-profiler/examples/faas.js:64;11;2025':
            { func: 'cal_arrayConcat /Volumes/d/dev/projects/v8-profiler/examples/faas.js:64',
              depth: 11,
              etime: 2025,
              stime: 2023 },
          'profiler.startProfiling /Volumes/d/dev/projects/v8-profiler/v8-profiler.js:119;11;2026':
            { func: 'profiler.startProfiling /Volumes/d/dev/projects/v8-profiler/v8-profiler.js:119',
              depth: 11,
              etime: 2026,
              stime: 2025 },
          'onRequest /Volumes/d/dev/projects/v8-profiler/examples/faas.js:28;10;2026':
            { func: 'onRequest /Volumes/d/dev/projects/v8-profiler/examples/faas.js:28',
              depth: 10,
              etime: 2026,
              stime: 2020 },
          'emit events.js:68;9;2026': { func: 'emit events.js:68', depth: 9, etime: 2026, stime: 2020 },
          'parserOnIncoming _http_server.js:420;8;2026':
            { func: 'parserOnIncoming _http_server.js:420',
              depth: 8,
              etime: 2026,
              stime: 2019 },
          'parserOnHeadersComplete _http_common.js:63;7;2026':
            { func: 'parserOnHeadersComplete _http_common.js:63',
              depth: 7,
              etime: 2026,
              stime: 2019 },
          'readableAddChunk _stream_readable.js:138;9;2027':
            { func: 'readableAddChunk _stream_readable.js:138',
              depth: 9,
              etime: 2027,
              stime: 2026 },
          'Readable.push _stream_readable.js:114;8;2027':
            { func: 'Readable.push _stream_readable.js:114',
              depth: 8,
              etime: 2027,
              stime: 2026 },
          'parserOnMessageComplete _http_common.js:138;7;2027':
            { func: 'parserOnMessageComplete _http_common.js:138',
              depth: 7,
              etime: 2027,
              stime: 2026 },
          'execute;6;2027': { func: 'execute', depth: 6, etime: 2027, stime: 2019 },
          'socketOnData _http_server.js:340;5;2027':
            { func: 'socketOnData _http_server.js:340',
              depth: 5,
              etime: 2027,
              stime: 2019 },
          'emit events.js:68;4;2027': { func: 'emit events.js:68', depth: 4, etime: 2027, stime: 2019 },
          'readableAddChunk _stream_readable.js:138;3;2027':
            { func: 'readableAddChunk _stream_readable.js:138',
              depth: 3,
              etime: 2027,
              stime: 2019 },
          'Readable.push _stream_readable.js:114;2;2027':
            { func: 'Readable.push _stream_readable.js:114',
              depth: 2,
              etime: 2027,
              stime: 2019 },
          'onread net.js:492;1;2027': { func: 'onread net.js:492', depth: 1, etime: 2027, stime: 2019 },
          '(root);0;2027': { func: '(root)', depth: 0, etime: 2027, stime: 0 } },
        time: 2027 } 
    , 'parses nodes and time correctly and ignores none'
  )
  t.end()
})
