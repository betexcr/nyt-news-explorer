import React, { PropsWithChildren, useEffect } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { initTheme } from "../utils/theme";

const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  useEffect(() => {
    initTheme();
  }, []);
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="NYT News Explorer — Home">
            <picture>
              <source
                type="image/webp"
                srcSet="/logo.webp 1x, /logo@2x.webp 2x"
              />
              <img
                src="/logo.png"
                srcSet="/logo.png 1x, /logo@2x.png 2x"
                alt="NYT News Explorer"
                className="logo"
                width={32}
                height={32}
                decoding="async"
              />
            </picture>
            <span className="brand-name">NYT News Explorer</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
};

export default Layout;
