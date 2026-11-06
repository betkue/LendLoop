import { SignIn } from "@clerk/nextjs";
import { setRequestLocale } from "next-intl/server";
import { AuthSplitLayout } from "@/features/auth";
import type { Locale } from "@/i18n/routing";

export default async function SignInPage({ params }: PageProps<"/[locale]/sign-in/[[...sign-in]]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <AuthSplitLayout>
      <SignIn
        path={`/${locale}/sign-in`}
        signUpUrl={`/${locale}/sign-up`}
        fallbackRedirectUrl={`/${locale}/tools`}
      />
    </AuthSplitLayout>
  );
}
