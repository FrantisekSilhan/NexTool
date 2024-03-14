'use client'

import Link from "next/link";
import {MutableRefObject, ReactNode, useCallback, useEffect, useRef} from "react";
import {usePathname, useRouter} from "next/navigation";

export default function NavBar({children}: { children: ReactNode }) {
  const nav = useRef() as MutableRefObject<HTMLMenuElement>;

  const toggleMenu = useCallback(() => {
    nav.current.classList.toggle("navbar--open");
  }, []);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") {
      router.refresh();
    }
  }, [pathname]);

  return (
    <nav ref={nav} className="navbar">
      <div className="navbar__top">
        <Link href={"/"} className={"navbar__brand navbar__link"}>NexTool</Link>
        <div onClick={toggleMenu} id="hamburger" className="navbar__hamburger" tabIndex={0} role="button" aria-label="Toggle navbar menu">
          <span className="navbar__hamburger__line"></span>
          <span className="navbar__hamburger__line"></span>
          <span className="navbar__hamburger__line"></span>
        </div>
      </div>
      <menu className={"navbar__menu"}>
        {children}
      </menu>
    </nav>
  )
}
