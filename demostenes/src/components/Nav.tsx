import Link from "next/link";
import { logout } from "@/app/login/actions";

export function Nav({ name, links }: { name: string; links: { href: string; label: string }[] }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <nav className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-3">
        <Link href="/" className="font-semibold">
          Demóstenes
        </Link>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-sm text-stone-600 hover:text-stone-900">
            {link.label}
          </Link>
        ))}
        <span className="ml-auto text-sm text-stone-500">{name}</span>
        <form action={logout}>
          <button type="submit" className="text-sm text-stone-600 hover:text-stone-900">
            Salir
          </button>
        </form>
      </nav>
    </header>
  );
}
