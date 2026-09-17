export function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">TaskAgent</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          言われたことを、まず投げる。
          <br />
          AI が数回だけ聞き返して、報連相できるメモにします。
          <br />
          メモは毎日あなたの GitHub リポジトリに Markdown で残ります。
        </p>
      </div>
      <a
        href="/api/auth/github"
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
      >
        GitHub でログイン
      </a>
      <p className="text-xs text-slate-500">
        ログイン時に付与される権限は、あなたのリポジトリへメモを書き込むために使います。
      </p>
    </div>
  );
}
