const Layout = ({ children }) => {
  return (
    <div className="app-shell">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
