// Marcador de posición mientras cargan las publicaciones (mismo esqueleto que PostCard)
function PostSkeleton() {
    return (
        <div aria-hidden="true" className="motion-safe:animate-pulse rounded-2xl border border-line bg-surface/50 p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-line" />
                <div className="space-y-2">
                    <div className="h-3 w-28 rounded bg-line" />
                    <div className="h-2.5 w-20 rounded bg-line" />
                </div>
            </div>
            <div className="mt-5 h-5 w-3/4 rounded bg-line" />
            <div className="mt-3 space-y-2">
                <div className="h-3 rounded bg-line" />
                <div className="h-3 w-5/6 rounded bg-line" />
            </div>
            <div className="mt-5 h-40 rounded-xl bg-line" />
        </div>
    );
}

export default PostSkeleton;
