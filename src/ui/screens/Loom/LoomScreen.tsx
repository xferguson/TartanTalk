import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadContent, indexItems } from '../../../content';
import { db, type TartanDB } from '../../../db/db';
import { getProgress, getScarf, listScarves, putScarf } from '../../../db/repo';
import { nextIntervalDays } from '../../../domain/scheduler';
import { recommendTopics, type TopicSuggestion } from '../../../domain/recommend';
import type { LearnableItem, Progress, Scarf, Tartan } from '../../../domain/types';
import { useSessionStore } from '../../../app/store/useSessionStore';
import type { SessionStore } from '../../../app/store/sessionStore';
import { Button, ButtonRow } from '../../components/Button';
import { Card } from '../../components/Card';
import { AccentKeys } from '../../components/AccentKeys';
import { ProgressBar } from '../../components/ProgressBar';
import { RatingBar } from '../../components/RatingBar';
import { ScarfCanvas } from '../../components/ScarfCanvas';
import { TagPicker } from '../../components/TagPicker';
import { formatLength } from '../../../domain/length';
import { scarfLengthElls } from '../../../app/services';
import { FALLBACK_TARTAN } from '../Shelf/loadShelf';
import { creditNote, exerciseLabel, slippedLetter, topLine, weavingCaption } from './loomModel';
import styles from './LoomScreen.module.css';

export interface LoomScreenProps {
  /** Injected so tests can run a session against a fake database and clock. */
  store?: SessionStore;
  database?: TartanDB;
  /** Every learnable item by id; defaults to the content bundle. */
  items?: ReadonlyMap<string, LearnableItem>;
  now?: () => number;
}

function formatDays(days: number): string {
  if (days < 1) return 'today';
  const d = Math.round(days);
  return d === 1 ? '1 day' : `${d} days`;
}

export function LoomScreen({ store = useSessionStore, database = db, items, now = Date.now }: LoomScreenProps) {
  const { scarfId } = useParams();
  if (!scarfId) return <ChooseScarf database={database} />;
  return <Session key={scarfId} scarfId={scarfId} store={store} database={database} items={items} now={now} />;
}

