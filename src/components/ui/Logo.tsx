import React from 'react';

interface LogoProps {
    className?: string; // Container class
    iconClassName?: string; // Icon size class
    textClassName?: string; // Text styling
    showText?: boolean;
}

export const Logo = ({
    className = "flex items-center gap-2",
    iconClassName = "w-8 h-8",
    textClassName = "text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400",
    showText = true
}: LogoProps) => {
    return (
        <div className={`${className} group`}>
            <img src="/logo.png" alt="KeepFlock" className={`${iconClassName} object-contain transition-transform group-hover:scale-105`} />
            {showText && (
                <span className={textClassName}>
                    KeepFlock
                </span>
            )}
        </div>
    );
};

export const LogoIcon = ({ className = "w-8 h-8" }: { className?: string }) => {
    return <img src="/logo.png" alt="KeepFlock" className={`${className} object-contain`} />;
};
