/** Small, realistic slice content shared by domain tests (love and languages). */
import type { Form, LearnableItem, Lexeme, Sentence, Source } from '../../../src/domain/types';

const src: Source = { ref: 'test fixture', licence: 'CC BY-SA 4.0' };

const lex = (id: string, gd: string, en: string, pos: Lexeme['pos'], tags: string[], freqRank?: number): Lexeme => ({
  kind: 'lexeme', id, gd, en, pos, tags, freqRank, source: src, review: 'verified',
});
const form = (id: string, lexemeId: string, gd: string, en: string, person: Form['person'], tags: string[]): Form => ({
  kind: 'form', id, lexemeId, gd, en, person, tags, source: src, review: 'verified',
});
const sent = (id: string, gd: string, en: string, ids: string[], pattern: string, tags: string[]): Sentence => ({
  kind: 'sentence', id, gd, en, altGd: [], pattern, tags, source: src, review: 'generated',
  tokens: gd.replace(/\.$/, '').split(' ').map((text, i) => ({ text, itemId: ids[i] ?? null })),
});

export const tha = lex('lex:tha', 'tha', 'is', 'verb', ['grammar:tha'], 1);
export const gaol = lex('lex:gaol', 'gaol', 'love', 'noun', ['topic:love'], 300);
export const gaidhlig = lex('lex:gaidhlig', 'Gàidhlig', 'Gaelic', 'noun', ['topic:languages'], 200);
export const beurla = lex('lex:beurla', 'Beurla', 'English', 'noun', ['topic:languages'], 250);
export const agam = form('form:aig.1sg', 'lex:aig', 'agam', 'at me', '1sg', ['prep:aig']);
export const agad = form('form:aig.2sg', 'lex:aig', 'agad', 'at you', '2sg', ['prep:aig']);
export const aige = form('form:aig.3sg-m', 'lex:aig', 'aige', 'at him', '3sg-m', ['prep:aig']);
export const orm = form('form:air.1sg', 'lex:air', 'orm', 'on me', '1sg', ['prep:air']);
export const ort = form('form:air.2sg', 'lex:air', 'ort', 'on you', '2sg', ['prep:air']);

export const iLoveYou = sent('sent:love-001', 'Tha gaol agam ort.', 'I love you.', ['lex:tha', 'lex:gaol', 'form:aig.1sg', 'form:air.2sg'], 'tha-N-aig-air', ['topic:love', 'prep:aig', 'prep:air']);
export const youLoveMe = sent('sent:love-002', 'Tha gaol agad orm.', 'You love me.', ['lex:tha', 'lex:gaol', 'form:aig.2sg', 'form:air.1sg'], 'tha-N-aig-air', ['topic:love', 'prep:aig', 'prep:air']);
export const iHaveGaelic = sent('sent:lang-001', 'Tha Gàidhlig agam.', 'I speak Gaelic.', ['lex:tha', 'lex:gaidhlig', 'form:aig.1sg'], 'tha-N-aig', ['topic:languages', 'prep:aig']);
export const youHaveGaelic = sent('sent:lang-002', 'Tha Gàidhlig agad.', 'You speak Gaelic.', ['lex:tha', 'lex:gaidhlig', 'form:aig.2sg'], 'tha-N-aig', ['topic:languages', 'prep:aig']);
export const heHasGaelic = sent('sent:lang-003', 'Tha Gàidhlig aige.', 'He speaks Gaelic.', ['lex:tha', 'lex:gaidhlig', 'form:aig.3sg-m'], 'tha-N-aig', ['topic:languages', 'prep:aig']);
export const iHaveEnglish = sent('sent:lang-004', 'Tha Beurla agam.', 'I speak English.', ['lex:tha', 'lex:beurla', 'form:aig.1sg'], 'tha-N-aig', ['topic:languages', 'prep:aig']);

export const ALL_ITEMS: LearnableItem[] = [
  tha, gaol, gaidhlig, beurla, agam, agad, aige, orm, ort,
  iLoveYou, youLoveMe, iHaveGaelic, youHaveGaelic, heHasGaelic, iHaveEnglish,
];
export const SENTENCES = ALL_ITEMS.filter((i): i is Sentence => i.kind === 'sentence');
