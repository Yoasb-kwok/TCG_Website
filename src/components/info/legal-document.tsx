import Link from "next/link";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { homeContainer } from "@/components/home/home-layout";
import {
  LEGAL_EMAIL_PLACEHOLDER,
  LEGAL_PAGES,
  LEGAL_PHONE_PLACEHOLDER,
  type LegalPage,
} from "@/lib/legal-pages";

const PLACEHOLDERS = [LEGAL_EMAIL_PLACEHOLDER, LEGAL_PHONE_PLACEHOLDER];

const textLink =
  "font-medium text-[#0a0a09] underline decoration-[#dccdaf] underline-offset-4 hover:decoration-[#c8a24a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]";

function renderLegalText(text: string) {
  const nodes: React.ReactNode[] = [];
  let rest = text;
  let index = 0;

  while (rest.length > 0) {
    const match = PLACEHOLDERS.map((token) => ({ token, at: rest.indexOf(token) }))
      .filter((item) => item.at >= 0)
      .sort((a, b) => a.at - b.at)[0];

    if (!match) {
      nodes.push(rest);
      break;
    }

    if (match.at > 0) nodes.push(<Fragment key={`text-${index}`}>{rest.slice(0, match.at)}</Fragment>);
    nodes.push(
      <span key={`${match.token}-${index}`} className="font-medium">
        {match.token}
      </span>,
    );
    rest = rest.slice(match.at + match.token.length);
    index += 1;
  }

  return nodes;
}

export function LegalPolicyNav({ currentHref }: { currentHref?: string }) {
  return (
    <nav aria-label="條款與政策" className="border-t border-[#dccdaf] pt-8">
      <p className="text-[14px] font-medium leading-[1.45] text-[#0a0a09]">條款與政策</p>
      <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
        {LEGAL_PAGES.map((item) => {
          const current = item.href === currentHref;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={current ? "text-[16px] leading-[1.6] font-medium text-[#0a0a09]" : textLink}
              >
                {item.navLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function LegalShell({
  title,
  englishTitle,
  currentHref,
  children,
}: {
  title: string;
  englishTitle?: string;
  currentHref?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={`${homeContainer} py-12`}>
      <div className="flex max-w-[760px] flex-col gap-10">
        <header>
          <nav aria-label="麵包屑" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1 text-[14px] leading-[1.6] text-[#5e5963]">
              <li>
                <Link href="/" className={textLink}>
                  首頁
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3.5" />
              </li>
              <li className="text-[#0a0a09]" aria-current="page">
                {title}
              </li>
            </ol>
          </nav>
          {englishTitle ? (
            <p className="text-[13px] font-medium leading-[1.6] tracking-[0.08em] text-[#5e5963]">{englishTitle}</p>
          ) : null}
          <h1 className="mt-2 text-[32px] font-medium leading-[1.3] text-[#0a0a09] xl:text-[40px]">{title}</h1>
        </header>
        {children}
        <LegalPolicyNav currentHref={currentHref} />
      </div>
    </article>
  );
}

export function LegalDocument({ page }: { page: LegalPage }) {
  return (
    <LegalShell title={page.title} englishTitle={page.englishTitle} currentHref={page.href}>
      <div className="flex flex-col gap-6">
        {page.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-heading`}
            className="scroll-mt-28 rounded-[14px] border border-[#e6dfd2] bg-white p-6 shadow-trtcg-card sm:p-8"
          >
            <h2 id={`${section.id}-heading`} className="text-[20px] font-medium leading-[1.4] text-[#0a0a09]">
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4 text-[16px] leading-[1.75] text-[#0a0a09]">
              {section.blocks.map((block) => (
                <p key={block.text}>{renderLegalText(block.text)}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </LegalShell>
  );
}
