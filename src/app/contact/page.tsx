import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ArrowUpRight, MessageCircle, Phone, MapPin } from 'lucide-react';
import { ContactForm } from '@/components/contact-form';
import { contactDetails } from '@/lib/contact';
export const metadata: Metadata = { title: 'Parlons de votre projet' };
export default function Contact() {
  return (
    <section className="contact-page section">
      <div className="contact-intro">
        <span className="eyebrow">Contact / On vous écoute</span>
        <h1>
          Une idée ?<br />
          Une équipe ?<br />
          <em>Parlons-en.</em>
        </h1>
        <p>
          Une collection vous plaît ? Vous souhaitez équiper votre équipe ou imaginer une
          personnalisation ? La conversation commence ici.
        </p>
        <div className="contact-channels">
          <a href={contactDetails.whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={24} strokeWidth={1.5} />
            <span>
              <small>Pour échanger directement</small>
              <strong>Écrivez-nous sur WhatsApp</strong>
            </span>
            <ArrowUpRight size={19} />
          </a>
          <a href={contactDetails.phoneHref}>
            <Phone size={24} strokeWidth={1.5} />
            <span>
              <small>Un appel, tout simplement</small>
              <strong>{contactDetails.phone}</strong>
            </span>
            <ArrowUpRight size={19} />
          </a>
          <div>
            <MapPin size={24} strokeWidth={1.5} />
            <span>
              <small>Notre inspiration</small>
              <strong>Dakar, Sénégal</strong>
            </span>
          </div>
        </div>
        <div className="contact-signature" aria-hidden="true">
          À CHACUN
          <br />
          SON GAINDÉ<span>✳</span>
        </div>
      </div>
      <Suspense fallback={<p>Chargement du formulaire…</p>}>
        <ContactForm />
      </Suspense>
    </section>
  );
}
