export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    ...props
}) {
    const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

    const variants = {
        primary: 'bg-accent text-white hover:brightness-110 rounded-lg shadow-lg hover:shadow-accent/30',
        secondary: 'bg-surface-dark border border-border-dark text-text-primary hover:border-primary/50 hover:bg-surface-hover rounded-lg',
        ghost: 'bg-transparent text-text-secondary hover:text-[#2A2018] hover:bg-[#C17C64]/5 rounded-lg',
        danger: 'bg-danger text-white hover:bg-red-400 rounded-lg',
        outline: 'bg-transparent border border-primary/40 text-primary hover:bg-primary/10 rounded-lg',
        pill: 'bg-accent text-white hover:brightness-110 rounded-full shadow-lg hover:shadow-accent/30',
    };

    const sizes = {
        xs: 'px-3 py-1.5 text-xs',
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-2.5 text-sm',
        lg: 'px-8 py-3 text-base',
        xl: 'px-10 py-4 text-lg',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}
            {children}
        </button>
    );
}
