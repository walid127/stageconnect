export default function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmer la suppression",
    message = "Cette action est irréversible",
    itemName,
    itemDetails,
    warningMessage,
    confirmButtonText = "Supprimer",
    itemIcon,
    disabled = false
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 max-w-md w-full">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white rounded-t-2xl">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">
                                {title}
                            </h3>
                            <p className="text-white/80 text-sm">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="p-6">
                    <div className="mb-6">
                        {itemName && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    {itemIcon && (
                                        <div className="w-10 h-10 bg-gradient-to-br from-[#1a365d] to-[#2d3748] rounded-xl flex items-center justify-center text-white text-lg font-bold">
                                            {itemIcon}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-[#1b1b18] dark:text-[#EDEDEC] text-lg">
                                            {itemName}
                                        </h4>
                                        {itemDetails && (
                                            <div className="mt-1">
                                                {itemDetails}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        {warningMessage && (
                            <p className="text-xs text-[#78786c] dark:text-[#9D9D99] mt-3">
                                {warningMessage}
                            </p>
                        )}
                    </div>
                    
                    <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={disabled || confirmButtonText?.includes('...') || confirmButtonText?.includes('Suppression')}
                            className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {confirmButtonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

