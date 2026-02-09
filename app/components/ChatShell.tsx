export default function ChatShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-4xl rounded-3xl bg-white/90 shadow-2xl backdrop-blur-md">
        <div className="border-b px-6 py-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
