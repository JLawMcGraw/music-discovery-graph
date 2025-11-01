import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          DeepCuts
        </h1>
        <p className="text-2xl text-gray-300 mb-8">
          Find Tastemakers Who Share Your Passion
        </p>
        <p className="text-lg text-gray-400 mb-8 max-w-2xl">
          No algorithms. No ratings. No competition. Just music lovers curating the tracks that matter to them—and helping you discover curators whose taste aligns with yours.
        </p>
        <div className="flex gap-4">
          <Link
            href="/auth/signup"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
          >
            Get Started
          </Link>
          <Link
            href="/feed"
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
          >
            Browse Drops
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h3 className="text-xl font-semibold mb-3 text-purple-400">Curate, Don't Compete</h3>
            <p className="text-gray-400">
              Share 10 tracks per week. The limit encourages you to be selective and thoughtful about what defines your taste.
            </p>
          </div>
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h3 className="text-xl font-semibold mb-3 text-purple-400">Context is Everything</h3>
            <p className="text-gray-400">
              Every drop includes why it matters and what to listen for. Discover music through the lens of people who care deeply.
            </p>
          </div>
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h3 className="text-xl font-semibold mb-3 text-purple-400">Find Your People</h3>
            <p className="text-gray-400">
              Follow curators whose taste resonates with you. Build a feed of music discovery from voices you trust.
            </p>
          </div>
        </div>

        <div className="mt-16 p-8 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 text-white">How It Works</h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex gap-4">
              <span className="text-3xl">1️⃣</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Share What Moves You</h3>
                <p className="text-gray-400">Pick 10 tracks per week that represent your taste. Quality over quantity.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-3xl">2️⃣</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Add Your Perspective</h3>
                <p className="text-gray-400">Explain why it matters. What makes it special? What should listeners pay attention to?</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-3xl">3️⃣</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Discover Aligned Taste</h3>
                <p className="text-gray-400">Browse curators by genre and curation philosophy. Follow those whose taste resonates with you.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-3xl">4️⃣</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Build Your Collection</h3>
                <p className="text-gray-400">Save drops you love privately. No public metrics, no pressure—just your personal soundtrack.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 p-8 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-2xl font-semibold mb-4 text-white">What Makes DeepCuts Different</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
            <div>
              <h3 className="font-semibold text-purple-400 mb-2">❌ No Ratings or Votes</h3>
              <p className="text-gray-400 text-sm">
                Your taste isn't up for public approval. Share what you love without fear of downvotes.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-purple-400 mb-2">❌ No Trust Scores</h3>
              <p className="text-gray-400 text-sm">
                We don't rank curators or create leaderboards. Everyone's taste is equally valid.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-purple-400 mb-2">❌ No Competition</h3>
              <p className="text-gray-400 text-sm">
                This isn't about being the "best" curator. It's about finding your musical kindred spirits.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-purple-400 mb-2">✅ Private Saves</h3>
              <p className="text-gray-400 text-sm">
                Only you see what you've saved. Build your collection without public judgment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
