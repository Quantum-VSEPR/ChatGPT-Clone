import Head from "next/head";
import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client";
import { getSession } from "@auth0/nextjs-auth0";

export default function Home() {
  const { isLoading, error, user } = useUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#343541] text-center text-white">
      <Head>
        <title>ChatGPT Clone - Login or Signup</title>
      </Head>
      <div>
        <div className=" rounded-xl bg-gray-700 p-20">
          {!!user && <Link href="/api/auth/logout">Logout </Link>}
          {!user && (
            <div className="flex flex-col gap-4">
              <Link href="/api/auth/login" className="btn">
                Login
              </Link>
              <Link href="/api/auth/signup" className="btn">
                Signup
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req, ctx.res);
  if (session) {
    return {
      redirect: {
        destination: "/c",
      },
    };
  }
  return {
    props: {},
  };
};
