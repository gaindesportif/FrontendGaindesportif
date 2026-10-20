'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adminError, adminFetch, type AdminProduct } from '@/lib/admin-client';
import { AdminProductMedia, ProductImportFields } from './admin-product-media';
import { categoryLabels } from './admin-products';
import styles from './admin.module.css';

export function AdminProductForm({ id }: { id?: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [publication, setPublication] = useState('draft');
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const next = await adminFetch<AdminProduct>(`products/${id}`);
      setProduct(next);
      setPublication(next.status);
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
          setPublication(result.status);
          setError('');
        }
      })
      .catch((error: unknown) => {
        if (current) setError(adminError(error));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [id]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const price = String(data.get('priceXof') || '').trim();
    const status = String(data.get('status') || 'draft');
    if (
      status === 'published' &&
      (!price || Number(price) <= 0 || !product?.media.some((media) => media.type === 'image'))
    ) {
      setError('Pour publier, renseignez un prix positif et ajoutez au moins une photo.');
      return;
    }
    const list = (name: string) => [
      ...new Set(
        String(data.get(name) || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    const sizes = list('sizes');
    const colors = list('colors');
    if (
      [sizes, colors].some(
        (values) => values.length > 20 || values.some((value) => value.length > 40),
      )
    ) {
      setError(
        'Tailles et couleurs : 20 choix maximum par champ, avec 40 caractères maximum par choix.',
      );
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    const body = {
      name: String(data.get('name') || '').trim(),
      description: String(data.get('description') || '').trim(),
      category: data.get('category'),
      priceXof: price ? Number(price) : null,
      sizes,
      colors,
      availability: data.get('availability'),
      status,
    };
    try {
      const saved = await adminFetch<AdminProduct>(id ? `products/${id}` : 'products', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      if (!id) router.replace(`/administration/produits/${saved.id}`);
      setProduct(saved);
      setPublication(saved.status);
      setSuccess(
        saved.status === 'published'
          ? 'Produit enregistré et publié dans la boutique.'
          : 'Brouillon enregistré. Il reste privé.',
      );
    } catch (error) {
      setError(adminError(error));
    } finally {
      setBusy(false);
    }
  }
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
      <h1 className={styles.title}>{id ? 'Modifier le produit' : 'Ajouter un produit'}</h1>
      <p className={styles.subtitle}>
        {id
          ? 'Les modifications d’un produit publié sont visibles après enregistrement.'
          : 'Commencez par un brouillon. Ajoutez ensuite les photos et vidéos avant de publier.'}
      </p>
      {product?.status === 'deleting' ? (
        <p className={styles.notice}>
          Ce produit est retiré de la boutique. Le nettoyage de ses médias est en cours. Revenez à
          la liste pour le relancer.
        </p>
      ) : (
        <>
          <section className={styles.panel}>
            <h2>Informations du produit</h2>
            <form onSubmit={submit} className={styles.form} key={product?.id || 'new'}>
              <fieldset disabled={busy} className={styles.form}>
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
                    aria-describedby="description-help"
                  />
                  <p id="description-help" className={styles.hint}>
                    Matière, coupe, entretien, contenu et précisions utiles. Texte simple, sans code
                    HTML.
                  </p>
                </div>
                <div className={styles.grid}>
                  <div className={styles.field}>
                    <label htmlFor="product-category">Catégorie</label>
                    <select
                      id="product-category"
                      name="category"
                      defaultValue={product?.category || 'senegal'}
                      aria-describedby="category-help"
                    >
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <p id="category-help" className={styles.hint}>
                      Après publication, le produit apparaîtra dans la boutique et dans cette
                      collection.
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="product-price">Prix en F CFA (XOF)</label>
                    <input
                      id="product-price"
                      name="priceXof"
                      inputMode="numeric"
                      type="number"
                      min={1}
                      step={1}
                      max={2147483647}
                      defaultValue={product?.priceXof ?? ''}
                      aria-describedby="price-help"
                    />
                    <p id="price-help" className={styles.hint}>
                      Montant entier réellement proposé. Facultatif tant que le produit reste en
                      brouillon.
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="product-sizes">Tailles proposées</label>
                    <input
                      id="product-sizes"
                      name="sizes"
                      maxLength={850}
                      defaultValue={product?.sizes.join(', ')}
                      aria-describedby="sizes-help"
                    />
                    <p id="sizes-help" className={styles.hint}>
                      Séparez les tailles par une virgule. Laissez vide si ce produit n’en a pas.
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="product-colors">Couleurs proposées</label>
                    <input
                      id="product-colors"
                      name="colors"
                      maxLength={850}
                      defaultValue={product?.colors.join(', ')}
                      aria-describedby="colors-help"
                    />
                    <p id="colors-help" className={styles.hint}>
                      Séparez les couleurs par une virgule. Indiquez uniquement les choix réellement
                      proposés.
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="product-availability">Disponibilité</label>
                    <select
                      id="product-availability"
                      name="availability"
                      defaultValue={product?.availability || 'on_request'}
                    >
                      <option value="on_request">À confirmer sur WhatsApp</option>
                      <option value="available">Disponible</option>
                      <option value="unavailable">Indisponible</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="product-status">Publication</label>
                    <select
                      id="product-status"
                      name="status"
                      value={publication}
                      onChange={(event) => setPublication(event.target.value)}
                    >
                      <option value="draft">Brouillon — privé</option>
                      {id && <option value="published">Publié — visible dans la boutique</option>}
                    </select>
                  </div>
                </div>
              </fieldset>
              {error && (
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
                <button className={styles.button} type="submit" disabled={busy}>
                  {busy
                    ? 'Enregistrement…'
                    : id
                      ? 'Enregistrer les modifications'
                      : 'Créer le brouillon'}
                </button>
                {product?.status === 'published' && (
                  <Link className={styles.secondary} href={`/boutique/${product.slug}`}>
                    Voir le produit
                  </Link>
                )}
              </div>
            </form>
          </section>
          {id && product ? (
            <AdminProductMedia product={product} onReload={load} />
          ) : (
            <section className={styles.panel}>
              <h2>Photos et vidéos</h2>
              <p className={styles.subtitle}>
                Créez d’abord le brouillon avec le bouton ci-dessus. Vous pourrez ensuite importer
                les photos et vidéos de votre produit ici.
              </p>
              <ProductImportFields />
            </section>
          )}
        </>
      )}
    </>
  );
}
