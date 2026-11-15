import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { QuickViewModal } from './components/QuickViewModal.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { TrackOrderPage } from './pages/TrackOrderPage.tsx';
import { AboutPage, ContactPage, PolicyPage } from './pages/InfoPages.tsx';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';

const AppRouter: React.FC = () => {
  const { route, loading } = useStore();
  const pathname = route.split('?')[0];

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return <AdminPage />;
  }

  const renderPage = () => {
    if (loading) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 animate-pulse">
          <div className="h-[460px] bg-neutral-100" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            <div className="h-80 bg-neutral-100" />
            <div className="h-80 bg-neutral-100" />
            <div className="h-80 bg-neutral-100" />
          </div>
        </div>
      );
    }

    if (pathname === '/' || pathname === '') return <HomePage />;
    if (pathname === '/shop') return <ShopPage />;
    if (pathname.startsWith('/product/')) {
      const slug = pathname.slice('/product/'.length);
      return <ProductDetailPage slug={slug} />;
    }
    if (pathname === '/checkout') return <CheckoutPage />;
    if (pathname === '/track') return <TrackOrderPage />;
    if (pathname === '/login') return <LoginPage />;
    if (pathname === '/register') return <RegisterPage />;
    if (pathname === '/forgot-password') return <ForgotPasswordPage />;
    if (pathname === '/account') return <AccountPage />;
    if (pathname === '/about') return <AboutPage />;
    if (pathname === '/contact') return <ContactPage />;
    if (pathname === '/policy/shipping') return <PolicyPage type="shipping" />;
    if (pathname === '/policy/privacy') return <PolicyPage type="privacy" />;

    return <HomePage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111111]">
      <Header />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
      <CartDrawer />
      <QuickViewModal />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppRouter />
    </StoreProvider>
  );
}
