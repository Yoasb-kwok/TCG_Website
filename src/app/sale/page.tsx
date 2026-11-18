import type { Metadata } from "next";
import { LegalDocument } from "@/components/info/legal-document";
import { getLegalPage } from "@/lib/legal-pages";

const page = getLegalPage("sale");

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
};

export default function TermsOfSalePage() {
  return <LegalDocument page={page} />;
}
