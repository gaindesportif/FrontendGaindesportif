'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, Eye, FileText, LoaderCircle, Save, Upload, Trash2 } from 'lucide-react';
import { adminFetch, adminError } from '@/lib/admin-client';
import {
  articleCategories,
  readingMinutes,
  type AdminArticle,
  type ArticleImage,
} from '@/lib/editorial';
import { ArticleBody } from './article-body';
import { Dialog } from '@/components/dialog';
import styles from './editorial.module.css';
const initial = {
  title: '',
  excerpt: '',
  body: '',
  author: '',
  category: 'actualites',
  featured: false,
};
type Fields = typeof initial;
function photoError(file: File) {
  const supported =
    ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.type) ||
    (!file.type && /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name));
  if (!supported) return 'Choisissez une photo JPG, PNG, WebP, AVIF ou GIF.';
  if (!file.size) return 'Ce fichier est vide. Choisissez une autre photo.';
  if (file.size > 10 * 1024 * 1024)
    return 'Cette photo dépasse 10 Mo. Choisissez une photo plus légère.';
  return '';
}

type Ticket = { id: string; uploadUrl: string; fields: Record<string, string>; maxBytes: number };
export function ArticleEditor({
  id,
  publicEnabled = false,
}: {
  id?: string;
  publicEnabled?: boolean;
}) {
  const router = useRouter();
  const [article, setArticle] = useState<AdminArticle | null>(null),
    [fields, setFields] = useState<Fields>(initial),
    [loading, setLoading] = useState(!!id),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false),
    [remove, setRemove] = useState(false),
    [reload, setReload] = useState(0),
    [file, setFile] = useState<File | null>(null),
    [filePreview, setFilePreview] = useState(''),
    [fileError, setFileError] = useState(''),
    [pending, setPending] = useState<{ articleId: string; ticket: Ticket } | null>(null),
    [imageFields, setImageFields] = useState<
      Record<string, { alt: string; caption: string; credit: string }>
    >({});
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoUrlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    },
    [],
  );
  function clearPhotoSelection() {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    if (photoInputRef.current) photoInputRef.current.value = '';
    setFile(null);
    setFilePreview('');
    setFileError('');
  }
  function selectPhoto(next?: File) {
    if (!next) return;
    clearPhotoSelection();
    const problem = photoError(next);
    if (problem) {
      setFileError(problem);
      return;
    }
    const url = URL.createObjectURL(next);
    photoUrlRef.current = url;
    setFile(next);
    setFilePreview(url);
    setError('');
  }
  function openPhotoPicker() {
    const input = photoInputRef.current;
    if (!input) return;
    input.value = '';
    input.click();
  }

  useEffect(() => {
    if (!id) return;
    let active = true;
    adminFetch<AdminArticle>(`articles/${id}`)
      .then((a) => {
        if (active) {
          setArticle(a);
          setFields({
            title: a.title,
            excerpt: a.excerpt,
            body: a.body,
            category: a.category,
            author: a.author,
            featured: a.featured ?? false,
          });
          setDirty(false);
        }
      })
      .catch((e) => {
        if (active) setError(adminError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, reload]);
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (dirty || file || Object.keys(imageFields).length) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, file, imageFields]);
  function field<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setMessage('');
  }
  async function save(status: 'draft' | 'published', current = article) {
    if (!fields.title.trim()) throw new Error('Donnez un titre à votre article.');
    const data = await adminFetch<AdminArticle>(current ? `articles/${current.id}` : 'articles', {
      method: current ? 'PATCH' : 'POST',
      body: JSON.stringify({ ...fields, status, version: current?.version }),
    });
    setArticle(data);
    setDirty(false);
    return data;
  }
  async function action(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error && !(e as { status?: number }).status ? e.message : adminError(e),
      );
    } finally {
      setBusy('');
    }
  }
  async function store(status: 'draft' | 'published') {
    await action('Enregistrement…', async () => {
      const a = await save(status);
      setMessage(
        status === 'published'
          ? publicEnabled
            ? 'Article publié.'
            : 'Article prêt pour l’ouverture de Gaindé Media.'
          : 'Brouillon enregistré.',
      );
      if (!id) router.replace(`/administration/media/${a.id}`);
    });
  }
  async function upload() {
    await action(pending ? 'Vérification de la photo…' : 'Envoi de la photo…', async () => {
      let a = article;
      if (pending) {
        a = await adminFetch<AdminArticle>(
          `articles/${pending.articleId}/images/${pending.ticket.id}/confirm`,
          { method: 'POST', body: JSON.stringify({ alt: '', caption: '', credit: '' }) },
        );
        setPending(null);
      } else {
        if (!file) throw new Error('Choisissez une photo.');
        const problem = photoError(file);
        if (problem) throw new Error(problem);
        if (!a || dirty) a = await save(a?.status || 'draft');
        const ticket = await adminFetch<Ticket>(`articles/${a.id}/images/upload-signature`, {
          method: 'POST',
          body: '{}',
        });
        const url = new URL(ticket.uploadUrl);
        if (
          url.protocol !== 'https:' ||
          url.hostname !== 'api.cloudinary.com' ||
          !/^\/v1_1\/[\w-]+\/image\/upload$/.test(url.pathname) ||
          url.username ||
          url.password
        )
          throw new Error('Envoi indisponible. Réessayez.');
        if (file.size > ticket.maxBytes) throw new Error('Cette photo est trop volumineuse.');
        const form = new FormData();
        Object.entries(ticket.fields).forEach(([k, v]) => form.append(k, v));
        form.append('file', file);
        const result = await fetch(ticket.uploadUrl, {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(90000),
        });
        if (!result.ok) throw new Error('La photo n’a pas pu être envoyée. Réessayez.');
        setPending({ articleId: a.id, ticket });
        a = await adminFetch<AdminArticle>(`articles/${a.id}/images/${ticket.id}/confirm`, {
          method: 'POST',
          body: JSON.stringify({ alt: '', caption: '', credit: '' }),
        });
        setPending(null);
      }
      setArticle(a);
      clearPhotoSelection();
      setMessage('Photo ajoutée. La première photo illustre l’article.');
      if (!id && a) router.replace(`/administration/media/${a.id}`);
    });
  }
  async function imageAction(image: ArticleImage, removeImage = false) {
    await action(removeImage ? 'Retrait de la photo…' : 'Enregistrement de la photo…', async () => {
      const a = await adminFetch<AdminArticle>(`articles/${article!.id}/images/${image.id}`, {
        method: removeImage ? 'DELETE' : 'PATCH',
        ...(removeImage
          ? {}
          : {
              body: JSON.stringify(
                imageFields[image.id] || {
                  alt: image.alt,
                  caption: image.caption,
                  credit: image.credit,
                },
              ),
            }),
      });
      setArticle(a);
      setImageFields((v) => {
        const next = { ...v };
        delete next[image.id];
        return next;
      });
      setMessage(removeImage ? 'Photo retirée.' : 'Informations de la photo enregistrées.');
    });
  }
  function imageField(image: ArticleImage, key: 'alt' | 'caption' | 'credit', value: string) {
    setImageFields((v) => ({
      ...v,
      [image.id]: {
        ...(v[image.id] || { alt: image.alt, caption: image.caption, credit: image.credit }),
        [key]: value,
      },
    }));
  }
  function insert(prefix: string) {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? fields.body.length;
    const end = el?.selectionEnd ?? start;
    field(
      'body',
      `${fields.body.slice(0, start)}\n\n${prefix}${fields.body.slice(start, end)}${fields.body.slice(end)}`,
    );
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + 2 + prefix.length, start + 2 + prefix.length);
    });
  }
  if (loading)
    return (
      <div className={styles.root}>
        <p role="status">Ouverture du brouillon…</p>
      </div>
    );
  if (id && !article)
    return (
      <div className={styles.root}>
        <h1 className={styles.adminTitle}>Article indisponible</h1>
        <p role="alert" className={styles.notice}>
          {error}
        </p>
        <button
          className={styles.secondary}
          onClick={() => (setLoading(true), setError(''), setReload((v) => v + 1))}
        >
          Réessayer
        </button>
        <Link className={styles.secondary} href="/administration/media">
          Tous les articles
        </Link>
      </div>
    );
  const images = article?.images || [];
  return (
    <div className={styles.root}>
      <Link className={styles.back} href="/administration/media">
        ← La rédaction
      </Link>
      <header className={styles.adminHeader}>
        <div>
          <p className={styles.kicker}>Gaindé Media · La rédaction</p>
          <h1 className={styles.adminTitle}>{id ? 'Votre article' : 'Une nouvelle histoire'}</h1>
          <p className={styles.hint}>
            {article?.status === 'published' ? 'Publié' : 'Brouillon privé'} ·{' '}
            {dirty ? 'Modifications non enregistrées' : 'Prêt à écrire'}
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => setPreview((v) => !v)}>
            {preview ? <FileText size={16} /> : <Eye size={16} />} {preview ? 'Écrire' : 'Aperçu'}
          </button>
          <button
            className={styles.button}
            disabled={!!busy || !!pending || !!Object.keys(imageFields).length}
            onClick={() => void store(article?.status || 'draft')}
          >
            <Save size={16} />
            Enregistrer
          </button>
        </div>
      </header>
      {!publicEnabled && (
        <p className={styles.notice}>
          La consultation publique de Gaindé Media n’est pas encore ouverte. Vous pouvez préparer
          vos articles et les consulter dans l’aperçu.
        </p>
      )}
      {error && (
        <p role="alert" className={`${styles.notice} ${styles.error}`}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={styles.notice}>
          <Check size={15} style={{ display: 'inline', marginRight: 8 }} />
          {message}
        </p>
      )}
      {busy && (
        <p role="status" className={styles.notice}>
          <LoaderCircle size={16} style={{ display: 'inline', marginRight: 8 }} />
          {busy}
        </p>
      )}
      {preview ? (
        <div className={`${styles.panel} ${styles.preview}`}>
          {fields.featured && <p className={styles.featureBadge}>À la une</p>}
          <p className={styles.category}>
            {articleCategories[fields.category as keyof typeof articleCategories]}
          </p>
          <h2 className={styles.articleTitle}>{fields.title || 'Le titre de votre article'}</h2>
          {fields.excerpt && <p className={styles.lead}>{fields.excerpt}</p>}
          {fields.author && <p className={styles.hint}>Par {fields.author}</p>}
          {images[0] && (
            <Image
              src={images[0].url}
              alt={images[0].alt || fields.title}
              width={1000}
              height={625}
              unoptimized
              className={styles.articlePhoto}
            />
          )}
          <ArticleBody body={fields.body} />
        </div>
      ) : (
        <fieldset
          disabled={!!busy || !!pending}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <div className={styles.editor}>
            <div className={`${styles.panel} ${styles.stack}`}>
              <label className={styles.label}>
                Titre de l’article
                <textarea
                  className={`${styles.input} ${styles.editorTitle}`}
                  value={fields.title}
                  maxLength={160}
                  onChange={(e) => field('title', e.target.value)}
                  placeholder="L’histoire commence ici…"
                />
                <span className={styles.hint}>{fields.title.length}/160 caractères</span>
              </label>
              <label className={styles.label}>
                Introduction{' '}
                <span className={styles.hint}>
                  Facultative · le texte court qui donne envie de lire.
                </span>
                <textarea
                  className={styles.input}
                  rows={3}
                  value={fields.excerpt}
                  maxLength={400}
                  onChange={(e) => field('excerpt', e.target.value)}
                />
              </label>
              <div>
                <div className={styles.toolbar}>
                  <span className={styles.label}>Le récit</span>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => insert('## ')}
                    >
                      Intertitre
                    </button>
                    <button type="button" className={styles.secondary} onClick={() => insert('> ')}>
                      Citation
                    </button>
                  </div>
                </div>
                <label className={styles.label}>
                  <span className={styles.hint}>
                    Séparez les paragraphes par une ligne vide. ## introduit un intertitre ; &gt;
                    une citation. Le texte est affiché sans HTML.
                  </span>
                  <textarea
                    ref={bodyRef}
                    aria-label="Texte de l’article"
                    className={`${styles.input} ${styles.textarea}`}
                    value={fields.body}
                    onChange={(e) => field('body', e.target.value)}
                    placeholder="Racontez, prenez votre temps…"
                  />
                  <span className={styles.hint}>
                    {readingMinutes(fields.body)} min de lecture estimée · sans limite éditoriale de
                    longueur
                  </span>
                </label>
              </div>
            </div>
            <aside className={styles.stack}>
              <div className={`${styles.panel} ${styles.stack}`}>
                <label className={styles.label}>
                  Rubrique
                  <select
                    className={styles.input}
                    value={fields.category}
                    onChange={(e) => field('category', e.target.value)}
                  >
                    {Object.entries(articleCategories).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.label}>
                  Auteur <span className={styles.hint}>Facultatif</span>
                  <input
                    className={styles.input}
                    maxLength={100}
                    value={fields.author}
                    onChange={(e) => field('author', e.target.value)}
                  />
                </label>
                <label className={styles.featureChoice}>
                  <input
                    type="checkbox"
                    checked={fields.featured}
                    onChange={(e) => field('featured', e.target.checked)}
                    aria-describedby="article-featured-help"
                  />
                  <span>Mettre cet article à la une</span>
                </label>
                <p id="article-featured-help" className={styles.hint}>
                  Une seule publication à la une à la fois. Elle apparaîtra en premier dans Gaindé
                  Media ; un nouveau choix remplacera le précédent.
                </p>
                <p className={styles.hint}>
                  Un texte et au moins une photo sont nécessaires pour publier. Les brouillons
                  restent privés.
                </p>
                <button
                  type="button"
                  className={styles.button}
                  disabled={
                    !fields.body.trim() ||
                    !images.length ||
                    !fields.title.trim() ||
                    !!Object.keys(imageFields).length
                  }
                  onClick={() =>
                    void store(article?.status === 'published' ? 'draft' : 'published')
                  }
                >
                  {article?.status === 'published' ? 'Repasser en brouillon' : 'Publier l’article'}
                </button>
              </div>
              <section
                className={`${styles.panel} ${styles.stack}`}
                aria-label="Photos de l’article"
              >
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Les photos</h2>
                  <p className={styles.hint}>
                    La première est la photo principale. Jusqu’à 10 photos, 10 Mo chacune.
                  </p>
                </div>
                <div className={styles.upload}>
                  <Upload size={24} />
                  <input
                    ref={photoInputRef}
                    id="article-photo-file"
                    aria-label="Ajouter une photo"
                    aria-describedby="article-photo-help"
                    type="file"
                    hidden
                    accept=".jpg,.jpeg,.png,.webp,.avif,.gif,image/jpeg,image/png,image/webp,image/avif,image/gif"
                    onChange={(e) => selectPhoto(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    className={styles.button}
                    aria-controls="article-photo-file"
                    onClick={openPhotoPicker}
                    disabled={images.length >= 10}
                  >
                    {file ? 'Changer de photo' : 'Choisir une photo'}
                  </button>
                  <p id="article-photo-help" className={styles.hint}>
                    JPG, PNG, WebP, AVIF ou GIF · 10 Mo maximum.
                  </p>
                  {fileError && (
                    <p role="alert" className={styles.fileError}>
                      {fileError}
                    </p>
                  )}
                  {file && (
                    <div className={styles.selectedPhoto}>
                      {filePreview && (
                        <Image
                          src={filePreview}
                          alt="Aperçu de la photo sélectionnée"
                          width={500}
                          height={320}
                          unoptimized
                          className={styles.thumbnail}
                        />
                      )}
                      <p className={styles.fileName}>{file.name}</p>
                      <p className={styles.hint} role="status">
                        Photo sélectionnée ·{' '}
                        {new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 1 }).format(
                          file.size / 1024,
                        )}{' '}
                        Ko
                      </p>
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={clearPhotoSelection}
                      >
                        Annuler cette sélection
                      </button>
                    </div>
                  )}
                  {images.length >= 10 && (
                    <p className={styles.hint}>
                      Les dix photos sont déjà ajoutées. Retirez-en une pour en ajouter une autre.
                    </p>
                  )}
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={!file || images.length >= 10}
                    onClick={() => void upload()}
                  >
                    Envoyer la photo
                  </button>
                  <span className={styles.hint}>
                    {file
                      ? 'L’article sera enregistré avant l’envoi.'
                      : 'Choisissez d’abord une photo pour activer l’envoi.'}
                  </span>
                </div>
                <div className={styles.imageGrid}>
                  {images.map((image, i) => (
                    <div key={image.id} className={styles.imageEditor}>
                      <p className={styles.category}>
                        {i === 0 ? 'Photo principale' : `Photo ${i + 1}`}
                      </p>
                      <Image
                        src={image.url}
                        alt={image.alt || fields.title}
                        width={500}
                        height={320}
                        unoptimized
                        className={styles.thumbnail}
                      />
                      {(['alt', 'caption', 'credit'] as const).map((key) => (
                        <label className={styles.label} key={key}>
                          {key === 'alt'
                            ? 'Description de l’image'
                            : key === 'caption'
                              ? 'Légende'
                              : 'Photographe / crédit'}
                          <span className={styles.hint}>Facultatif</span>
                          <input
                            className={styles.input}
                            maxLength={key === 'alt' ? 200 : key === 'caption' ? 300 : 100}
                            value={imageFields[image.id]?.[key] ?? image[key]}
                            onChange={(e) => imageField(image, key, e.target.value)}
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={!imageFields[image.id]}
                        onClick={() => void imageAction(image)}
                      >
                        Enregistrer les informations
                      </button>
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={article?.status === 'published' && images.length === 1}
                        onClick={() => void imageAction(image, true)}
                      >
                        <Trash2 size={14} />
                        Retirer la photo
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </fieldset>
      )}
      {pending && (
        <div className={styles.notice}>
          <p>Photo envoyée. Sa vérification doit être confirmée avant de continuer.</p>
          <button className={styles.secondary} disabled={!!busy} onClick={() => void upload()}>
            Réessayer la vérification
          </button>
        </div>
      )}
      {article && (
        <div className={styles.footerActions}>
          <button className={styles.secondary} disabled={!!busy} onClick={() => setRemove(true)}>
            <Trash2 size={15} />
            Supprimer l’article
          </button>
        </div>
      )}
      <Dialog
        open={remove}
        onClose={() => {
          if (!busy) setRemove(false);
        }}
        title="Supprimer cet article ?"
      >
        <p>L’article sera retiré et ses photos supprimées. Cette action est définitive.</p>
        <div className={styles.actions}>
          <button className={styles.secondary} disabled={!!busy} onClick={() => setRemove(false)}>
            Conserver l’article
          </button>
          <button
            className={styles.button}
            disabled={!!busy}
            onClick={() =>
              void action('Suppression…', async () => {
                await adminFetch(`articles/${article!.id}`, { method: 'DELETE' });
                setDirty(false);
                router.push('/administration/media');
              })
            }
          >
            Supprimer définitivement
          </button>
        </div>
      </Dialog>
    </div>
  );
}
