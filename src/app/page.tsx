import Image from "next/image";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white overflow-hidden">
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0B]/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-[#00FF94] via-[#00E0F3] to-[#00B3FF] bg-clip-text text-transparent">T3KDET</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" asChild>
                <a href="/auth/signin">Log in</a>
              </Button>
              <Button className="bg-gradient-to-r from-[#00FF94] to-[#00B3FF] text-black hover:opacity-90" asChild>
                <a href="/auth/signup">Sign up</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center space-y-8 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00FF94]/20 via-[#00E0F3]/20 to-[#00B3FF]/20 blur-3xl -z-10" />
            <h1 className="text-6xl font-bold tracking-tight sm:text-7xl lg:text-8xl max-w-4xl">
              <span className="bg-gradient-to-r from-[#00FF94] via-[#00E0F3] to-[#00B3FF] bg-clip-text text-transparent">
                The only autonomous
              </span>
              <br />
              <span className="text-white">technical debt management tool</span>
            </h1>
            <p className="max-w-[42rem] text-xl leading-relaxed text-gray-400">
              With a hardwired reasoning engine, T3KDET has contextual insight into your projects and how your team works.
            </p>
            <div className="flex justify-center">
              <Button size="lg" className="bg-gradient-to-r from-[#00FF94] to-[#00B3FF] text-black hover:opacity-90 px-12 py-6 text-xl" asChild>
                <a href="/auth/signup">Get Started</a>
              </Button>
            </div>

            <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#00FF94]/10 to-[#00B3FF]/10 rounded-lg blur transition-all duration-500 group-hover:blur-xl" />
                <div className="relative p-6 bg-gray-900/50 border border-gray-800 rounded-lg backdrop-blur-sm">
                  <h3 className="text-xl font-semibold mb-2">Automated Analysis</h3>
                  <p className="text-gray-400">Integrate with popular static analysis tools to compute complexity and identify risks.</p>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#00E0F3]/10 to-[#00FF94]/10 rounded-lg blur transition-all duration-500 group-hover:blur-xl" />
                <div className="relative p-6 bg-gray-900/50 border border-gray-800 rounded-lg backdrop-blur-sm">
                  <h3 className="text-xl font-semibold mb-2">Real-time Tracking</h3>
                  <p className="text-gray-400">Monitor technical debt trends with interactive visualizations and metrics.</p>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#00B3FF]/10 to-[#00E0F3]/10 rounded-lg blur transition-all duration-500 group-hover:blur-xl" />
                <div className="relative p-6 bg-gray-900/50 border border-gray-800 rounded-lg backdrop-blur-sm">
                  <h3 className="text-xl font-semibold mb-2">Smart Recommendations</h3>
                  <p className="text-gray-400">Get AI-powered suggestions for improving code quality and reducing debt.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6 text-left">
      <h3 className="text-xl font-semibold text-gray-200">{title}</h3>
      <p className="mt-2 text-gray-400">{description}</p>
    </div>
  );
}
