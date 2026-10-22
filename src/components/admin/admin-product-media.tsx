'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Dialog } from '@/components/dialog';
import { adminError, adminFetch, type AdminProduct, type ProductMedia } from '@/lib/admin-client';
import styles from './admin.module.css';

type MediaConfig = {
  configured: boolean;
  maxImageBytes: number;
  maxVideoBytes: number;
  maxMedia: number;
  maxImages: number;
  maxVideos: number;
};
type UploadTicket = {
  mediaId: string;
  uploadUrl: string;
  fields: Record<string, string>;
  maxBytes: number;
};

export function ProductImportFields({
  onUpload,
  disabled = true,
  maxImages = 5,
  remainingImages = maxImages,
}: {
  onUpload?: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  disabled?: boolean;
  maxImages?: number;
  remainingImages?: number;
}) {
  return (
    <div className={styles.importGrid}>
      <div className={styles.field}>
        <label htmlFor="product-upload-image">Importer des images</label>
        <input
          className={styles.fileInput}
          id="product-upload-image"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          onChange={onUpload}
          disabled={disabled}
          aria-describedby="product-image-help"
        />
        <p id="product-image-help" className={styles.hint}>
          Sélectionnez jusqu’à {maxImages} images depuis votre ordinateur ou téléphone. JPG, PNG,
          WebP, AVIF ou GIF ; 10 Mo par image. {remainingImages} photo(s) encore possible(s) pour ce
          produit.
        </p>
      </div>
    </div>
  );
}

