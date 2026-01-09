import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AUTH_ROUTES } from "@/constants/auth";

export default auth((req) => {
  if (req.auth) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = AUTH_ROUTES.signIn;
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|sign-in).*)"],
};
