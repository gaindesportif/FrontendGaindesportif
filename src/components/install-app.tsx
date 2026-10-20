'use client';
import { useEffect, useState } from 'react';
import { Download, Share, PlusSquare } from 'lucide-react';
import { Dialog } from './dialog';
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function InstallApp() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* Le site reste utilisable sans PWA. */
      });
    const listener = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setEvent(null);
    };
    if (window.matchMedia('(display-mode: standalone)').matches)
      queueMicrotask(() => setInstalled(true));
    window.addEventListener('beforeinstallprompt', listener);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', listener);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  async function install() {
    if (!event) {
      setHelp(true);
      return;
    }
    await event.prompt();
    const result = await event.userChoice;
    if (result.outcome === 'accepted') setInstalled(true);
    setEvent(null);
  }
  return (
    <>
      <button className="install-link" onClick={install} disabled={installed}>
        <Download size={14} />
        {installed ? 'Application installée' : 'Installer Gainde Sportif'}
      </button>
      <Dialog
        open={help}
        onClose={() => setHelp(false)}
        title="Gaindé, à portée de main"
        className="install-dialog"
      >
        <h2>Votre raccourci vers Gaindé.</h2>
        <p>
          Sur iPhone ou iPad : ouvrez le site dans Safari, touchez <Share size={17} />{' '}
          <strong>Partager</strong>, puis <PlusSquare size={17} />{' '}
          <strong>Sur l’écran d’accueil</strong>.
        </p>
        <p>
          Sur Android ou ordinateur : dans le menu du navigateur, choisissez{' '}
          <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>,
          si proposé.
        </p>
        <p className="small muted">
          L’installation dépend de votre navigateur et nécessite une connexion sécurisée. Vous
          pouvez toujours utiliser le site sans l’installer.
        </p>
        <button className="button button-dark" onClick={() => setHelp(false)}>
          Compris
        </button>
      </Dialog>
    </>
  );
}
