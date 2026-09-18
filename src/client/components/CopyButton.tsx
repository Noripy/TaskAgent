import { useState } from "react";

export function CopyButton(props: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ta-btn"
      onClick={async () => {
        try {
          await navigator.clipboard?.writeText(props.text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard 不可の環境では無視 */
        }
      }}
    >
      {done ? "コピーしました" : (props.label ?? "コピー")}
    </button>
  );
}
