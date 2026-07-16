// Lightweight animated background.
//
// The previous implementation ran ~35 infinite framer-motion animations
// (animated background gradients, hue-rotate filters, mix-blend-mode,
// per-frame calc() interpolation) which forced continuous full-screen
// repaints and pushed GPU usage up drastically on every page.
//
// This version uses pure CSS keyframes that only animate `transform` and
// `opacity`, so everything runs on the compositor thread with no repaints.
// Animations are disabled entirely for users with prefers-reduced-motion.
// Keyframes live in resources/css/app.css (.bg-leaf, .bg-particle, .bg-blob).

const LEAVES = [
    { image: '/leaf/leaf.png', top: '15%', size: 32, duration: 38, delay: 0 },
    { image: '/leaf/leaf 2.png', top: '55%', size: 40, duration: 46, delay: 12 },
    { image: '/leaf/leaf 3.png', top: '35%', size: 28, duration: 42, delay: 24 },
    { image: '/leaf/leaf 2.png', top: '75%', size: 36, duration: 50, delay: 6 },
];

const PARTICLES = [
    { left: '12%', top: '25%', size: 10, color: 'rgba(167, 243, 208, 0.35)', duration: 14, delay: 0 },
    { left: '28%', top: '65%', size: 8, color: 'rgba(191, 219, 254, 0.35)', duration: 17, delay: 3 },
    { left: '45%', top: '20%', size: 12, color: 'rgba(221, 214, 254, 0.3)', duration: 15, delay: 6 },
    { left: '62%', top: '70%', size: 9, color: 'rgba(167, 243, 208, 0.35)', duration: 18, delay: 2 },
    { left: '78%', top: '35%', size: 11, color: 'rgba(191, 219, 254, 0.35)', duration: 16, delay: 8 },
    { left: '90%', top: '60%', size: 8, color: 'rgba(221, 214, 254, 0.3)', duration: 19, delay: 5 },
];

export default function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-green-100 via-sky-100 to-green-50">
            {/* Static radial tint (was an animated background gradient) */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(circle at 25% 40%, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 60%, rgba(59, 130, 246, 0.06) 0%, transparent 50%)',
                }}
            />

            {/* Static grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px',
                }}
            />

            {/* Drifting leaves — transform/opacity only */}
            {LEAVES.map((leaf, i) => (
                <img
                    key={i}
                    src={leaf.image}
                    alt=""
                    aria-hidden="true"
                    className="bg-leaf absolute object-contain"
                    style={{
                        top: leaf.top,
                        width: leaf.size,
                        height: leaf.size,
                        animationDuration: `${leaf.duration}s`,
                        animationDelay: `-${leaf.delay}s`,
                    }}
                    loading="lazy"
                />
            ))}

            {/* Floating particles — transform/opacity only */}
            {PARTICLES.map((p, i) => (
                <div
                    key={i}
                    className="bg-particle absolute rounded-full"
                    style={{
                        left: p.left,
                        top: p.top,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `-${p.delay}s`,
                    }}
                />
            ))}

            {/* Soft gradient blobs — blurred once, moved by the compositor */}
            <div
                className="bg-blob absolute top-0 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
                style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))',
                    animationDuration: '50s',
                }}
            />
            <div
                className="bg-blob absolute bottom-0 -right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
                style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                    animationDuration: '60s',
                    animationDelay: '-20s',
                }}
            />
        </div>
    );
}
