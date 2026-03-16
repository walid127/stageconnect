export default function TableSquelette({ rows = 5 }) {
    return (
        <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden animate-pulse">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-1 h-4 bg-white/20 rounded"></div>
                    <div className="col-span-3 h-4 bg-white/20 rounded"></div>
                    <div className="col-span-2 h-4 bg-white/20 rounded"></div>
                    <div className="col-span-2 h-4 bg-white/20 rounded"></div>
                    <div className="col-span-2 h-4 bg-white/20 rounded"></div>
                    <div className="col-span-2 h-4 bg-white/20 rounded"></div>
                </div>
            </div>
            
            {/* Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(rows)].map((_, i) => (
                    <div key={i} className="px-6 py-4">
                        <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="col-span-3 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="col-span-2 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="col-span-2 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="col-span-2 h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
                            <div className="col-span-2 flex gap-2 justify-center">
                                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}






