import { Link, usePage } from '@inertiajs/react';
import { Home, Leaf, Camera, BookOpen, User } from 'lucide-react';

export default function BottomNav() {
    const { url } = usePage();
    
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
        { id: 'kebun', label: 'Kebun', icon: Leaf, href: '/kebun' },
        { id: 'deteksi', label: 'Deteksi', icon: Camera, href: '/deteksi' },
        { id: 'artikel', label: 'Artikel', icon: BookOpen, href: '/artikel' },
        { id: 'profil', label: 'Profil', icon: User, href: '/profile' },
    ];

    const isActive = (href) => {
        return url === href || url.startsWith(href + '/');
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-50 shadow-lg">
            <div className="flex items-center justify-around max-w-md mx-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                                active
                                    ? 'text-green-600 bg-green-50'
                                    : 'text-gray-500 hover:text-green-600 hover:bg-gray-50'
                            }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

