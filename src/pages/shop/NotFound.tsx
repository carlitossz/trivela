import { Link } from 'react-router-dom'
import { ShopShell } from '../../components/ShopLayout'

export default function NotFound() {
  return (
    <ShopShell>
      <main className="flex flex-col items-start gap-3 px-5 py-10">
        <h1 className="text-xl font-bold">Esta página no existe</h1>
        <Link to="/" className="chip chip-on">
          Ver franelas
        </Link>
      </main>
    </ShopShell>
  )
}
