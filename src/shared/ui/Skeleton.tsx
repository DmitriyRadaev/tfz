import clsx from "clsx";


type SkeletonProps = {
    className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={clsx(
                "animate-pulse rounded-md bg-gray-200",
                className
            )}
        />
    );
}

export function PatientCardSkeleton() {
    return (
        <div className="p-3 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-start mb-3">
                <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex justify-between mt-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
        </div>
    );
}

export function PatientCaseCardSkeleton() {
    return (
        <div className="p-3 border border-gray-200 rounded-lg">
            <div className="flex flex-col items-start mb-3 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24 rounded-full" />
            </div>
        </div>
    );
}