function ChooseScarf({ database }: { database: TartanDB }) {
  const [scarves, setScarves] = useState<Scarf[] | null>(null);
  useEffect(() => {
    let live = true;
    void listScarves(database).then((s) => live && setScarves(s));
    return () => {
      live = false;
    };
  }, [database]);
  return (
    <>
      <h1 className={styles.title}>Choose a scarf to weave</h1>
      {scarves?.length === 0 && (
        <p className={styles.muted}>
          Your shelf is empty. <Link to="/new">Start a new scarf</Link>
        </p>
      )}
      <ul className={styles.scarfList}>
        {scarves?.map((s) => (
          <li key={s.id}>
            <Link to={`/loom/${s.id}`}>{s.name}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Session({ scarfId, store, database, items: injected, now }: Omit<Required<LoomScreenProps>, 'items'> & Pick<LoomScreenProps, 'items'> & { scarfId: string }) {
  const s = store();
  const bundle = useMemo(() => loadContent(), []);
  const items = useMemo(() => injected ?? indexItems(bundle), [injected, bundle]);
  const [scarf, setScarf] = useState<Scarf | null>(null);
  const [typed, setTyped] = useState('');
  const [goodInterval, setGoodInterval] = useState('');
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void store.getState().startLearning(scarfId);
    return () => store.getState().reset();
  }, [store, scarfId]);

  // Re-read the scarf after each answer so a newly woven band reaches the strip and its shuttle.
  useEffect(() => {
    let live = true;
    void getScarf(scarfId, database).then((row) => live && setScarf(row ?? null));
    return () => {
      live = false;
    };
  }, [scarfId, database, s.answered, s.weaving]);

  // When there is nothing new left, suggest subjects that still have words to learn.
  const spent = s.exhausted || (s.done && s.total === 0);
  useEffect(() => {
    if (!spent || !scarf) return;
    let live = true;
    void database.progress.toArray().then((rows: Progress[]) => {
      if (!live) return;
      const byId = new Map(rows.map((p) => [p.itemId, p]));
      setSuggestions(recommendTopics(bundle.topics, [...items.values()], scarf.tagFilter, byId).slice(0, 3));
    });
    return () => {
      live = false;
    };
  }, [spent, scarf, database, bundle, items]);

  const addSubject = async (t: TopicSuggestion) => {
    if (!scarf) return;
    await putScarf({ ...scarf, tagFilter: [...new Set([...scarf.tagFilter, ...t.topic.tags])] }, database);
    await store.getState().startLearning(scarf.id);
  };

  // The Good hint under the rating bar is that item's real next interval.
  const awaiting = s.feedback?.awaitingRating ? s.itemId : null;
  useEffect(() => {
    if (!awaiting) return;
    let live = true;
    void getProgress(awaiting, database).then((p) => {
      if (live && p) setGoodInterval(formatDays(nextIntervalDays(p, 'good', now())));
    });
    return () => {
      live = false;
    };
  }, [awaiting, database, now]);

  // A fresh card starts with an empty field.
  useEffect(() => setTyped(''), [s.itemId, s.card]);

  const tartan: Tartan = bundle.tartans.find((t) => t.id === scarf?.tartanId) ?? FALLBACK_TARTAN;
  const ex = s.exercise;
  const fb = s.feedback;
  const strip = scarf && (
    <ScarfCanvas
      tartan={tartan}
      variant="strip"
      wovenOrder={scarf.wovenOrder}
      name={scarf.name}
      lengthLabel={formatLength(scarfLengthElls(scarf.wovenOrder, items))}
    />
  );

  if (!scarf) return null; // still reading the local database

  if (s.done || s.waitUntil !== null) {
    return (
      <>
        <h1 className={styles.title}>{scarf.name}</h1>
        <Card>
          {strip}
          <p className={styles.plain} role="status">
            {spent
              ? 'You have woven every word on this scarf\'s subjects. Add another subject to keep going.'
              : s.waitUntil !== null
                ? 'The next thread is resting a moment. Weave on with new words, or come back soon.'
                : 'That is all for this batch. The scarf is a little longer.'}
          </p>
          {spent && suggestions.length > 0 && (
            <ul className={styles.scarfList} aria-label="Subjects to add">
              {suggestions.map((t, i) => (
                <li key={t.topic.id}>
                  <Button variant={i === 0 ? 'primary' : 'ghost'} onClick={() => void addSubject(t)}>
                    {`Add ${t.topic.name} (${t.fresh} new)`}
                  </Button>
                  {i === 0 && <span className={styles.muted}> Suggested next</span>}
                </li>
              ))}
            </ul>
          )}
          <ButtonRow>
            {!spent && (
              <Button onClick={() => void store.getState().keepWeaving()} autoFocus>Learn more words</Button>
            )}
            <Button to="/" variant={spent ? undefined : 'ghost'}>Back to the shelf</Button>
            <Button to={`/scarf/${scarf.id}`} variant="ghost">See the scarf</Button>
          </ButtonRow>
        </Card>
      </>
    );
  }
  if (s.card?.exercise === 'introduce') {
    const word = items.get(s.card.itemId);
    return (
      <>
        <p className={styles.top}>{topLine(scarf.name, s.mode, s.answered, s.total)}</p>
        <ProgressBar value={s.answered} max={s.total} label="Session progress" />
        <Card>
          <p className={styles.label}>A new word</p>
          <p className={styles.prompt} lang="gd">{word?.gd}</p>
          <p className={styles.plain}>{word?.en}</p>
        </Card>
        {strip}
        <ButtonRow>
          <Button onClick={() => void store.getState().introduce('got-it')} autoFocus>Got it</Button>
          <Button variant="ghost" onClick={() => void store.getState().introduce('later')}>Later</Button>
          <Button variant="ghost" onClick={() => void store.getState().introduce('known')}>I already know this</Button>
        </ButtonRow>
      </>
    );
  }
  if (!ex) return null;

  const respond = (text: string) => void store.getState().submit(text);
  const chosen = (text: string) => fb !== null && (ex.type === 'produce' ? false : text === typed);
  const answerWord = fb?.check.matched ?? '';
  const letter = fb?.check.verdict === 'near' ? slippedLetter(answerWord, typed) : null;
  const note = ex.type === 'produce' && fb?.check.correct ? creditNote(s.credited, items, s.itemId) : null;

  const options = ex.type === 'produce' ? [] : ex.options;
  const optionState = (o: { text: string; correct: boolean }) =>
    fb && o.correct ? styles.right : fb && chosen(o.text) ? styles.wrong : '';

  return (
    <>
      <p className={styles.top}>{topLine(scarf.name, s.mode, s.answered, s.total)}</p>
      <ProgressBar value={s.answered} max={s.total} label="Session progress" />
      <Card>
        <p className={styles.label}>{exerciseLabel(ex.type)}</p>

        {ex.type === 'recognise' && (
          <>
            <p className={styles.prompt} lang="gd">{ex.prompt}</p>
            <div className={styles.options}>
              {options.map((o) => (
                <button
                  key={o.text}
                  type="button"
                  className={`${styles.option} ${optionState(o)}`}
                  disabled={fb !== null}
                  onClick={() => { setTyped(o.text); respond(o.text); }}
                >
                  {o.text}
                </button>
              ))}
            </div>
          </>
        )}

        {ex.type === 'cloze' && (
          <>
            <p className={styles.prompt} lang="gd">
              {ex.tokens.map((t, i) =>
                t === null ? <span key={i} className={styles.gap} aria-label="blank">{fb ? ex.answer : ' '}</span> : <span key={i}>{i > 0 ? ' ' : ''}{t}</span>,
              )}
            </p>
            <p className={styles.muted}>{ex.translation}</p>
            <div lang="gd">
              <TagPicker
                label="Choose the missing word"
                tags={options.map((o) => o.text)}
                selected={fb ? [typed] : []}
                onToggle={(t) => { if (!fb) { setTyped(t); respond(t); } }}
              />
            </div>
          </>
        )}

        {ex.type === 'produce' && (
          <>
            <p className={styles.prompt}>{ex.prompt}</p>
            <form
              className={styles.produce}
              onSubmit={(e) => {
                e.preventDefault();
                if (!fb && typed.trim()) respond(typed);
              }}
            >
              <input
                ref={inputRef}
                className={`${styles.input} ${fb ? styles.inputFeedback : ''}`}
                aria-label="Your answer in Gaelic"
                lang="gd"
                value={typed}
                readOnly={fb !== null}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setTyped(e.target.value)}
              />
              {!fb && <AccentKeys inputRef={inputRef} />}
              {!fb && <Button type="submit" disabled={!typed.trim()}>Check</Button>}
            </form>
          </>
        )}

        {fb && (
          <p className={`${styles.feedback} ${fb.check.verdict === 'correct' ? styles.ok : fb.check.verdict === 'near' ? styles.near : styles.miss}`} role="status">
            {fb.check.verdict === 'correct' && <><span lang="gd">Math dhèanta!</span> Well done.</>}
            {fb.check.verdict === 'near' && (letter ? <>Almost: it&apos;s <b lang="gd">{answerWord}</b>, with a grave accent on the {letter}.</> : <>Almost: it&apos;s <b lang="gd">{answerWord}</b>. Mind the accents.</>)}
            {fb.check.verdict === 'wrong' && <>Not quite. It&apos;s <b lang={ex.type === 'recognise' ? undefined : 'gd'}>{answerWord}</b>.</>}
          </p>
        )}

        {note && <p className={styles.credit}>{note}</p>}

        {fb?.awaitingRating && (
          <div className={styles.rating}>
            <p className={styles.label}>How did that feel?</p>
            <RatingBar key={s.itemId} interval={goodInterval || 'a few days'} pre={fb.check.maxRating ?? 'good'} onRate={(r) => void store.getState().rate(r)} />
          </div>
        )}
      </Card>

      {strip}
      {s.weaving && <p className={styles.caption} role="status">{weavingCaption(scarf.name, s.weaving.ells)}</p>}

      {fb && !fb.awaitingRating && (
        <ButtonRow>
          <Button onClick={() => void store.getState().next()} autoFocus>Next</Button>
          {s.canClaimKnown && (
            <Button variant="ghost" onClick={() => void store.getState().claimKnown()}>I already knew this</Button>
          )}
        </ButtonRow>
      )}
    </>
  );
}
