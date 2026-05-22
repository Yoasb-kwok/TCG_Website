import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function AdminLoginRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const callback = params.callbackUrl ?? "/admin";
  redirect(`/login?callbackUrl=${encodeURIComponent(callback)}`);
}
