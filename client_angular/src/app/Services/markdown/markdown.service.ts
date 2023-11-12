// src/app/markdown-parser.service.ts

import { Injectable } from '@angular/core';
import * as MarkdownIt from 'markdown-it';
import markdownItFootnote from 'markdown-it-footnote';

@Injectable({
  providedIn: 'root',
})
export class MarkdownService {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt();
    this.md.use(markdownItFootnote);

    // Customize output -> https://www.npmjs.com/package/markdown-it-footnote


    // We need to fix the href links from the footnotes, because they reload the page currently
    // The code below will remove the links and just show the footnote text
    this.md.renderer.rules['footnote_ref'] = (tokens,idx,options,env,slf) => {
      // @ts-ignore
      var id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
      // @ts-ignore
      var caption = slf.rules.footnote_caption(tokens, idx, options, env, slf);
      var refid = id;
      if (tokens[idx].meta.subId > 0) {
        refid += ':' + tokens[idx].meta.subId;
      }

      //Original (links to #fn + footnote id) = return ('<sup class="footnote-ref"><a href="#fn' + id + '"target="_blank" id="fnref' + refid + '">' + caption + '</a></sup>');
      // So we override the link to the source (we dont have that long texts. Users can just scroll up to see the footnote)
      return ('<sup class="footnote-ref""><a>' + caption + '</a></sup>');
    };

    // Same as above, but for the backlinks (↩  symbol) - We just remove the link
    this.md.renderer.rules['footnote_anchor'] = (tokens,idx,options,env,slf) => {
      // @ts-ignore
      var id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);

      if (tokens[idx].meta.subId > 0) {
         id += ':' + tokens[idx].meta.subId;
       }

      /* ↩ with escape code to prevent display as Apple Emoji on iOS */
      return ' <a class="footnote-backref">\u21a9\uFE0E</a>';
    }


    // add heading "Quellen" before footnote list
    this.md.renderer.rules['footnote_block_open'] = () =>
      '<h4 class="mt-3">Quellen:</h4>\n' +
      '<section class="footnotes">\n' +
      '<ol class="footnotes-list">\n'
  }

  parse(markdown: string): string {
    return this.md.render(markdown);
  }
}
