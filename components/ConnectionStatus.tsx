export default function ConnectionStatus({ isActive }: { isActive: boolean }) {
    return (
        <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                {isActive ? 'Link Active' : 'Link Unstable'}
            </span>
            <div
                className={`w-2 h-2 rounded-full shadow-[0_0_8px] transition-colors duration-500 ${
                    isActive
                        ? 'bg-green-500 shadow-green-500/50'
                        : 'bg-red-500 shadow-red-500/50 animate-pulse'
                }`}
                title={isActive ? "All encrypted uplinks established" : "Attempting to re-establish data link"}
            />
        </div>
    );
}
