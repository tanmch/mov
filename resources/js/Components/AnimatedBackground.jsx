import { useMemo } from 'react';
import { motion } from 'framer-motion';

// GIF files available - defined outside component for better performance
const leafGifs = [
    '/leaf/leaf.gif',
    '/leaf/clover.gif',
    '/leaf/leaf love.gif',
    '/leaf/organic.gif',
];

export default function AnimatedBackground() {
    // Flying leaves animation data - 8 leaves (2 per GIF) with more spacing
    const flyingLeaves = useMemo(() => {
        return [
            // leaf.gif (2x)
            { id: 1, startX: -10, endX: 110, startY: 15, duration: 22, delay: 0, size: 'w-8 h-8', rotation: 45, gif: leafGifs[0] },
            { id: 2, startX: -10, endX: 110, startY: 65, duration: 24, delay: 6, size: 'w-10 h-10', rotation: -30, gif: leafGifs[0] },
            // clover.gif (2x)
            { id: 3, startX: -10, endX: 110, startY: 35, duration: 20, delay: 2, size: 'w-8 h-8', rotation: 60, gif: leafGifs[1] },
            { id: 4, startX: -10, endX: 110, startY: 85, duration: 26, delay: 8, size: 'w-6 h-6', rotation: -45, gif: leafGifs[1] },
            // leaf love.gif (2x)
            { id: 5, startX: -10, endX: 110, startY: 25, duration: 23, delay: 4, size: 'w-10 h-10', rotation: 30, gif: leafGifs[2] },
            { id: 6, startX: -10, endX: 110, startY: 75, duration: 21, delay: 10, size: 'w-8 h-8', rotation: -60, gif: leafGifs[2] },
            // organic.gif (2x)
            { id: 7, startX: -10, endX: 110, startY: 50, duration: 25, delay: 1, size: 'w-6 h-6', rotation: 50, gif: leafGifs[3] },
            { id: 8, startX: -10, endX: 110, startY: 90, duration: 19, delay: 7, size: 'w-10 h-10', rotation: -40, gif: leafGifs[3] },
        ];
    }, []);
    
    // Generate particle data once (memoized) - Larger, pastel colors, abstract movement
    const particles = useMemo(() => {
        return [...Array(20)].map((_, i) => ({
            id: i,
            size: Math.random() * 12 + 8,
            left: Math.random() * 100,
            top: Math.random() * 100,
            // Pastel colors with lower saturation
            baseColor: i % 3 === 0 
                ? { r: 167, g: 243, b: 208 } // Pastel emerald
                : i % 3 === 1 
                ? { r: 191, g: 219, b: 254 } // Pastel blue
                : { r: 221, g: 214, b: 254 }, // Pastel purple
            duration: Math.random() * 10 + 10,
            delay: Math.random() * 5,
            // Abstract movement patterns
            movementType: i % 4, // 0: circular, 1: figure-8, 2: zigzag, 3: wave
            radius: Math.random() * 30 + 20, // For circular movement
            speed: Math.random() * 0.5 + 0.3, // Movement speed multiplier
        }));
    }, []);

    return (
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-green-100 via-sky-100 to-green-50">
            {/* Subtle animated overlay for depth */}
            <motion.div
                className="absolute inset-0"
                animate={{
                    background: [
                        'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
                        'radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
                        'radial-gradient(circle at 50% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)',
                        'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
                    ],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            
            {/* Subtle grid pattern */}
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                }}
            />
            
                    {/* Flying Leaves Animation with GIF */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {flyingLeaves.map((leaf) => (
                    <motion.div
                        key={leaf.id}
                        className={`absolute ${leaf.size}`}
                        initial={{
                            left: `${leaf.startX}%`,
                            top: `${leaf.startY}%`,
                            rotate: leaf.rotation,
                            opacity: 0,
                        }}
                        animate={{
                            left: `${leaf.endX}%`,
                            top: `${leaf.startY + 15}%`,
                            rotate: [leaf.rotation, leaf.rotation + 360, leaf.rotation + 720],
                            opacity: [0, 0.7, 0.5, 0.3, 0],
                            y: [0, -20, -10, 0, 10, 20],
                        }}
                        transition={{
                            duration: leaf.duration,
                            repeat: Infinity,
                            delay: leaf.delay,
                            ease: "linear",
                        }}
                    >
                        <motion.div
                            className="w-full h-full"
                            animate={{
                                filter: [
                                    'hue-rotate(0deg) saturate(1) brightness(1)',
                                    'hue-rotate(20deg) saturate(1.15) brightness(1.05)',
                                    'hue-rotate(40deg) saturate(1.3) brightness(1.1)',
                                    'hue-rotate(20deg) saturate(1.15) brightness(1.05)',
                                    'hue-rotate(0deg) saturate(1) brightness(1)',
                                ],
                            }}
                            transition={{
                                duration: 12 + (leaf.id * 0.8),
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: leaf.delay * 0.4,
                            }}
                        >
                            <div 
                                className="w-full h-full relative"
                                style={{
                                    mixBlendMode: 'multiply',
                                }}
                            >
                                <img 
                                    src={leaf.gif} 
                                    alt="Flying leaf" 
                                    className="w-full h-full object-contain drop-shadow-md"
                                    style={{ 
                                        imageRendering: 'auto',
                                        // Remove white background using CSS filters
                                        // This makes white/light colors more transparent
                                        filter: 'brightness(1.05) contrast(1.15) saturate(1.2)',
                                        WebkitFilter: 'brightness(1.05) contrast(1.15) saturate(1.2)',
                                        // Use mix-blend-mode to blend with background
                                        mixBlendMode: 'multiply',
                                    }}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                ))}
            </div>
            
            {/* Floating Particles - Abstract Movement with Pastel Colors */}
            {particles.map((particle) => {
                // Generate color transitions for pastel colors
                const colors = [
                    `rgba(${particle.baseColor.r}, ${particle.baseColor.g}, ${particle.baseColor.b}, 0.4)`,
                    `rgba(${particle.baseColor.r + 20}, ${particle.baseColor.g + 20}, ${particle.baseColor.b + 20}, 0.4)`,
                    `rgba(${particle.baseColor.r - 20}, ${particle.baseColor.g - 20}, ${particle.baseColor.b - 20}, 0.4)`,
                    `rgba(${particle.baseColor.r}, ${particle.baseColor.g}, ${particle.baseColor.b}, 0.4)`,
                ];
                
                // Abstract movement patterns
                let movementAnimation = {};
                if (particle.movementType === 0) {
                    // Circular movement
                    movementAnimation = {
                        x: [
                            `calc(${particle.left}% + ${particle.radius * Math.cos(0)}px)`,
                            `calc(${particle.left}% + ${particle.radius * Math.cos(Math.PI / 2)}px)`,
                            `calc(${particle.left}% + ${particle.radius * Math.cos(Math.PI)}px)`,
                            `calc(${particle.left}% + ${particle.radius * Math.cos(3 * Math.PI / 2)}px)`,
                            `calc(${particle.left}% + ${particle.radius * Math.cos(2 * Math.PI)}px)`,
                        ],
                        y: [
                            `calc(${particle.top}% + ${particle.radius * Math.sin(0)}px)`,
                            `calc(${particle.top}% + ${particle.radius * Math.sin(Math.PI / 2)}px)`,
                            `calc(${particle.top}% + ${particle.radius * Math.sin(Math.PI)}px)`,
                            `calc(${particle.top}% + ${particle.radius * Math.sin(3 * Math.PI / 2)}px)`,
                            `calc(${particle.top}% + ${particle.radius * Math.sin(2 * Math.PI)}px)`,
                        ],
                    };
                } else if (particle.movementType === 1) {
                    // Figure-8 movement
                    movementAnimation = {
                        x: [
                            `${particle.left}%`,
                            `${particle.left + particle.radius * 0.5}%`,
                            `${particle.left}%`,
                            `${particle.left - particle.radius * 0.5}%`,
                            `${particle.left}%`,
                        ],
                        y: [
                            `${particle.top}%`,
                            `${particle.top - particle.radius * 0.3}%`,
                            `${particle.top}%`,
                            `${particle.top + particle.radius * 0.3}%`,
                            `${particle.top}%`,
                        ],
                    };
                } else if (particle.movementType === 2) {
                    // Zigzag movement
                    movementAnimation = {
                        x: [
                            `${particle.left}%`,
                            `${particle.left + particle.radius * 0.4}%`,
                            `${particle.left}%`,
                            `${particle.left - particle.radius * 0.4}%`,
                            `${particle.left}%`,
                        ],
                        y: [
                            `${particle.top}%`,
                            `${particle.top - particle.radius * 0.6}%`,
                            `${particle.top - particle.radius * 0.3}%`,
                            `${particle.top - particle.radius * 0.6}%`,
                            `${particle.top}%`,
                        ],
                    };
                } else {
                    // Wave movement
                    movementAnimation = {
                        x: [
                            `${particle.left}%`,
                            `${particle.left + particle.radius * 0.3}%`,
                            `${particle.left}%`,
                            `${particle.left - particle.radius * 0.3}%`,
                            `${particle.left}%`,
                        ],
                        y: [
                            `${particle.top}%`,
                            `${particle.top - particle.radius * 0.4}%`,
                            `${particle.top}%`,
                            `${particle.top + particle.radius * 0.4}%`,
                            `${particle.top}%`,
                        ],
                    };
                }
                
                // Generate box shadow with pastel colors
                const baseColorStr = `rgba(${particle.baseColor.r}, ${particle.baseColor.g}, ${particle.baseColor.b}, 0.4)`;
                
                return (
                    <motion.div
                        key={particle.id}
                        className="absolute rounded-full"
                        style={{
                            width: particle.size + 'px',
                            height: particle.size + 'px',
                            left: particle.left + '%',
                            top: particle.top + '%',
                            boxShadow: `0 0 ${particle.size * 2}px ${baseColorStr}, 0 0 ${particle.size * 4}px ${baseColorStr}40`,
                        }}
                        animate={{
                            ...movementAnimation,
                            backgroundColor: colors,
                            opacity: [0.3, 0.6, 0.4, 0.6, 0.3],
                            scale: [1, 1.2, 1.1, 1.3, 1],
                            rotate: [0, 180, 360],
                            boxShadow: [
                                `0 0 ${particle.size * 2}px ${colors[0]}, 0 0 ${particle.size * 4}px ${colors[0]}40`,
                                `0 0 ${particle.size * 2.5}px ${colors[1]}, 0 0 ${particle.size * 5}px ${colors[1]}40`,
                                `0 0 ${particle.size * 2.2}px ${colors[2]}, 0 0 ${particle.size * 4.5}px ${colors[2]}40`,
                                `0 0 ${particle.size * 2.5}px ${colors[3]}, 0 0 ${particle.size * 5}px ${colors[3]}40`,
                                `0 0 ${particle.size * 2}px ${colors[0]}, 0 0 ${particle.size * 4}px ${colors[0]}40`,
                            ],
                        }}
                        transition={{
                            duration: particle.duration * particle.speed,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: particle.delay,
                        }}
                    />
                );
            })}
            
            {/* Subtle animated blobs for depth */}
            <motion.div
                className="absolute top-0 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
                style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))',
                }}
                animate={{
                    x: [0, 100, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            <motion.div
                className="absolute bottom-0 -right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
                style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                }}
                animate={{
                    x: [0, -100, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
        </div>
    );
}

