'use server'

import Links from "@/components/navbar/Links";

export default async function NavBar() {
  return (
    <nav className="navbar">
      <div className="navbar__top">
        <a className="navbar__brand navbar__link" href="/">NexTool</a>
        <div id="hamburger" className="navbar__hamburger" tabIndex={0} role="button" aria-label="Toggle navbar menu">
          <span className="navbar__hamburger__line"></span>
          <span className="navbar__hamburger__line"></span>
          <span className="navbar__hamburger__line"></span>
        </div>
      </div>
      <Links/>
    </nav>
  )
}
