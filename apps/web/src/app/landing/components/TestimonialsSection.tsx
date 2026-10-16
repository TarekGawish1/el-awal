'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { usePublicTestimonials } from '@/hooks/usePublicContent';

export function TestimonialsSection() {
  const { data: testimonials = [] } = usePublicTestimonials();

  if (testimonials.length === 0) return null;

  return (
    <section
      className="py-24 bg-white relative overflow-hidden"
      id="testimonials"
      dir="rtl"
    >
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[30%] rounded-full bg-blue-50 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[30%] h-[40%] rounded-full bg-emerald-50 blur-[100px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              آراء{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
                طلابنا
              </span>
            </h2>
            <p className="text-slate-600 text-lg font-medium">
              نفخر دائماً بنجاح طلابنا وتفوقهم، إليك ما يقولونه عن تجربتهم معنا.
            </p>
          </motion.div>
        </div>

        {/* Mobile View: Continuous Marquee */}
        <div className="md:hidden flex overflow-hidden -mx-6">
          <motion.div
            className="flex gap-6 px-6 w-max"
            animate={{ x: ["0%", "50%"] }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: 15,
            }}
          >
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <div
                key={`${testimonial.id}-${index}`}
                className="bg-slate-50 rounded-3xl p-8 border border-slate-100 relative shrink-0 w-[85vw] sm:w-[350px]"
              >
                <div className="absolute top-6 left-8 text-blue-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 rotate-180"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>

                <div className="mb-6 relative z-10">
                  <h3 className="font-bold text-slate-900 text-lg">
                    {testimonial.firstName}
                  </h3>
                  {testimonial.gradeLevel && (
                    <p className="text-sm text-slate-500 font-medium mt-1">
                      {testimonial.gradeLevel}
                    </p>
                  )}
                </div>

                <div className="flex gap-1 mb-4 relative z-10">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-amber-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <p className="text-slate-700 leading-relaxed relative z-10 text-lg">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Desktop View: Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all relative"
            >
              <div className="absolute top-6 left-8 text-blue-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 rotate-180"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              <div className="mb-6 relative z-10">
                <h3 className="font-bold text-slate-900 text-lg">
                  {testimonial.firstName}
                </h3>
                {testimonial.gradeLevel && (
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    {testimonial.gradeLevel}
                  </p>
                )}
              </div>

              <div className="flex gap-1 mb-4 relative z-10">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-amber-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-slate-700 leading-relaxed relative z-10 text-lg">
                "{testimonial.content}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}