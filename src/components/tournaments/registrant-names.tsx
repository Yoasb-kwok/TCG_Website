export function RegistrantNames({ names }: { names: string[] }) {
  return (
    <section aria-label="已報名選手" className="space-y-2">
      <p className="text-sm font-medium text-foreground">已報名選手</p>
      {names.length === 0 ? (
        <p className="text-sm text-muted-foreground">暫無報名</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {names.map((name, index) => (
            <li
              key={`${index}-${name}`}
              className="rounded-full bg-muted px-3 py-1 text-sm text-foreground"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
