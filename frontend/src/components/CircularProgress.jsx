import { useEffect, useState } from 'react';

export default function ProgressionCirculaire({ 
    percentage = 0, 
    size = 120, 
    strokeWidth = 8, 
    color = '#3b82f6',
    label = '',
    showPercentage = true 
}) {
    const [progress, setProgress] = useState(0);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    
    // Ensure valid numeric values to prevent NaN
    const safeProgress = Number.isFinite(progress) ? progress : 0;
    const offset = circumference - (safeProgress / 100) * circumference;

    useEffect(() => {
        const timer = setTimeout(() => {
            // Ensure percentage is a valid number before setting
            const safePercentage = Number.isFinite(percentage) ? percentage : 0;
            setProgress(safePercentage);
        }, 100);
        return () => clearTimeout(timer);
    }, [percentage]);

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    className="transform -rotate-90"
                    width={size}
                    height={size}
                >
                    {/* Background circle */}
                    <circle
                        className="text-gray-200 dark:text-gray-700"
                        strokeWidth={strokeWidth}
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    {/* Progress circle */}
                    <circle
                        className="transition-all duration-1000 ease-out"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke={color}
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        {showPercentage && (
                            <div className="text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC]">
                                {Math.round(safeProgress)}%
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {label && (
                <div className="mt-2 text-sm font-medium text-[#78786c] dark:text-[#9D9D99] text-center">
                    {label}
                </div>
            )}
        </div>
    );
}


