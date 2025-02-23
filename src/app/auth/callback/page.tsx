'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        
        // Redirect to dashboard after successful authentication
        router.push('/dashboard');
      } catch (error: any) {
        console.error('Error during auth callback:', error.message);
        router.push('/auth/signin');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Completing authentication...</h2>
        <div className="animate-pulse">Please wait while we redirect you</div>
      </div>
    </div>
  );
}