import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "登入 / 註冊",
};

export default function LoginPage() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <Suspense>
        <AuthForm />
      </Suspense>
    </div>
  );
}
