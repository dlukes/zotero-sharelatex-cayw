// ==UserScript==
// @version         ∞
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
 *   you've made edits to the bibliography in Zotero. Currently, it
 *   requires you to hardcode the Zotero collection you want to export.
 *   The default setting (below) exports your entire personal library,
 *   which can take a while if there are many items and the export is
 *   not cached.
 */

function zotError() {
  var msg = "Can't reach the bibliography database! Make sure that Zotero is " +
            "running and the Better BibTeX extension for Zotero is installed.";
  console.error(msg);
  alert(msg);
}

function zoteroFetchAndInsert(url, postProcessFunc) {
  GM.xmlHttpRequest({
    method: "GET",
    url: url,
    headers: {
      "Zotero-Allowed-Request": true
    },
    onload: function(resp) {
      var ace = unsafeWindow.ace;
      var editor = ace.edit(document.querySelector(".ace-editor-body"));
      var content = postProcessFunc(resp.responseText);
      // cursor position = an object of the form {column: x, row: y}
      var cursorPosition = editor.getCursorPosition();
      editor.session.insert(cursorPosition, content);
    },
    onerror: zotError
  });
}

function zoteroInsertBibliography() {
  zoteroFetchAndInsert(
    // TODO: modify the URL to set the Zotero collection to convert to
    // Bib(La)TeX and insert -- cf. instructions for Pull Export here:
    // https://retorque.re/zotero-better-bibtex/push-and-pull/
    "http://localhost:23119/better-bibtex/collection?/0/library.biblatex",
    function(responseText) {
      // TODO: you can manipulate the string before it's inserted --
      // e.g. get rid of abstracts
      return responseText.replace(/^  abstract = \{[\s\S]*?^(  \w+ = \{)/gm, "$1");
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
