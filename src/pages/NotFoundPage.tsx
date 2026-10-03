import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="text-center">
      <h1 className="text-3xl font-semibold">Nothing cooking here</h1>
      <p className="mt-3 text-cocoa-700">We couldn't find that page.</p>
      <Link to="/" className="mt-6 inline-block text-terracotta-600 underline">
        Back to the kitchen
      </Link>
    </section>
  )
}
