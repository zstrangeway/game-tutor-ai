export function Navbar({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {children}
      </div>
    </div>
  )
}

export function NavbarMenu({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex items-center gap-4">
      {children}
    </div>
  )
}
