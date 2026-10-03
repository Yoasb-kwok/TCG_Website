import { GamesManager } from "@/components/admin/games-manager";

export const metadata = { title: "遊戲管理" };

export default function GamesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">遊戲管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理網店支援的 TCG 遊戲類型。新增遊戲後，可在標籤管理中為該遊戲建立專屬標籤。
        </p>
      </div>
      <GamesManager />
    </div>
  );
}
