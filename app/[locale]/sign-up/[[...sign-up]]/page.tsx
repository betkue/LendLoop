import { SignUp } from "@clerk/nextjs";
import { setRequestLocale } from "next-intl/server";
import { AuthSplitLayout } from "@/features/auth";
import type { Locale } from "@/i18n/routing";

export default async function SignUpPage({ params }: PageProps<"/[locale]/sign-up/[[...sign-up]]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <AuthSplitLayout>
      <SignUp
        path={`/${locale}/sign-up`}
        signInUrl={`/${locale}/sign-in`}
        fallbackRedirectUrl={`/${locale}/tools`}
      />
    </AuthSplitLayout>
  );
}
