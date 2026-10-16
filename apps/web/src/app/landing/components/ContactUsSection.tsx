'use client';

import React, { useTransition, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { submitContactMessage } from '@/app/actions';

function ContactForm() {
  const [isPending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitContactMessage(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("تم إرسال رسالتك بنجاح!");
        formRef.current?.reset();
      }
    });
  };

  return (
    <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          الاسم بالكامل
        </label>
        <input
          name="name"
          type="text"
          placeholder="اكتب اسمك هنا"
          required
          className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          رقم الموبايل
        </label>
        <input
          name="phone"
          type="tel"
          placeholder="01X XXXX XXXX"
          dir="ltr"
          required
          className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all text-right"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          الرسالة أو الاستفسار
        </label>
        <textarea
          name="message"
          rows={4}
          placeholder="اكتب رسالتك هنا..."
          required
          className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all resize-none"
        ></textarea>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <span>{isPending ? "جاري الإرسال..." : "إرسال الرسالة"}</span>
        {!isPending && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 -rotate-90"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        )}
      </button>
      <p className="text-[11px] text-slate-500 leading-relaxed text-center pt-1">
        بإرسال رسالتك، فإنك تؤكد موافقتك على{" "}
        <Link href="/privacy" className="text-indigo-600 hover:underline font-bold">
          سياسة الخصوصية
        </Link>{" "}
        واستخدام بياناتك للرد على استفسارك والتواصل معك.
      </p>
    </form>
  );
}

export function ContactUsSection() {
  return (
    <section
      className="py-24 bg-slate-50 relative overflow-hidden"
      id="contact"
      dir="rtl"
    >
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              تواصل{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                معنا
              </span>
            </h2>
            <p className="text-slate-600 text-lg font-medium">
              نحن هنا دائماً لمساعدتك والإجابة على جميع استفساراتك.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Phone */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">
                  رقم الهاتف
                </h3>
                <p className="text-slate-600" dir="ltr">
                  012 2130 1224
                </p>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">
                  واتساب
                </h3>
                <p className="text-slate-600" dir="ltr">
                  010 2190 2000
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">
                  الفروع ومقرات السنتر
                </h3>
                <p className="text-slate-600">سنتر العدليه التعليمي - دمياط</p>
                <p className="text-slate-600 mt-1">سنتر البستان - دمياط</p>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-6">
              أرسل لنا رسالة
            </h3>
            <ContactForm />
          </motion.div>
        </div>
      </div>
    </section>
  );
}