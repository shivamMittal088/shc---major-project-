"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { submitLoginForm } from "@/server-actions/submit-otp.action";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendOtp } from "@/server-actions/send-otp.action";
import { toast } from "sonner";
import Image from "next/image";
import {
  ArrowRight,
  KeyRound,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";

const LoginFormSchema = z.object({
  name: z.string().min(3).max(255),
  email: z.string().email(),
  otp: z.string().length(6),
});

export type LoginFormType = z.infer<typeof LoginFormSchema>;

export default function LoginForm() {
  const router = useRouter();
  const [otpStatus, setOtpStatus] = useState<
    "pending" | "sending" | "sent" | "error"
  >("pending");

  const loginForm = useForm<LoginFormType>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {},
  });

  const isSendingOtp = otpStatus === "sending";
  const isOtpSent = otpStatus === "sent";
  const isSubmittingOtp = loginForm.formState.isSubmitting;

  const onLoginFormSubmit = async (data: LoginFormType) => {
    await toast.promise(submitLoginForm(data), {
      loading: "Submitting OTP...",
      success: "Logged in successfully",
      error: "Something went wrong",
    });
    router.push("/");
  };

  const onClickSendOtpButton = async () => {
    if (
      (await loginForm.trigger("email")) &&
      (await loginForm.trigger("name"))
    ) {
      setOtpStatus("sending");
      toast.promise(
        sendOtp(loginForm.getValues("name"), loginForm.getValues("email")),
        {
          loading: "Sending OTP...",
          success: () => {
            setOtpStatus("sent");
            return "OTP sent successfully";
          },
          error: () => {
            setOtpStatus("error");
            return "Something went wrong";
          },
        }
      );
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#040814] px-3 py-3 text-slate-100 sm:px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(56,189,248,0.2),transparent_26%),radial-gradient(circle_at_86%_20%,rgba(59,130,246,0.16),transparent_24%),linear-gradient(180deg,#040814_0%,#070f23_45%,#030713_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:36px_36px] opacity-20" />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="pointer-events-none absolute -left-16 top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.08 }}
        className="pointer-events-none absolute -right-20 bottom-8 h-64 w-64 rounded-full bg-sky-500/16 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-4xl items-center justify-center">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-[380px] rounded-[20px] border border-cyan-300/15 bg-[#071124]/88 p-4 shadow-[0_30px_86px_-50px_rgba(56,189,248,0.7)] backdrop-blur-2xl sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image
                src="/assets/images/logo.png"
                alt="ShareCode"
                width={36}
                height={36}
                priority
              />
              <div>
                <p className="text-sm font-semibold text-white">ShareCode</p>
              </div>
            </div>
          </div>

          <p className="mb-3 text-xs text-slate-300">
            Fast OTP verification.
          </p>

          <div className="mb-3 grid grid-cols-2 gap-1.5 text-[10px]">
            <div
              className={`rounded-md border px-2 py-1 transition-colors ${
                !isOtpSent
                  ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300"
              }`}
            >
              1. Profile
            </div>
            <div
              className={`rounded-md border px-2 py-1 transition-colors ${
                isOtpSent
                  ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300"
              }`}
            >
              2. Verify OTP
            </div>
          </div>

          <Form {...loginForm}>
            <form
              onSubmit={loginForm.handleSubmit(onLoginFormSubmit)}
              className="space-y-2.5"
            >
                <FormField
                  control={loginForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-200">Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your full name"
                          autoComplete="name"
                          {...field}
                          disabled={isSendingOtp || isOtpSent}
                          className="h-9 rounded-md border-white/15 bg-white/[0.03] text-sm text-slate-100 placeholder:text-slate-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-200">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          {...field}
                          disabled={isSendingOtp || isOtpSent}
                          className="h-9 rounded-md border-white/15 bg-white/[0.03] text-sm text-slate-100 placeholder:text-slate-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isOtpSent && (
                  <Button
                    type="button"
                    disabled={isSendingOtp}
                    onClick={onClickSendOtpButton}
                    className="h-9 w-full rounded-md bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 text-slate-950 hover:opacity-90"
                  >
                    {isSendingOtp ? "Sending OTP..." : "Continue with OTP"}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                )}

                {isOtpSent && (
                  <>
                    <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1.5 text-[11px] text-emerald-100">
                      OTP sent. Enter 6-digit code.
                    </div>

                    <FormField
                      control={loginForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-200">One-time password</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123456"
                              autoComplete="one-time-code"
                              inputMode="numeric"
                              maxLength={6}
                              {...field}
                              disabled={isSubmittingOtp}
                              className="h-9 rounded-md border-white/15 bg-white/[0.03] text-center text-sm tracking-[0.22em] text-slate-100 placeholder:text-slate-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col gap-1.5 sm:flex-row">
                      <Button
                        type="submit"
                        disabled={isSubmittingOtp}
                        className="h-9 flex-1 rounded-md bg-gradient-to-r from-sky-300 to-cyan-300 text-slate-950 hover:opacity-90"
                      >
                        {isSubmittingOtp ? "Verifying..." : "Unlock workspace"}
                        <KeyRound className="ml-1.5 h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSendingOtp || isSubmittingOtp}
                        onClick={onClickSendOtpButton}
                        className="h-9 rounded-md border-white/15 bg-transparent text-slate-200 hover:bg-white/[0.06]"
                      >
                        Resend OTP
                      </Button>
                    </div>
                  </>
                )}

                {otpStatus === "error" && (
                  <p className="text-xs text-rose-300">
                    Could not send OTP. Please recheck your details and try again.
                  </p>
                )}
            </form>
          </Form>

          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-300">
            <MailCheck className="h-3 w-3 text-cyan-300" />
            OTP email
            <span className="mx-0.5 text-slate-500">|</span>
            <ShieldCheck className="h-3 w-3 text-emerald-300" />
            Server-protected access
          </div>
        </motion.section>
      </div>
    </main>
  );
}
