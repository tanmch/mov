import { usePage } from '@inertiajs/react';

/**
 * Custom hook untuk role-based access control
 * @returns {Object} Role helpers dan user data
 */
export function useRole() {
    const { auth } = usePage().props;
    const user = auth?.user;
    const userRole = user?.role;

    return {
        // User data
        user,
        userRole,
        
        // Role checks
        isKPetani: userRole === 'k-petani',
        isPetani: userRole === 'petani',
        isGuest: userRole === 'guest',
        
        // Permission checks
        canEdit: userRole === 'k-petani',
        canDelete: userRole === 'k-petani',
        canCreate: userRole === 'k-petani',
        canManageUsers: userRole === 'k-petani',
        canManageKebun: userRole === 'k-petani',
        canManageBlok: userRole === 'k-petani',
        canScheduleRobot: userRole === 'k-petani',
        
        // Helper function untuk check multiple roles
        hasRole: (roles) => {
            if (!Array.isArray(roles)) {
                roles = [roles];
            }
            return roles.includes(userRole);
        },
        
        // Helper function untuk check permission
        hasPermission: (permission) => {
            // K-Petani has all permissions
            if (userRole === 'k-petani') {
                return true;
            }
            
            // Define permissions for each role
            const permissions = {
                'petani': [
                    'view.dashboard',
                    'view.kebun',
                    'view.blok',
                    'view.sensor',
                    'view.robot',
                    'view.deteksi',
                    'view.prediksi',
                    'view.laporan',
                    'view.artikel',
                ],
                'guest': [
                    'view.artikel',
                ],
            };
            
            return permissions[userRole]?.includes(permission) || false;
        },
    };
}

