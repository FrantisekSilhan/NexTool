import NavBar from "@/components/navbar/NavBar";
import Links from "@/components/navbar/Links";

export default async function Layout({children}: { children: React.ReactNode }) {
  return (
    <>
      <NavBar>
        <Links/>
      </NavBar>
      <main>
        {children}
      </main>
    </>
  );
}
