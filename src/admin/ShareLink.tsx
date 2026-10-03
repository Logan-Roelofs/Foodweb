import { useState } from 'react'
import { Button, inputClass } from '../components/ui'

/** A read-only link with Copy and Open buttons. */
export function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className={`${inputClass} font-mono text-sm`}
        aria-label="Share link"
      />
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" onClick={copy}>
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
        <a href={url} target="_blank" rel="noreferrer" className="self-center text-sm font-semibold text-terracotta-600 hover:underline">
          Open
        </a>
      </div>
    </div>
  )
}
