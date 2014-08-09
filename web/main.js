'use strict';
var flamegraph = require('flamegraph');
var flamegraphEl = document.getElementById('flamegraph');

function hookHoverMethods() {
  var details = document.getElementById("details").firstChild;
  window.s = function s(info) { details.nodeValue = "Function: " + info; }
  window.c = function c() { details.nodeValue = ' '; }
}

function readFile(file, cb) {
  var fileReader = new FileReader();
  fileReader.readAsText(file, 'utf-8');
  fileReader.onload = function onload(err) {
    cb(err, fileReader.result);
  }
}

function onFile(e) {
  var file = e.target.files[0];
  if (!file) return;
  readFile(file, function (e) {
    var arr = e.target.result.split('\n');
    var svg;
    try {
      svg = flamegraph.fromArray(arr);
     flamegraphEl.innerHTML= svg;
     hookHoverMethods();
    } catch (err) {
      flamegraphEl.innerHTML = '<br><p class="error">' + err.toString() + '</p>';
    }
  });
}

document
  .getElementById('inputfile')
  .addEventListener('change', onFile);
