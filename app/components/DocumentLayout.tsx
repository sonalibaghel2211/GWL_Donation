import type { ReactNode } from "react";
import { Link } from "react-router";
import documentStyles from "../styles/document-pages.css?url";

/**
 * Export this from any route that renders <DocumentLayout /> so the
 * shared stylesheet is loaded, e.g.:
 *
 *   export const links: LinksFunction = () => documentPageLinks();
 */
export function documentPageLinks() {
  return [{ rel: "stylesheet", href: documentStyles }];
}

interface DocumentLayoutProps {
  title: string;
  updated?: string;
  activePath: "/privacy-policy" | "/documentation" | "/faq";
  children: ReactNode;
}

const NAV_ITEMS: { href: DocumentLayoutProps["activePath"]; label: string }[] = [
  { href: "/documentation", label: "Documentation" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy-policy", label: "Privacy Policy" },
];

/**
 * Shared public-facing layout for standalone informational pages
 * (Privacy Policy, Documentation, FAQ). Intentionally does not use
 * Shopify App Bridge or any authenticated app chrome, since these
 * pages must be reachable without logging into the embedded app.
 */
export default function DocumentLayout({
  title,
  updated,
  activePath,
  children,
}: DocumentLayoutProps) {
  return (
    <div className="doc-page">
      <header className="doc-header">
        <div className="doc-header__inner">
          <Link to="/" className="doc-header__brand">
            SmartDonate: Recurring &amp; Receipts
          </Link>
          <nav className="doc-nav" aria-label="Document pages">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                aria-current={activePath === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="doc-main">
        <h1 className="doc-title">{title}</h1>
        {updated ? <p className="doc-updated">{updated}</p> : null}
        {children}
      </main>

      <footer className="doc-footer">
        <p>
          &copy; {new Date().getFullYear()} Galaxy Web Links. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}
