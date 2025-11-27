import { useMemo } from 'react';
import { motion } from 'framer-motion';

const leafPngs = [
    '/leaf/leaf.png',
    '/leaf/leaf 2.png',
    '/leaf/leaf 3.png',
];

export default function AnimatedBackground() {
    const flyingLeaves = useMemo(() => {
        return [
            { id: 1, startX: -10, endX: 110, startY: 15, duration: 22, delay: 0, size: 'w-8 h-8', rotation: 45, image: leafPngs[0] },
            { id: 2, startX: -10, endX: 110, startY: 65, duration: 24, delay: 6, size: 'w-10 h-10', rotation: -30, image: leafPngs[0] },
            { id: 3, startX: -10, endX: 110, startY: 35, duration: 20, delay: 2, size: 'w-8 h-8', rotation: 60, image: leafPngs[1] },
            { id: 4, startX: -10, endX: 110, startY: 85, duration: 26, delay: 8, size: 'w-6 h-6', rotation: -45, image: leafPngs[1] },
            { id: 5, startX: -10, endX: 110, startY: 25, duration: 23, delay: 4, size: 'w-10 h-10', rotation: 30, image: leafPngs[2] },
            { id: 6, startX: -10, endX: 110, startY: 75, duration: 21, delay: 10, size: 'w-8 h-8', rotation: -60, image: leafPngs[2] },
            { id: 7, startX: -10, endX: 110, startY: 45, duration: 25, delay: 12, size: 'w-9 h-9', rotation: 75, image: leafPngs[0] },
            { id: 8, startX: -10, endX: 110, startY: 55, duration: 19, delay: 14, size: 'w-7 h-7', rotation: -50, image: leafPngs[1] },
            { id: 9, startX: -10, endX: 110, startY: 30, duration: 27, delay: 16, size: 'w-11 h-11', rotation: 40, image: leafPngs[2] },
            { id: 10, startX: -10, endX: 110, startY: 70, duration: 18, delay: 18, size: 'w-8 h-8', rotation: -70, image: leafPngs[0] },
        ];
    }, []);
    
    const particles = useMemo(() => {
        return [...Array(20)].map((_, i) => ({
            id: i,
            size: Math.random() * 10 + 6,
            left: Math.random() * 100,
            top: Math.random() * 100,
            baseColor: i % 3 === 0 
                ? { r: 167, g: 243, b: 208 }
                : i % 3 === 1 
                ? { r: 191, g: 219, b: 254 }
                : { r: 221, g: 214, b: 254 },
            duration: Math.random() * 8 + 12,
            delay: Math.random() * 5,
            movementType: i % 4,
            radius: Math.random() * 25 + 15,
            speed: Math.random() * 0.4 + 0.4,
        }));
    }, []);

    return (
        <div 
            className="fixed inset-0 -z-10 bg-gradient-to-br from-green-100 via-sky-100 to-green-50"
            style={{
                willChange: 'transform',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
            }}
        >
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
                style={{
                    willChange: 'background',
                }}
            />
            
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                    willChange: 'auto',
                }}
            />
            
            <div 
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{
                    willChange: 'transform',
                    transform: 'translateZ(0)',
                }}
            >
                {flyingLeaves.map((leaf) => (
                    <motion.div
                        key={leaf.id}
                        className={`absolute ${leaf.size}`}
                        initial={{
                            x: `${leaf.startX}vw`,
                            y: `${leaf.startY}vh`,
                            rotate: leaf.rotation,
                            opacity: 0,
                        }}
                        animate={{
                            x: `${leaf.endX}vw`,
                            y: `${leaf.startY + 15}vh`,
                            rotate: [leaf.rotation, leaf.rotation + 360, leaf.rotation + 720],
                            opacity: [0, 0.7, 0.5, 0.3, 0],
                        }}
                        transition={{
                            duration: leaf.duration,
                            repeat: Infinity,
                            delay: leaf.delay,
                            ease: "linear",
                        }}
                        style={{
                            willChange: 'transform, opacity',
                            transform: 'translateZ(0)',
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
                            style={{
                                willChange: 'filter',
                            }}
                        >
                            <div 
                                className="w-full h-full relative"
                                style={{
                                    mixBlendMode: 'multiply',
                                }}
                            >
                                <img 
                                    src={leaf.image} 
                                    alt="Flying leaf" 
                                    className="w-full h-full object-contain drop-shadow-md"
                                    style={{ 
                                        imageRendering: 'auto',
                                        filter: 'brightness(1.05) contrast(1.15) saturate(1.2)',
                                        WebkitFilter: 'brightness(1.05) contrast(1.15) saturate(1.2)',
                                        mixBlendMode: 'multiply',
                                        willChange: 'auto',
                                    }}
                                    loading="lazy"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                ))}
            </div>
            
            {particles.map((particle) => {
                const colors = [
                    `rgba(${particle.baseColor.r}, ${particle.baseColor.g}, ${particle.baseColor.b}, 0.3)`,
                    `rgba(${particle.baseColor.r + 15}, ${particle.baseColor.g + 15}, ${particle.baseColor.b + 15}, 0.3)`,
                    `rgba(${particle.baseColor.r - 15}, ${particle.baseColor.g - 15}, ${particle.baseColor.b - 15}, 0.3)`,
                    `rgba(${particle.baseColor.r}, ${particle.baseColor.g}, ${particle.baseColor.b}, 0.3)`,
                ];
                
                let movementAnimation = {};
                if (particle.movementType === 0) {
                    movementAnimation = {
                        x: [
                            `calc(${particle.left}vw + ${particle.radius * Math.cos(0)}px)`,
                            `calc(${particle.left}vw + ${particle.radius * Math.cos(Math.PI / 2)}px)`,
                            `calc(${particle.left}vw + ${particle.radius * Math.cos(Math.PI)}px)`,
                            `calc(${particle.left}vw + ${particle.radius * Math.cos(3 * Math.PI / 2)}px)`,
                            `calc(${particle.left}vw + ${particle.radius * Math.cos(2 * Math.PI)}px)`,
                        ],
                        y: [
                            `calc(${particle.top}vh + ${particle.radius * Math.sin(0)}px)`,
                            `calc(${particle.top}vh + ${particle.radius * Math.sin(Math.PI / 2)}px)`,
                            `calc(${particle.top}vh + ${particle.radius * Math.sin(Math.PI)}px)`,
                            `calc(${particle.top}vh + ${particle.radius * Math.sin(3 * Math.PI / 2)}px)`,
                            `calc(${particle.top}vh + ${particle.radius * Math.sin(2 * Math.PI)}px)`,
                        ],
                    };
                } else if (particle.movementType === 1) {
                    movementAnimation = {
                        x: [
                            `${particle.left}vw`,
                            `${particle.left + particle.radius * 0.4}vw`,
                            `${particle.left}vw`,
                            `${particle.left - particle.radius * 0.4}vw`,
                            `${particle.left}vw`,
                        ],
                        y: [
                            `${particle.top}vh`,
                            `${particle.top - particle.radius * 0.25}vh`,
                            `${particle.top}vh`,
                            `${particle.top + particle.radius * 0.25}vh`,
                            `${particle.top}vh`,
                        ],
                    };
                } else if (particle.movementType === 2) {
                    movementAnimation = {
                        x: [
                            `${particle.left}vw`,
                            `${particle.left + particle.radius * 0.3}vw`,
                            `${particle.left}vw`,
                            `${particle.left - particle.radius * 0.3}vw`,
                            `${particle.left}vw`,
                        ],
                        y: [
                            `${particle.top}vh`,
                            `${particle.top - particle.radius * 0.5}vh`,
                            `${particle.top - particle.radius * 0.25}vh`,
                            `${particle.top - particle.radius * 0.5}vh`,
                            `${particle.top}vh`,
                        ],
                    };
                } else {
                    movementAnimation = {
                        x: [
                            `${particle.left}vw`,
                            `${particle.left + particle.radius * 0.25}vw`,
                            `${particle.left}vw`,
                            `${particle.left - particle.radius * 0.25}vw`,
                            `${particle.left}vw`,
                        ],
                        y: [
                            `${particle.top}vh`,
                            `${particle.top - particle.radius * 0.3}vh`,
                            `${particle.top}vh`,
                            `${particle.top + particle.radius * 0.3}vh`,
                            `${particle.top}vh`,
                        ],
                    };
                }
                
                return (
                    <motion.div
                        key={particle.id}
                        className="absolute rounded-full"
                        style={{
                            width: particle.size + 'px',
                            height: particle.size + 'px',
                            x: `${particle.left}vw`,
                            y: `${particle.top}vh`,
                            backgroundColor: colors[0],
                            boxShadow: `0 0 ${particle.size * 1.5}px ${colors[0]}`,
                            willChange: 'transform, opacity',
                            transform: 'translateZ(0)',
                        }}
                        animate={{
                            ...movementAnimation,
                            opacity: [0.2, 0.5, 0.3, 0.5, 0.2],
                            scale: [1, 1.15, 1.05, 1.2, 1],
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
            
            {/* Animated Gradient Blobs */}
            <motion.div
                className="absolute top-0 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
                style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))',
                    willChange: 'transform',
                    transform: 'translateZ(0)',
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
                    willChange: 'transform',
                    transform: 'translateZ(0)',
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
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-15"
                style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
                    willChange: 'transform',
                    transform: 'translateZ(0)',
                }}
                animate={{
                    x: [0, 50, -50, 0],
                    y: [0, -30, 30, 0],
                    scale: [1, 1.15, 1.1, 1],
                }}
                transition={{
                    duration: 35,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
        </div>
    );
}
