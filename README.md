Zotero ShareLaTeX Cite-as-you-Write
===================================

This userscript leverages the Better BibTeX Zotero extension in order to
make it possible to insert citations into ShareLaTeX documents via the
Zotero popup.

Installation
------------

You need a userscript manager for your web browser of choice, e.g.
GreaseMonkey or TamperMonkey are popular browser extensions that serve
this purpose. Once you've installed it, add this userscript (refer to
the documentation of your userscript manager for information on how to
do this).

After you've added the script, you'll probably want to configure the
following things:

- set `@match` in the userscript to match the URL of your ShareLaTex
  server
- go through the `TODO`s in the code and customize at will based on the
  provided guidelines

Usage
-----

The userscript provides two additional keyboard shortcuts when using
ShareLaTeX, which are by default:

- `Ctrl+.` -- calls up the Zotero popup, allows you to put together a
  citation, and inserts it into the document
- `Ctrl+Shift+.` -- inserts a Zotero collection exported as a Bib(La)TeX
  bibliography database into the document. This is intended as an easy
  way to update your ShareLaTeX .bib file after you've made edits to the
  bibliography in Zotero.

It determines the Zotero collection to generate your bibliography from
by searching your `.bib` file for a collection declaration in the
following format:

```
% -*- zotero-sharelatex-cayw-collection: <library-number>/<collection-name>.<format> -*-
```

E.g. the following will generate a biblatex bibliography for a
collection named NLP within your private Zotero library (0):

```
% -*- zotero-sharelatex-cayw-collection: 0/NLP.biblatex -*-
```

To figure out the identifier for a collection, right-click on the
collection in Zotero, select *Download Better BibTeX export*, and
inspect the generated URLs.

If no collection declaration is provided, it will ask whether to export
your entire personal library, which can take a while if there are many
items and the export is not cached.

Cf. <https://retorque.re/zotero-better-bibtex/push-and-pull/> for more
information.


