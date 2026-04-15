export default function TableSquelette({ rows = 5 }) {
    return (
        <div className="bg-white/95 dark:bg-[#161615]/95 rounded-xl shadow-md sm:rounded-2xl sm:shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden animate-pulse">
            {/* Header */}
            <div className="sc-table-header-gradient px-3 py-3 sm:px-6 sm:py-4">
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
                    <div key={i} className="px-3 py-3 sm:px-6 sm:py-4">
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






