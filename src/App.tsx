import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Spinner } from './components/ui'
import Catalog from './pages/shop/Catalog'
import ProductDetail from './pages/shop/ProductDetail'
import CartPage from './pages/shop/Cart'
import Checkout from './pages/shop/Checkout'
import OrderDone from './pages/shop/OrderDone'
import NotFound from './pages/shop/NotFound'

// El panel se carga aparte para que la tienda abra más rápido en el teléfono
const AdminApp = lazy(() => import('./pages/admin/AdminApp'))

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
  window.scrollTo(0, 0)
}, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/franela/:id" element={<ProductDetail />} />
        <Route path="/carrito" element={<CartPage />} />
        <Route path="/pedido" element={<Checkout />} />
        <Route path="/pedido/:code" element={<OrderDone />} />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div className="grid min-h-screen place-items-center bg-paper"><Spinner dark /></div>}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
