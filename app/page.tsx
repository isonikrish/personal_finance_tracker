
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useMain  from "@/src/lib/useMain";

export default function HomePage() {
  const { user, getUser } = useMain();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        await getUser();
      } catch {
        // Treat a failed authentication check as logged out.
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    void checkAuth();

    return () => {
      isMounted = false;
    };
  }, [getUser]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <section className="mx-auto w-full max-w-3xl text-center">
        <div className="mb-8 inline-flex items-center rounded-full border px-4 py-2 text-sm text-muted-foreground">
          Personal Finance Tracker
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Take control of your{" "}
          <span className="text-primary">finances.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          Track your income and expenses, manage your accounts, and understand
          where your money goes — all in one place.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {isCheckingAuth ? (
            <div className="h-11 w-40 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <Link
              href="/dashboard"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
              >
                Get Started — Sign Up
              </Link>

              <Link
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border bg-background px-8 text-sm font-medium transition-colors hover:bg-muted sm:w-auto"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
