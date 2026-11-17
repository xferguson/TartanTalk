import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadContent, type ContentBundle } from '../../../content';
import type { Tartan } from '../../../domain/types';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { filterTartans } from '../NewScarf/newScarf';
import { TartanCanvas } from './TartanCanvas';
import styles from './LibraryScreen.module.css';

const fullName = (t: Tartan) => (t.variant ? `${t.name} (${t.variant})` : t.name);

function TartanDetail({ tartan, onBack, onUse }: { tartan: Tartan; onBack: () => void; onUse: () => void }) {
  return (
    <section className={styles.detail} aria-labelledby="tartan-name">
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onBack}>
          Back to the library
        </Button>
      </div>
      <TartanCanvas tartan={tartan} height={220} thread={3} />
      <h1 id="tartan-name">{fullName(tartan)}</h1>
      <p className={styles.muted}>
        {tartan.clan}
        {tartan.variant ? ` · ${tartan.variant}` : ''}
      </p>
      <p>
        <b>Sett:</b> <span className={styles.sett}>{tartan.sett}</span>
      </p>
      <ul className={styles.key} aria-label="Colour key">
        {Object.entries(tartan.colours).map(([code, hex]) => (
          <li key={code}>
            <span className={styles.dot} style={{ background: hex }} aria-hidden="true" />
            {code} {hex}
          </li>
        ))}
      </ul>
      {!tartan.verified && <Chip variant="calm">pattern unverified</Chip>}
      <Card>
        <p className={styles.notes}>
          <b>Source:</b>{' '}
          {tartan.provenance.url ? (
            <a href={tartan.provenance.url} target="_blank" rel="noreferrer">
              {tartan.provenance.ref}
            </a>
          ) : (
            tartan.provenance.ref
          )}
        </p>
        {tartan.provenance.notes && <p className={styles.notes}>{tartan.provenance.notes}</p>}
      </Card>
      <div className={styles.actions}>
        <Button onClick={onUse}>Use for a new scarf</Button>
      </div>
    </section>
  );
}

export function LibraryScreen({ content }: { content?: ContentBundle }) {
  const bundle = useMemo(() => content ?? loadContent(), [content]);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const results = useMemo(() => filterTartans(bundle.tartans, query), [bundle, query]);
  const open = bundle.tartans.find((t) => t.id === openId);

  if (open) {
    return (
      <div className={styles.page}>
        <TartanDetail
          tartan={open}
          onBack={() => setOpenId(null)}
          onUse={() => navigate(`/new?tartan=${encodeURIComponent(open.id)}`)}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1>Tartan library</h1>
        <p>{bundle.tartans.length} setts</p>
      </header>
      <input
        type="search"
        className={styles.search}
        aria-label="Search tartans"
        placeholder="Search clans and families: Ferguson, Murchison…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {bundle.tartans.length === 0 ? (
        <p className={styles.muted}>No tartans are in the library yet.</p>
      ) : results.length === 0 ? (
        <p className={styles.muted}>No tartans match “{query}”.</p>
      ) : (
        <ul className={styles.grid}>
          {results.map((t) => (
            <li key={t.id}>
              <button type="button" className={styles.card} onClick={() => setOpenId(t.id)}>
                <TartanCanvas tartan={t} height={110} thread={3} />
                <span className={styles.body}>
                  <span className={styles.name}>{fullName(t)}</span>
                  <span className={styles.sett}>{t.sett}</span>
                  <span className={styles.meta}>{t.clan}</span>
                  {!t.verified && <Chip variant="calm">pattern unverified</Chip>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
