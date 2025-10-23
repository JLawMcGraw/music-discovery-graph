export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Signal
        </h1>
        <p className="text-2xl text-gray-300 mb-8">
          The Trust Graph for Music Discovery
        </p>
        <p className="text-lg text-gray-400 mb-8 max-w-2xl">
          Discover music through trusted humans, not algorithms. Stake your reputation on recommendations that matter.
        </p>
        <div className="flex gap-4">
          <a
            href="/auth/spotify"
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            Connect with Spotify
          </a>
          <a
            href="/feed"
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
          >
            Browse Drops
          </a>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-gray-900 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-purple-400">Stake Reputation</h3>
            <p className="text-gray-400">
              Put points on the line when you recommend music. Good drops elevate your trust score.
            </p>
          </div>
          <div className="p-6 bg-gray-900 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-purple-400">Context Matters</h3>
            <p className="text-gray-400">
              Every drop includes why it matters and what to listen for. No more mindless scrolling.
            </p>
          </div>
          <div className="p-6 bg-gray-900 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-purple-400">Trust Networks</h3>
            <p className="text-gray-400">
              Find people whose musical judgment you can trust. Build your taste graph.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
