'use strict';

function funcName(node) {
  var n = node.functionName;
  if (node.url) n += ' ' + node.url + ':' + node.lineNumber;
  return n;
}

function byFramesLexically(a, b) {
  var i = 0, framesA = a.frames, framesB = b.frames;
  while(true) {
    if (!framesA[i]) return -1;
    if (!framesB[i]) return 1;
    if (framesA[i] < framesB[i]) return -1;
    if (framesB[i] < framesA[i]) return 1;
    i++;
  }
}

function sort(functions) {
  return functions.sort(byFramesLexically);
}

function CpuProfileProcessor(cpuprofile) {
  if (!(this instanceof CpuProfileProcessor)) return new CpuProfileProcessor(cpuprofile);

  this._profile = cpuprofile;
  this._paths = [];
  this._time = 0;

  this._last = [];
  this._tmp = {};
  this._nodes = {};
}

var proto = CpuProfileProcessor.prototype;
module.exports = CpuProfileProcessor;


proto._explorePaths = function _explorePaths(node, stack) {
  stack.push(funcName(node));

  if (node.hitCount) this._paths.push({ frames: stack.slice(), hitCount: node.hitCount });

  for (var i = 0; i < node.children.length; i++)
    this._explorePaths(node.children[i], stack);

  stack.pop();
}

proto._flow = function _flow(frames) {

  var lenLast = this._last.length - 1
    , lenFrames = frames.length - 1
    , i
    , lenSame
    , k

  for(i = 0; i <= lenLast; i++) {
    if (i > lenFrames) break;
    if (this._last[i] !== frames[i]) break;
  }
  lenSame = i;

  for(i = lenLast; i >= lenSame; i--) {
    k = this._last[i] + ';' + i;
		// a unique ID is constructed from "func;depth;etime";
		// func-depth isn't unique, it may be repeated later.
    this._nodes[k + ';' + this._time] = { func: this._last[i], depth: i, etime: this._time, stime: this._tmp[k].stime }
    this._tmp[k] = null;
  }

  for(i = lenSame; i <= lenFrames; i++) {
    k = frames[i]+ ';' + i;
    this._tmp[k] = { stime: this._time };
  }
}

proto._processPath = function _processPath(path) {
  this._flow(path.frames);
  this._time += path.hitCount;
  this._last = path.frames;
}

proto._processPaths = function _processPaths() {
  sort(this._paths);
  for (var i = 0; i < this._paths.length; i++) 
    this._processPath(this._paths[i]);

  this._flow([]);
}

proto.process = function process() {
  this._explorePaths(this._profile.head, []);
  this._processPaths();
  return { nodes: this._nodes, time: this._time };
}
