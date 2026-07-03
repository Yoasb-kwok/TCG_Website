import { Suspense } from "react";
import { TournamentRegisterSuccessContent } from "./success-content";

export const metadata = {
  title: "報名成功",
};

export default function TournamentRegisterSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-24 text-center text-muted-foreground">
          載入中...
        </div>
      }
    >
      <TournamentRegisterSuccessContent />
    </Suspense>
  );
}
