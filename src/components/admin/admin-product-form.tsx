'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Dialog } from '@/components/dialog';
import { useCategories } from '@/components/catalogue/categories-provider';
import { adminError, adminFetch, formatAdminPrice, type AdminProduct } from '@/lib/admin-client';
import { AdminProductMedia } from './admin-product-media';
import styles from './admin.module.css';

type Fields = {
  name: string;
  description: string;
  category: string;
  priceXof: number | null;
  stockQuantity: number | null;
  sizes: string[];
  colors: string[];
};
export function AdminProductForm({ id }: { id?: string }) {
  const router = useRouter();
  const { categories, reload: reloadCategories } = useCategories();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [category, setCategory] = useState('');
  const [extraCategory, setExtraCategory] = useState<{ value: string; label: string } | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [preview, setPreview] = useState<{ product: AdminProduct; fields: Fields } | null>(null);
  const load = useCallback(async () => {
    if (!id) return;
    try {
      setProduct(await adminFetch<AdminProduct>(`products/${id}`));
      setError('');
    } catch (error) {
      setError(adminError(error));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    if (!id) return;
    let current = true;
    adminFetch<AdminProduct>(`products/${id}`)
      .then((result) => {
        if (current) {
          setProduct(result);
          setCategory(result.category);
          setError('');
        }
      })
      .catch((error) => {
        if (current) setError(adminError(error));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [id]);
  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setCategoryBusy(true);
    setCategoryError('');
    try {
      const created = await adminFetch<{ value: string; label: string }>('categories', {
        method: 'POST',
        body: JSON.stringify({ name: String(new FormData(form).get('categoryName') || '').trim() }),
      });
      setExtraCategory(created);
      setCategory(created.value);
      await reloadCategories();
      setCategoryOpen(false);
      form.reset();
    } catch (error) {
      setCategoryError(adminError(error));
    } finally {
      setCategoryBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action =
      ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value ||
      (id ? 'preview' : 'continue');
    const data = new FormData(event.currentTarget);
    const price = String(data.get('priceXof') || '').trim(),
      stock = String(data.get('stockQuantity') || '').trim();
    const list = (key: string) => [
      ...new Set(
        String(data.get(key) || '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ];
    const fields: Fields = {
      name: String(data.get('name') || '').trim(),
      description: String(data.get('description') || '').trim(),
      category,
      priceXof: price ? Number(price) : null,
      stockQuantity: stock ? Number(stock) : null,
      sizes: list('sizes'),
      colors: list('colors'),
    };
    setError('');
    setSuccess('');
    if (
      [fields.sizes, fields.colors].some(
        (values) => values.length > 20 || values.some((v) => v.length > 40),
      )
    ) {
      setError('Tailles et couleurs : 20 choix maximum et 40 caractères par choix.');
      return;
    }
    if (!options.some((item) => item.value === category)) {
      setError('Choisissez une catégorie ou créez-en une.');
      return;
    }
    if (action === 'preview') {
      if (
        !product ||
        !fields.priceXof ||
        fields.priceXof < 1 ||
        fields.stockQuantity === null ||
        !Number.isInteger(fields.stockQuantity) ||
        fields.stockQuantity < 0 ||
        !product.media.some((m) => m.type === 'image')
      ) {
        setError('Avant de publier, renseignez le prix, le stock et ajoutez au moins une photo.');
        return;
      }
      setPreview({
        fields,
        product: {
          ...product,
          ...fields,
          categoryLabel: options.find((item) => item.value === category)?.label,
          status: 'published',
        },
      });
      return;
    }
    setBusy(true);
    try {
      const saved = await adminFetch<AdminProduct>(id ? `products/${id}` : 'products', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...fields, status: 'draft' }),
      });
      setProduct(saved);
      if (!id) router.replace(`/administration/produits/${saved.id}`);
      setSuccess('Informations enregistrées. Le produit reste privé jusqu’à sa publication.');
    } catch (error) {
      setError(adminError(error));
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!preview || !product) return;
    setBusy(true);
    setError('');
    try {
      const saved = await adminFetch<AdminProduct>(`products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...preview.fields, status: 'published' }),
      });
      setProduct(saved);
      setPreview(null);
      setSuccess('Produit publié dans la boutique.');
    } catch (error) {
      setError(adminError(error));
    } finally {
      setBusy(false);
    }
  }
  async function withdraw() {
    if (!product) return;
    setBusy(true);
    setError('');
    try {
      setProduct(
        await adminFetch<AdminProduct>(`products/${product.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'draft' }),
        }),
      );
      setSuccess('Produit retiré de la boutique. Vous pouvez le préparer avant de le republier.');
    } catch (error) {
      setError(adminError(error));
    } finally {
      setBusy(false);
    }
  }
  const options = [
    ...categories,
    ...(extraCategory && !categories.some((item) => item.value === extraCategory.value)
      ? [extraCategory]
      : []),
  ];
  if (loading)
    return (
      <p role="status" className={styles.panel}>
        Chargement du produit…
      </p>
    );
  if (id && !product)
    return (
      <div role="alert" className={styles.error}>
        {error || 'Produit indisponible.'}
        <button className={styles.secondary} onClick={() => void load()}>
          Réessayer
        </button>
      </div>
    );
  return (
    <>
      <Link className={styles.secondary} href="/administration">
        ← Tous les produits
      </Link>
      <h1 className={styles.title}>{id ? 'Préparer le produit' : 'Ajouter un produit'}</h1>
      <p className={styles.subtitle}>
        1. Renseignez les informations · 2. Ajoutez les photos · 3. Vérifiez l’aperçu et publiez.
      </p>
      {product?.status === 'deleting' ? (
        <p className={styles.notice}>
          Ce produit est retiré de la boutique. Le nettoyage de ses photos est en cours.
        </p>
      ) : (
        <>
          <section className={styles.panel}>
            <h2>Informations du produit</h2>
            <form onSubmit={submit} className={styles.form} key={product?.id || 'new'}>
              <fieldset disabled={busy || mediaBusy} className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="product-name">Nom du produit</label>
                  <input
                    id="product-name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={160}
                    defaultValue={product?.name}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="product-description">Description et détails</label>
                  <textarea
                    id="product-description"
                    name="description"
                    rows={6}
                    maxLength={5000}
                    defaultValue={product?.description}
                  />
                  <p className={styles.hint}>
                    Matière, coupe, entretien et contenu. Indiquez les informations réellement
                    proposées.
                  </p>
                </div>
                <div className={styles.grid}>
                  <div className={styles.field}>
                    <label htmlFor="product-category">Catégorie</label>
                    <select
                      id="product-category"
                      name="category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      required
                    >
                      {!options.some((item) => item.value === category) && (
                        <option value="">Choisir une catégorie</option>
                      )}
                      {options.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => {
                        setCategoryError('');
                        setCategoryOpen(true);
                      }}
                    >
                      Créer une catégorie
                    </button>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="product-price">Prix en F CFA (XOF)</label>
                    <input
                      id="product-price"
                      name="priceXof"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={2147483647}
                      step={1}
                      defaultValue={product?.priceXof ?? ''}
                    />
                    <p className={styles.hint}>Prix entier requis avant publication.</p>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="product-stock">Stock total disponible</label>
                    <input
                      id="product-stock"
                      name="stockQuantity"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={2147483647}
                      step={1}
                      defaultValue={product?.stockQuantity ?? ''}
                      aria-describedby="stock-help"
                    />
                    <p id="stock-help" className={styles.hint}>
                      Total toutes tailles et couleurs confondues. Zéro indique une rupture.
                      Actualisez ce nombre après chaque vente confirmée ; une demande WhatsApp ne
                      réserve pas d’article.
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="product-sizes">Tailles proposées</label>
                    <input
                      id="product-sizes"
                      name="sizes"
                      maxLength={850}
                      defaultValue={product?.sizes.join(', ')}
                    />
                    <p className={styles.hint}>
                      Séparez les tailles par une virgule. Laissez vide si le produit n’en a pas.
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="product-colors">Couleurs proposées</label>
                    <input
                      id="product-colors"
                      name="colors"
                      maxLength={850}
                      defaultValue={product?.colors.join(', ')}
                    />
                    <p className={styles.hint}>
                      Séparez les couleurs par une virgule. Indiquez les choix réellement proposés.
                    </p>
                  </div>
                </div>
              </fieldset>
              {error && !preview && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className={styles.success} role="status">
                  {success}
                </p>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.button}
                  type="submit"
                  value={id ? 'preview' : 'continue'}
                  disabled={busy || mediaBusy}
                >
                  {busy
                    ? 'Enregistrement…'
                    : id
                      ? 'Publier le produit'
                      : 'Continuer vers les photos'}
                </button>
                {id && (product?.status !== 'published' || product.publicationReady === false) && (
                  <button
                    className={styles.secondary}
                    type="submit"
                    value="save"
                    disabled={busy || mediaBusy}
                  >
                    Enregistrer sans publier
                  </button>
                )}
                {product?.status === 'published' && product.publicationReady !== false && (
                  <>
                    <Link className={styles.secondary} href={`/boutique/${product.slug}`}>
                      Voir le produit
                    </Link>
                    <button
                      className={styles.secondary}
                      type="button"
                      disabled={busy || mediaBusy}
                      onClick={() => void withdraw()}
                    >
                      Retirer de la boutique
                    </button>
                  </>
                )}
              </div>
            </form>
          </section>
          {id && product ? (
            <AdminProductMedia product={product} onReload={load} onBusyChange={setMediaBusy} />
          ) : (
            <section className={styles.panel}>
              <h2>Photos du produit</h2>
              <p>
                Renseignez les informations, puis cliquez sur « Continuer vers les photos ». Le
                produit restera privé pendant sa préparation.
              </p>
            </section>
          )}
        </>
      )}
      <Dialog
        open={categoryOpen}
        onClose={() => {
          if (!categoryBusy) setCategoryOpen(false);
        }}
        title="Créer une catégorie"
        className={styles.categoryDialog}
      >
        <h2>Créer une catégorie</h2>
        <form onSubmit={createCategory} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="new-category">Nom de la catégorie</label>
            <input
              id="new-category"
              name="categoryName"
              minLength={2}
              maxLength={80}
              required
              disabled={categoryBusy}
            />
          </div>
          {categoryError && (
            <p role="alert" className={styles.error}>
              {categoryError}
            </p>
          )}
          <button className={styles.button} disabled={categoryBusy}>
            {categoryBusy ? 'Création…' : 'Créer la catégorie'}
          </button>
        </form>
      </Dialog>
      <Dialog
        open={!!preview}
        onClose={() => {
          if (!busy) setPreview(null);
        }}
        title="Aperçu avant publication"
        className={styles.productPreview}
      >
        {preview && (
          <>
            <h2>Aperçu avant publication</h2>
            <p>
              Vérifiez les photos, le prix et les informations. Le produit sera visible dans la
              boutique après confirmation.
            </p>
            <div className={styles.previewGrid}>
              <div>
                {preview.product.media
                  .filter((m) => m.type === 'image')
                  .map((media, index) => (
                    <Image
                      key={media.id}
                      unoptimized
                      src={media.url}
                      alt={media.alt || preview.product.name}
                      width={640}
                      height={640}
                      sizes="(max-width:650px) 85vw,40vw"
                      className={index === 0 ? styles.previewCover : styles.previewThumb}
                    />
                  ))}
              </div>
              <div>
                <p>{preview.product.categoryLabel}</p>
                <h3>{preview.product.name}</h3>
                <strong>{formatAdminPrice(preview.product.priceXof)}</strong>
                <p>
                  {preview.product.stockQuantity === 0
                    ? 'Rupture de stock'
                    : `${preview.product.stockQuantity} article(s) en stock au total`}
                </p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{preview.product.description}</p>
                {preview.product.sizes.length > 0 && (
                  <p>Tailles : {preview.product.sizes.join(', ')}</p>
                )}
                {preview.product.colors.length > 0 && (
                  <p>Couleurs : {preview.product.colors.join(', ')}</p>
                )}
              </div>
            </div>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <button className={styles.secondary} disabled={busy} onClick={() => setPreview(null)}>
                Revenir aux modifications
              </button>
              <button className={styles.button} disabled={busy} onClick={() => void publish()}>
                {busy ? 'Publication…' : 'Confirmer la publication'}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
