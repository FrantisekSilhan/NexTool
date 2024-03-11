'use client'

import {MutableRefObject, useCallback, useRef} from "react";
import NavBarLink from "@/components/navbar/Link";

export default function NavBar() {
  const navbar = useRef() as MutableRefObject<HTMLDivElement>

  const toggleMenu = useCallback(() => {
    navbar.current.classList.toggle("navbar--open");
  }, []);

  return (
    <nav ref={navbar} className="navbar">
      <div className="navbar__top">
        <a className="navbar__brand navbar__link" href="/">NexTool</a>
        <div id="hamburger" className="navbar__hamburger" tabIndex={0} role="button" aria-label="Toggle navbar menu"
             onClick={toggleMenu}>
          <span className="navbar__hamburger__line"></span>
          <span className="navbar__hamburger__line"></span>
          <span className="navbar__hamburger__line"></span>
        </div>
      </div>
      <menu className="navbar__menu">
        <NavBarLink name={"Admin"} link={"/admin"}/>
        <NavBarLink name={"Shortener"} link={"/shortener"}/>
        <NavBarLink name={"Upload"} link={"/upload"}/>
        <NavBarLink name={"Dashboard"} link={"/dashboard"}/>
        <NavBarLink name={"Invite"} link={"/invite"}/>
        <NavBarLink name={"Sign out"} link={"/logout"}/>
        <NavBarLink name={"Sign in"} link={"/login"}/>
        <NavBarLink name={"Sign up"} link={"/register"}/>
      </menu>
    </nav>
  )
}