export function AdminProductMedia({
  product,
  onReload,
  onBusyChange,
}: {
  product: AdminProduct;
  onReload: () => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [config, setConfig] = useState<MediaConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const uploadActive = useRef(false);
  const [pendingUpload, setPendingUpload] = useState<{ mediaId: string; alt: string } | null>(null);
  const [remove, setRemove] = useState<ProductMedia | null>(null);
  useEffect(() => {
    onBusyChange?.(busy || uploading || !!pendingUpload);
  }, [busy, uploading, pendingUpload, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  const base = `products/${product.id}/media`;
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    setError('');
    try {
      setConfig(await adminFetch<MediaConfig>('media/config'));
    } catch (error) {
      setError(adminError(error));
    } finally {
      setConfigLoading(false);
    }
  }, []);
  useEffect(() => {
    let current = true;
    adminFetch<MediaConfig>('media/config')
      .then((result) => {
        if (current) setConfig(result);
      })
      .catch((error: unknown) => {
        if (current) setError(adminError(error));
      })
      .finally(() => {
        if (current) setConfigLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  async function confirmUpload(mediaId: string, alt: string) {
    await adminFetch<ProductMedia>(`${base}/${mediaId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ alt }),
    });
    setPendingUpload(null);
    setNotice('Média ajouté et vérifié.');
    await onReload();
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    if (!files.length || !config?.configured || uploadActive.current || busy || pendingUpload)
      return;
    setError('');
    setNotice('');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    const maxImages = Math.min(5, config.maxImages ?? 5);
    const currentCount = product.media.filter((item) => item.type === 'image').length;
    if (
      files.length + currentCount > maxImages ||
      files.length + product.media.length > config.maxMedia
    ) {
      setError(
        `Un produit peut contenir ${maxImages} photos maximum. Vous pouvez encore en ajouter ${Math.max(0, maxImages - currentCount)}.`,
      );
      input.value = '';
      return;
    }
    if (files.some((file) => !allowed.includes(file.type))) {
      setError('Choisissez uniquement des images JPG, PNG, WebP, AVIF ou GIF.');
      input.value = '';
      return;
    }
    const limit = config.maxImageBytes;
    if (files.some((file) => file.size > limit || file.size === 0)) {
      setError('Chaque image doit peser entre 1 octet et 10 Mo. Aucun fichier n’a été envoyé.');
      input.value = '';
      return;
    }
    uploadActive.current = true;
    setBusy(true);
    setUploading(true);
    let completed = 0;
    try {
      for (const file of files) {
        setProgress(`Envoi de l’image ${completed + 1} sur ${files.length}, puis vérification…`);
        const ticket = await adminFetch<UploadTicket>(`${base}/upload-signature`, {
          method: 'POST',
          body: JSON.stringify({ type: 'image' }),
        });
        const url = new URL(ticket.uploadUrl);
        if (
          url.origin !== 'https://api.cloudinary.com' ||
          !/^\/v1_1\/[A-Za-z0-9_-]+\/image\/upload$/.test(url.pathname) ||
          url.search ||
          url.username ||
          url.password ||
          file.size > ticket.maxBytes
        )
          throw new Error();
        setPendingUpload({ mediaId: ticket.mediaId, alt: '' });
        const body = new FormData();
        for (const [key, value] of Object.entries(ticket.fields)) body.append(key, value);
        body.append('file', file);
        const response = await fetch(ticket.uploadUrl, {
          method: 'POST',
          body,
          credentials: 'omit',
          cache: 'no-store',
          signal: AbortSignal.timeout(120000),
        });
        if (!response.ok) throw new Error();
        await confirmUpload(ticket.mediaId, '');
        completed++;
      }
      if (files.length > 1) setNotice(`${completed} images ajoutées et vérifiées.`);
    } catch (error) {
      setError(
        error instanceof Error && 'status' in error
          ? adminError(error)
          : 'Cet envoi n’a pas pu être confirmé. S’il a atteint Cloudinary, utilisez « Vérifier cet envoi » ; sinon, retirez-le avant de réessayer.',
      );
      if (completed > 0)
        setNotice(
          `${completed} image(s) ajoutée(s) et vérifiée(s). Le reste de la sélection n’a pas été confirmé ; résolvez cet envoi avant de sélectionner à nouveau les images restantes.`,
        );
    } finally {
      input.value = '';
      uploadActive.current = false;
      setBusy(false);
      setUploading(false);
      setProgress('');
    }
  }
  async function retryConfirm() {
    if (!pendingUpload) return;
    setBusy(true);
    setError('');
    try {
      await confirmUpload(pendingUpload.mediaId, pendingUpload.alt);
    } catch (error) {
      setError(adminError(error));
    } finally {
      setBusy(false);
    }
  }
  async function discardUpload() {
    if (!pendingUpload) return;
    setBusy(true);
    setError('');
    try {
      const result = await adminFetch<{ deleted: boolean }>(`${base}/${pendingUpload.mediaId}`, {
        method: 'DELETE',
      });
      setPendingUpload(null);
      setNotice(
        result.deleted
          ? 'Envoi retiré.'
          : 'Envoi retiré. Son nettoyage Cloudinary reste en attente.',
      );
      await onReload();
    } catch (error) {
      setError(adminError(error));
    } finally {
      setBusy(false);
    }
  }
  async function deleteMedia() {
    if (!remove) return;
    setBusy(true);
    setError('');
    try {
      const result = await adminFetch<{ deleted: boolean }>(`${base}/${remove.id}`, {
        method: 'DELETE',
      });
      setNotice(
        result.deleted
          ? 'Média supprimé.'
          : 'Média retiré du produit. Sa suppression de Cloudinary reste en attente de nettoyage.',
      );
      setRemove(null);
      await onReload();
    } catch (error) {
      setError(adminError(error));
      setRemove(null);
    } finally {
      setBusy(false);
    }
  }
  async function changeMedia(media: ProductMedia, values: { alt?: string; position?: number }) {
    setBusy(true);
    setError('');
    try {
      await adminFetch(`${base}/${media.id}`, { method: 'PATCH', body: JSON.stringify(values) });
      setNotice('Présentation du média enregistrée.');
      await onReload();
    } catch (error) {
      setError(adminError(error));
    } finally {
      setBusy(false);
    }
  }
  function saveAlt(event: FormEvent<HTMLFormElement>, media: ProductMedia) {
    event.preventDefault();
    void changeMedia(media, {
      alt: String(new FormData(event.currentTarget).get('alt') || '').trim(),
    });
  }
  const media = [...product.media].sort((left, right) => left.position - right.position);
  const maxImages = Math.min(5, config?.maxImages ?? 5);
  const imageCount = product.media.filter((item) => item.type === 'image').length;
  const importDisabled =
    configLoading ||
    !config?.configured ||
    busy ||
    !!pendingUpload ||
    product.media.length >= config.maxMedia;
  return (
    <section className={styles.panel}>
      <div className={styles.headingRow}>
        <h2>Photos du produit</h2>
        <span className={styles.hint}>
          {imageCount} / {maxImages} photos
        </span>
      </div>
      <p className={styles.subtitle}>
        La première photo présente le produit dans la boutique et sa collection. Ajoutez les autres
        vues dans sa galerie.
      </p>
      <p className={styles.hint}>
        Ajoutez jusqu’à cinq photos par produit, en une ou plusieurs sélections. Le produit apparaît
        dans la boutique uniquement après sa publication.
      </p>
      {product.status === 'published' && (
        <p className={styles.notice}>
          Les changements de photos sont immédiatement visibles sur cette fiche publiée. Pour
          préparer toute la fiche en privé, retirez d’abord le produit de la boutique.
        </p>
      )}
      <ProductImportFields
        onUpload={upload}
        disabled={importDisabled || imageCount >= maxImages}
        maxImages={maxImages}
        remainingImages={Math.max(0, maxImages - imageCount)}
      />
      {configLoading ? (
        <p role="status">Vérification des médias…</p>
      ) : !config?.configured ? (
        <div className={styles.notice}>
          <p>
            {config
              ? 'L’ajout de photos est indisponible tant que Cloudinary n’est pas configuré. Vous pouvez enregistrer le produit sans le publier.'
              : 'La disponibilité des médias n’a pas pu être vérifiée. Vous pouvez enregistrer le produit et réessayer plus tard.'}
          </p>
          <button className={styles.secondary} onClick={() => void loadConfig()} disabled={busy}>
            Vérifier à nouveau
          </button>
        </div>
      ) : product.media.length >= config.maxMedia ? (
        <p className={styles.notice}>
          La limite de médias est atteinte. Retirez une photo pour en importer une autre.
        </p>
      ) : imageCount >= maxImages ? (
        <p className={styles.hint}>
          Les cinq photos sont ajoutées. Retirez une photo pour en importer une autre.
        </p>
      ) : null}
      {uploading && (
        <p role="status" className={styles.notice}>
          {progress} Gardez cette page ouverte.
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {pendingUpload && !uploading && (
        <div className={styles.notice}>
          <p>Un envoi reste à vérifier. Il ne sera pas affiché en boutique avant confirmation.</p>
          <div className={styles.actions}>
            <button className={styles.secondary} disabled={busy} onClick={retryConfirm}>
              Vérifier cet envoi
            </button>
            <button className={styles.danger} disabled={busy} onClick={discardUpload}>
              Retirer cet envoi
            </button>
          </div>
        </div>
      )}
      {!!product.pendingMediaCleanup && (
        <p className={styles.notice}>
          Nettoyage de {product.pendingMediaCleanup} média(s) en attente. La suppression Cloudinary
          n’est pas encore confirmée.
        </p>
      )}
      {!media.length ? (
        <p className={styles.hint} style={{ marginTop: 20 }}>
          Aucun média prêt pour ce produit. Ajoutez au moins une photo pour pouvoir le publier.
        </p>
      ) : (
        <div className={styles.mediaGrid}>
          {media.map((item, index) => (
            <article className={styles.mediaCard} key={item.id}>
              {item.type === 'image' ? (
                <Image
                  src={item.url}
                  alt={item.alt || product.name}
                  width={300}
                  height={300}
                  unoptimized
                />
              ) : (
                <p>Ancienne vidéo — vous pouvez la retirer.</p>
              )}
              <p className={styles.hint}>
                {item.type === 'image' ? 'Photo' : 'Vidéo'} {index + 1}
                {index === 0 && item.type === 'image' ? ' · couverture' : ''}
              </p>
              <form onSubmit={(event) => saveAlt(event, item)} className={styles.field}>
                <label htmlFor={`alt-${item.id}`}>Description du média</label>
                <input
                  id={`alt-${item.id}`}
                  name="alt"
                  maxLength={160}
                  defaultValue={item.alt}
                  disabled={busy}
                />
                <button type="submit" className={styles.secondary} disabled={busy}>
                  Enregistrer la description
                </button>
              </form>
              <div className={styles.mediaTools}>
                <button
                  disabled={busy || index === 0}
                  onClick={() => void changeMedia(item, { position: index - 1 })}
                  aria-label={`Avancer le média ${index + 1}`}
                >
                  ←
                </button>
                <button
                  disabled={busy || index === media.length - 1}
                  onClick={() => void changeMedia(item, { position: index + 1 })}
                  aria-label={`Reculer le média ${index + 1}`}
                >
                  →
                </button>
                <button disabled={busy} onClick={() => setRemove(item)}>
                  Retirer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Dialog
        open={!!remove}
        onClose={() => {
          if (!busy) setRemove(null);
        }}
        title="Supprimer le média"
      >
        <h2 className={styles.title}>Retirer ce média ?</h2>
        <p>
          Il sera retiré du produit et sa suppression sera demandée à Cloudinary. Retirer la
          dernière photo d’un produit publié le remet en brouillon.
        </p>
        <div className={styles.actions} style={{ marginTop: 24 }}>
          <button className={styles.danger} onClick={deleteMedia} disabled={busy}>
            {busy ? 'Suppression…' : 'Confirmer le retrait'}
          </button>
          <button className={styles.secondary} onClick={() => setRemove(null)} disabled={busy}>
            Annuler
          </button>
        </div>
      </Dialog>
    </section>
  );
}
