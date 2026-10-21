'use client';
import { useEffect, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { adminFetch, adminError, formatAdminPrice } from '@/lib/admin-client';
import { requestStatusLabels } from '@/lib/customer-client';
import styles from './admin.module.css';
type Status = keyof typeof requestStatusLabels;
type Entry = {
  id: string;
  productName: string;
  quantity: number;
  priceXof: number;
  size: string | null;
  color: string | null;
  createdAt: string;
  processingStatus: Status;
  statusVersion: number;
  notificationStatus: string;
  account: { displayName: string; email: string; emailVerifiedAt: string | null };
};
type Result = { items: Entry[]; total: number; page: number; mailConfigured: boolean };
const transitions: Record<Status, Status[]> = {
  prepared: ['received', 'cancelled'],
  received: ['shipped', 'delivered', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};
const notifications: Record<string, string> = {
  none: 'Aucun e-mail en attente',
  queued: 'E-mail en attente',
  sending: 'Envoi en cours',
  sent: 'E-mail accepté par le serveur de messagerie',
  failed: 'Envoi en échec',
  cancelled: 'Envoi annulé ou expiré',
};
export function AdminCustomerRequests() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [choice, setChoice] = useState<{ entry: Entry; status: Status } | null>(null);
  useEffect(() => {
    let active = true;
    adminFetch<Result>(`customer-requests?page=${page}`)
      .then((value) => {
        if (active) {
          setData(value);
          setError('');
        }
      })
      .catch((error) => {
        if (active) setError(adminError(error));
      });
    return () => {
      active = false;
    };
  }, [page, revision]);
  async function confirm() {
    if (!choice) return;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const result = await adminFetch<{ notification: string }>(
        `customer-requests/${choice.entry.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: choice.status,
            version: choice.entry.statusVersion,
            confirmed: true,
          }),
        },
      );
      setNotice(
        result.notification === 'queued'
          ? 'Statut enregistré. L’e-mail est en attente d’envoi.'
          : result.notification === 'unverified'
            ? 'Statut enregistré. Aucun e-mail envoyé : le client doit confirmer son adresse.'
            : 'Statut enregistré. Aucun e-mail envoyé : configurez d’abord le service e-mail.',
      );
      setChoice(null);
      setRevision((v) => v + 1);
    } catch (error) {
      setError(adminError(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <section className={styles.panel}>
      <h1 className={styles.title}>Demandes clients</h1>
      <p>
        Ces demandes ont été préparées sur le site. Vérifiez leur réception réelle dans WhatsApp
        avant de confirmer un statut. Les e-mails concernent uniquement les adresses confirmées.
      </p>
      <div className={styles.actions}>
        <button
          className={styles.secondary}
          disabled={pending}
          onClick={() => setRevision((v) => v + 1)}
        >
          Actualiser
        </button>
      </div>
      {data && !data.mailConfigured && (
        <p className={styles.error}>L’envoi des e-mails n’est pas encore configuré.</p>
      )}
      {error && !choice && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      )}
      {!data ? (
        <p role="status">Chargement des demandes…</p>
      ) : data.items.length === 0 ? (
        <p>Aucune demande préparée pour le moment.</p>
      ) : (
        data.items.map((entry) => (
          <article key={entry.id} className={styles.panel}>
            <h2 className={styles.subtitle}>{entry.productName}</h2>
            <p>
              {entry.account.displayName} · {entry.account.email}
              {!entry.account.emailVerifiedAt && ' · Adresse non confirmée'}
            </p>
            <p>
              Quantité : {entry.quantity} · Prix unitaire affiché :{' '}
              {formatAdminPrice(entry.priceXof)}
              {entry.size && ` · Taille : ${entry.size}`}
              {entry.color && ` · Couleur : ${entry.color}`}
            </p>
            <p>
              Référence : {entry.id} · {new Date(entry.createdAt).toLocaleString('fr-SN')}
            </p>
            <p>
              <strong>{requestStatusLabels[entry.processingStatus]}</strong> ·{' '}
              {notifications[entry.notificationStatus] || 'État à vérifier'}
            </p>
            <div className={styles.actions}>
              {transitions[entry.processingStatus].map((status) => (
                <button
                  key={status}
                  className={styles.secondary}
                  onClick={() => {
                    setError('');
                    setChoice({ entry, status });
                  }}
                >
                  Confirmer : {requestStatusLabels[status].toLowerCase()}
                </button>
              ))}
            </div>
          </article>
        ))
      )}
      {data && (
        <div className={styles.actions}>
          <button
            className={styles.secondary}
            disabled={page === 1}
            onClick={() => {
              setData(null);
              setPage((p) => p - 1);
            }}
          >
            Précédent
          </button>
          <span>
            Page {page} · {data.total} demande(s)
          </span>
          <button
            className={styles.secondary}
            disabled={page * 20 >= data.total}
            onClick={() => {
              setData(null);
              setPage((p) => p + 1);
            }}
          >
            Suivant
          </button>
        </div>
      )}
      <Dialog
        open={!!choice}
        onClose={() => {
          if (!pending) setChoice(null);
        }}
        title="Confirmer le suivi"
      >
        {choice && (
          <>
            <h2>{requestStatusLabels[choice.status]}</h2>
            <p>
              Vous confirmez avoir vérifié cette information pour « {choice.entry.productName} »
              auprès de votre équipe.
            </p>
            <p>
              Cette action enregistrera le statut et préparera un e-mail si l’adresse du client est
              confirmée et le service configuré.
            </p>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <button
                className={styles.secondary}
                disabled={pending}
                onClick={() => setChoice(null)}
              >
                Annuler
              </button>
              <button className={styles.button} disabled={pending} onClick={() => void confirm()}>
                {pending ? 'Enregistrement…' : 'Confirmer et informer le client'}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </section>
  );
}
