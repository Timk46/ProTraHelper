import { Injectable } from '@angular/core';
import * as MarkdownIt from 'markdown-it';
import markdownItFootnote from 'markdown-it-footnote';
import hljs from 'highlight.js';

@Injectable({
  providedIn: 'root',
})
export class MarkdownService {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return (
              '<pre class="hljs"><code class="language-' +
              lang +
              '">' +
              hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
              '</code></pre>'
            );
          } catch (__) {}
        }
        return (
          '<pre class="hljs"><code>' + this.escapeHtml(str) + '</code></pre>'
        );
      },
      breaks: true, // sorgt dafür, dass Zeilenumbrüche beachtet werden
    });
    this.md.use(markdownItFootnote);

    // Customize output for footnotes
    this.md.renderer.rules['footnote_ref'] = (tokens, idx, options, env, slf) => {
      const id = slf.rules['footnote_anchor_name']?.(tokens, idx, options, env, slf);
      const caption = slf.rules['footnote_caption']?.(tokens, idx, options, env, slf);
      let refid = id ?? '';
      if (tokens[idx].meta.subId > 0) {
        refid += ':' + tokens[idx].meta.subId;
      }
      return '<sup class="footnote-ref"><a>' + caption + '</a></sup>';
    };

    this.md.renderer.rules['footnote_anchor'] = (tokens, idx, options, env, slf) => {
      let id = slf.rules['footnote_anchor_name']?.(tokens, idx, options, env, slf);
      if (id && tokens[idx].meta.subId > 0) {
        id += ':' + tokens[idx].meta.subId;
      }
      return ' <a class="footnote-backref">\u21a9\uFE0E</a>';
    };

    this.md.renderer.rules['footnote_block_open'] = () =>
      '<h4 class="mt-3">Quellen:</h4>\n<section class="footnotes">\n<ol class="footnotes-list">\n';
  }

  parse(markdown: string): string {
    return this.md.render(markdown);
  }

  // HTML-Escape-Funktion definieren
  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (tag) => {
      const charsToReplace: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return charsToReplace[tag] || tag;
    });
  }
}
