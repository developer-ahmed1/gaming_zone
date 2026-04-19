'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/booking', icon: '➕', label: 'Book' },
  { href: '/bookings', icon: '📋', label: 'Bookings' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🎮</span>
          <span className="sidebar-logo-text">Mirpurkhas<br/>Gaming Zone</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%' }}>
            <span className="sidebar-link-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
