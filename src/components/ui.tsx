import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-terracotta-500 text-cream-50 hover:bg-terracotta-600 shadow-sm',
  secondary: 'bg-cream-50 text-cocoa-900 ring-1 ring-cream-200 hover:bg-cream-200/60',
  danger: 'bg-cream-50 text-terracotta-700 ring-1 ring-terracotta-500/40 hover:bg-terracotta-500/10',
  ghost: 'text-cocoa-700 hover:bg-cream-200/60',
}

export function buttonClass(variant: Variant = 'primary') {
  return `inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${buttonClass(variant)} ${className}`} {...props} />
}

export const inputClass =
  'w-full rounded-xl border-0 bg-white px-3 py-2 text-cocoa-900 ring-1 ring-cream-200 placeholder:text-cocoa-700/40 focus:ring-2 focus:ring-terracotta-500 focus:outline-none'

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-cocoa-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-cocoa-700/70">{hint}</span>}
    </label>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-cream-50 p-6 shadow-sm ring-1 ring-cream-200 ${className}`}>
      {children}
    </div>
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-cocoa-700/70" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-terracotta-500 border-t-transparent" />
      {label}
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-terracotta-500/10 px-4 py-3 text-sm text-terracotta-700" role="alert">
      {children}
    </p>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' }) {
  const tones = {
    neutral: 'bg-cream-200 text-cocoa-700',
    green: 'bg-olive-600/15 text-olive-600',
    amber: 'bg-terracotta-500/15 text-terracotta-700',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

/** Human-readable error message from a Firebase or generic error. */
export function errorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code
  if (code === 'permission-denied' || code === 'storage/unauthorized') {
    return "You don't have permission to do that."
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Sign-in was cancelled.'
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Sign-in is not enabled on this web address. Use the main site or local emulators.'
  }
  return err instanceof Error ? err.message : 'Something went wrong.'
}
