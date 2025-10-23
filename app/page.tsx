import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          DeepCuts
        </h1>
        <p className="text-2xl text-gray-300 mb-8">
          Dig Deeper with Trusted Curators
        </p>
        <p className="text-lg text-gray-400 mb-8 max-w-2xl">
          Go beyond the algorithm. Discover music from curators who stake their reputation on every recommendation.
        </p>
        <div className="flex gap-4">
          <Link
            href="/feed"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
          >
            Browse Drops
          </Link>
          <Link
            href="/drop/create"
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
          >
            Create a Drop
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h3 className="text-xl font-semibold mb-3 text-purple-400">Stake Reputation</h3>
            <p className="text-gray-400">
              Put points on the line when you recommend music. Good drops elevate your trust score.
            </p>
          </div>
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h3 className="text-xl font-semibold mb-3 text-purple-400">Context Matters</h3>
            <p className="text-gray-400">
              Every drop includes why it matters and what to listen for. No more mindless scrolling.
            </p>
          </div>
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h3 className="text-xl font-semibold mb-3 text-purple-400">Build Trust</h3>
            <p className="text-gray-400">
              Earn trust through successful drops. Your reputation is public and auditable.
            </p>
          </div>
        </div>

        <div className="mt-16 p-8 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 text-white">How It Works</h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex gap-4">
              <span className="text-3xl">1️⃣</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Find a Track You Love</h3>
                <p className="text-gray-400">Search Spotify for any track you believe others should discover.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-3xl">2️⃣</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Write Context</h3>
                <p className="text-gray-400">Explain why it matters. What makes it special? What should people listen for?</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-3xl">3️⃣</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Stake Reputation</h3>
                <p className="text-gray-400">Put 10-100 points on the line. Higher stakes show confidence.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-3xl">4️⃣</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Community Validates</h3>
                <p className="text-gray-400">Others rate your drop. Great recs earn bonus points. Poor ones lose stakes.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
