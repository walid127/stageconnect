export default function CarteSquelette() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md sm:rounded-2xl sm:shadow-lg border border-gray-100 dark:border-gray-700 p-3 sm:p-6 animate-pulse">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
            <div className="h-8 sm:h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1.5 sm:mb-2"></div>
            <div className="h-2.5 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 hidden sm:block"></div>
        </div>
    );
}






