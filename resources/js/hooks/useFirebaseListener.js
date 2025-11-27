import { useEffect, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/config/firebase';

/**
 * Custom hook untuk mengelola Firebase listeners dengan cleanup otomatis
 * @param {string|Array} paths - Firebase path(s) to listen to
 * @param {Function} callback - Callback function when data changes
 * @param {Array} dependencies - useEffect dependencies
 * @param {Object} options - Options { enabled, onError }
 */
export const useFirebaseListener = (paths, callback, dependencies = [], options = {}) => {
    const { enabled = true, onError } = options;
    const listenersRef = useRef([]);
    const callbackRef = useRef(callback);

    // Update callback ref when it changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled) {
            // Cleanup if disabled
            listenersRef.current.forEach(({ ref: listenerRef, callback: listenerCallback }) => {
                try {
                    off(listenerRef, 'value', listenerCallback);
                } catch (error) {
                    console.error('Error removing Firebase listener:', error);
                }
            });
            listenersRef.current = [];
            return;
        }

        const pathsArray = Array.isArray(paths) ? paths : [paths];
        const newListeners = [];

        pathsArray.forEach(path => {
            if (!path) return;

            const listenerRef = ref(database, path);
            const listenerCallback = (snapshot) => {
                try {
                    callbackRef.current(snapshot, path);
                } catch (error) {
                    console.error(`Error in Firebase listener callback for ${path}:`, error);
                    if (onError) {
                        onError(error, path);
                    }
                }
            };

            onValue(listenerRef, listenerCallback, (error) => {
                if (error) {
                    console.error(`Firebase listener error for ${path}:`, error);
                    if (onError) {
                        onError(error, path);
                    }
                }
            });

            newListeners.push({ ref: listenerRef, callback: listenerCallback });
        });

        listenersRef.current = newListeners;

        // Cleanup function
        return () => {
            listenersRef.current.forEach(({ ref: listenerRef, callback: listenerCallback }) => {
                try {
                    off(listenerRef, 'value', listenerCallback);
                } catch (error) {
                    console.error('Error removing Firebase listener:', error);
                }
            });
            listenersRef.current = [];
        };
    }, [enabled, ...dependencies]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            listenersRef.current.forEach(({ ref: listenerRef, callback: listenerCallback }) => {
                try {
                    off(listenerRef, 'value', listenerCallback);
                } catch (error) {
                    console.error('Error removing Firebase listener on unmount:', error);
                }
            });
            listenersRef.current = [];
        };
    }, []);
};

