export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">FLOAE</h1>
      <p className="text-lg text-gray-600">Find Labour Online At Ease</p>
      <p className="text-sm text-gray-500 max-w-md">
        A marketplace connecting recruiters posting work with contractors and
        labourers looking for it.
      </p>
      <div className="flex gap-4 mt-4">
        <a
          href="/signup"
          className="bg-black text-white rounded-md px-4 py-2 font-medium"
        >
          Sign up
        </a>
        <a
          href="/login"
          className="border rounded-md px-4 py-2 font-medium"
        >
          Log in
        </a>
        <a
          href="/jobs"
          className="border rounded-md px-4 py-2 font-medium"
        >
          Browse jobs
        </a>
      </div>
    </main>
  );
}
