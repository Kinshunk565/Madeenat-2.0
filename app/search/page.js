'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SearchRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';

  useEffect(() => {
    router.replace(`/?query=${encodeURIComponent(query)}`);
  }, [query, router]);

  return <p className="text-center" style={{ padding: '6rem' }}>Searching inventory databases...</p>;
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<p className="text-center" style={{ padding: '6rem' }}>Loading Search Results...</p>}>
      <SearchRedirectContent />
    </Suspense>
  );
}
