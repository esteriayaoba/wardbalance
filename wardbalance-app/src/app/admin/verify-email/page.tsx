import { cookies } from "next/headers";
import VerifyEmailForm from "./verify-email-form";

export default async function VerifyEmailPage() {
  const cookieStore = await cookies();
  const devOtp = process.env.NODE_ENV === "development" ? cookieStore.get("dev_otp")?.value : undefined;

  return (
    <div className="min-h-full flex items-center justify-center py-4">
      <div className="w-full max-w-md">
        <VerifyEmailForm devOtp={devOtp} />
      </div>
    </div>
  );
}
