import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'
import { RequireAuth } from './components/ui'
import { AuthProvider } from './lib/auth'
import { CategoriesProvider } from './lib/categories'
import Admin from './pages/Admin'
import { Login, Register } from './pages/AuthPages'
import EditListing from './pages/EditListing'
import ListingDetail from './pages/ListingDetail'
import Market from './pages/Market'
import MyListings from './pages/MyListings'
import NotFound from './pages/NotFound'
import PostListing from './pages/PostListing'
import Profile from './pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CategoriesProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Market />} />
                <Route path="tin/:id" element={<ListingDetail />} />
                <Route path="dang-nhap" element={<Login />} />
                <Route path="dang-ky" element={<Register />} />
                <Route path="dang-tin" element={<RequireAuth><PostListing /></RequireAuth>} />
                <Route path="sua-tin/:id" element={<RequireAuth><EditListing /></RequireAuth>} />
                <Route path="tin-cua-toi" element={<RequireAuth><MyListings /></RequireAuth>} />
                <Route path="tai-khoan" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="quan-tri" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </CategoriesProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
