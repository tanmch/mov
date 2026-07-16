import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import AnimatedBackground from '@/Components/AnimatedBackground';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col items-center relative overflow-hidden pt-6 sm:justify-center sm:pt-0 font-body">
            {/* Animated Background - Same as Dashboard */}
            <AnimatedBackground />
            
            <div className="relative z-10">
                <Link href="/">
                    <ApplicationLogo showText={true} asLink={false} />
                </Link>
            </div>

            <div className="relative z-10 mt-6 w-full overflow-hidden bg-white/80 backdrop-blur-lg px-6 py-4 shadow-md sm:max-w-md sm:rounded-lg border border-white/50">
                {children}
            </div>
        </div>
    );
}
