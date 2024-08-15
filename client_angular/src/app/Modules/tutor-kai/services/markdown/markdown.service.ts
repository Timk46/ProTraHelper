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
      breaks: true,
      html: true,
      linkify: true,
      typographer: true,
    });

    this.md.use(markdownItFootnote);

    // Anpassen der Listenelemente-Rendering
    this.md.renderer.rules['list_item_open'] = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (token.markup === '1.') {
        return '<li class="ordered-list-item">';
      }
      return '<li>';
    };

    this.md.renderer.rules['list_item_close'] = () => '</li>';

    // Anpassen des Inhalts-Renderings für Listenelemente
    this.md.renderer.rules['paragraph_open'] = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (token.level > 0 && tokens[idx - 1] && tokens[idx - 1].type === 'list_item_open') {
        return ''; // Kein zusätzliches <p>-Tag innerhalb von Listenelementen
      }
      return '<p>';
    };

    this.md.renderer.rules['paragraph_close'] = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (token.level > 0 && tokens[idx + 1] && tokens[idx + 1].type === 'list_item_close') {
        return ''; // Kein schließendes </p>-Tag innerhalb von Listenelementen
      }
      return '</p>';
    };

    // Bestehende Anpassungen für Fußnoten beibehalten
    this.md.renderer.rules['footnote_ref'] = (tokens, idx, options, env, slf) => {
      const caption = slf.rules['footnote_caption']?.(tokens, idx, options, env, slf);
      return '<sup class="footnote-ref"><a>' + caption + '</a></sup>';
    };

    this.md.renderer.rules['footnote_anchor'] = () =>
      ' <a class="footnote-backref">\u21a9\uFE0E</a>';

    this.md.renderer.rules['footnote_block_open'] = () =>
      '<h4 class="mt-3">Quellen (Links zum Video):</h4>\n<section class="footnotes">\n<ol class="footnotes-list">\n';
  }

  parse(markdown: string): string {
    return this.md.render(markdown);
  }

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
