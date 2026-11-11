import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function LegalDocument({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return <main className="legal-page">
    <Link to="/" className="legal-back"><ArrowLeft size={18}/> Back to Cubellio</Link>
    <h1>{title}</h1>
    <p className="legal-updated">Last updated: {updated}</p>
    <div className="legal-copy">{children}</div>
  </main>;
}
