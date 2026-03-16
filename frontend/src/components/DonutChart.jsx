import { useEffect, useState } from 'react';

export default function DiagrammeAnneau({ 
    value = 0, 
    size = 160, 
    strokeWidth = 12, 
    color = '#f53003', 
    background = '#eee', 
    label = '',
    data = null // Support for multi-segment donut chart
}) {
    const [animated, setAnimated] = useState(false);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    useEffect(() => {
        const timer = setTimeout(() => setAnimated(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // If data array is provided, use it for multi-segment chart
    let segments = [];
    let total = 0;

    if (data && Array.isArray(data) && data.length > 0) {
        // Multi-segment donut chart
        total = data.reduce((sum, item) => sum + (item.value || 0), 0);
        
        let accumulatedLength = 0;
        segments = data.map((item, index) => {
            const itemValue = item.value || 0;
            const percentage = total > 0 ? (itemValue / total) * 100 : 0;
            const segmentLength = (percentage / 100) * circumference;
            
            // Calculate the offset: start where previous segment ended
            const segmentOffset = accumulatedLength;
            accumulatedLength += segmentLength;
            
            const segment = {
                label: item.label || '',
                value: itemValue,
                percentage: percentage,
                segmentLength: segmentLength,
                offset: segmentOffset,
                // strokeDasharray: "dash-length gap-length"
                // Draw the segment, then leave a gap that fills the rest of the circle
                strokeDasharray: `${segmentLength} ${circumference - segmentLength}`,
                // strokeDashoffset shifts the start position
                // Negative offset moves the start clockwise (since we rotate -90deg)
                strokeDashoffset: animated ? -segmentOffset : circumference - segmentOffset,
                color: item.color || color
            };
            
            return segment;
        });
    } else {
        // Single segment chart (backward compatibility)
        total = value;
        segments = [
            {
                label: label,
                value: value,
                percentage: 100,
                segmentLength: circumference,
                offset: 0,
                strokeDasharray: `${circumference} ${0}`,
                strokeDashoffset: animated ? -0 : circumference,
                color: color
            }
        ];
    }

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
                        className="text-gray-100 dark:text-gray-800"
                        strokeWidth={strokeWidth}
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    {/* Segments */}
                    {segments.map((segment, index) => (
                        <circle
                            key={index}
                            className="transition-all duration-1000 ease-out"
                            strokeWidth={strokeWidth}
                            strokeDasharray={segment.strokeDasharray}
                            strokeDashoffset={segment.strokeDashoffset}
                            strokeLinecap="round"
                            stroke={segment.color}
                            fill="transparent"
                            r={radius}
                            cx={size / 2}
                            cy={size / 2}
                        />
                    ))}
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-[#1b1b18] dark:text-[#EDEDEC]">
                            {total}
                        </div>
                        <div className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                            Total
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            {segments.length > 0 && (
                <div className="mt-6 space-y-2 w-full">
                    {segments.map((segment, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: segment.color }}
                                ></div>
                                <span className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                    {segment.label}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                    {segment.value}
                                </span>
                                {total > 0 && (
                                    <span className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                                        ({Math.round(segment.percentage)}%)
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


