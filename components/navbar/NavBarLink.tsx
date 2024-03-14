'use client'

import Link from "next/link";

export default function NavBarLink({ name, link }: Readonly<{ name: string; link: string }>) {
  return (
    <li className="navbar__item">
      <Link className="navbar__link" href={link}>{name}</Link>
    </li>
  );
}
