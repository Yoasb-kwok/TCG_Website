import { redirect } from "next/navigation";

// ADR-006 Decision 5: /products redirects to default game
export default function ProductsPage() {
  redirect("/products/pokemon");
}
