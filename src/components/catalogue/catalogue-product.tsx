'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, MessageCircle, Minus, Plus } from 'lucide-react';
import {
  catalogueCategoryLabel,
  formatXof,
  productWhatsappUrl,
  publicProductSchema,
  type PublicProduct,
} from '@/lib/catalogue';
import { useCatalogueResource } from './use-catalogue-resource';
import { CatalogueState } from './catalogue-state';
import { CatalogueImage } from './catalogue-image';
import styles from './catalogue.module.css';
import { SaveProductButton } from './save-product-button';
import { CustomerProductActivity } from './customer-product-activity';
import { useCustomer } from '@/components/account/customer-provider';
import { customerFetch } from '@/lib/customer-client';

function ProductGallery({ product }: { product: PublicProduct }) {
  const media = [...product.media].sort((a, b) => a.position - b.position);
  const [selectedId, setSelectedId] = useState(media[0].id);
  const selected = media.find((item) => item.id === selectedId) || media[0];
  return (
    <div className={styles.gallery} role="group" aria-label="Galerie du produit">
      <div className={styles.mainMedia}>
        <CatalogueImage
          key={selected.id}
          media={{ ...selected, alt: selected.alt || product.name }}
          sizes="(max-width:650px) 90vw,50vw"
          priority
        />
      </div>
      {media.length > 1 && (
        <div className={styles.thumbnails} role="group" aria-label="Choisir une photo">
          {media.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={styles.thumbnail}
              aria-pressed={item.id === selected.id}
              aria-label={`Voir la photo ${index + 1}${item.alt ? ` : ${item.alt}` : ''}`}
              onClick={() => setSelectedId(item.id)}
            >
              <CatalogueImage media={{ ...item, alt: '' }} sizes="74px" />
            </button>
          ))}
        </div>
      )}
      <p className={styles.caption} aria-live="polite">
        Photo {media.indexOf(selected) + 1} sur {media.length}
        {selected.alt ? ` · ${selected.alt}` : ''}
      </p>
    </div>
  );
}

