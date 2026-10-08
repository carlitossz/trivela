import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Si algo se rompe al mostrar una pantalla, enseña el error en vez de dejar la página en negro */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Trivela se cayó:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-6 text-white">
        <h1 className="text-xl font-bold">Algo falló al abrir esta pantalla</h1>
        <pre className="whitespace-pre-wrap rounded-xl border border-line2 bg-panel p-4 text-sm text-[#F2B5A8]">{this.state.error.message}</pre>
        <div className="flex gap-2">
          <button type="button" className="chip chip-on" onClick={() => window.location.reload()}>
            Recargar
          </button>
          <a className="chip" href={import.meta.env.BASE_URL}>
            Ir al inicio
          </a>
        </div>
      </div>
    )
  }
}
