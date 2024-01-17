import Head from "next/head";
import "../styles/globals.css";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import { config } from "@fortawesome/fontawesome-svg-core";

import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

function App({ Component, pageProps }) {
  return (
    <div className="bg-[#343541]">
      <UserProvider>
        <Head>
          <link rel="icon" href="/favicon.png" />
          <title>GPT Clone</title>
          <meta name="description" content="ChatGPT clone" />
        </Head>
        <Component {...pageProps} />
      </UserProvider>
    </div>
  );
}

export default App;
