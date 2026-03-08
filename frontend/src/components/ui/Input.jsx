import { forwardRef } from 'react';

export const Input = forwardRef(({ className = '', error, label, ...props }, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</label>
            )}
            <input
                ref={ref}
                className={`w-full bg-surface-dark border border-border-dark rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm ${error ? 'border-danger focus:border-danger focus:ring-danger' : ''} ${className}`}
                {...props}
            />
            {error && <p className="text-danger text-xs mt-1.5 font-medium">{error}</p>}
        </div>
    );
});

Input.displayName = 'Input';
