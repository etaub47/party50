'use client'

import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export default function AppGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const hasAccess = document.cookie.includes("party_access=true");
        if (!hasAccess && pathname !== '/gatekeeper') {
            router.replace('/gatekeeper');
            setIsAuthorized(false);
        } else {
            setIsAuthorized(true);
        }
    }, [pathname, router]);

    if (isAuthorized === null && pathname !== '/gatekeeper') {
        return <div className="bg-black min-h-screen" />;
    }

    return <>{children}</>;
}
