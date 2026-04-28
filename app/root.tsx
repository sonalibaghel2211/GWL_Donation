import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { useEffect } from "react";

export default function App() {

  useEffect(() => {
    // @ts-ignore (Tawk global variable fix)
    var Tawk_API = window.Tawk_API || {};
    var Tawk_LoadStart = new Date();

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://embed.tawk.to/69e6113d6ef56e1c36f54727/default";
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
        <Meta />
        <Links />
      </head>

      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}