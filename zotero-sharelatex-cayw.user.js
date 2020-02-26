// ==UserScript==
// @version         0.8
// @name            Zotero ShareLaTeX Cite-as-you-Write
// @namespace       https://github.com/dlukes
// @author          dlukes
// @description     Insert citations from Zotero into ShareLaTeX as you write.
// @match           *://sharelatex.korpus.cz/*
// @run-at          document-end
// @grant           unsafeWindow
// @grant           GM.xmlHttpRequest
// ==/UserScript==

/* Zotero ShareLaTeX Cite-as-you-Write
 * ===================================
 *
 * This userscript leverages the Better BibTeX Zotero extension in
 * order to make it possible to insert citations into ShareLaTeX
 * documents via the Zotero popup.
 *
 * Installation
 * ------------
 *
 * You need a userscript manager for your web browser of choice, e.g.
 * GreaseMonkey or TamperMonkey are popular browser extensions that
 * serve this purpose. Once you've installed it, add this userscript
 * (refer to the documentation of your userscript manager for
 * information on how to do this).
 *
 * After you've added the script, you'll probably want to configure the
 * following things:
 *
 * - set @match above to match the URL of your ShareLaTex server
 * - go through the TODOs below and customize at will based on the
 *   provided guidelines
 *
 * Usage
 * -----
 *
 * The userscript provides two additional keyboard shortcuts when using
 * ShareLaTeX, which are by default:
 *
 * - Ctrl+. -- calls up the Zotero popup, allows you to put together a
 *   citation, and inserts it into the document
 * - Ctrl+Shift+. -- inserts a Zotero collection exported as a
 *   Bib(La)TeX bibliography database into the document. This is
 *   intended as an easy way to update your ShareLaTeX .bib file after
 *   you've made edits to the bibliography in Zotero.
 *
 *   It determines the Zotero collection to generate your bibliography
 *   from by searching your .bib file for a collection declaration in
 *   the following format:
 *
 *     % -*- zotero-sharelatex-cayw-collection: <library-number>/<collection-name>.<format> -*-
 *
 *   E.g. the following will generate a biblatex bibliography for a
 *   collection named NLP within your private Zotero library (0):
 *
 *     % -*- zotero-sharelatex-cayw-collection: 0/NLP.biblatex -*-
 *
 *   To figure out the identifier for a collection, right-click on the
 *   collection in Zotero, select Download Better BibTeX export, and
 *   inspect the generated URLs.
 *
 *   If no collection declaration is provided, it will ask whether to
 *   export your entire personal library, which can take a while if
 *   there are many items and the export is not cached.
 *
 *   Cf. https://retorque.re/zotero-better-bibtex/push-and-pull/ for
 *   more information.
 */

var COLLECTION_RE = /-\*-\s*zotero-sharelatex-cayw-collection:\s*(.*?)\s*-\*-/;
var DROP_FIELDS = (function() {
  var conf = ["abstract", "file", "keywords", "eprint", "eprinttype"];
  var ans = new Set();
  for (var elem of conf) {
    ans.add(elem);
  }
  return ans;
})();
var DROP_FIELDS_FOR_TYPE = (function() {
  var conf = [
    ["article", ["url", "urldate"]],
    ["incollection", ["url", "urldate"]],
    ["book", ["edition", "volume", "series"]]
  ];
  var ans = new Map();
  for (var pair of conf) {
    var type = pair[0];
    var fields = pair[1];
    var field_set = new Set();
    for (var field of fields) {
      field_set.add(field);
    }
    ans.set(type, field_set);
  }
  return ans;
})();
var EMPTY_SET = new Set();

function cleanBib(string) {
  var lines = string.match(/[^\r\n]+/g);
  var clean = [];
  var groups, type, key, field;
  var skip = false;
  for (var line of lines) {
    if (line.match(/^%/)) {
      continue;
    } else if (groups = line.match(/^@(.*?)\{(.*),/)) {
      type = groups[1];
      key = groups[2];
      skip = false;
    } else if (groups = line.match(/^  (.*?) = \{/)) {
      var field = groups[1];
      var drop_fields_for_type = DROP_FIELDS_FOR_TYPE.get(type) || EMPTY_SET;
      skip = DROP_FIELDS.has(field) || drop_fields_for_type.has(field);
    } else if (line.match(/^\}/)) {
      skip = false
    }

    if (!skip) {
      // make sure trailing commas are present
      line = line.replace(/(?!^)\}$/, "},");
      clean.push(line)
    } else {
      console.debug("Removing field", field, "in entry type", type, "with key", key);
    }
  }
  return clean.join("\n");
}

function zotError() {
  var msg = "Can't reach the bibliography database! Make sure that Zotero is " +
            "running and the Better BibTeX extension for Zotero is installed.";
  console.error(msg);
  alert(msg);
}

function zotWarnAndAsk() {
  var msg = "No collection declaration found in file. Specify one in the following " +
            "format:\n\n" +
            "  % -*- zotero-sharelatex-cayw-collection: <library-number>/<collection-name>.<format> -*-\n\n" +
            "E.g. the following will generate a biblatex bibliography for a collection named " +
            "NLP within your private Zotero library (0):\n\n" +
            "  % -*- zotero-sharelatex-cayw-collection: 0/NLP.biblatex -*-\n\n" +
            "To figure out the identifier for a collection, right-click on the collection " +
            "in Zotero, select Download Better BibTeX export, and inspect the generated " +
            "URLs.\n\n" +
            "As a default, I can also just try to insert a bibliography based on your " +
            "entire private library, but that may take a while, depending on its size. " +
            "Proceed?";
  console.warn(msg);
  return confirm(msg);
}

function getAceEditor() {
  var ace = unsafeWindow.ace;
  return ace.edit(document.querySelector(".ace-editor-body"));
}

function zoteroFetchAndInsert(url, postProcessFunc) {
  GM.xmlHttpRequest({
    method: "GET",
    url: url,
    headers: {
      "Zotero-Allowed-Request": true
    },
    onload: function(resp) {
      var editor = getAceEditor();
      var content = postProcessFunc(resp.responseText);
      // cursor position = an object of the form {column: x, row: y}
      var cursorPosition = editor.getCursorPosition();
      editor.session.insert(cursorPosition, content);
    },
    onerror: zotError
  });
}

function zoteroInsertBibliography() {
  var editor = getAceEditor();
  var doc = editor.session.toString();
  var match = COLLECTION_RE.exec(doc);
  var collection;
  if (match) {
    collection = "collection?/" + match[1];
  } else {
    if (!zotWarnAndAsk()) return;
    collection = "library?/0/library.biblatex";
  }
  zoteroFetchAndInsert(
    "http://localhost:23119/better-bibtex/" + collection,
    function(responseText) {
      // TODO: you can manipulate the string before it's inserted --
      // e.g. get rid of unnecessary fields
      return cleanBib(responseText);
    }
  );
}

function zoteroCite() {
  zoteroFetchAndInsert(
    // TODO: customize citation format by modifying the URL
    "http://localhost:23119/better-bibtex/cayw?format=latex",
    function(responseText) {
      // TODO: you can manipulate the string before it's inserted
      return responseText;
    }
  );
}

window.onkeyup = function(e) {
  // TODO: you can customize the keyboard shortcuts here
  if (e.ctrlKey && e.shiftKey && e.keyCode === 190) {
    zoteroInsertBibliography();
  } else if (e.ctrlKey && e.keyCode === 190) {
    zoteroCite();
  }
};
