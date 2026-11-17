import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadContent, type ContentBundle } from '../../../content';
import { db, type TartanDB } from '../../../db/db';
import { putScarf } from '../../../db/repo';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { TagPicker } from '../../components/TagPicker';
import { TartanSwatch } from './TartanSwatch';
import {
  buildScarf,
  collectTags,
  defaultScarfName,
  filterTartans,
  isTopicSelected,
  previewCounts,
  toggleTopic,
} from './newScarf';
import styles from './NewScarfScreen.module.css';

const PAGE = 9;

interface Props {
  /** Injected so tests need no generated content, database or clock. */
  content?: ContentBundle;
  database?: TartanDB;
  now?: () => number;
  newId?: () => string;
}

export function NewScarfScreen({ content, database = db, now = Date.now, newId = () => crypto.randomUUID() }: Props) {
  const bundle = useMemo(() => content ?? loadContent(), [content]);
  const navigate = useNavigate();
  // The Library links here with ?tartan=<id>; an unknown id is ignored.
  const [params] = useSearchParams();
  const preselected = bundle.tartans.findIndex((t) => t.id === params.get('tartan'));
  const [selected, setSelected] = useState<string[]>([]);
  const [tartanId, setTartanId] = useState<string | null>(preselected >= 0 ? bundle.tartans[preselected].id : null);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(Math.max(PAGE, Math.ceil((preselected + 1) / PAGE) * PAGE));
  const [name, setName] = useState('');

  const items = useMemo(() => [...bundle.lexemes, ...bundle.forms, ...bundle.sentences], [bundle]);
  const tags = useMemo(() => collectTags(items), [items]);
  const starters = useMemo(() => bundle.topics.filter((t) => t.starter), [bundle]);
  const progress = useLiveQuery(() => database.progress.toArray(), [database]) ?? [];
  const { fresh, elsewhere } = previewCounts(items, selected, progress);
  const results = filterTartans(bundle.tartans, query);
  const placeholderName = defaultScarfName(bundle.topics, selected);
  const canCreate = selected.length > 0 && tartanId !== null;

  const toggleTag = (tag: string) =>
    setSelected((s) => (s.includes(tag) ? s.filter((t) => t !== tag) : [...s, tag]));

  const create = async () => {
    if (!canCreate || tartanId === null) return;
    const scarf = buildScarf({
      id: newId(),
      name: name.trim() || placeholderName || 'My scarf',
      tagFilter: selected,
      tartanId,
      now: now(),
    });
    await putScarf(scarf, database);
    navigate(`/loom/${scarf.id}`);
  };

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
    >
      <h1>A new scarf</h1>

      <fieldset className={styles.field}>
        <legend className={styles.label}>What would you like to talk about?</legend>
        {starters.length > 0 && (
          <TagPicker
            label="Starter suggestions"
            tags={starters.map((t) => t.name)}
            selected={starters.filter((t) => isTopicSelected(t, selected)).map((t) => t.name)}
            onToggle={(n) => {
              const topic = starters.find((t) => t.name === n);
              if (topic) setSelected((s) => toggleTopic(topic, s));
            }}
          />
        )}
        <TagPicker label="Topic tags" tags={tags.topic} selected={selected} onToggle={toggleTag} />
      </fieldset>

      {tags.grammar.length > 0 && (
        <fieldset className={styles.field}>
          <legend className={styles.label}>Grammar</legend>
          <div lang="gd">
            <TagPicker label="Grammar tags" tags={tags.grammar} selected={selected} onToggle={toggleTag} />
          </div>
        </fieldset>
      )}

      <Card>
        <div className={styles.row} aria-live="polite">
          <span>
            <b>{fresh}</b> new items
          </span>
          <span className={styles.muted}>{elsewhere} already woven elsewhere</span>
        </div>
      </Card>

      <fieldset className={styles.field}>
        <legend className={styles.label}>Choose a tartan</legend>
        <input
          type="search"
          className={styles.text}
          aria-label="Search tartans"
          placeholder="Search clans and families: Ferguson, Murchison…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE);
          }}
        />
        {bundle.tartans.length === 0 ? (
          <p className={styles.muted}>No tartans are in the library yet, so a scarf can’t be set up for now.</p>
        ) : results.length === 0 ? (
          <p className={styles.muted}>No tartans match “{query}”.</p>
        ) : (
          <div className={styles.grid}>
            {results.slice(0, shown).map((t) => (
              <TartanSwatch key={t.id} tartan={t} selected={t.id === tartanId} onSelect={() => setTartanId(t.id)} />
            ))}
          </div>
        )}
        {results.length > shown && (
          <Button variant="ghost" onClick={() => setShown((n) => n + PAGE)}>
            Show more
          </Button>
        )}
      </fieldset>

      <label className={styles.field}>
        <span className={styles.label}>Name your scarf (optional)</span>
        <input
          type="text"
          className={styles.text}
          value={name}
          placeholder={placeholderName}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <Button type="submit" disabled={!canCreate}>
        Set up the loom
      </Button>
    </form>
  );
}
