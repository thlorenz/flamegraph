'use strict';

var debounce = require('debounce')

var searchFieldEl = document.querySelector('.search.ui-part input[type=search]')
  , regexCheckEl = document.getElementById('search-regex')
  , blinkCheckEl = document.getElementById('search-blink')
  , searchErrorEl = document.getElementById('search-error')

function tryMakeRegex(query) {
  try {
    return new RegExp(query, 'i');
  } catch (e) {
    console.error(e);
    searchErrorEl.value = e.message;
  }
}

function addMatchIndicator(el) {
  el.classList.add('match');  
  var rect = el.children[1]
  var w = rect.getAttribute('width');
  var h = rect.getAttribute('height');
 
  // make invisible or too small nodes that matched the search visible
  if (w < 10) {
    rect.setAttribute('width', 10);
  }
}

function removeMatchIndicator(el) {
  el.classList.remove('match');  
  var rect = el.children[1]
  rect.setAttribute('width', parseInt(rect.dataset.width));
  rect.setAttribute('height', parseInt(rect.dataset.height));
}

function addBlink(el) {
  el.classList.add('blink');  
}

function removeBlink(el) {
  el.classList.remove('blink');  
}

function clearMatches() {
  var matches = document.querySelectorAll('g.func_g.match');
  for (var i = 0; i < matches.length; i++) {
    removeMatchIndicator(matches.item(i));  
  }
}

function clearBlinks() {
  var matches = document.querySelectorAll('g.func_g.blink');
  for (var i = 0; i < matches.length; i++) {
    removeBlink(matches.item(i));  
  }
}

function clearError() {
  searchErrorEl.value = '';
}

function indicateMatch(el, blink) {
  addMatchIndicator(el);
  if (blink) addBlink(el);
}

function onQueryChange() {
  clearMatches();
  clearBlinks();
  clearError();

  var query = searchFieldEl.value.trim();
  var isregex = regexCheckEl.checked;
  var blink = blinkCheckEl.checked;
  if (!query.length) return;

  var regex;
  if (isregex) { 
    regex = tryMakeRegex(query);
    if (!regex) return;
  } else {
    query = query.toLowerCase();
  }

  var func_gs = document.querySelectorAll('g.func_g');
  for (var i = 0; i < func_gs.length; i++) {
    var func_g = func_gs[i];

    if (isregex) {
      if (regex.test(func_g.dataset.search)) indicateMatch(func_g, blink);
    } else {
      if (~func_g.dataset.search.indexOf(query)) indicateMatch(func_g, blink);
    }
  }
}


var go = module.exports = function initSearch() {
  searchFieldEl.addEventListener('input', debounce(onQueryChange, 200));
  regexCheckEl.addEventListener('change', onQueryChange);
  blinkCheckEl.addEventListener('change', onQueryChange);
}

module.exports.refresh = onQueryChange;