function ProductRequest({ product }: { product: PublicProduct }) {
  const { user, status } = useCustomer();
  const identity = useRef(user?.id);
  useLayoutEffect(() => {
    identity.current = user?.id;
  }, [user?.id]);
  const [historyNotice, setHistoryNotice] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin));
  const maximum = Math.min(99, product.stockQuantity);
  const amount = Number(quantity);
  const validQuantity = Number.isInteger(amount) && amount >= 1 && amount <= maximum;
  // L'URL publique courante est obtenue après hydratation ; aucun secret de configuration exposé.
  const whatsapp = origin
    ? productWhatsappUrl(product, { quantity: amount, size, color }, origin)
    : null;
  function rememberWhatsapp() {
    if (status !== 'authenticated' || !user || !whatsapp) return;
    const accountId = user.id;
    setHistoryNotice('');
    // L’ancre ouvre WhatsApp normalement ; cette écriture ne prétend pas envoyer le message.
    void customerFetch('requests', {
      method: 'POST',
      body: JSON.stringify({
        productId: product.id,
        quantity: amount,
        ...(size ? { size } : {}),
        ...(color ? { color } : {}),
        requestKey: crypto.randomUUID(),
      }),
    })
      .then(() => {
        if (identity.current === accountId)
          setHistoryNotice(
            'Demande préparée ajoutée à votre historique. L’envoi reste à effectuer dans WhatsApp.',
          );
      })
      .catch(() => {
        if (identity.current === accountId)
          setHistoryNotice(
            'WhatsApp reste accessible, mais l’ajout à votre historique n’a pas pu être confirmé.',
          );
      });
  }
  if (product.stockQuantity === 0 || product.availability === 'unavailable')
    return (
      <div className={styles.order}>
        <p>
          <strong>Rupture de stock.</strong>
        </p>
        <p>Ce produit ne peut pas faire l’objet d’une demande de commande pour le moment.</p>
        <Link href="/boutique" className={styles.textLink}>
          Découvrir les autres produits
        </Link>
      </div>
    );
  const missingOptions =
    (product.sizes.length > 0 && !size) || (product.colors.length > 0 && !color);
  return (
    <div className={styles.options}>
      {product.sizes.length > 0 && (
        <div className={styles.field}>
          <label htmlFor="product-size">Taille souhaitée</label>
          <select id="product-size" value={size} onChange={(event) => setSize(event.target.value)}>
            <option value="">Choisir une taille</option>
            {product.sizes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      )}
      {product.colors.length > 0 && (
        <div className={styles.field}>
          <label htmlFor="product-color">Couleur souhaitée</label>
          <select
            id="product-color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          >
            <option value="">Choisir une couleur</option>
            {product.colors.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={styles.quantity}>
        <label htmlFor="product-quantity">Quantité souhaitée</label>
        <div className={styles.quantityControl}>
          <button
            type="button"
            aria-label="Diminuer la quantité"
            disabled={!validQuantity || amount <= 1}
            onClick={() => setQuantity(String(amount - 1))}
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <input
            id="product-quantity"
            type="number"
            min="1"
            max={maximum}
            step="1"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-invalid={!validQuantity}
            aria-describedby={!validQuantity ? 'quantity-error' : undefined}
          />
          <button
            type="button"
            aria-label="Augmenter la quantité"
            disabled={!validQuantity || amount >= maximum}
            onClick={() => setQuantity(String(amount + 1))}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles.order}>
        {!validQuantity && (
          <p className={styles.hint} id="quantity-error" role="status">
            Choisissez une quantité entière de 1 à {maximum}.
          </p>
        )}
        {missingOptions && (
          <p>
            Choisissez {product.sizes.length > 0 && !size ? 'votre taille' : ''}
            {product.sizes.length > 0 && !size && product.colors.length > 0 && !color ? ' et ' : ''}
            {product.colors.length > 0 && !color ? 'votre couleur' : ''} pour préparer la demande.
          </p>
        )}
        {validQuantity && (
          <p>
            Sous-total produits : <strong>{formatXof(product.priceXof * amount)}</strong>
          </p>
        )}
        {whatsapp ? (
          <a
            data-testid="product-whatsapp"
            onClick={rememberWhatsapp}
            className="button button-dark"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            Commander sur WhatsApp <MessageCircle size={20} aria-hidden="true" />
          </a>
        ) : (
          <button type="button" className="button button-dark" disabled>
            Commander sur WhatsApp <MessageCircle size={20} aria-hidden="true" />
          </button>
        )}
        {historyNotice && <p role="status">{historyNotice}</p>}
        <p>
          Votre demande s’ouvre dans WhatsApp. L’équipe confirme la disponibilité, le règlement et
          la livraison ou le retrait avant toute commande.
        </p>
      </div>
    </div>
  );
}

export function CatalogueProduct({ slug }: { slug: string }) {
  const { resource, retry } = useCatalogueResource(
    `/api/catalogue/${encodeURIComponent(slug)}`,
    publicProductSchema.parse,
  );
  return (
    <section className={styles.page} aria-labelledby="product-title">
      <Link href="/boutique" className={styles.backLink}>
        <ArrowLeft size={17} aria-hidden="true" /> Retour à la boutique
      </Link>
      {resource.state === 'loading' && (
        <div className={styles.state} aria-busy="true">
          <h1 id="product-title" className={styles.productTitle}>
            Votre prochain Gainde.
          </h1>
          <p role="status">Chargement du produit…</p>
        </div>
      )}
      {(resource.state === 'missing' || resource.state === 'error') && (
        <>
          <h1 id="product-title" className={styles.productTitle}>
            Le produit se fait attendre.
          </h1>
          <CatalogueState
            title={
              resource.state === 'missing'
                ? 'Ce produit n’est plus proposé.'
                : 'Le produit est momentanément inaccessible.'
            }
            description={
              resource.state === 'missing'
                ? 'Cette fiche a été retirée ou le lien a changé. Retrouvez les produits actuellement proposés dans la boutique.'
                : 'Vérifiez votre connexion puis réessayez. Vous pouvez aussi contacter notre équipe sur WhatsApp.'
            }
            onRetry={resource.state === 'error' ? retry : undefined}
            contact={resource.state === 'error'}
          />
        </>
      )}
      {resource.state === 'ready' && (
        <div className={styles.product}>
          <CustomerProductActivity productId={resource.data.id} />
          <ProductGallery key={resource.data.id} product={resource.data} />
          <div className={styles.productInfo}>
            <header>
              <Link href="/boutique" className={styles.category}>
                {resource.data.categoryLabel || catalogueCategoryLabel(resource.data.category)}{' '}
                <ArrowUpRight size={12} className="inline" aria-hidden="true" />
              </Link>
              <h1 id="product-title" className={styles.productTitle}>
                {resource.data.name}
              </h1>
              <p className={styles.productPrice}>{formatXof(resource.data.priceXof)}</p>
              <p className={styles.reference}>Référence : {resource.data.id}</p>
            </header>
            {resource.data.description && (
              <p className={styles.description}>{resource.data.description}</p>
            )}
            <p className="small">
              {resource.data.stockQuantity === 0
                ? 'Rupture de stock'
                : `${resource.data.stockQuantity} article${resource.data.stockQuantity > 1 ? 's' : ''} en stock au total`}
            </p>
            <SaveProductButton product={resource.data} showLabel />
            <ProductRequest
              key={`${resource.data.id}-${resource.data.updatedAt}`}
              product={resource.data}
            />
            <details className={styles.details}>
              <summary>Commander et personnaliser</summary>
              <p>
                La demande est préparée avec le produit, son prix affiché et vos choix. Les tailles
                et couleurs proposées sont à confirmer avec notre équipe. Pour un flocage ou une
                personnalisation, précisez votre besoin dans la conversation WhatsApp.
              </p>
            </details>
          </div>
        </div>
      )}
    </section>
  );
}
