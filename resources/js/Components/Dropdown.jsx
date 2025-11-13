import { Transition } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const DropDownContext = createContext();

const Dropdown = ({ children }) => {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef(null);

    const toggleOpen = () => {
        setOpen((previousState) => !previousState);
    };

    return (
        <DropDownContext.Provider value={{ open, setOpen, toggleOpen, triggerRef }}>
            <div className="relative">{children}</div>
        </DropDownContext.Provider>
    );
};

const Trigger = ({ children }) => {
    const { open, setOpen, toggleOpen, triggerRef } = useContext(DropDownContext);

    const overlay = open ? (
        <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setOpen(false)}
        ></div>
    ) : null;

    return (
        <>
            <div 
                ref={triggerRef}
                onClick={(e) => {
                    e.stopPropagation();
                    toggleOpen();
                }}
                className="cursor-pointer"
            >
                {children}
            </div>

            {typeof window !== 'undefined' && overlay
                ? createPortal(overlay, document.body)
                : overlay}
        </>
    );
};

const Content = ({
    align = 'right',
    width = '48',
    contentClasses = 'py-1 bg-white',
    children,
    className = '',
}) => {
    const { open, setOpen, triggerRef } = useContext(DropDownContext);
    const contentRef = useRef(null);

    useEffect(() => {
        if (open && contentRef.current && triggerRef?.current) {
            const trigger = triggerRef.current;
            const content = contentRef.current;
            
            const rect = trigger.getBoundingClientRect();
            
            // Fixed positioning tidak perlu scroll offset
            if (align === 'right') {
                content.style.right = `${window.innerWidth - rect.right}px`;
                content.style.top = `${rect.bottom + 8}px`;
                content.style.left = 'auto';
            } else {
                content.style.left = `${rect.left}px`;
                content.style.top = `${rect.bottom + 8}px`;
                content.style.right = 'auto';
            }
        }
    }, [open, align, triggerRef]);

    let widthClasses = '';

    if (width === '48') {
        widthClasses = 'w-48';
    } else if (width === '56') {
        widthClasses = 'w-56';
    }

    if (!open) return null;

    const dropdownContent = (
        <>
            <Transition
                show={open}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 scale-95 translate-y-[-10px]"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-75"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 translate-y-[-10px]"
            >
                <div
                    ref={contentRef}
                    className={`fixed z-[9999] rounded-xl shadow-2xl ${widthClasses} ${className}`}
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <div
                        className={
                            `rounded-xl ring-1 ring-green-200/30 ` +
                            contentClasses
                        }
                    >
                        {children}
                    </div>
                </div>
            </Transition>
        </>
    );

    // Render menggunakan portal ke body untuk memastikan di atas semua elemen
    if (typeof window !== 'undefined') {
        return createPortal(dropdownContent, document.body);
    }

    return dropdownContent;
};

const DropdownLink = ({ className = '', children, ...props }) => {
    const { setOpen } = useContext(DropDownContext);
    
    return (
        <Link
            {...props}
            onClick={() => setOpen(false)}
            className={
                'block w-full px-4 py-2 text-start text-sm leading-5 text-gray-700 transition duration-150 ease-in-out hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ' +
                className
            }
        >
            {children}
        </Link>
    );
};

Dropdown.Trigger = Trigger;
Dropdown.Content = Content;
Dropdown.Link = DropdownLink;

export default Dropdown;
