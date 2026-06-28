import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Masuk | CatatanPosyandu",
};

export default function LoginPage() {
  return (
    <main className="bg-background lg:flex lg:items-stretch0">
      <section className="min-h-screen relative hidden overflow-hidden bg-primary p-12 text-white lg:grid lg:w-1/2 lg:grid-rows-[auto_minmax(0,1fr)_auto] xl:px-12 xl:py-10">
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-secondary/35" />
        <div className="absolute -bottom-32 -left-24 size-96 rounded-full border-[40px] border-white/10" />

        <div className="relative">
          <p className=" max-w-md text-4xl font-extrabold leading-tight xl:text-5xl">
            Catatan rapi, tumbuh kembang terpantau.
          </p>
          <p className="mt-5 max-w-md text-base leading-7 text-white/80">
            Kelola data balita, pencatatan penimbangan, dan laporan Posyandu
            dalam satu tempat.
          </p>
        </div>

        <div className="relative flex items-center justify-center py-6">
          <div className="relative aspect-square w-7/10 rounded-3xl border border-white/50 bg-linear-to-br from-white to-[#c9ffe7] p-4 shadow-lg shadow-primary/15">
            <div className="relative size-full">
              <Image
                alt="Logo CatatanPosyandu"
                className="object-contain"
                fill
                src="/logo/logo_with_text_2.png"
              />
            </div>
          </div>
        </div>

        <p className="relative text-sm text-white/70">
          Dibuat untuk kader Posyandu dan pengurus RW.
        </p>
      </section>

      <section className="mx-auto flex w-full  flex-col justify-center p-6 lg:w-1/2 lg:max-w-none lg:px-12 xl:px-24">
        <div className="lg:max-w-md">
          <Image
            alt="CatatanPosyandu"
            className="h-auto w-44 lg:hidden"
            height={1000}
            priority
            src="/logo/logo_with_text_2.png"
            width={1000}
          />
          <p className="mt-4 text-xs sm:text-sm font-semibold text-primary lg:mt-0">
            SELAMAT DATANG KEMBALI
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Masuk ke akun Anda
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Gunakan username dan password yang telah terdaftar untuk
            melanjutkan.
          </p>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
