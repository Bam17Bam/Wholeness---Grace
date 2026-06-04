"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

export default function WelcomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-wg-background">
      <div className="max-w-2xl text-center space-y-8">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-wg-primary text-white shadow-lg">
            <Heart size={48} />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl font-serif font-bold text-wg-charcoal">
            Wholeness & Grace
          </h1>
          <div className="space-y-2">
            <p className="text-2xl font-serif italic text-wg-primary">
              "Homework for whole hearts"
            </p>
            <p className="text-xl text-wg-charcoal/60">
              Between sessions, toward wholeness
            </p>
          </div>
        </div>

        <div className="pt-8">
          <Link 
            href="/login"
            className="inline-block py-4 px-12 bg-wg-primary text-white rounded-full font-medium text-lg hover:bg-wg-primary/90 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Enter Portal
          </Link>
        </div>

        <p className="text-wg-charcoal/40 text-sm">
          A secure, faith-friendly companion for your healing journey.
        </p>
      </div>
    </div>
  );
}
