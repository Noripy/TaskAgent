export function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-3">
        <h1 className="ta-h1">TaskAgent</h1>
        <p>
          言われたことを、まず投げる。
          <br />
          AI が数回だけ聞き返して、報連相できるメモにします。
        </p>
        <p className="ta-muted">
          伝え方の言い換えと使える語彙も一緒に残り、
          <br />
          毎日あなたの GitHub に Markdown で積み上がります。
        </p>
      </div>
      <a href="/api/auth/github" className="ta-btn ta-btn-primary w-full max-w-xs">
        GitHub でログイン
      </a>
      <p className="ta-muted text-sm">
        ログイン時の権限は、あなたのリポジトリへメモを書き込むためだけに使います。
      </p>
    </div>
  );
}
