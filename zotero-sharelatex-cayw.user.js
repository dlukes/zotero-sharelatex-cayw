// ==UserScript==
// @version         0.10
// @name            Zotero ShareLaTeX Cite-as-you-Write
// @namespace       https://github.com/dlukes
// @author          dlukes
// @description     Insert citations from Zotero into ShareLaTeX as you write.
// @match           *://www.overleaf.com/*
// @run-at          document-end
// @grant           unsafeWindow
// @grant           GM.xmlHttpRequest
// ==/UserScript==
"use strict";

const LOG_PREFIX = "zotero-sharelatex-cayw:";
console.debug(LOG_PREFIX, "Initializing.");

const COLLECTION_RE = /-\*-\s*zotero-sharelatex-cayw-collection:\s*(.*?)\s*-\*-/;
const DROP_FIELDS = (() => {
  const conf = ["abstract", "file", "keywords", "eprint", "eprinttype"];
  const ans = new Set();
  for (const elem of conf) {
    ans.add(elem);
  }
  return ans;
})();
const DROP_FIELDS_FOR_TYPE = (() => {
  const conf = [
    ["article", ["url", "urldate"]],
    ["incollection", ["url", "urldate"]],
    ["book", ["edition", "volume", "series"]]
  ];
  const ans = new Map();
  for (const pair of conf) {
    const type = pair[0];
    const fields = pair[1];
    const field_set = new Set();
    for (const field of fields) {
      field_set.add(field);
    }
    ans.set(type, field_set);
  }
  return ans;
})();
const EMPTY_SET = new Set();

function cleanBib(string) {
  const lines = string.match(/[^\r\n]+/g);
  const clean = [];
  let groups, type, key, field;
  let skip = false;
  for (let line of lines) {
    if (line.match(/^%/)) {
      continue;
    } else if (groups = line.match(/^@(.*?)\{(.*),/)) {
      type = groups[1];
      key = groups[2];
      skip = false;
    } else if (groups = line.match(/^  (.*?) = \{/)) {
      field = groups[1];
      const drop_fields_for_type = DROP_FIELDS_FOR_TYPE.get(type) || EMPTY_SET;
      skip = DROP_FIELDS.has(field) || drop_fields_for_type.has(field);
    } else if (line.match(/^\}/)) {
      skip = false
    }

    if (!skip) {
      // make sure trailing commas are present
      line = line.replace(/(?!^)\}$/, "},");
      clean.push(line)
    } else {
      console.debug(LOG_PREFIX, "Removing field", field, "in entry type", type, "with key", key);
    }
  }
  return clean.join("\n");
}

function zotError() {
  const msg = "Can't reach the bibliography database! Make sure that Zotero is " +
            "running and the Better BibTeX extension for Zotero is installed.";
  console.error(LOG_PREFIX, msg);
  alert(msg);
}

function zotWarnAndAsk() {
  const msg = "No collection declaration found in file. Specify one in the following " +
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
  console.warn(LOG_PREFIX, msg);
  return confirm(msg);
}

function getDocumentText() {
  return unsafeWindow._ide.$scope.editor.sharejs_doc.doc._doc.getText()
}

function makeInsert(text) {
  const event = new ClipboardEvent('paste', {
    dataType: 'text/plain',
  	data: text
  });
  const element = document.activeElement;
  element.dispatchEvent(event);
}


function zoteroFetchAndInsert(url, postProcessFunc) {
  console.debug(LOG_PREFIX, "Sending request to Better BibTeX URL", url);
  GM.xmlHttpRequest({
    method: "GET",
    url: url,
    headers: {
      "Zotero-Allowed-Request": true
    },
    onload: function(resp) {
      const content = postProcessFunc(resp.responseText);
      // console.debug(content);
			makeInsert(content);
    },
    onerror: zotError
  });
}

function zoteroInsertBibliography() {
  const doc = getDocumentText();
  const match = COLLECTION_RE.exec(doc);
  let collection;
  if (match) {
    collection = "collection?/" + match[1];
  } else {
    if (!zotWarnAndAsk()) return;
    collection = "library?/0/library.biblatex";
  }
  zoteroFetchAndInsert(
    "http://localhost:23119/better-bibtex/" + collection,
    // TODO: you can manipulate the string before it's inserted -- e.g.
    // get rid of unnecessary fields
    cleanBib,
  );
}

function zoteroCite() {
  zoteroFetchAndInsert(
    // TODO: customize citation format by modifying the URL
    "http://localhost:23119/better-bibtex/cayw?format=latex",
    // TODO: you can manipulate the string before it's inserted
    responseText => responseText,
  );
}

window.onkeyup = (ev) => {
  // TODO: you can customize the keyboard shortcuts here
  if (ev.ctrlKey && ev.shiftKey && ev.keyCode === 190) {
    zoteroInsertBibliography();
  } else if (ev.ctrlKey && ev.keyCode === 190) {
    zoteroCite();
  }
};

console.debug(LOG_PREFIX, "Done initializing.");
