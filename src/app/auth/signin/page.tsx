'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Github } from 'lucide-react';
import { Gitlab } from 'lucide-react';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleGitlabSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'gitlab',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8 bg-black/10 rounded-lg backdrop-blur-sm">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-400">
            Or{' '}
            <a href="/auth/signup" className="font-medium hover:text-gray-200">
              create a new account
            </a>
          </p>
        </div>

        <form onSubmit={handleSignIn} className="mt-8 space-y-6">
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGithubSignIn}
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGitlabSignIn}
            >
              <Gitlab className="mr-2 h-4 w-4" />
              GitLab
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}