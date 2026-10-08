'use client';
import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, Check, LoaderCircle, MessageCircle } from 'lucide-react';
import { contactDetails, contactSchema } from '@/lib/contact';

type Fields = 'name' | 'email' | 'phone' | 'subject' | 'message' | 'consent';
export function ContactForm() {
  const params = useSearchParams();
  const requested = params.get('subject');
  const defaultSubject = ['collection', 'personnalisation', 'partenariat', 'autre'].includes(
    requested || '',
  )
    ? requested!
    : 'autre';
  const selection = params.get('selection')?.slice(0, 600);
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone'),
      subject: form.get('subject'),
      message: form.get('message'),
      consent: form.get('consent') === 'on',
      website: form.get('website'),
    };
    const parsed = contactSchema.safeParse(data);
    if (!parsed.success) {
      const next: Partial<Record<Fields, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Fields;
        next[key] ||= issue.message;
      }
      setErrors(next);
      setStatus('idle');
      const first = parsed.error.issues[0].path[0] as string;
      (formRef.current?.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    setErrors({});
    setStatus('sending');
    setMessage('');
    const payload = JSON.stringify(parsed.data);
    if (!attempt.current || attempt.current.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.current.key },
        body: payload,
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus('error');
        setMessage(result.message || 'Votre message n’a pas pu être enregistré.');
        requestAnimationFrame(() => statusRef.current?.focus());
        return;
      }
      if (!result.reference) throw new Error('Confirmation indisponible');
      setReference(result.reference);
      attempt.current = null;
      setStatus('success');
      requestAnimationFrame(() => statusRef.current?.focus());
    } catch {
      setStatus('error');
      setMessage(
        'Votre message n’a pas été confirmé. Vérifiez votre connexion ou utilisez WhatsApp.',
      );
      requestAnimationFrame(() => statusRef.current?.focus());
    }
  }
  function error(field: Fields) {
    return errors[field] ? (
      <span className="field-error" id={`${field}-error`}>
        {errors[field]}
      </span>
    ) : null;
  }
  const props = (field: Fields) => ({
    'aria-invalid': !!errors[field],
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  });
  if (status === 'success')
    return (
      <div className="contact-success" ref={statusRef} tabIndex={-1} role="status">
        <span className="success-icon">
          <Check size={28} />
        </span>
        <span className="eyebrow">Demande enregistrée</span>
        <h2>
          Le premier pas
          <br />
          est fait.
        </h2>
        <p>
          Votre message est bien enregistré. Conservez cette référence pour vos échanges avec
          l’équipe.
        </p>
        <code className="contact-reference">{reference}</code>
        <p className="small muted">
          Aucun email de confirmation automatique n’est envoyé pour le moment. Pour échanger
          directement, contactez-nous sur WhatsApp.
        </p>
        <a
          className="button button-dark"
          href={contactDetails.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
        >
          Échanger sur WhatsApp <MessageCircle size={19} />
        </a>
        <button
          className="text-link"
          onClick={() => {
            setStatus('idle');
            setReference('');
          }}
        >
          Écrire un autre message <ArrowUpRight size={18} />
        </button>
      </div>
    );
  return (
    <form
      ref={formRef}
      className="contact-form"
      noValidate
      onSubmit={submit}
      aria-label="Envoyer un message à Gaindé Sportif"
    >
      <div className="form-heading">
        <span className="eyebrow">À vous de jouer</span>
        <h2>Parlez-nous de votre idée.</h2>
        <p className="small muted">Tous les champs sont nécessaires.</p>
      </div>
      <fieldset disabled={status === 'sending'}>
        <legend className="sr-only">Votre demande</legend>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Votre nom</label>
            <input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Prénom et nom"
              maxLength={100}
              required
              {...props('name')}
            />
            {error('name')}
          </div>
          <div className="form-field">
            <label htmlFor="phone">Votre téléphone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+221 77 …"
              maxLength={25}
              required
              {...props('phone')}
            />
            {error('phone')}
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="email">Votre adresse email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            maxLength={254}
            required
            {...props('email')}
          />
          {error('email')}
        </div>
        <div className="form-field">
          <label htmlFor="subject">Qu’avez-vous en tête ?</label>
          <select
            id="subject"
            name="subject"
            defaultValue={defaultSubject}
            required
            {...props('subject')}
          >
            <option value="collection">Une pièce ou une collection</option>
            <option value="personnalisation">Équiper ou personnaliser pour mon équipe</option>
            <option value="partenariat">Un partenariat</option>
            <option value="autre">Une autre question</option>
          </select>
          {error('subject')}
        </div>
        <div className="form-field">
          <label htmlFor="message">Votre message</label>
          <textarea
            id="message"
            name="message"
            rows={5}
            maxLength={2000}
            placeholder="Votre idée, votre équipe, les pièces qui vous intéressent…"
            defaultValue={selection ? `Bonjour, je souhaite me renseigner sur : ${selection}` : ''}
            required
            {...props('message')}
          />
          {error('message')}
          <span className="small muted">
            2 000 caractères maximum. Ne transmettez pas de données sensibles.
          </span>
        </div>
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="website">
            Ne pas remplir ce champ
            <input id="website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
        <label className="consent-label">
          <input id="consent" name="consent" type="checkbox" required {...props('consent')} />
          <span>
            J’accepte que Gaindé Sportif utilise ces informations pour répondre à ma demande.{' '}
            <Link href="/confidentialite">Confidentialité</Link>
          </span>
        </label>
        {error('consent')}
        <button className="button button-dark submit-button" type="submit">
          {status === 'sending' ? (
            <>
              Enregistrement… <LoaderCircle size={19} className="spin" />
            </>
          ) : (
            <>
              Envoyer mon message <ArrowUpRight size={20} />
            </>
          )}
        </button>
      </fieldset>
      <div
        ref={statusRef}
        className={status === 'error' ? 'form-error-message' : ''}
        role={status === 'error' ? 'alert' : 'status'}
        tabIndex={-1}
      >
        {message}
        {status === 'error' && (
          <a href={contactDetails.whatsapp} target="_blank" rel="noopener noreferrer">
            Nous contacter sur WhatsApp <ArrowUpRight size={15} />
          </a>
        )}
      </div>
      <p className="small muted">
        Votre demande sera enregistrée. Il ne s’agit pas d’une commande et aucun paiement ne vous
        sera demandé ici.
      </p>
    </form>
  );
}
