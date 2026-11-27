'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import styles from './editorial.module.css';

type Ready = { key: string; registration: ServiceWorkerRegistration };

function keyBytes(key: string) {
  return Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), (value) =>
    value.charCodeAt(0),
  );
}

async function changeSubscription(
  action: 'subscribe' | 'unsubscribe',
  subscription: PushSubscription,
) {
  const { endpoint, keys } = subscription.toJSON();
  const response = await fetch('/api/media-notifications/' + action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint,
      auth: keys?.auth,
      ...(action === 'subscribe' ? { p256dh: keys?.p256dh } : {}),
    }),
  });
  if (!response.ok) throw new Error('Échec d’enregistrement');
}

export function MediaSubscribe() {
  const [ready, setReady] = useState<Ready>();
  const [subscribed, setSubscribed] = useState(false);
  const [message, setMessage] = useState('');
  const [permission, setPermission] = useState<NotificationPermission>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    )
      return;
    const abort = new AbortController();
    const observePermission = () => setPermission(Notification.permission);
    window.addEventListener('focus', observePermission);
    async function initialize() {
      const response = await fetch('/api/media-notifications/config', {
        signal: abort.signal,
        cache: 'no-store',
      });
      if (!response.ok) return;
      const { publicKey } = (await response.json()) as { publicKey: string | null };
      if (!publicKey) return;
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!abort.signal.aborted) {
        observePermission();
        setSubscribed(Boolean(subscription));
        setReady({ registration, key: publicKey });
      }
    }
    void initialize().catch(() => undefined);
    return () => {
      abort.abort();
      window.removeEventListener('focus', observePermission);
    };
  }, []);

  async function requestPermission() {
    let state = Notification.permission;
    if (state === 'default') {
      setMessage(
        'Autorisez les notifications dans le navigateur. Si la demande est discrète, cliquez sur la cloche près de l’adresse.',
      );
      state = await Notification.requestPermission();
    }
    setPermission(state);
    if (state === 'denied') {
      setMessage(
        'Notifications bloquées. Ouvrez les réglages du site à gauche de l’adresse, puis choisissez « Autoriser » pour Notifications.',
      );
    } else if (state === 'default') {
      setMessage(
        'Autorisation en attente. Cliquez sur la cloche près de l’adresse, puis réessayez.',
      );
    }
    return state === 'granted';
  }

  async function testNotification() {
    if (!ready) return;
    setBusy(true);
    setMessage('');
    try {
      if (!(await requestPermission())) return;
      await ready.registration.showNotification('Gaindé Media — Notification de test', {
        body: 'Vous pouvez vérifier le son des notifications sur cet appareil.',
        tag: 'gainde-media-notification-test',
        renotify: true,
        silent: false,
        icon: '/icons/icon-192.png',
        data: { path: '/media' },
      } as NotificationOptions & { renotify: boolean });
      setMessage('Notification de test affichée. Le son dépend des réglages de votre appareil.');
    } catch {
      setMessage('Le navigateur n’a pas pu afficher la notification de test.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle() {
    if (!ready) return;
    setBusy(true);
    setMessage('');
    try {
      const push = ready.registration.pushManager;
      if (subscribed && Notification.permission === 'granted') {
        const current = await push.getSubscription();
        if (current) {
          await changeSubscription('unsubscribe', current);
          await current.unsubscribe();
        }
        setSubscribed(false);
        setMessage('Notifications désactivées sur cet appareil.');
      } else {
        if (!(await requestPermission())) return;
        const existing = await push.getSubscription();
        const current =
          existing ??
          (await push.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes(ready.key),
          }));
        try {
          await changeSubscription('subscribe', current);
        } catch (error) {
          if (!existing) await current.unsubscribe().catch(() => false);
          throw error;
        }
        setSubscribed(true);
        setMessage('Vous recevrez les nouveaux articles sur cet appareil.');
      }
    } catch (error) {
      setMessage(
        Notification.permission === 'granted' && error instanceof DOMException
          ? 'Notifications autorisées, mais le navigateur a refusé l’abonnement. Réessayez dans une fenêtre normale ou utilisez « Tester la notification ».'
          : 'Impossible de modifier l’abonnement. Réessayez dans un instant.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return null;
  const active = subscribed && permission === 'granted';
  return (
    <div className={styles.subscribe}>
      <button
        type="button"
        className={`${styles.secondary} button-fill`}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {active ? <BellOff size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />}
        {active ? 'Se désabonner' : 'S’abonner aux articles'}
      </button>
      <button
        type="button"
        className={`${styles.secondary} button-fill`}
        disabled={busy}
        onClick={() => void testNotification()}
      >
        Tester la notification
      </button>
      {permission && (
        <p className={styles.hint}>
          {permission === 'granted'
            ? 'Notifications autorisées par le navigateur.'
            : permission === 'denied'
              ? 'Notifications bloquées dans le navigateur.'
              : 'Autorisation du navigateur à confirmer.'}
        </p>
      )}
      {message && (
        <p role="status" className={styles.hint}>
          {message}
        </p>
      )}
    </div>
  );
}
