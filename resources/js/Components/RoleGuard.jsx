import { useRole } from '@/hooks/useRole';

/**
 * Component untuk conditional rendering berdasarkan role
 * 
 * @param {Object} props
 * @param {string|string[]} props.allowedRoles - Role yang diizinkan (e.g., 'k-petani' atau ['k-petani', 'petani'])
 * @param {React.ReactNode} props.children - Content yang akan dirender jika role sesuai
 * @param {React.ReactNode} props.fallback - Content yang akan dirender jika role tidak sesuai (optional)
 * @param {boolean} props.requireAll - Jika true, semua roles harus match (untuk multiple roles)
 */
export default function RoleGuard({ 
    allowedRoles, 
    children, 
    fallback = null,
    requireAll = false 
}) {
    const { hasRole } = useRole();
    
    // Convert single role to array
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    // Check if user has required role
    let hasAccess = false;
    
    if (requireAll) {
        // User must have ALL roles (rarely used)
        hasAccess = roles.every(role => hasRole(role));
    } else {
        // User must have at least ONE role (common case)
        hasAccess = roles.some(role => hasRole(role));
    }
    
    return hasAccess ? children : fallback;
}

/**
 * Component wrapper untuk K-Petani only content
 */
export function KPetaniOnly({ children, fallback = null }) {
    return (
        <RoleGuard allowedRoles="k-petani" fallback={fallback}>
            {children}
        </RoleGuard>
    );
}

/**
 * Component wrapper untuk Petani and above (Petani + K-Petani)
 */
export function PetaniAndAbove({ children, fallback = null }) {
    return (
        <RoleGuard allowedRoles={['petani', 'k-petani']} fallback={fallback}>
            {children}
        </RoleGuard>
    );
}

